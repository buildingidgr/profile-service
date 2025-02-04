"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesService = void 0;
const logger_1 = require("../shared/utils/logger");
const errors_1 = require("../shared/utils/errors");
const database_1 = require("../shared/utils/database");
const logger = (0, logger_1.createLogger)('PreferencesService');
const DEFAULT_PREFERENCES = {
    dashboard: {
        timezone: 'UTC',
        language: 'en'
    },
    notifications: {
        email: {
            marketing: true,
            updates: true,
            security: true,
            newsletters: true,
            productAnnouncements: true
        }
    },
    display: {
        theme: 'system'
    }
};
class PreferencesService {
    async getPreferences(clerkId) {
        try {
            const preferences = await database_1.prisma.userPreferences.findUnique({
                where: { clerkId }
            });
            if (!preferences) {
                await this.createDefaultPreferences(clerkId);
                return DEFAULT_PREFERENCES;
            }
            return preferences.preferences;
        }
        catch (error) {
            logger.error('Error getting preferences', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to get preferences');
        }
    }
    async updatePreferences(clerkId, data) {
        try {
            const currentPreferences = await database_1.prisma.userPreferences.findUnique({
                where: { clerkId }
            });
            const updatedPreferences = {
                ...DEFAULT_PREFERENCES,
                ...((currentPreferences === null || currentPreferences === void 0 ? void 0 : currentPreferences.preferences) || {}),
                ...data
            };
            const result = await database_1.prisma.userPreferences.upsert({
                where: { clerkId },
                create: {
                    clerkId,
                    preferences: updatedPreferences
                },
                update: {
                    preferences: updatedPreferences
                }
            });
            return result.preferences;
        }
        catch (error) {
            logger.error('Error updating preferences', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to update preferences');
        }
    }
    async createDefaultPreferences(clerkId) {
        try {
            await database_1.prisma.userPreferences.create({
                data: {
                    clerkId,
                    preferences: DEFAULT_PREFERENCES
                }
            });
        }
        catch (error) {
            logger.error('Error creating default preferences', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to create default preferences');
        }
    }
}
exports.PreferencesService = PreferencesService;
//# sourceMappingURL=PreferencesService.js.map