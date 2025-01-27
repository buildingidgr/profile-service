import { prisma } from '../utils/database';
import { createLogger } from '../utils/logger';
import { createTransport, Transporter } from 'nodemailer';

const logger = createLogger('OpportunityNotificationService');

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

export class OpportunityNotificationService {
  private emailTransporter: Transporter;

  constructor() {
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

      for (const profile of profiles) {
        if (!profile.email) continue;

        // Check email preferences
        const shouldSend = await this.shouldSendEmail(profile.clerkId);
        if (!shouldSend) continue;

        // Get professional info with location
        const professionalInfo = await prisma.professionalInfo.findUnique({
          where: { clerkId: profile.clerkId },
          select: {
            professionalInfo: true,
          },
        });

        if (!professionalInfo?.professionalInfo) continue;

        // Parse the professional info JSON and ensure it has the right shape
        const profInfo = professionalInfo.professionalInfo as unknown as ProfessionalInfoData;
        if (!profInfo.operationArea) continue;

        // Send email notification
        await this.sendOpportunityEmail(profile.email, opportunity);
      }
    } catch (error) {
      logger.error('Error processing opportunity:', error);
      throw error;
    }
  }
} 