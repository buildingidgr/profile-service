import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';

const logger = createLogger('WebhookService');

interface WebhookEvent {
  type: string;
  data: any;
}

export class WebhookService {
  async processWebhookEvent(event: WebhookEvent): Promise<void> {
    try {
      logger.info(`Processing webhook event: ${event.type}`);

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
          logger.warn(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error processing webhook event:', error);
      throw error;
    }
  }

  private async handleUserCreated(data: any): Promise<void> {
    try {
      const { id, email_addresses, first_name, last_name } = data;
      
      const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
      
      await prisma.profile.create({
        data: {
          clerkId: id,
          email: primaryEmail?.email_address,
          firstName: first_name,
          lastName: last_name,
          emailVerified: primaryEmail?.verification?.status === 'verified',
        },
      });

      logger.info(`Created profile for user: ${id}`);
    } catch (error) {
      logger.error('Error handling user.created event:', error);
      throw error;
    }
  }

  private async handleUserUpdated(data: any): Promise<void> {
    try {
      const { id, email_addresses, first_name, last_name } = data;
      
      const primaryEmail = email_addresses?.find((e: any) => e.id === data.primary_email_address_id);
      
      await prisma.profile.update({
        where: { clerkId: id },
        data: {
          email: primaryEmail?.email_address,
          firstName: first_name,
          lastName: last_name,
          emailVerified: primaryEmail?.verification?.status === 'verified',
        },
      });

      logger.info(`Updated profile for user: ${id}`);
    } catch (error) {
      logger.error('Error handling user.updated event:', error);
      throw error;
    }
  }

  private async handleUserDeleted(data: any): Promise<void> {
    try {
      const { id } = data;
      
      await prisma.profile.delete({
        where: { clerkId: id },
      });

      logger.info(`Deleted profile for user: ${id}`);
    } catch (error) {
      logger.error('Error handling user.deleted event:', error);
      throw error;
    }
  }
}

