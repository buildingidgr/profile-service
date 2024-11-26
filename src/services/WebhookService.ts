import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';
import { RegistrationService } from './RegistrationService';

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

interface ExternalAccount {
  id: string;
  provider: string;
  email_address?: string;
}

interface UserData {
  id: string;
  email_addresses?: EmailAddress[];
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  created_at?: number;
  updated_at?: number;
  external_accounts?: ExternalAccount[];
  primary_email_address_id?: string | null;
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
  app: {
    domain_name: string;
    name: string;
    url: string;
  };
  has_custom_suffix: boolean;
  otp_code: string;
  user: {
    public_metadata: any;
    public_metadata_fallback: string;
  };
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
      logger.error('Error processing webhook event', { error, eventType });
      throw error;
    }
  }

  private async handleUserCreated(userData: UserData) {
    try {
      logger.info('Handling user.created event', { userId: userData.id });
      
      const primaryEmail = userData.email_addresses?.find(email => email.id === userData.primary_email_address_id);
      const externalAccount = userData.external_accounts?.[0];

      const newProfile = await profileService.createProfile({
        clerkId: userData.id,
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
        updatedAt: userData.updated_at ? new Date(userData.updated_at) : new Date(),
        externalAccounts: externalAccount ? [{
          provider: externalAccount.provider,
          providerId: externalAccount.id,
          email: externalAccount.email_address
        }] : []
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

  private async handleUserUpdated(userData: UserData) {
    try {
      logger.info('Handling user.updated event', { userId: userData.id });
      logger.info(`User updated: ${userData.id}`);
    } catch (error) {
      logger.error('Error handling user.updated event:', error);
      throw error;
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
      throw error;
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
      throw error;
    }
  }

  private async handleSmsCreated(event: WebhookEvent) {
    try {
      logger.info('Handling sms.created event', { smsId: (event.data.data as SmsData).id });
      await registrationService.storeRegistrationAttempt(event);
      logger.info('Stored registration attempt');
    } catch (error) {
      logger.error('Error handling sms.created event:', error);
      throw error;
    }
  }
}

