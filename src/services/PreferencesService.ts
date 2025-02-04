import { createLogger } from '../shared/utils/logger';
import { BadRequestError } from '../shared/utils/errors';
import { mongoClient } from '../shared/utils/database';

const logger = createLogger('PreferencesService');
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
    };
  };
  display: {
    theme: 'light' | 'dark' | 'system';
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    email: {
      updates: false,
      marketing: false,
      security: false,
      newsletters: false
    }
  },
  dashboard: {
    language: "en-US",
    timezone: "Athens/Greece"
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
      const currentPreferences = await preferencesCollection.findOne({ clerkId });

      if (!currentPreferences) {
        // If no preferences exist, create with defaults and apply updates
        const newPreferences = {
          clerkId,
          preferences: DEFAULT_PREFERENCES,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await preferencesCollection.insertOne(newPreferences);
        return this.updatePreferences(clerkId, data);
      }

      // Create update operations for each field in the request
      const updateOperations: { [key: string]: any } = {};

      // Handle dashboard updates
      if (data.dashboard) {
        if (data.dashboard.timezone) {
          updateOperations['preferences.dashboard.timezone'] = data.dashboard.timezone;
        }
        if (data.dashboard.language) {
          updateOperations['preferences.dashboard.language'] = data.dashboard.language;
        }
      }

      // Handle notifications updates
      if (data.notifications?.email) {
        const emailUpdates = data.notifications.email;
        Object.entries(emailUpdates).forEach(([key, value]) => {
          if (value !== undefined) {
            updateOperations[`preferences.notifications.email.${key}`] = value;
          }
        });
      }

      // Handle display updates
      if (data.display?.theme) {
        updateOperations['preferences.display.theme'] = data.display.theme;
      }

      // If no valid updates, return current preferences
      if (Object.keys(updateOperations).length === 0) {
        return currentPreferences.preferences;
      }

      // Perform the update
      const result = await preferencesCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: {
            ...updateOperations,
            updatedAt: new Date()
          }
        },
        { 
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

  async createDefaultPreferences(clerkId: string): Promise<void> {
    try {
      const preferencesCollection = db.collection('UserPreferences');
      await preferencesCollection.insertOne({
        clerkId,
        preferences: DEFAULT_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      // If error is duplicate key, ignore it as preferences already exist
      if ((error as any).code !== 11000) {
        logger.error('Error creating default preferences', { error, clerkId });
        throw new BadRequestError('Failed to create default preferences');
      }
    }
  }
} 