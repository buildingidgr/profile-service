import { MongoClient } from 'mongodb';
import { createLogger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';
import { ObjectId } from 'mongodb';
import { config } from '../config';

const logger = createLogger('PreferencesService');
const mongoClient = new MongoClient(process.env.DATABASE_URL || config.databaseUrl);

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
  private db;
  private isConnected = false;

  constructor() {
    this.db = mongoClient.db();
  }

  private async ensureConnection() {
    if (!this.isConnected) {
      try {
        await mongoClient.connect();
        this.isConnected = true;
        logger.info('Connected to MongoDB');
      } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw new Error('Database connection failed');
      }
    }
  }

  async getPreferences(clerkId: string): Promise<UserPreferences> {
    try {
      await this.ensureConnection();

      const preferencesCollection = this.db.collection('UserPreferences');
      const preferences = await preferencesCollection.findOne({ clerkId });

      if (!preferences) {
        logger.info('No preferences found for user, creating defaults', { clerkId });
        const newPreferences = await this.createDefaultPreferences(clerkId);
        return newPreferences;
      }

      logger.info('Retrieved preferences for user', { clerkId });
      return {
        id: preferences._id.toString(),
        clerkId: preferences.clerkId,
        preferences: preferences.preferences,
        createdAt: preferences.createdAt,
        updatedAt: preferences.updatedAt
      } as UserPreferences;
    } catch (error) {
      logger.error('Error getting preferences', { error, clerkId });
      if (error instanceof Error) {
        throw new BadRequestError(`Failed to get preferences: ${error.message}`);
      }
      throw new BadRequestError('Failed to get preferences');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences['preferences']>): Promise<UserPreferences> {
    try {
      await this.ensureConnection();

      const preferencesCollection = this.db.collection('UserPreferences');
      const currentPrefs = await preferencesCollection.findOne({ clerkId });

      const updatedPreferences = {
        preferences: {
          ...DEFAULT_PREFERENCES.preferences,
          ...(currentPrefs?.preferences || {}),
          ...data
        }
      };

      logger.info('Updating preferences for user', { clerkId, updatedPreferences });

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
        logger.error('Failed to update preferences', { clerkId });
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
      if (error instanceof Error) {
        throw new BadRequestError(`Failed to update preferences: ${error.message}`);
      }
      throw new BadRequestError('Failed to update preferences');
    }
  }

  public async createDefaultPreferences(clerkId: string): Promise<UserPreferences> {
    try {
      await this.ensureConnection();

      const preferencesCollection = this.db.collection('UserPreferences');
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

      logger.info('Creating default preferences for user', { clerkId });
      await preferencesCollection.insertOne(newPreferences);

      return {
        id,
        clerkId,
        preferences: DEFAULT_PREFERENCES.preferences,
        createdAt: now,
        updatedAt: now
      } as UserPreferences;
    } catch (error) {
      logger.error('Error creating default preferences', { error, clerkId });
      if (error instanceof Error) {
        throw new BadRequestError(`Failed to create preferences: ${error.message}`);
      }
      throw new BadRequestError('Failed to create preferences');
    }
  }
} 