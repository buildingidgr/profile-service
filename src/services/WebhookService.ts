import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

interface EmailAddress {
  email_address: string;
  verification: {
    status: string;
  };
}

interface UserData {
  id: string;
  email_addresses: EmailAddress[];
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  created_at: number;
  updated_at: number;
}

interface WebhookEvent {
  data: {
    data: UserData;
    type: string;
  };
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent) {
    const eventType = event.data.type;
    logger.info(`Processing webhook event: ${eventType}`, { eventData: JSON.stringify(event) });

    try {
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(event.data.data);
          break;
        default:
          logger.warn(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      logger.error('Error processing webhook event', { error, eventType });
      throw error;
    }
  }

  private async handleUserCreated(userData: UserData) {
    try {
      logger.info('Handling user.created event', { userId: userData.id });
      const primaryEmail = userData.email_addresses[0];
      const newProfile = await profileService.createProfile({
        clerkId: userData.id,
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at)
      });
      
      if (newProfile) {
        logger.info(`Created new profile for user: ${newProfile.clerkId}`);
      } else {
        logger.error('Failed to create new profile', { userId: userData.id });
        throw new Error('Failed to create new profile');
      }
    } catch (error) {
      logger.error('Error handling user.created event:', error);
      throw error;
    }
  }
}

