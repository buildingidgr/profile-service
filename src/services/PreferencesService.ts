import { createLogger } from '../shared/utils/logger';
import { BadRequestError } from '../shared/utils/errors';
import { prisma } from '../shared/utils/database';
import { Prisma } from '@prisma/client';

const logger = createLogger('PreferencesService');

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
      const preferences = await prisma.userPreferences.findUnique({
        where: { clerkId },
        select: {
          preferences: true
        }
      });

      if (!preferences) {
        await this.createDefaultPreferences(clerkId);
        return DEFAULT_PREFERENCES;
      }

      return preferences.preferences as unknown as UserPreferences;
    } catch (error) {
      logger.error('Error getting preferences', { error, clerkId });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestError('Preferences already exist for this user');
        }
      }
      throw new BadRequestError('Failed to get preferences');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // First try to find existing preferences
      let preferences = await prisma.userPreferences.findUnique({
        where: { clerkId },
        select: {
          preferences: true
        }
      });

      if (!preferences) {
        // If no preferences exist, create new ones
        preferences = await prisma.userPreferences.create({
          data: {
            clerkId,
            preferences: DEFAULT_PREFERENCES as unknown as Prisma.InputJsonValue
          },
          select: {
            preferences: true
          }
        });
      }

      // Merge the preferences
      const currentPrefs = preferences.preferences as unknown as UserPreferences;
      const updatedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...currentPrefs,
        ...data
      };

      // Update the preferences
      const result = await prisma.userPreferences.update({
        where: { clerkId },
        data: {
          preferences: updatedPreferences as unknown as Prisma.InputJsonValue
        },
        select: {
          preferences: true
        }
      });

      return result.preferences as unknown as UserPreferences;
    } catch (error) {
      logger.error('Error updating preferences', { error, clerkId });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestError('Preferences already exist for this user');
        }
      }
      throw new BadRequestError('Failed to update preferences');
    }
  }

  async createDefaultPreferences(clerkId: string): Promise<void> {
    try {
      await prisma.userPreferences.create({
        data: {
          clerkId,
          preferences: DEFAULT_PREFERENCES as unknown as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      logger.error('Error creating default preferences', { error, clerkId });
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // If preferences already exist, we can ignore this error
          return;
        }
      }
      throw new BadRequestError('Failed to create default preferences');
    }
  }
} 