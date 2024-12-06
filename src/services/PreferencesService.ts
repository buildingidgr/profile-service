import { MongoClient } from 'mongodb';
import { createLogger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

const logger = createLogger('PreferencesService');
const mongoClient = new MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();

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

export class PreferencesService {
  async getPreferences(clerkId: string): Promise<UserPreferences> {
    try {
      const preferencesCollection = db.collection('UserPreferences');
      const preferences = await preferencesCollection.findOne({ clerkId });

      if (!preferences) {
        // If no preferences exist, create default ones
        await this.createDefaultPreferences(clerkId);
        return DEFAULT_PREFERENCES;
      }

      return preferences.preferences;
    } catch (error) {
      logger.error('Error getting preferences', { error, clerkId });
      throw new BadRequestError('Failed to get preferences');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const preferencesCollection = db.collection('UserPreferences');
      const currentPrefs = await preferencesCollection.findOne({ clerkId });

      const updatedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(currentPrefs?.preferences || {}),
        ...data
      };

      const result = await preferencesCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: { 
            preferences: updatedPreferences,
            updatedAt: new Date()
          }
        },
        { 
          upsert: true,
          returnDocument: 'after'
        }
      );

      if (!result.value) {
        throw new BadRequestError('Failed to update preferences');
      }

      return result.value.preferences;
    } catch (error) {
      logger.error('Error updating preferences', { error, clerkId });
      throw new BadRequestError('Failed to update preferences');
    }
  }

  private async createDefaultPreferences(clerkId: string): Promise<void> {
    const preferencesCollection = db.collection('UserPreferences');
    await preferencesCollection.insertOne({
      clerkId,
      preferences: DEFAULT_PREFERENCES,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
} 