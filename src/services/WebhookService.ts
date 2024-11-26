import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';
import { RegistrationService } from './RegistrationService';
import { BadRequestError } from '../utils/errors';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();
const registrationService = new RegistrationService();

interface EmailAddress {
  id: string;
  email_address: string;
  verification: {
    status: string;
  };
}

interface PhoneNumber {
  id: string;
  phone_number: string;
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
  phone_numbers: PhoneNumber[];
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  profile_image_url: string | null;
  created_at: number;
  updated_at: number;
  external_accounts: ExternalAccount[];
  primary_email_address_id: string | null;
  primary_phone_number_id: string | null;
}

interface SessionData {
  id: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  client_id: string;
  expire_at: number;
  status: string;
}

interface SmsData {
  id: string;
  object: string;
  from_phone_number: string;
  to_phone_number: string;
  phone_number_id: string;
  user_id: string | null;
  status: string;
  message: string;
  slug: string;
}

interface WebhookEvent {
  eventType: string;
  data: {
    data: UserData | SessionData | SmsData;
    type: string;
  };
  event_attributes: {
    http_request: {
      client_ip: string;
      user_agent: string;
    };
  };
  object: string;
  timestamp: number;
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent) {
    const eventType = event.eventType || event.data.type;
    logger.info(`Processing webhook event: ${eventType}`, { eventData: JSON.stringify(event) });

    try {
      switch (eventType) {
        case 'user.created':
          await this.handleUserCreated(event.data.data as UserData);
          break;
        case 'user.updated':
          await this.handleUserUpdated(event.data.data as UserData);
          break;
        case 'user.deleted':
          await this.handleUserDeleted(event.data.data as UserData);
          break;
        case 'session.created':
          await this.handleSessionCreated(event.data.data as SessionData);
          break;
        case 'sms.created':
          await this.handleSmsCreated(event as WebhookEvent);
          break;
        default:
          logger.warn(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (error) {
      logger.error('Error processing webhook event', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        eventType, 
        stack: error instanceof Error ? error.stack : undefined 
      });
    }
  }

  private async handleUserCreated(userData: UserData) {
    try {
      logger.info('Handling user.created event', { userId: userData.id });
      
      const primaryEmail = userData.email_addresses.find(email => email.id === userData.primary_email_address_id);
      const primaryPhone = userData.phone_numbers.find(phone => phone.id === userData.primary_phone_number_id);
      const externalAccount = userData.external_accounts[0]; // Assuming the first external account is the primary one

      const profileData = {
        clerkId: userData.id,
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification.status === 'verified',
        phoneNumber: primaryPhone?.phone_number,
        phoneVerified: primaryPhone?.verification.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.profile_image_url || userData.image_url,
        createdAt: new Date(userData.created_at),
        updatedAt: new Date(userData.updated_at),
        externalAccounts: externalAccount ? [{
          provider: externalAccount.provider,
          providerId: externalAccount.id,
          email: externalAccount.email_address
        }] : []
      };

      const newProfile = await profileService.createProfile(profileData);
    
      if (newProfile) {
        logger.info(`Created new profile for user: ${newProfile.clerkId}`);
      } else {
        logger.error('Failed to create new profile', { userId: userData.id });
      }
    } catch (error) {
      if (error instanceof BadRequestError) {
        logger.error('Bad request error handling user.created event:', error);
      } else {
        logger.error('Unexpected error handling user.created event:', error);
      }
    }
  }

  private async handleUserUpdated(userData: UserData) {
    try {
      logger.info('Handling user.updated event', { userId: userData.id });
      // Implement user update logic here
      logger.info(`User updated: ${userData.id}`);
    } catch (error) {
      logger.error('Error handling user.updated event:', error);
    }
  }

  private async handleUserDeleted(userData: UserData) {
    try {
      logger.info('Handling user.deleted event', { userId: userData.id });
      const deletedProfile = await profileService.deleteProfile(userData.id);
      if (deletedProfile) {
        logger.info(`Deleted profile and associated data for user: ${userData.id}`);
      } else {
        logger.warn(`Profile not found for deletion: ${userData.id}`);
      }
    } catch (error) {
      logger.error('Error handling user.deleted event:', error);
    }
  }

  private async handleSessionCreated(sessionData: SessionData) {
    try {
      logger.info('Handling session.created event', { 
        sessionId: sessionData.id, 
        userId: sessionData.user_id,
        clientId: sessionData.client_id,
        expireAt: new Date(sessionData.expire_at).toISOString()
      });
    } catch (error) {
      logger.error('Error handling session.created event:', error);
    }
  }

  private async handleSmsCreated(event: WebhookEvent) {
    try {
      logger.info('Handling sms.created event', { smsId: (event.data.data as SmsData).id });
      await registrationService.storeRegistrationAttempt(event);
      logger.info('Stored registration attempt');
    } catch (error) {
      logger.error('Error handling sms.created event:', error);
    }
  }
}

