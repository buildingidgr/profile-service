import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';
import { PreferencesService } from './PreferencesService';

const logger = createLogger('WebhookService');

interface WebhookEvent {
  type: string;
  data: any;
  eventType?: string;
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    // Handle both direct webhook events and queued events
    const eventType = event.type || event.eventType;
    const eventData = event.data?.data || event.data;
    const eventId = eventData?.id || 'unknown';

    console.log('DEBUG - WebhookService processing event:', {
      eventType,
      eventData,
      originalEvent: event
    });

    try {
      logger.info(`[${eventId}] Started processing webhook event`, {
        eventId,
        eventType,
        data: eventData,
        eventStructure: {
          hasType: !!event.type,
          hasEventType: !!event.eventType,
          hasData: !!event.data,
          hasNestedData: !!event.data?.data,
          extractedType: eventType,
          extractedId: eventId,
          fullEvent: event
        }
      });

      switch (eventType) {
        case 'user.created':
          console.log('DEBUG - Handling user.created event');
          await this.handleUserCreated(eventData);
          break;
        case 'user.updated':
          console.log('DEBUG - Handling user.updated event');
          await this.handleUserUpdated(eventData);
          break;
        case 'user.deleted':
          console.log('DEBUG - Handling user.deleted event');
          await this.handleUserDeleted(eventData);
          break;
        default:
          console.log('DEBUG - Unhandled event type:', eventType);
          logger.warn(`[${eventId}] Unhandled webhook event type`, {
            eventId,
            eventType,
            availableTypes: ['user.created', 'user.updated', 'user.deleted']
          });
      }

      logger.info(`[${eventId}] Successfully processed webhook event`, {
        eventId,
        eventType
      });
    } catch (error) {
      console.error('DEBUG - Error in processWebhookEvent:', error);
      logger.error(`[${eventId}] Error processing webhook event:`, {
        error,
        eventId,
        eventType,
        data: eventData,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }

  private async handleUserCreated(data: any): Promise<void> {
    const userId = data.id;
    console.log('DEBUG - handleUserCreated received data:', data);

    try {
      logger.info(`[${userId}] Processing user.created event`, {
        userId,
        data,
        dataStructure: {
          hasId: !!data.id,
          hasEmailAddresses: !!data.email_addresses,
          emailAddressesCount: data.email_addresses?.length,
          hasPrimaryEmailId: !!data.primary_email_address_id,
          primaryEmailId: data.primary_email_address_id,
          fullData: data
        }
      });

      const { id, email_addresses, first_name, last_name } = data;
      const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);

      console.log('DEBUG - Primary email data:', {
        primaryEmail,
        primaryEmailId: data.primary_email_address_id,
        allEmails: email_addresses
      });

      logger.info(`[${userId}] Found primary email`, {
        userId,
        primaryEmail,
        allEmails: email_addresses
      });

      // Check if profile already exists
      console.log('DEBUG - Checking for existing profile with clerkId:', id);
      const existingProfile = await prisma.profile.findUnique({
        where: { clerkId: id }
      });

      if (existingProfile) {
        console.log('DEBUG - Profile already exists:', existingProfile);
        logger.warn(`[${userId}] Profile already exists for user.created event`, {
          userId,
          existingProfile
        });
        return;
      }

      // Create new profile using Prisma
      const profileData = {
        clerkId: id,
        email: primaryEmail?.email_address,
        firstName: first_name,
        lastName: last_name,
        emailVerified: primaryEmail?.verification?.status === 'verified'
      };

      console.log('DEBUG - Creating new profile with data:', profileData);
      logger.info(`[${userId}] Creating new profile`, {
        userId,
        profileData
      });

      const newProfile = await prisma.profile.create({
        data: profileData
      });

      console.log('DEBUG - Profile created:', newProfile);

      // Create default preferences
      console.log('DEBUG - Creating default preferences for user:', id);
      const preferencesService = new PreferencesService();
      await preferencesService.createDefaultPreferences(id);

      logger.info(`[${userId}] Successfully created profile and preferences`, {
        userId,
        profile: newProfile
      });
    } catch (error) {
      console.error('DEBUG - Error in handleUserCreated:', error);
      logger.error(`[${userId}] Error handling user.created event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }

  private async handleUserUpdated(data: any): Promise<void> {
    const userId = data.id;
    console.log('DEBUG - handleUserUpdated received data:', data);

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
      console.error('DEBUG - Error in handleUserUpdated:', error);
      logger.error(`[${userId}] Error handling user.updated event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }

  private async handleUserDeleted(data: any): Promise<void> {
    const userId = data.id;
    console.log('DEBUG - handleUserDeleted received data:', data);

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
      console.error('DEBUG - Error in handleUserDeleted:', error);
      logger.error(`[${userId}] Error handling user.deleted event:`, {
        error,
        userId,
        data,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }
}

