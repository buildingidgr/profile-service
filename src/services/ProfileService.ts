import { prisma } from '../utils/database';
import { redis } from '../utils/redis';
import { BadRequestError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const logger = createLogger('ProfileService');

// MongoDB connection
const mongoClient = new MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();

export interface ProfilePreference {
  location: {
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
  };
  notifications: {
    email: {
      updates: boolean;
      security_alerts: boolean;
      marketing: boolean;
      newsletter: boolean;
      team_mentions: boolean;
    };
  };
  privacy: {
    profile_visibility: string;
    show_online_status: boolean;
    two_factor_auth: boolean;
  };
  appearance: {
    theme: string;
  };
}

export class ProfileService {
  async createProfile(data: any) {
    try {
      logger.info('Creating new profile', { data });
      
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
      logger.info('Profile created successfully', { profileId: newProfile?._id });
      return newProfile;
    } catch (error) {
      logger.error('Error creating profile', { error });
      throw new BadRequestError('Failed to create profile');
    }
  }

  async getProfile(clerkId: string) {
    try {
      const profileCollection = db.collection('Profile');
      const profile = await profileCollection.findOne({ clerkId });

      if (!profile) {
        throw new BadRequestError('Profile not found');
      }

      return profile;
    } catch (error) {
      logger.error('Error getting profile', { error, clerkId });
      throw new BadRequestError('Failed to get profile');
    }
  }

  async updateProfile(clerkId: string, data: any) {
    try {
      logger.info(`Updating profile for user: ${clerkId}`, { data });
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            email: data.email,
            emailVerified: data.emailVerified,
            username: data.username,
            firstName: data.firstName,
            lastName: data.lastName,
            avatarUrl: data.avatarUrl,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
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

  async getProfilePreferences(clerkId: string): Promise<ProfilePreference | null> {
    try {
      const profileCollection = db.collection('Profile');
      const profile = await profileCollection.findOne({ clerkId });

      if (!profile || !profile.preferences) {
        return null;
      }

      return profile.preferences as ProfilePreference;
    } catch (error) {
      logger.error('Error getting profile preferences', { error, clerkId });
      throw new BadRequestError('Failed to get profile preferences');
    }
  }

  async updateProfilePreferences(clerkId: string, data: Partial<ProfilePreference>) {
    try {
      logger.info(`Updating profile preferences for user: ${clerkId}`, { data });
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            preferences: data,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      logger.info(`Profile preferences for ${clerkId} updated successfully`);
      return result.value.preferences as ProfilePreference;
    } catch (error) {
      logger.error(`Error updating profile preferences for ${clerkId}:`, error);
      throw new BadRequestError('Failed to update profile preferences');
    }
  }

  async generateAndStoreApiKey(clerkId: string): Promise<string> {
    try {
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

      logger.info(`Generated and stored new API key for user: ${clerkId}`);
      return apiKey;
    } catch (error) {
      logger.error(`Error generating and storing API key for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to generate and store API Key');
    }
  }

  async updateLastLogin(clerkId: string, lastLoginDate: Date) {
    try {
      logger.info(`Updating last login for user: ${clerkId}`);
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            lastLoginAt: lastLoginDate,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      logger.info(`Last login updated for user: ${clerkId}`);
      return result.value;
    } catch (error) {
      logger.error(`Error updating last login for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to update last login');
    }
  }

  private generateApiKey(): string {
    return 'mh_' + crypto.randomBytes(32).toString('hex');
  }
}

