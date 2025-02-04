import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';
import { PreferencesService } from './PreferencesService';

const logger = createLogger('WebhookService');

interface WebhookEvent {
  type: string;
  data: any;
}

export class WebhookService {
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
      const existingProfile = await prisma.profile.findUnique({
        where: { clerkId: id }
      });

      if (existingProfile) {
        logger.warn(`[${userId}] Profile already exists for user.created event`, {
          userId,
          existingProfile
        });
        return;
      }

      // Create new profile using Prisma
      const newProfile = await prisma.profile.create({
        data: {
          clerkId: id,
          email: primaryEmail?.email_address,
          firstName: first_name,
          lastName: last_name,
          emailVerified: primaryEmail?.verification?.status === 'verified'
        }
      });

      // Create default preferences
      const preferencesService = new PreferencesService();
      await preferencesService.createDefaultPreferences(id);

      logger.info(`[${userId}] Successfully created profile and preferences`, {
        userId,
        profile: newProfile
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

      const updatedProfile = await prisma.profile.update({
        where: { clerkId: id },
        data: {
          email: primaryEmail?.email_address,
          firstName: first_name,
          lastName: last_name,
          emailVerified: primaryEmail?.verification?.status === 'verified'
        }
      });

      logger.info(`[${userId}] Successfully updated profile`, {
        userId,
        updatedProfile
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

      // Delete profile and preferences using Prisma
      const [deletedProfile, deletedPreferences] = await Promise.all([
        prisma.profile.delete({
          where: { clerkId: userId }
        }),
        prisma.userPreferences.delete({
          where: { clerkId: userId }
        })
      ]);

      logger.info(`[${userId}] Successfully deleted profile and preferences`, {
        userId,
        deletedProfile,
        deletedPreferences
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

