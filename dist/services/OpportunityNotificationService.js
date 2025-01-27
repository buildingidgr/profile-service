"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpportunityNotificationService = void 0;
const database_1 = require("../utils/database");
const logger_1 = require("../utils/logger");
const nodemailer_1 = require("nodemailer");
const logger = (0, logger_1.createLogger)('OpportunityNotificationService');
class OpportunityNotificationService {
    constructor() {
        this.emailTransporter = (0, nodemailer_1.createTransport)({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASSWORD || '',
            },
        });
    }
    async shouldSendEmail(clerkId) {
        try {
            const preferences = await database_1.prisma.userPreferences.findUnique({
                where: { clerkId },
                select: {
                    preferences: true,
                },
            });
            if (!preferences)
                return false;
            const { notifications } = preferences.preferences;
            return notifications?.email?.updates || false;
        }
        catch (error) {
            logger.error('Error checking email preferences:', error);
            return false;
        }
    }
    async sendOpportunityEmail(email, opportunity) {
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
        }
        catch (error) {
            logger.error('Error sending opportunity email:', error);
            throw error;
        }
    }
    async handleOpportunity(opportunity) {
        try {
            // Get all profiles with professional info
            const profiles = await database_1.prisma.profile.findMany({
                where: {
                    emailVerified: true,
                },
                select: {
                    clerkId: true,
                    email: true,
                },
            });
            for (const profile of profiles) {
                if (!profile.email)
                    continue;
                // Check email preferences
                const shouldSend = await this.shouldSendEmail(profile.clerkId);
                if (!shouldSend)
                    continue;
                // Get professional info with location
                const professionalInfo = await database_1.prisma.professionalInfo.findUnique({
                    where: { clerkId: profile.clerkId },
                    select: {
                        professionalInfo: true,
                    },
                });
                if (!professionalInfo?.professionalInfo)
                    continue;
                // Parse the professional info JSON and ensure it has the right shape
                const profInfo = professionalInfo.professionalInfo;
                if (!profInfo.operationArea)
                    continue;
                // Send email notification
                await this.sendOpportunityEmail(profile.email, opportunity);
            }
        }
        catch (error) {
            logger.error('Error processing opportunity:', error);
            throw error;
        }
    }
}
exports.OpportunityNotificationService = OpportunityNotificationService;
