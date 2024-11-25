import { prisma } from '../utils/database';
import { redis } from '../utils/redis';
import { BadRequestError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { ObjectId } from 'mongodb';

const logger = createLogger('ProfileService');

export class ProfileService {
  async createProfile(data: any) {
    try {
      logger.info('Creating new profile', { data });
      const profileData = {
        ...data,
        _id: new ObjectId().toHexString(), // Generate a new MongoDB ObjectId
        clerkId: data.id, // Store the Clerk-generated ID in a new field
      };
      delete profileData.id; // Remove the original id field

      const newProfile = await prisma.profile.create({
        data: profileData,
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

