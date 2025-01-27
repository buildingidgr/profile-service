"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesService = void 0;
const mongodb_1 = require("mongodb");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const logger = (0, logger_1.createLogger)('PreferencesService');
const mongoClient = new mongodb_1.MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();
const DEFAULT_PREFERENCES = {
    dashboard: {
        timezone: "Europe/Athens",
        language: "el-GR"
    },
    notifications: {
        email: {
            marketing: false,
            updates: false,
            security: true,
            newsletters: false,
            productAnnouncements: false
        }
    },
    display: {
        theme: "light"
    }
};
class PreferencesService {
    async getPreferences(clerkId) {
        try {
            const preferencesCollection = db.collection('UserPreferences');
            const preferences = await preferencesCollection.findOne({ clerkId });
            if (!preferences) {
                // If no preferences exist, create default ones
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
            const preferencesCollection = db.collection('UserPreferences');
            const currentPrefs = await preferencesCollection.findOne({ clerkId });
            const updatedPreferences = {
                ...DEFAULT_PREFERENCES,
                ...(currentPrefs?.preferences || {}),
                ...data
            };
            const result = await preferencesCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    preferences: updatedPreferences,
                    updatedAt: new Date()
                }
            }, {
                upsert: true,
                returnDocument: 'after'
            });
            if (!result.value) {
                throw new errors_1.BadRequestError('Failed to update preferences');
            }
            return result.value.preferences;
        }
        catch (error) {
            logger.error('Error updating preferences', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to update preferences');
        }
    }
    async createDefaultPreferences(clerkId) {
        const preferencesCollection = db.collection('UserPreferences');
        await preferencesCollection.insertOne({
            clerkId,
            preferences: DEFAULT_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}
exports.PreferencesService = PreferencesService;
