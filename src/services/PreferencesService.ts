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
      productAnnouncements: boolean;
    };
  };
  display: {
    theme: 'light' | 'dark' | 'system';
  };
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dashboard: {
    timezone: 'UTC',
    language: 'en'
  },
  notifications: {
    email: {
      marketing: true,
      updates: true,
      security: true,
      newsletters: true,
      productAnnouncements: true
    }
  },
  display: {
    theme: 'system'
  }
};

export class PreferencesService {
  async getPreferences(clerkId: string): Promise<UserPreferences> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { clerkId }
      });

      if (!preferences) {
        await this.createDefaultPreferences(clerkId);
        return DEFAULT_PREFERENCES;
      }

      return preferences.preferences as unknown as UserPreferences;
    } catch (error) {
      logger.error('Error getting preferences', { error, clerkId });
      throw new BadRequestError('Failed to get preferences');
    }
  }

  async updatePreferences(clerkId: string, data: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const currentPreferences = await prisma.userPreferences.findUnique({
        where: { clerkId }
      });

      const updatedPreferences = {
        ...DEFAULT_PREFERENCES,
        ...(currentPreferences?.preferences as unknown as UserPreferences || {}),
        ...data
      };

      const result = await prisma.userPreferences.upsert({
        where: { clerkId },
        create: {
          clerkId,
          preferences: updatedPreferences as unknown as Prisma.InputJsonValue
        },
        update: {
          preferences: updatedPreferences as unknown as Prisma.InputJsonValue
        }
      });

      return result.preferences as unknown as UserPreferences;
    } catch (error) {
      logger.error('Error updating preferences', { error, clerkId });
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
      throw new BadRequestError('Failed to create default preferences');
    }
  }
} 