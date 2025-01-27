"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const ProfileService_1 = require("../services/ProfileService");
const authService_1 = __importDefault(require("../services/authService"));
const logger_1 = require("../utils/logger");
const database_1 = require("../utils/database");
const mongodb_1 = require("mongodb");
const config_1 = require("../config");
const logger = (0, logger_1.createLogger)('ProfileController');
class ProfileController {
    constructor() {
        this.profileService = new ProfileService_1.ProfileService();
    }
    static async initMongoClient() {
        if (!this.mongoClient) {
            this.mongoClient = new mongodb_1.MongoClient(config_1.config.databaseUrl);
            await this.mongoClient.connect();
        }
        return this.mongoClient;
    }
    static async closeMongoClient() {
        if (this.mongoClient) {
            await this.mongoClient.close();
            this.mongoClient = null;
        }
    }
    async getProfile(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const profile = await database_1.prisma.profile.findUnique({
                where: { clerkId },
            });
            if (!profile) {
                return res.status(404).json({ error: 'Profile not found' });
            }
            return res.json(profile);
        }
        catch (error) {
            logger.error('Error getting profile:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateProfile(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            const updateData = req.body;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const profile = await database_1.prisma.profile.update({
                where: { clerkId },
                data: updateData,
            });
            return res.json(profile);
        }
        catch (error) {
            logger.error('Error updating profile:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async createProfile(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            const profileData = req.body;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Ensure the profile data uses the authenticated user's ID
            profileData.clerkId = clerkId;
            const existingProfile = await database_1.prisma.profile.findUnique({
                where: { clerkId },
            });
            if (existingProfile) {
                return res.status(409).json({ error: 'Profile already exists' });
            }
            const profile = await database_1.prisma.profile.create({
                data: profileData,
            });
            return res.status(201).json(profile);
        }
        catch (error) {
            logger.error('Error creating profile:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async deleteProfile(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await database_1.prisma.profile.delete({
                where: { clerkId },
            });
            return res.status(204).send();
        }
        catch (error) {
            logger.error('Error deleting profile:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getPreferences(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const preferences = await database_1.prisma.userPreferences.findUnique({
                where: { clerkId },
            });
            if (!preferences) {
                return res.status(404).json({ error: 'Preferences not found' });
            }
            return res.json(preferences);
        }
        catch (error) {
            logger.error('Error getting preferences:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updatePreferences(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            const preferencesData = req.body;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const preferences = await database_1.prisma.userPreferences.upsert({
                where: { clerkId },
                update: { preferences: preferencesData },
                create: {
                    clerkId,
                    preferences: preferencesData,
                },
            });
            return res.json(preferences);
        }
        catch (error) {
            logger.error('Error updating preferences:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async getProfessionalInfo(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Connect to MongoDB directly
            const mongoClient = await ProfileController.initMongoClient();
            const database = mongoClient.db();
            const professionalInfoCollection = database.collection('ProfessionalInfo');
            const professionalInfo = await professionalInfoCollection.findOne({ clerkId });
            if (!professionalInfo) {
                return res.status(404).json({ error: 'Professional info not found' });
            }
            return res.json(professionalInfo);
        }
        catch (error) {
            logger.error('Error getting professional info:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        finally {
            await ProfileController.closeMongoClient();
        }
    }
    async updateProfessionalInfo(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            const professionalData = req.body;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Connect to MongoDB directly
            const mongoClient = await ProfileController.initMongoClient();
            const database = mongoClient.db();
            const professionalInfoCollection = database.collection('ProfessionalInfo');
            const result = await professionalInfoCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    professionalInfo: professionalData,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    clerkId,
                    createdAt: new Date()
                }
            }, {
                upsert: true,
                returnDocument: 'after'
            });
            return res.json(result);
        }
        catch (error) {
            logger.error('Error updating professional info:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
        finally {
            await ProfileController.closeMongoClient();
        }
    }
    async getProfilePreferences(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Directly use Prisma instead of preferencesService
            const preferences = await database_1.prisma.userPreferences.findUnique({
                where: { clerkId },
            });
            if (!preferences) {
                return res.status(404).json({ error: 'Preferences not found' });
            }
            return res.json(preferences);
        }
        catch (error) {
            logger.error('Error getting profile preferences:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async updateProfilePreferences(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Directly use Prisma instead of preferencesService
            const preferences = await database_1.prisma.userPreferences.upsert({
                where: { clerkId },
                update: { preferences: req.body },
                create: {
                    clerkId,
                    preferences: req.body,
                },
            });
            return res.json(preferences);
        }
        catch (error) {
            logger.error('Error updating profile preferences:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
    async generateApiKey(req, res) {
        try {
            // Use the authenticated user's ID from the token
            const clerkId = req.user?.sub || req.userId;
            if (!clerkId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const apiKey = await this.profileService.generateAndStoreApiKey(clerkId);
            const tokens = await authService_1.default.exchangeApiKey(apiKey);
            return res.json({
                apiKey,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type,
                expires_in: tokens.expires_in
            });
        }
        catch (error) {
            logger.error('Error generating API key:', error);
            return res.status(500).json({ error: 'Failed to generate API key' });
        }
    }
}
exports.ProfileController = ProfileController;
ProfileController.mongoClient = null;
