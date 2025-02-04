"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const logger_1 = require("../shared/utils/logger");
const mongodb_1 = require("mongodb");
const crypto_1 = __importDefault(require("crypto"));
const RedisService_1 = require("./RedisService");
const errors_1 = require("../shared/utils/errors");
const PreferencesService_1 = require("./PreferencesService");
const database_1 = require("../shared/utils/database");
const logger = (0, logger_1.createLogger)('ProfileService');
const db = database_1.mongoClient.db();
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
class ProfileService {
    constructor() {
        this.redisService = new RedisService_1.RedisService();
    }
    async createProfile(data) {
        try {
            logger.info('Creating new profile', { data: JSON.stringify(data) });
            if (!data.clerkId) {
                throw new errors_1.BadRequestError('ClerkId is required');
            }
            const apiKey = this.generateApiKey();
            const profileCollection = db.collection('Profile');
            const result = await profileCollection.insertOne({
                _id: new mongodb_1.ObjectId(),
                clerkId: data.clerkId,
                email: data.email,
                emailVerified: data.emailVerified,
                phoneNumber: data.phoneNumber,
                phoneVerified: data.phoneVerified,
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName,
                avatarUrl: data.avatarUrl,
                apiKey: apiKey,
                createdAt: new Date(data.createdAt),
                updatedAt: new Date(data.updatedAt)
            });
            const newProfile = await profileCollection.findOne({ _id: result.insertedId });
            if (newProfile && data.externalAccounts && data.externalAccounts.length > 0) {
                await this.createExternalAccounts(newProfile._id.toString(), data.externalAccounts);
            }
            const preferencesService = new PreferencesService_1.PreferencesService();
            await preferencesService.createDefaultPreferences(data.clerkId);
            logger.info('Profile created successfully', { profileId: newProfile === null || newProfile === void 0 ? void 0 : newProfile._id });
            return newProfile;
        }
        catch (error) {
            logger.error('Error creating profile', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            });
            throw new errors_1.BadRequestError('Failed to create profile: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    }
    async getProfile(clerkId) {
        try {
            const profileCollection = db.collection('Profile');
            const profile = await profileCollection.findOne({ clerkId }, { projection: { preferences: 0 } });
            if (!profile) {
                throw new errors_1.BadRequestError('Profile not found');
            }
            return profile;
        }
        catch (error) {
            logger.error('Error getting profile', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to get profile');
        }
    }
    async updateProfile(clerkId, data) {
        try {
            const allowedUpdates = {
                firstName: data.firstName,
                lastName: data.lastName,
                avatarUrl: data.avatarUrl
            };
            Object.keys(allowedUpdates).forEach(key => {
                if (allowedUpdates[key] === undefined) {
                    delete allowedUpdates[key];
                }
            });
            logger.info(`Updating profile for user: ${clerkId}`, { data: allowedUpdates });
            const profileCollection = db.collection('Profile');
            const result = await profileCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    ...allowedUpdates,
                    updatedAt: new Date()
                }
            }, {
                returnDocument: 'after',
                projection: { preferences: 0 }
            });
            if (!result.value) {
                throw new errors_1.BadRequestError('Profile not found');
            }
            logger.info(`Profile ${clerkId} updated successfully`);
            return result.value;
        }
        catch (error) {
            logger.error(`Error updating profile ${clerkId}:`, error);
            throw new errors_1.BadRequestError('Failed to update profile');
        }
    }
    async generateAndStoreApiKey(clerkId) {
        try {
            const apiKey = this.generateApiKey();
            const profileCollection = db.collection('Profile');
            const result = await profileCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    apiKey: apiKey,
                    updatedAt: new Date()
                }
            }, { returnDocument: 'after' });
            if (!result.value) {
                throw new errors_1.BadRequestError('Profile not found');
            }
            await this.redisService.storeApiKey(clerkId, apiKey);
            logger.info(`Generated and stored new API key for user: ${clerkId}`);
            return apiKey;
        }
        catch (error) {
            logger.error(`Error generating and storing API key for user ${clerkId}:`, error);
            throw new errors_1.BadRequestError('Failed to generate and store API Key');
        }
    }
    generateApiKey() {
        return 'mk_' + crypto_1.default.randomBytes(32).toString('hex');
    }
    async createExternalAccounts(clerkId, externalAccounts) {
        try {
            const externalAccountCollection = db.collection('ProfileExternalAccount');
            const accounts = externalAccounts.map(account => ({
                clerkId,
                provider: account.provider,
                providerId: account.providerId,
                email: account.email
            }));
            await externalAccountCollection.insertMany(accounts);
            logger.info('External accounts created successfully', { clerkId, count: accounts.length });
        }
        catch (error) {
            logger.error('Error creating external accounts', {
                error: error instanceof Error ? error.message : 'Unknown error',
                clerkId
            });
        }
    }
    async deleteProfile(clerkId) {
        try {
            logger.info(`Deleting profile for user: ${clerkId}`);
            const profileCollection = db.collection('Profile');
            const result = await profileCollection.findOneAndDelete({ clerkId });
            if (!result.value) {
                logger.warn(`Profile not found for deletion: ${clerkId}`);
                return null;
            }
            const externalAccountCollection = db.collection('ProfileExternalAccount');
            const deleteResult = await externalAccountCollection.deleteMany({ clerkId });
            logger.info(`Deleted ${deleteResult.deletedCount} associated external accounts for user: ${clerkId}`);
            if (result.value.apiKey) {
                await this.redisService.deleteApiKey(result.value.apiKey);
            }
            await this.redisService.deleteApiKey(`profile:${clerkId}`);
            logger.info(`Profile and related data deleted for user: ${clerkId}`);
            return result.value;
        }
        catch (error) {
            logger.error(`Error deleting profile ${clerkId}:`, error);
            throw new errors_1.BadRequestError('Failed to delete profile');
        }
    }
    async updatePhoneNumber(clerkId, phoneNumber, phoneNumberId) {
        try {
            logger.info(`Updating phone number for user: ${clerkId}`, { phoneNumber, phoneNumberId });
            const profileCollection = db.collection('Profile');
            const result = await profileCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    phoneNumber: phoneNumber,
                    phoneNumberId: phoneNumberId,
                    phoneVerified: false,
                    updatedAt: new Date()
                }
            }, { returnDocument: 'after' });
            if (!result.value) {
                throw new errors_1.BadRequestError('Profile not found');
            }
            logger.info(`Phone number updated for user: ${clerkId}`);
            return result.value;
        }
        catch (error) {
            logger.error(`Error updating phone number for user ${clerkId}:`, error);
            throw new errors_1.BadRequestError('Failed to update phone number');
        }
    }
    async updatePreferences(clerkId, data) {
        var _a, _b, _c, _d, _e;
        try {
            const profileCollection = db.collection('Profile');
            const profile = await profileCollection.findOne({ clerkId });
            if (!profile) {
                throw new errors_1.BadRequestError('Profile not found');
            }
            const updatedPreferences = {
                ...profile.preferences,
                ...data,
                dashboard: {
                    ...(_a = profile.preferences) === null || _a === void 0 ? void 0 : _a.dashboard,
                    ...data.dashboard
                },
                notifications: {
                    email: {
                        ...(_c = (_b = profile.preferences) === null || _b === void 0 ? void 0 : _b.notifications) === null || _c === void 0 ? void 0 : _c.email,
                        ...(_d = data.notifications) === null || _d === void 0 ? void 0 : _d.email
                    }
                },
                display: {
                    ...(_e = profile.preferences) === null || _e === void 0 ? void 0 : _e.display,
                    ...data.display
                }
            };
            const result = await profileCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    preferences: updatedPreferences,
                    updatedAt: new Date()
                }
            }, { returnDocument: 'after' });
            return result.value;
        }
        catch (error) {
            logger.error('Error updating preferences', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to update preferences');
        }
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=ProfileService.js.map