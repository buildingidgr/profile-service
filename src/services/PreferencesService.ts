import { MongoClient } from 'mongodb';
import { createLogger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import { ObjectId } from 'mongodb';

const logger = createLogger('PreferencesService');
const mongoClient = new MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();

export interface UserPreferences {
  id: string;
  clerkId: string;
  preferences: {
    notifications: {
      email: {
        updates: boolean;
        marketing: boolean;
        security: boolean;
        newsletters: boolean;
      };
    };
    dashboard: {
      language: string;
      timezone: string;
    };
    display: {
      theme: 'light' | 'dark';
    };
  };
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_PREFERENCES: Partial<UserPreferences> = {
  preferences: {
    notifications: {
      email: {
        updates: false,
        marketing: false,
        security: false,
        newsletters: true
      }
    },
    dashboard: {
      language: "en-US",
      timezone: "Pacific/Pago_Pago"
    },
    display: {
      theme: "light"
    }
  }
};

export class PreferencesService {
  async getPreferences(clerkId: string): Promise<UserPreferences> {
    try {
      const preferencesCollection = db.collection('UserPreferences');
      const preferences = await preferencesCollection.findOne({ clerkId });

      if (!preferences) {
        // If no preferences exist, create default ones
        const newPreferences = await this.createDefaultPreferences(clerkId);
        return newPreferences;
      }

      return {
        id: preferences._id.toString(),
        clerkId: preferences.clerkId,
        preferences: preferences.preferences,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      } as UserPreferences;
    } catch (error) {
      logger.error('Error getting preferences', { error, clerkId });
      throw new BadRequestError('Failed to get preferences');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences['preferences']>): Promise<UserPreferences> {
    try {
      const preferencesCollection = db.collection('UserPreferences');
      const currentPrefs = await preferencesCollection.findOne({ clerkId });

      const updatedPreferences = {
        preferences: {
          ...DEFAULT_PREFERENCES.preferences,
          ...(currentPrefs?.preferences || {}),
          ...data
        }
      };

      const result = await preferencesCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: { 
            ...updatedPreferences,
            updatedAt: new Date().toISOString()
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

      return {
        id: result.value._id.toString(),
        clerkId: result.value.clerkId,
        preferences: result.value.preferences,
        createdAt: result.value.createdAt,
        updatedAt: result.value.updatedAt
      } as UserPreferences;
    } catch (error) {
      logger.error('Error updating preferences', { error, clerkId });
      throw new BadRequestError('Failed to update preferences');
    }
  }

  public async createDefaultPreferences(clerkId: string): Promise<UserPreferences> {
    const preferencesCollection = db.collection('UserPreferences');
    const now = new Date().toISOString();
    const id = new ObjectId().toString();
    
    const newPreferences = {
      _id: new ObjectId(id),
      id,
      clerkId,
      ...DEFAULT_PREFERENCES,
      createdAt: now,
      updatedAt: now
    };

    await preferencesCollection.insertOne(newPreferences);
    return {
      id,
      clerkId,
      preferences: DEFAULT_PREFERENCES.preferences,
      createdAt: now,
      updatedAt: now
    } as UserPreferences;
  }
} 