"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const logger = (0, logger_1.createLogger)('WebhookService');
class WebhookService {
    async processWebhookEvent(event) {
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
        }
        catch (error) {
            logger.error('Error processing webhook event:', error);
            throw error;
        }
    }
    async handleUserCreated(data) {
        try {
            const { id, email_addresses, first_name, last_name } = data;
            const primaryEmail = email_addresses?.find((e) => e.id === data.primary_email_address_id);
            await database_1.prisma.profile.create({
                data: {
                    clerkId: id,
                    email: primaryEmail?.email_address,
                    firstName: first_name,
                    lastName: last_name,
                    emailVerified: primaryEmail?.verification?.status === 'verified',
                },
            });
            logger.info(`Created profile for user: ${id}`);
        }
        catch (error) {
            logger.error('Error handling user.created event:', error);
            throw error;
        }
    }
    async handleUserUpdated(data) {
        try {
            const { id, email_addresses, first_name, last_name } = data;
            const primaryEmail = email_addresses?.find((e) => e.id === data.primary_email_address_id);
            await database_1.prisma.profile.update({
                where: { clerkId: id },
                data: {
                    email: primaryEmail?.email_address,
                    firstName: first_name,
                    lastName: last_name,
                    emailVerified: primaryEmail?.verification?.status === 'verified',
                },
            });
            logger.info(`Updated profile for user: ${id}`);
        }
        catch (error) {
            logger.error('Error handling user.updated event:', error);
            throw error;
        }
    }
    async handleUserDeleted(data) {
        try {
            const { id } = data;
            await database_1.prisma.profile.delete({
                where: { clerkId: id },
            });
            logger.info(`Deleted profile for user: ${id}`);
        }
        catch (error) {
            logger.error('Error handling user.deleted event:', error);
            throw error;
        }
    }
}
exports.WebhookService = WebhookService;
