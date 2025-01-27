import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import authService from '../services/authService';
import { createLogger } from '../utils/logger';
import { prisma, safeGetPreferences, safeUpdatePreferences } from '../utils/database';
import { BadRequestError } from '../utils/errors';
import { MongoClient, ObjectId } from 'mongodb';
import { config } from '../config';
import { safeProfileUpdate } from '../utils/database';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user: any;
    }
  }
}

const logger = createLogger('ProfileController');

export class ProfileController {
  private profileService: ProfileService;
  private static mongoClient: MongoClient | null = null;

  constructor() {
    this.profileService = new ProfileService();
  }

  private static async initMongoClient(): Promise<MongoClient> {
    if (!this.mongoClient) {
      this.mongoClient = new MongoClient(config.databaseUrl);
      await this.mongoClient.connect();
    }
    return this.mongoClient;
  }

  private static async closeMongoClient() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      this.mongoClient = null;
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;
      
      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profile = await prisma.profile.findUnique({
        where: { clerkId },
      });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.json(profile);
    } catch (error) {
      logger.error('Error getting profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;
      const updateData = req.body;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Use the new safeProfileUpdate method
      const profile = await safeProfileUpdate(clerkId, updateData);

      return res.json(profile);
    } catch (error) {
      logger.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProfile(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;
      const profileData = req.body;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Ensure the profile data uses the authenticated user's ID
      profileData.clerkId = clerkId;

      const existingProfile = await prisma.profile.findUnique({
        where: { clerkId },
      });

      if (existingProfile) {
        return res.status(409).json({ error: 'Profile already exists' });
      }

      const profile = await prisma.profile.create({
        data: profileData,
      });

      return res.status(201).json(profile);
    } catch (error) {
      logger.error('Error creating profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProfile(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await prisma.profile.delete({
        where: { clerkId },
      });

      return res.status(204).send();
    } catch (error) {
      logger.error('Error deleting profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPreferences(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Use the new safeGetPreferences method
      const preferences = await safeGetPreferences(clerkId);

      return res.json(preferences);
    } catch (error) {
      logger.error('Error getting preferences:', error);
      
      // Check if preferences not found
      if (error instanceof Error && error.message === 'Preferences not found') {
        return res.status(404).json({ error: 'Preferences not found' });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;
      const preferencesData = req.body;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await prisma.userPreferences.upsert({
        where: { clerkId },
        update: { preferences: preferencesData },
        create: {
          clerkId,
          preferences: preferencesData,
        },
      });

      return res.json(preferences);
    } catch (error) {
      logger.error('Error updating preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfessionalInfo(req: Request, res: Response) {
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
    } catch (error) {
      logger.error('Error getting professional info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      await ProfileController.closeMongoClient();
    }
  }

  async updateProfessionalInfo(req: Request, res: Response) {
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
      
      // Find existing document first to perform partial update
      const existingDoc = await professionalInfoCollection.findOne({ clerkId });

      // Merge existing data with new data
      const updatedData = existingDoc 
        ? {
            ...existingDoc.professionalInfo,
            ...professionalData
          }
        : professionalData;

      // Perform update with merged data
      await professionalInfoCollection.updateOne(
        { clerkId },
        { 
          $set: { 
            professionalInfo: updatedData,
            updatedAt: new Date() 
          },
          $setOnInsert: { 
            clerkId,
            createdAt: new Date() 
          }
        },
        { upsert: true }
      );

      // Retrieve the updated document
      const updatedDoc = await professionalInfoCollection.findOne({ clerkId });

      if (!updatedDoc) {
        throw new Error('Failed to retrieve updated professional info');
      }

      // Transform the result to match previous structure
      const transformedResult = {
        id: updatedDoc._id.toString(),
        clerkId: updatedDoc.clerkId,
        professionalInfo: updatedDoc.professionalInfo,
        createdAt: updatedDoc.createdAt,
        updatedAt: updatedDoc.updatedAt
      };

      return res.json(transformedResult);
    } catch (error) {
      logger.error('Error updating professional info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    } finally {
      await ProfileController.closeMongoClient();
    }
  }

  async getProfilePreferences(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Directly use Prisma instead of preferencesService
      const preferences = await prisma.userPreferences.findUnique({
        where: { clerkId },
      });
      
      if (!preferences) {
        return res.status(404).json({ error: 'Preferences not found' });
      }

      return res.json(preferences);
    } catch (error) {
      logger.error('Error getting profile preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfilePreferences(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Use the new safeUpdatePreferences method
      const preferences = await safeUpdatePreferences(clerkId, req.body);

      return res.json(preferences);
    } catch (error) {
      logger.error('Error updating profile preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateApiKey(req: Request, res: Response) {
    try {
      // Use the authenticated user's ID from the token
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const apiKey = await this.profileService.generateAndStoreApiKey(clerkId);
      const tokens = await authService.exchangeApiKey(apiKey);
      
      return res.json({
        apiKey,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in
      });
    } catch (error) {
      logger.error('Error generating API key:', error);
      return res.status(500).json({ error: 'Failed to generate API key' });
    }
  }
}