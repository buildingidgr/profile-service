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
  location: {
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: string;
  };
  notifications: {
    email: {
      updates: boolean;
      security_alerts: boolean;
      marketing: boolean;
      newsletter: boolean;
      team_mentions: boolean;
    };
  };
  privacy: {
    profile_visibility: string;
    show_online_status: boolean;
    two_factor_auth: boolean;
  };
  appearance: {
    theme: string;
  };
}

export class ProfileService {
  // ... (previous methods remain unchanged)

  async updateLastLogin(clerkId: string, lastLoginDate: Date) {
    try {
      logger.info(`Updating last login for user: ${clerkId}`);
    
      const profileCollection = db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        {
          $set: {
            lastLoginAt: lastLoginDate,
            updatedAt: new Date()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new BadRequestError('Profile not found');
      }

      logger.info(`Last login updated for user: ${clerkId}`);
      return result.value;
    } catch (error) {
      logger.error(`Error updating last login for user ${clerkId}:`, error);
      throw new BadRequestError('Failed to update last login');
    }
  }

  // ... (rest of the class remains unchanged)
}

