"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="node" />
const rabbitmq_1 = require("../utils/rabbitmq");
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const nodemailer_1 = require("nodemailer");
const logger = (0, logger_1.createLogger)('opportunityConsumer');
class OpportunityConsumer {
    constructor() {
        this.connection = new rabbitmq_1.RabbitMQConnection();
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
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    isWithinRadius(userLocation, opportunityLocation) {
        const distance = this.calculateDistance(userLocation.latitude, userLocation.longitude, opportunityLocation.latitude, opportunityLocation.longitude);
        return distance <= userLocation.radius;
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
                // Check if opportunity is within operation area
                if (!this.isWithinRadius(profInfo.operationArea, opportunity.location))
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
    async start() {
        try {
            await this.connection.connect();
            const channel = await this.connection.getChannel();
            const queueName = 'public-opportunities';
            await channel.assertQueue(queueName, { durable: true });
            logger.info('Started consuming from public-opportunities queue');
            channel.consume(queueName, async (msg) => {
                if (!msg)
                    return;
                try {
                    const opportunity = JSON.parse(msg.content.toString());
                    await this.handleOpportunity(opportunity);
                    channel.ack(msg);
                }
                catch (error) {
                    logger.error('Error processing message:', error);
                    // Nack the message and don't requeue it if it's malformed
                    channel.nack(msg, false, false);
                }
            });
        }
        catch (error) {
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
