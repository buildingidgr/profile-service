import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

interface EmailAddress {
  email_address: string;
  verification: {
    status: string;
  };
  id: string;
}

interface UserData {
  id: string;
  email_addresses?: EmailAddress[];
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string;
  created_at?: number;
  updated_at?: number;
  birthday?: string;
  gender?: string;
  password_enabled?: boolean;
  phone_numbers?: any[];
  primary_email_address_id?: string | null;
  primary_phone_number_id?: string | null;
  primary_web3_wallet_id?: string | null;
  private_metadata?: Record<string, any>;
  public_metadata?: Record<string, any>;
  unsafe_metadata?: Record<string, any>;
  two_factor_enabled?: boolean;
  profile_image_url?: string;
  deleted?: boolean;
}

interface SessionData {
  id: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  // Add other session fields as needed
}

interface WebhookEvent {
  data: {
    data: UserData | SessionData;
    type: string;
  };
  type: string;
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent) {
    const eventType = event.type;
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
      const primaryEmail = userData.email_addresses?.[0];
      const newProfile = await profileService.createProfile({
        clerkId: userData.id,
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        createdAt: userData.created_at ? new Date(userData.created_at) : new Date(),
        updatedAt: userData.updated_at ? new Date(userData.updated_at) : new Date()
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
      const primaryEmail = userData.email_addresses?.find(email => email.id === userData.primary_email_address_id);
      const updatedProfile = await profileService.updateProfile(userData.id, {
        email: primaryEmail?.email_address,
        emailVerified: primaryEmail?.verification?.status === 'verified',
        username: userData.username,
        firstName: userData.first_name,
        lastName: userData.last_name,
        avatarUrl: userData.image_url,
        updatedAt: userData.updated_at ? new Date(userData.updated_at) : new Date()
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

  private async handleUserDeleted(userData: UserData) {
    try {
      logger.info('Handling user.deleted event', { userId: userData.id });
      const deletedProfile = await profileService.deleteProfile(userData.id);
    
      if (deletedProfile) {
        logger.info(`Deleted profile for user: ${userData.id}`);
      } else {
        logger.warn('Profile not found for deletion', { userId: userData.id });
      }
    } catch (error) {
      logger.error('Error handling user.deleted event:', error);
      throw error;
    }
  }

  private async handleSessionCreated(sessionData: SessionData) {
    try {
      logger.info('Handling session.created event', { sessionId: sessionData.id, userId: sessionData.user_id });
      
      // Fetch the user data using the user_id from the session
      const userData = await this.fetchUserData(sessionData.user_id);
      
      if (userData) {
        // Use the existing handleUserCreated method with the fetched user data
        await this.handleUserCreated(userData);
      } else {
        logger.error('Failed to fetch user data for session.created event', { userId: sessionData.user_id });
      }
    } catch (error) {
      logger.error('Error handling session.created event:', error);
      throw error;
    }
  }

  private async fetchUserData(userId: string): Promise<UserData | null> {
    // Implement the logic to fetch user data from Clerk API
    // This is a placeholder and should be replaced with actual API call
    logger.info('Fetching user data from Clerk API', { userId });
    // TODO: Implement Clerk API call to fetch user data
    return null;
  }
}

