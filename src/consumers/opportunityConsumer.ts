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

      // Get all profiles with professional info
      const profiles = await prisma.profile.findMany({
        where: {
          emailVerified: true,
        },
        select: {
          clerkId: true,
          email: true,
        },
      });

      logger.info(`Found ${profiles.length} verified profiles to process`);

      for (const profile of profiles) {
        if (!profile.email) {
          logger.debug(`Skipping profile ${profile.clerkId}: No email found`);
          continue;
        }

        // Check email preferences
        const shouldSend = await this.shouldSendEmail(profile.clerkId);
        if (!shouldSend) {
          logger.debug(`Skipping profile ${profile.clerkId}: Email notifications disabled`);
          continue;
        }

        // Get professional info with location
        const professionalInfo = await prisma.professionalInfo.findUnique({
          where: { clerkId: profile.clerkId },
          select: {
            professionalInfo: true,
          },
        });

        if (!professionalInfo?.professionalInfo) {
          logger.debug(`Skipping profile ${profile.clerkId}: No professional info found`);
          continue;
        }

        // Parse the professional info JSON and ensure it has the right shape
        const profInfo = professionalInfo.professionalInfo as unknown as ProfessionalInfoData;
        if (!profInfo.operationArea) {
          logger.debug(`Skipping profile ${profile.clerkId}: No operation area defined`);
          continue;
        }

        // Check if opportunity is within operation area
        const isWithin = this.isWithinRadius(profInfo.operationArea, opportunity.location);
        if (!isWithin) {
          logger.debug(`Skipping profile ${profile.clerkId}: Opportunity outside operation area`, {
            opportunityLocation: opportunity.location,
            operationArea: profInfo.operationArea
          });
          continue;
        }

        logger.info(`Sending opportunity notification to profile ${profile.clerkId}`, {
          email: profile.email,
          opportunityId: opportunity.id
        });

        // Send email notification
        await this.sendOpportunityEmail(profile.email, opportunity);
      }
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

          const opportunity = JSON.parse(rawContent) as Opportunity;
          logger.info('Parsed opportunity from message:', {
            opportunityId: opportunity.id,
            title: opportunity.title
          });

          await this.handleOpportunity(opportunity);
          
          logger.info('Successfully processed opportunity', {
            opportunityId: opportunity.id,
            messageId: msg.properties.messageId
          });
          
          channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message:', {
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