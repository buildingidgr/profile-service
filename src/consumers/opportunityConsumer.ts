/// <reference types="node" />
import { RabbitMQConnection } from '../utils/rabbitmq';
import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';
import { createTransport, Transporter } from 'nodemailer';
import { ConsumeMessage } from 'amqplib';

const logger = createLogger('opportunityConsumer');

interface Location {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  location: Location;
}

interface ProfessionalInfoData {
  operationArea: Location;
  // Add other fields as needed
}

interface QueueMessage {
  eventType: string;
  opportunity: {
    id: string;
    data: any;
    status: string;
    lastStatusChange: {
      from: string;
      to: string;
      changedBy: string;
      changedAt: Date;
    };
    metadata: {
      publishedAt: string;
      previousStatus: string;
    };
  };
}

class OpportunityConsumer {
  private connection: RabbitMQConnection;
  private emailTransporter: Transporter;

  constructor() {
    this.connection = new RabbitMQConnection();
    this.emailTransporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isWithinRadius(userLocation: Location, opportunityLocation: Location): boolean {
    const distance = this.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      opportunityLocation.latitude,
      opportunityLocation.longitude
    );
    return distance <= userLocation.radius;
  }

  private async shouldSendEmail(clerkId: string): Promise<boolean> {
    try {
      const preferences = await prisma.userPreferences.findUnique({
        where: { clerkId },
        select: {
          preferences: true,
        },
      });

      if (!preferences) return false;

      const { notifications } = preferences.preferences as any;
      return notifications?.email?.updates || false;
    } catch (error) {
      logger.error('Error checking email preferences:', error);
      return false;
    }
  }

  private async sendOpportunityEmail(email: string, opportunity: Opportunity) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com',
        to: email,
        subject: `New Opportunity: ${opportunity.title}`,
        html: `
          <h2>New Opportunity Match!</h2>
          <h3>${opportunity.title}</h3>
          <p>${opportunity.description}</p>
          <p>Location: ${opportunity.location.latitude}, ${opportunity.location.longitude}</p>
        `,
      });
      logger.info(`Opportunity notification email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending opportunity email:', error);
      throw error;
    }
  }

  async handleOpportunity(opportunity: Opportunity) {
    try {
      logger.info('Processing opportunity:', {
        opportunityId: opportunity.id,
        title: opportunity.title,
        location: opportunity.location
      });

      // Get all professional info records and their corresponding profiles
      const profilesWithProfInfo = await prisma.professionalInfo.findMany({
        select: {
          clerkId: true,
          professionalInfo: true
        }
      });

      // Get the corresponding profiles
      const clerkIds = profilesWithProfInfo.map(p => p.clerkId);
      const profiles = await prisma.profile.findMany({
        where: {
          clerkId: {
            in: clerkIds
          }
        },
        select: {
          clerkId: true,
          email: true,
          emailVerified: true
        }
      });

      // Create a map for quick profile lookup
      const profileMap = new Map(profiles.map(p => [p.clerkId, p]));

      logger.info(`Found ${profilesWithProfInfo.length} profiles with professional info`);

      let matchedCount = 0;
      for (const record of profilesWithProfInfo) {
        const profile = profileMap.get(record.clerkId);
        
        // Skip if profile is not found or not verified or has no email
        if (!profile || !profile.emailVerified || !profile.email) {
          logger.debug(`Skipping profile ${record.clerkId}: Profile not found, email not verified, or missing`);
          continue;
        }

        // Parse the professional info and check operation area
        const profInfo = record.professionalInfo as unknown as ProfessionalInfoData;
        if (!profInfo.operationArea) {
          logger.debug(`Skipping profile ${record.clerkId}: No operation area defined in professional info`);
          continue;
        }

        // Check if opportunity is within operation area
        const isWithin = this.isWithinRadius(profInfo.operationArea, opportunity.location);
        if (!isWithin) {
          logger.debug(`Skipping profile ${record.clerkId}: Opportunity outside operation area`, {
            opportunityLocation: opportunity.location,
            operationArea: profInfo.operationArea
          });
          continue;
        }

        // Check email preferences
        const shouldSend = await this.shouldSendEmail(record.clerkId);
        if (!shouldSend) {
          logger.debug(`Skipping profile ${record.clerkId}: Email notifications disabled`);
          continue;
        }

        matchedCount++;
        logger.info(`Sending opportunity notification to profile ${record.clerkId}`, {
          email: profile.email,
          opportunityId: opportunity.id,
          matchNumber: matchedCount
        });

        // Send email notification
        await this.sendOpportunityEmail(profile.email, opportunity);
      }

      logger.info(`Completed processing opportunity. Matched ${matchedCount} profiles out of ${profilesWithProfInfo.length} total profiles with professional info`, {
        opportunityId: opportunity.id,
        title: opportunity.title
      });

    } catch (error) {
      logger.error('Error processing opportunity:', error);
      throw error;
    }
  }

  async start() {
    try {
      await this.connection.connect();
      const channel = await this.connection.getChannel();
      
      const queueName = 'public-opportunities';
      await channel.assertQueue(queueName, { durable: true });
      
      logger.info('Started consuming from public-opportunities queue');
      
      channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) {
          logger.warn('Received null message from queue');
          return;
        }
        
        try {
          logger.info('Received message from queue', {
            messageId: msg.properties.messageId,
            timestamp: msg.properties.timestamp,
            contentType: msg.properties.contentType
          });

          const rawContent = msg.content.toString();
          logger.debug('Raw message content:', rawContent);

          const queueMessage = JSON.parse(rawContent) as QueueMessage;
          logger.info('Parsed queue message:', {
            eventType: queueMessage.eventType,
            opportunityId: queueMessage.opportunity.id,
            status: queueMessage.opportunity.status,
            statusChange: {
              from: queueMessage.opportunity.lastStatusChange.from,
              to: queueMessage.opportunity.lastStatusChange.to,
              changedBy: queueMessage.opportunity.lastStatusChange.changedBy,
              changedAt: queueMessage.opportunity.lastStatusChange.changedAt
            },
            metadata: {
              publishedAt: queueMessage.opportunity.metadata.publishedAt,
              previousStatus: queueMessage.opportunity.metadata.previousStatus
            }
          });

          // Transform the queue message into the Opportunity format expected by handleOpportunity
          const opportunity: Opportunity = {
            id: queueMessage.opportunity.id,
            title: queueMessage.opportunity.data.title,
            description: queueMessage.opportunity.data.description,
            location: queueMessage.opportunity.data.location
          };

          logger.info('Processing opportunity from queue message:', {
            opportunityId: opportunity.id,
            title: opportunity.title,
            status: queueMessage.opportunity.status,
            changedBy: queueMessage.opportunity.lastStatusChange.changedBy
          });

          await this.handleOpportunity(opportunity);
          
          logger.info('Successfully processed opportunity from queue', {
            opportunityId: opportunity.id,
            messageId: msg.properties.messageId,
            eventType: queueMessage.eventType,
            publishedAt: queueMessage.opportunity.metadata.publishedAt
          });
          
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing queue message:', {
            error,
            messageId: msg.properties.messageId,
            content: msg.content.toString()
          });
          // Nack the message and don't requeue it if it's malformed
          channel.nack(msg, false, false);
        }
      });
    } catch (error) {
      logger.error('Error starting consumer:', error);
      throw error;
    }
  }
}

// Create and start the consumer
const consumer = new OpportunityConsumer();
consumer.start().catch((error) => {
  logger.error('Failed to start consumer:', error);
  process.exit(1);
}); 