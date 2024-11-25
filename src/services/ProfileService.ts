import { prisma } from '../utils/database';
import { redis } from '../utils/redis';
import { BadRequestError } from '../utils/errors';

export class ProfileService {
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

    await redis.set(`profile:${id}`, JSON.stringify(profile), 'EX', 3600); // Cache for 1 hour
    return profile;
  }

  async updateProfile(id: string, data: any) {
    const updatedProfile = await prisma.profile.update({
      where: { id },
      data,
      include: { externalAccounts: true, preferences: true }
    });

    await redis.del(`profile:${id}`);
    return updatedProfile;
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
    const updatedPreferences = await prisma.profilePreference.upsert({
      where: { profileId: id },
      update: data,
      create: { ...data, profileId: id }
    });

    return updatedPreferences;
  }
}

