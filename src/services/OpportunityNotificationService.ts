import { prisma } from '../utils/database';
import { createLogger } from '../utils/logger';
import { PreferencesService } from './PreferencesService';
import nodemailer from 'nodemailer';
import { config } from '../config';

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
  // Add other relevant fields
}

export class OpportunityNotificationService {
  private preferencesService: PreferencesService;
  private emailTransporter: nodemailer.Transporter;

  constructor() {
    this.preferencesService = new PreferencesService();
    this.emailTransporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: true,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
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
      const preferences = await this.preferencesService.getPreferences(clerkId);
      return preferences.notifications.email.updates;
    } catch (error) {
      logger.error('Error checking email preferences:', error);
      return false;
    }
  }

  private async sendOpportunityEmail(email: string, opportunity: Opportunity) {
    try {
      await this.emailTransporter.sendMail({
        from: config.smtp.from,
        to: email,
        subject: `New Opportunity: ${opportunity.title}`,
        html: `
          <h2>New Opportunity Match!</h2>
          <h3>${opportunity.title}</h3>
          <p>${opportunity.description}</p>
          <p>Location: ${opportunity.location.latitude}, ${opportunity.location.longitude}</p>
          <!-- Add more opportunity details as needed -->
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
            operationArea: true,
          },
        });

        if (!professionalInfo?.operationArea) continue;

        // Check if opportunity is within operation area
        const operationArea = professionalInfo.operationArea as unknown as Location;
        if (!this.isWithinRadius(operationArea, opportunity.location)) continue;

        // Send email notification
        await this.sendOpportunityEmail(profile.email, opportunity);
      }
    } catch (error) {
      logger.error('Error processing opportunity:', error);
      throw error;
    }
  }
} 