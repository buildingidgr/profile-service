import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

interface EmailAddress {
  email_address: string;
  verification: {
    status: string;
  };
  id: string; // Added id field to EmailAddress
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
  birthday: string;
  gender: string;
  password_enabled: boolean;
  phone_numbers: any[];
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
  primary_web3_wallet_id: string | null;
  private_metadata: Record<string, any>;
  public_metadata: Record<string, any>;
  unsafe_metadata: Record<string, any>;
  two_factor_enabled: boolean;
  profile_image_url: string;
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
        case 'user.updated':
          await this.handleUserUpdated(event.data.data);
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
        logger.info(`Created new profile for user: ${newProfile.clerkId}`, { apiKey: newProfile.apiKey });
      } else {
        logger.error('Failed to create new profile', { userId: userData.id });
        throw new Error('Failed to create new profile');
      }
    } catch (error) {
      logger.error('Error handling user.created event:', error);
      throw error;
    }
  }

  private async handleUserUpdated(userData: UserData) {
    try {
      logger.info('Handling user.updated event', { userId: userData.id });
      const primaryEmail = userData.email_addresses.find(email => email.id === userData.primary_email_address_id);
      const updatedProfile = await profileService.updateProfile(userData.id, {
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        updatedAt: new Date(userData.updated_at)
      });
    
      if (updatedProfile) {
        logger.info(`Updated profile for user: ${updatedProfile.clerkId}`);
      } else {
        logger.error('Failed to update profile', { userId: userData.id });
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      logger.error('Error handling user.updated event:', error);
      throw error;
    }
  }
}

