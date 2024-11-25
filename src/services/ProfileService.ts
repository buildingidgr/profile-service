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
          id: data.id,
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

  async getProfile(id: string) {
    const cachedProfile = await redis.get(`profile:${id}`);
    if (cachedProfile) {
      return JSON.parse(cachedProfile);
    }

    const profile = await prisma.profile.findUnique({
      where: { id },
      include: { externalAccounts: true, preferences: true }
    });

    if (!profile) {
      throw new BadRequestError('Profile not found');
    }

    await redis.set(`profile:${id}`, JSON.stringify(profile), { EX: 3600 });
    return profile;
  }

  async updateProfile(id: string, data: any) {
    try {
      const updatedProfile = await prisma.profile.update({
        where: { id },
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

      await redis.del(`profile:${id}`);
      logger.info(`Profile ${id} updated successfully`);
      return updatedProfile;
    } catch (error) {
      logger.error(`Error updating profile ${id}:`, error);
      throw new BadRequestError('Failed to update profile');
    }
  }

  async getProfilePreferences(id: string) {
    const preferences = await prisma.profilePreference.findUnique({
      where: { profileId: id }
    });

    if (!preferences) {
      throw new BadRequestError('Profile preferences not found');
    }

    return preferences;
  }

  async updateProfilePreferences(id: string, data: any) {
    try {
      const updatedPreferences = await prisma.profilePreference.upsert({
        where: { profileId: id },
        update: data,
        create: { ...data, profileId: id }
      });

      logger.info(`Profile preferences for ${id} updated successfully`);
      return updatedPreferences;
    } catch (error) {
      logger.error(`Error updating profile preferences for ${id}:`, error);
      throw new BadRequestError('Failed to update profile preferences');
    }
  }

  async storeApiKey(userId: string, apiKey: string) {
    try {
      await prisma.profile.update({
        where: { id: userId },
        data: { apiKey }
      });
      logger.info(`API Key stored for user: ${userId}`);
    } catch (error) {
      logger.error(`Error storing API Key for user ${userId}:`, error);
      throw new BadRequestError('Failed to store API Key');
    }
  }

  async getApiKey(userId: string) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { apiKey: true }
      });
      if (!profile || !profile.apiKey) {
        throw new BadRequestError('API Key not found');
      }
      return profile.apiKey;
    } catch (error) {
      logger.error(`Error retrieving API Key for user ${userId}:`, error);
      throw new BadRequestError('Failed to retrieve API Key');
    }
  }
}

