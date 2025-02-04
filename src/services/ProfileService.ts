import { createLogger } from '../shared/utils/logger';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';
import { RedisService } from './RedisService';
import { BadRequestError } from '../shared/utils/errors';
import { PreferencesService } from './PreferencesService';
import { mongoClient } from '../shared/utils/database';

const logger = createLogger('ProfileService');

// MongoDB connection
const db = mongoClient.db();

interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface UserPreferences {
  dashboard: {
    timezone: string;
    language: string;
  };
  notifications: {
    email: {
      marketing: boolean;
      updates: boolean;
      security: boolean;
      newsletters: boolean;
      productAnnouncements: boolean;
    };
  };
  display: {
    theme: 'light' | 'dark' | 'system';
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dashboard: {
    timezone: "Europe/Athens",
    language: "el-GR"
  },
  notifications: {
    email: {
      marketing: false,
      updates: false,
      security: true,
      newsletters: false,
      productAnnouncements: false
    }
  },
  display: {
    theme: "light"
  }
};

export class ProfileService {
  private redisService: RedisService | null = null;

  async createProfile(data: any) {
    try {
      logger.info('Creating new profile', { data: JSON.stringify(data) });
      
      if (!data.clerkId) {
        throw new BadRequestError('ClerkId is required');
      }

      const apiKey = this.generateApiKey();
      
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.insertOne({
        _id: new ObjectId(),
        clerkId: data.clerkId,
        email: data.email,
        emailVerified: data.emailVerified,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        apiKey: apiKey,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      });

      const newProfile = await profileCollection.findOne({ _id: result.insertedId });

      if (newProfile && data.externalAccounts && data.externalAccounts.length > 0) {
        await this.createExternalAccounts(newProfile._id.toString(), data.externalAccounts);
      }

      // Create default preferences for the new user
      const preferencesService = new PreferencesService();
      await preferencesService.createDefaultPreferences(data.clerkId);

      logger.info('Profile created successfully', { profileId: newProfile?._id });
      return newProfile;
    } catch (error) {
      logger.error('Error creating profile', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        stack: error instanceof Error ? error.stack : undefined 
      });
      throw new BadRequestError('Failed to create profile: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  async getProfile(clerkId: string) {
    try {
      const profileCollection = db.collection('Profile');
      const profile = await profileCollection.findOne(
        { clerkId },
        { projection: { preferences: 0 } }
      );

      if (!profile) {
        throw new BadRequestError('Profile not found');
      }

      return profile;
    } catch (error) {
      logger.error('Error getting profile', { error, clerkId });
      throw new BadRequestError('Failed to get profile');
    }
  }

  async updateProfile(clerkId: string, data: ProfileUpdateData) {
    try {
      // Only allow specific fields to be updated
      const allowedUpdates: ProfileUpdateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl
      };

      // Remove undefined values
      Object.keys(allowedUpdates).forEach(key => {
        if (allowedUpdates[key as keyof ProfileUpdateData] === undefined) {
          delete allowedUpdates[key as keyof ProfileUpdateData];
        }
      });

      logger.info(`Updating profile for user: ${clerkId}`, { data: allowedUpdates });
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            ...allowedUpdates,
            updatedAt: new Date()
          }
        },
        { 
          returnDocument: 'after',
          projection: { preferences: 0 } // Exclude preferences from the response
        }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      logger.info(`Profile ${clerkId} updated successfully`);
      return result.value;
    } catch (error) {
      logger.error(`Error updating profile ${clerkId}:`, error);
      throw new BadRequestError('Failed to update profile');
    }
  }

  async generateAndStoreApiKey(clerkId: string): Promise<string> {
    try {
      // Initialize Redis service only when needed
      if (!this.redisService) {
        this.redisService = new RedisService();
      }

      const apiKey = this.generateApiKey();
      
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            apiKey: apiKey,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      try {
        // Try to store in Redis, but don't fail if Redis is unavailable
        await this.redisService.storeApiKey(clerkId, apiKey);
      } catch (redisError) {
        logger.warn('Failed to store API key in Redis, continuing without caching', redisError);
      }

      logger.info(`Generated and stored new API key for user: ${clerkId}`);
      return apiKey;
    } catch (error) {
      logger.error(`Error generating and storing API key for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to generate and store API Key');
    }
  }

  private generateApiKey(): string {
    return 'mk_' + crypto.randomBytes(32).toString('hex');
  }

  private async createExternalAccounts(clerkId: string, externalAccounts: any[]) {
    try {
      const externalAccountCollection = db.collection('ProfileExternalAccount');
      const accounts = externalAccounts.map(account => ({
        clerkId,
        provider: account.provider,
        providerId: account.providerId,
        email: account.email
      }));

      await externalAccountCollection.insertMany(accounts);
      logger.info('External accounts created successfully', { clerkId, count: accounts.length });
    } catch (error) {
      logger.error('Error creating external accounts', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        clerkId 
      });
      // Don't throw here, just log the error
    }
  }

  async deleteProfile(clerkId: string) {
    try {
      logger.info(`Deleting profile for user: ${clerkId}`);
  
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndDelete({ clerkId });

      if (!result.value) {
        logger.warn(`Profile not found for deletion: ${clerkId}`);
        return null;
      }

      // Delete associated ProfileExternalAccount documents
      const externalAccountCollection = db.collection('ProfileExternalAccount');
      const deleteResult = await externalAccountCollection.deleteMany({ clerkId });
      logger.info(`Deleted ${deleteResult.deletedCount} associated external accounts for user: ${clerkId}`);

      // Try to clean up Redis if we have an API key
      if (result.value.apiKey && !this.redisService) {
        this.redisService = new RedisService();
      }

      if (this.redisService && result.value.apiKey) {
        try {
          await this.redisService.deleteApiKey(result.value.apiKey);
          await this.redisService.deleteApiKey(`profile:${clerkId}`);
        } catch (redisError) {
          logger.warn('Failed to clean up Redis keys, continuing with deletion', redisError);
        }
      }

      logger.info(`Profile and related data deleted for user: ${clerkId}`);
      return result.value;
    } catch (error) {
      logger.error(`Error deleting profile ${clerkId}:`, error);
      throw new BadRequestError('Failed to delete profile');
    }
  }

  async updatePhoneNumber(clerkId: string, phoneNumber: string, phoneNumberId: string) {
    try {
      logger.info(`Updating phone number for user: ${clerkId}`, { phoneNumber, phoneNumberId });
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            phoneNumber: phoneNumber,
            phoneNumberId: phoneNumberId,
            phoneVerified: false, // Set to false initially, will be updated when verified
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      logger.info(`Phone number updated for user: ${clerkId}`);
      return result.value;
    } catch (error) {
      logger.error(`Error updating phone number for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to update phone number');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences>) {
    try {
      const profileCollection = db.collection('Profile');
      const profile = await profileCollection.findOne({ clerkId });

      if (!profile) {
        throw new BadRequestError('Profile not found');
      }

      // Merge existing preferences with updates
      const updatedPreferences = {
        ...profile.preferences,
        ...data,
        dashboard: {
          ...profile.preferences?.dashboard,
          ...data.dashboard
        },
        notifications: {
          email: {
            ...profile.preferences?.notifications?.email,
            ...data.notifications?.email
          }
        },
        display: {
          ...profile.preferences?.display,
          ...data.display
        }
      };

      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: { 
            preferences: updatedPreferences,
            updatedAt: new Date()
          } 
        },
        { returnDocument: 'after' }
      );

      return result.value;
    } catch (error) {
      logger.error('Error updating preferences', { error, clerkId });
      throw new BadRequestError('Failed to update preferences');
    }
  }
}

