import { createLogger } from '../utils/logger';
import { ProfileService } from './ProfileService';

const logger = createLogger('WebhookService');
const profileService = new ProfileService();

export class WebhookService {
  async processWebhookEvent(event: any) {
    logger.info(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'user.created':
        await this.handleUserCreated(event.data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(event.data);
        break;
      // Add more event types as needed
      default:
        logger.warn(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleUserCreated(userData: any) {
    try {
      // Create a new profile based on the user data
      const newProfile = await profileService.createProfile({
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        // Add more fields as necessary
      });
      logger.info(`Created new profile for user: ${newProfile.id}`);
    } catch (error) {
      logger.error('Error handling user.created event:', error);
      throw error;
    }
  }

  private async handleUserUpdated(userData: any) {
    try {
      // Update the existing profile based on the user data
      const updatedProfile = await profileService.updateProfile(userData.id, {
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        // Add more fields as necessary
      });
      logger.info(`Updated profile for user: ${updatedProfile.id}`);
    } catch (error) {
      logger.error('Error handling user.updated event:', error);
      throw error;
    }
  }
}

