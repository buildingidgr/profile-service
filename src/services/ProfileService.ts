import { prisma } from '../utils/database';
import { redis } from '../utils/redis';
import { BadRequestError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { MongoClient, ObjectId } from 'mongodb';
import crypto from 'crypto';

const logger = createLogger('ProfileService');

// MongoDB connection
const mongoClient = new MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();

export interface ProfilePreference {
  // ... (previous code remains unchanged)
}

export class ProfileService {
  async createProfile(data: any) {
    try {
      logger.info('Creating new profile', { data });
      
      const apiKey = this.generateApiKey();
      
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.insertOne({
        _id: new ObjectId(),
        clerkId: data.clerkId,
        email: data.email,
        emailVerified: data.emailVerified,
        phoneNumber: data.phoneNumber,
        phoneVerified: data.phoneVerified,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        avatarUrl: data.avatarUrl,
        apiKey: apiKey,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      });

      const newProfile = await profileCollection.findOne({ _id: result.insertedId });

      if (newProfile && data.externalAccounts) {
        await this.createExternalAccounts(newProfile._id.toString(), data.externalAccounts);
      }

      logger.info('Profile created successfully', { profileId: newProfile?._id });
      return newProfile;
    } catch (error) {
      logger.error('Error creating profile', { error });
      throw new BadRequestError('Failed to create profile');
    }
  }

  private async createExternalAccounts(profileId: string, externalAccounts: any[]) {
    try {
      const externalAccountCollection = db.collection('ProfileExternalAccount');
      const accounts = externalAccounts.map(account => ({
        profileId: new ObjectId(profileId),
        provider: account.provider,
        providerId: account.providerId,
        email: account.email
      }));

      await externalAccountCollection.insertMany(accounts);
      logger.info('External accounts created successfully', { profileId, count: accounts.length });
    } catch (error) {
      logger.error('Error creating external accounts', { error, profileId });
      throw new BadRequestError('Failed to create external accounts');
    }
  }

  // ... (rest of the methods remain unchanged)
}

