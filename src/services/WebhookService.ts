import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

interface EmailAddress {
  id: string;
  email_address: string;
  verification: {
    status: string;
  };
}

interface ExternalAccount {
  id: string;
  provider: string;
  email_address?: string;
}

interface UserData {
  id: string;
  email_addresses: EmailAddress[];
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
  external_accounts: ExternalAccount[];
  primary_email_address_id: string | null;
}

interface WebhookEvent {
  eventType: string;
  data: {
    data: UserData;
    type: string;
  };
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent) {
    const eventType = event.eventType || event.data.type;
    logger.info(`Processing webhook event: ${eventType}`, { eventData: JSON.stringify(event) });

    try {
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(event.data.data);
          break;
        // ... other event handlers ...
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
      
      const primaryEmail = userData.email_addresses.find(email => email.id === userData.primary_email_address_id);
      const externalAccount = userData.external_accounts[0]; // Assuming the first external account is the primary one

      const newProfile = await profileService.createProfile({
        clerkId: userData.id,
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
        externalAccounts: [{
          provider: externalAccount.provider,
          providerId: externalAccount.id,
          email: externalAccount.email_address
        }]
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

