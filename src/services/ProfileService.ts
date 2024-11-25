import { prisma } from '../utils/database';
import { redis } from '../utils/redis';
import { BadRequestError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProfileService');

export class ProfileService {
  async createProfile(data: any) {
    try {
      logger.info('Creating new profile', { data });
      const newProfile = await prisma.profile.create({
        data: {
          clerkId: data.clerkId,
          email: data.email,
          emailVerified: data.emailVerified,
          phoneNumber: data.phoneNumber,
          phoneVerified: data.phoneVerified,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          apiKey: data.apiKey,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        },
      });
      logger.info('Profile created successfully', { profileId: newProfile.id });
      return newProfile;
    } catch (error) {
      logger.error('Error creating profile', { error });
      if (error instanceof Error) {
        throw new BadRequestError(`Failed to create profile: ${error.message}`);
      } else {
        throw new BadRequestError('Failed to create profile');
      }
    }
  }

  async getProfile(clerkId: string) {
    const profile = await prisma.profile.findUnique({
      where: { clerkId },
      include: { externalAccounts: true, preferences: true }
    });

    if (!profile) {
      throw new BadRequestError('Profile not found');
    }

    return profile;
  }

  async updateProfile(clerkId: string, data: any) {
    try {
      const updatedProfile = await prisma.profile.update({
        where: { clerkId },
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          phoneNumber: data.phoneNumber,
          phoneVerified: data.phoneVerified,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          apiKey: data.apiKey,
          externalAccounts: {
            upsert: data.externalAccounts?.map((account: any) => ({
              where: {
                provider_providerId: {
                  provider: account.provider,
                  providerId: account.providerId
                }
              },
              update: account,
              create: account
            })) || []
          },
          preferences: {
            upsert: {
              update: data.preferences || {},
              create: data.preferences || {}
            }
          }
        },
        include: { externalAccounts: true, preferences: true }
      });

      await redis.del(`profile:${clerkId}`);
      logger.info(`Profile ${clerkId} updated successfully`);
      return updatedProfile;
    } catch (error) {
      logger.error(`Error updating profile ${clerkId}:`, error);
      throw new BadRequestError('Failed to update profile');
    }
  }

  async getProfilePreferences(clerkId: string) {
    const profile = await prisma.profile.findUnique({
      where: { clerkId },
      include: { preferences: true }
    });

    if (!profile || !profile.preferences) {
      throw new BadRequestError('Profile preferences not found');
    }

    return profile.preferences;
  }

  async updateProfilePreferences(clerkId: string, data: any) {
    try {
      const updatedProfile = await prisma.profile.update({
        where: { clerkId },
        data: {
          preferences: {
            upsert: {
              create: data,
              update: data,
            },
          },
        },
        include: { preferences: true },
      });

      logger.info(`Profile preferences for ${clerkId} updated successfully`);
      return updatedProfile.preferences;
    } catch (error) {
      logger.error(`Error updating profile preferences for ${clerkId}:`, error);
      throw new BadRequestError('Failed to update profile preferences');
    }
  }

  async storeApiKey(clerkId: string, apiKey: string) {
    try {
      await prisma.profile.update({
        where: { clerkId },
        data: { apiKey }
      });
      logger.info(`API Key stored for user: ${clerkId}`);
    } catch (error) {
      logger.error(`Error storing API Key for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to store API Key');
    }
  }

  async getApiKey(clerkId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { clerkId },
        select: { apiKey: true }
      });
      if (!profile || !profile.apiKey) {
        throw new BadRequestError('API Key not found');
      }
      return profile.apiKey;
    } catch (error) {
      logger.error(`Error retrieving API Key for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to retrieve API Key');
    }
  }
}

