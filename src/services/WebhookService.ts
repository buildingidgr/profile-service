import { createLogger } from '../utils/logger';
import { mongoClient } from '../utils/database';
import { ObjectId } from 'mongodb';
import { PreferencesService } from './PreferencesService';

const logger = createLogger('WebhookService');

interface WebhookEvent {
  type: string;
  data: any;
}

export class WebhookService {
  private db;

  constructor() {
    this.db = mongoClient.db();
  }

  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    const eventId = event.data?.id || 'unknown';
    try {
      logger.info(`[${eventId}] Started processing webhook event`, {
        eventId,
        eventType: event.type,
        data: event.data
      });

      switch (event.type) {
        case 'user.created':
          await this.handleUserCreated(event.data);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event.data);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event.data);
          break;
        default:
          logger.warn(`[${eventId}] Unhandled webhook event type`, {
            eventId,
            eventType: event.type
          });
      }

      logger.info(`[${eventId}] Successfully processed webhook event`, {
        eventId,
        eventType: event.type
      });
    } catch (error) {
      logger.error(`[${eventId}] Error processing webhook event:`, {
        error,
        eventId,
        eventType: event.type,
        data: event.data,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async handleUserCreated(data: any): Promise<void> {
    const userId = data.id;
    try {
      logger.info(`[${userId}] Processing user.created event`, {
        userId,
        data
      });

      const { id, email_addresses, first_name, last_name } = data;
      const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);

      // Check if profile already exists
      const profileCollection = this.db.collection('Profile');
      const existingProfile = await profileCollection.findOne({ clerkId: id });

      if (existingProfile) {
        logger.warn(`[${userId}] Profile already exists for user.created event`, {
          userId,
          existingProfile
        });
        return;
      }

      // Create new profile
      const now = new Date().toISOString();
      const newProfile = {
        _id: new ObjectId(),
        clerkId: id,
        email: primaryEmail?.email_address,
        firstName: first_name,
        lastName: last_name,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        createdAt: now,
        updatedAt: now
      };

      await profileCollection.insertOne(newProfile);

      // Create default preferences
      const preferencesService = new PreferencesService();
      await preferencesService.createDefaultPreferences(id);

      logger.info(`[${userId}] Successfully created profile and preferences`, {
        userId,
        profile: { ...newProfile, _id: newProfile._id.toString() }
      });
    } catch (error) {
      logger.error(`[${userId}] Error handling user.created event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async handleUserUpdated(data: any): Promise<void> {
    const userId = data.id;
    try {
      logger.info(`[${userId}] Processing user.updated event`, {
        userId,
        data
      });

      const { id, email_addresses, first_name, last_name } = data;
      const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);

      const profileCollection = this.db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId: id },
        {
          $set: {
            email: primaryEmail?.email_address,
            firstName: first_name,
            lastName: last_name,
            emailVerified: primaryEmail?.verification?.status === 'verified',
            updatedAt: new Date().toISOString()
          }
        },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        logger.warn(`[${userId}] No profile found to update`, { userId });
        return;
      }

      logger.info(`[${userId}] Successfully updated profile`, {
        userId,
        updatedProfile: { ...result.value, _id: result.value._id.toString() }
      });
    } catch (error) {
      logger.error(`[${userId}] Error handling user.updated event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private async handleUserDeleted(data: any): Promise<void> {
    const userId = data.id;
    try {
      logger.info(`[${userId}] Processing user.deleted event`, {
        userId,
        data
      });

      const profileCollection = this.db.collection('Profile');
      const preferencesCollection = this.db.collection('UserPreferences');

      // Delete both profile and preferences
      const [profileResult, preferencesResult] = await Promise.all([
        profileCollection.deleteOne({ clerkId: userId }),
        preferencesCollection.deleteOne({ clerkId: userId })
      ]);

      logger.info(`[${userId}] Deletion results`, {
        userId,
        profileDeleted: profileResult.deletedCount > 0,
        preferencesDeleted: preferencesResult.deletedCount > 0
      });
    } catch (error) {
      logger.error(`[${userId}] Error handling user.deleted event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
}

