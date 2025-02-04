/// <reference types="node" />
import { RabbitMQConnection } from '../utils/rabbitmq';
import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';
import { createTransport, Transporter } from 'nodemailer';
import { Channel, ConsumeMessage } from 'amqplib';

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
    data: {
      project: {
        category: string;
        location: {
          address: string;
          coordinates: {
            lat: number;
            lng: number;
          };
          parsedAddress: {
            streetNumber: string;
            street: string;
            city: string;
            area: string;
            country: string;
            countryCode: string;
            postalCode: string;
          };
        };
        details: {
          title: string;
          description: string;
        };
      };
    };
    status: string;
    lastStatusChange: {
      from: string;
      to: string;
      changedBy: string;
      changedAt: string;
    };
    metadata: {
      publishedAt: string;
      previousStatus: string;
    };
  };
}

export class OpportunityConsumer {
  private static instance: OpportunityConsumer | null = null;
  private connection: RabbitMQConnection;
  private emailTransporter: Transporter;
  private channel: Channel | null = null;
  private isStarted: boolean = false;

  private constructor() {
    this.connection = new RabbitMQConnection();
    this.emailTransporter = createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  public static getInstance(): OpportunityConsumer {
    if (!OpportunityConsumer.instance) {
      OpportunityConsumer.instance = new OpportunityConsumer();
    }
    return OpportunityConsumer.instance;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * Math.PI / 180;
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
        where: { clerkId }
      });

      if (!preferences) {
        logger.warn(`No preferences found for user ${clerkId}`);
        return false;
      }

      return preferences.emailNotifications;
    } catch (error) {
      logger.error(`Error checking email preferences for user ${clerkId}:`, error);
      return false;
    }
  }

  private async sendOpportunityEmail(email: string, opportunity: Opportunity) {
    try {
      await this.emailTransporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `New Opportunity: ${opportunity.title}`,
        html: `
          <h1>New Opportunity Available</h1>
          <h2>${opportunity.title}</h2>
          <p>${opportunity.description}</p>
          <p>Location: ${opportunity.location.latitude}, ${opportunity.location.longitude}</p>
        `
      });
      logger.info(`Sent opportunity email to ${email}`);
    } catch (error) {
      logger.error(`Error sending email to ${email}:`, error);
      throw error;
    }
  }

  async handleOpportunity(opportunity: Opportunity) {
    try {
      // Find all professionals
      const professionals = await prisma.profile.findMany({
        where: {
          professionalInfo: {
            isNot: null
          }
        },
        include: {
          professionalInfo: true
        }
      });

      for (const professional of professionals) {
        if (!professional.professionalInfo) continue;

        const professionalInfo = professional.professionalInfo as unknown as ProfessionalInfoData;
        const isInRange = this.isWithinRadius(professionalInfo.operationArea, opportunity.location);

        if (isInRange) {
          logger.info(`Opportunity ${opportunity.id} is within range for professional ${professional.clerkId}`);

          // Check if we should send an email
          if (await this.shouldSendEmail(professional.clerkId)) {
            await this.sendOpportunityEmail(professional.email!, opportunity);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing opportunity:', error);
      throw error;
    }
  }

  async start() {
    if (this.isStarted) {
      logger.warn('Opportunity consumer already started');
      return;
    }

    try {
      await this.connection.connect();
      this.channel = await this.connection.getChannel();
      
      const queueName = 'public-opportunities';
      await this.channel.assertQueue(queueName, { durable: true });
      
      logger.info('Started consuming from public-opportunities queue');
      
      await this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) {
          logger.warn('Received null message from queue');
          return;
        }
        
        try {
          const content = JSON.parse(msg.content.toString()) as QueueMessage;
          
          if (content.eventType === 'opportunity.published') {
            const opportunityData = content.opportunity.data.project;
            const opportunity: Opportunity = {
              id: content.opportunity.id,
              title: opportunityData.details.title,
              description: opportunityData.details.description,
              location: {
                latitude: opportunityData.location.coordinates.lat,
                longitude: opportunityData.location.coordinates.lng,
                radius: 50 // Default radius in km
              }
            };
            
            await this.handleOpportunity(opportunity);
          }
          
          if (this.channel) {
            this.channel.ack(msg);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
          if (this.channel) {
            this.channel.nack(msg, false, false);
          }
        }
      });

      this.isStarted = true;
      logger.info('Opportunity consumer successfully started');
    } catch (error) {
      logger.error('Error starting opportunity consumer:', error);
      throw error;
    }
  }

  async stop() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isStarted = false;
      OpportunityConsumer.instance = null;
      logger.info('Opportunity consumer stopped');
    } catch (error) {
      logger.error('Error stopping opportunity consumer:', error);
      throw error;
    }
  }
}

// Only create and start the consumer if this file is being run directly
if (require.main === module) {
  const consumer = OpportunityConsumer.getInstance();
  consumer.start().catch((error) => {
    logger.error('Failed to start opportunity consumer:', error);
    process.exit(1);
  });
} 