import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

interface SessionData {
  id: string;
  user_id: string;
  created_at: number;
  updated_at: number;
  client_id: string;
  expire_at: number;
  status: string;
}

interface WebhookEvent {
  data: {
    data: SessionData;
  };
  type: string;
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent) {
    const eventType = event.type;
    logger.info(`Processing webhook event: ${eventType}`, { eventData: JSON.stringify(event) });

    try {
      switch (eventType) {
        case 'session.created':
          await this.handleSessionCreated(event.data.data);
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

  private async handleSessionCreated(sessionData: SessionData) {
    try {
      logger.info('Handling session.created event', { 
        sessionId: sessionData.id, 
        userId: sessionData.user_id,
        clientId: sessionData.client_id,
        expireAt: new Date(sessionData.expire_at).toISOString()
      });

      // Check if the user already exists in our system
      const existingProfile = await profileService.getProfile(sessionData.user_id);

      if (existingProfile) {
        logger.info('User already exists, updating last login', { userId: sessionData.user_id });
        await profileService.updateLastLogin(sessionData.user_id, new Date(sessionData.created_at));
      } else {
        logger.info('New user detected, fetching user data and creating profile', { userId: sessionData.user_id });
        const userData = await this.fetchUserData(sessionData.user_id);
        if (userData) {
          await profileService.createProfile(userData);
        } else {
          logger.error('Failed to fetch user data for new user', { userId: sessionData.user_id });
        }
      }

      // You might want to store or update session information here
      // await sessionService.createOrUpdateSession(sessionData);

    } catch (error) {
      logger.error('Error handling session.created event:', error);
      throw error;
    }
  }

  private async fetchUserData(userId: string): Promise<any> {
    // Implement the logic to fetch user data from Clerk API
    // This is a placeholder and should be replaced with actual API call
    logger.info('Fetching user data from Clerk API', { userId });
    // TODO: Implement Clerk API call to fetch user data
    return null;
  }
}

