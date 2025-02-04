import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import authService from '../services/authService';
import { createLogger } from '../utils/logger';
import { mongoClient } from '../utils/database';
import { BadRequestError } from '../utils/errors';
import { ObjectId } from 'mongodb';
import { config } from '../config';
import { PreferencesService } from '../services/PreferencesService';

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
  private db;

  constructor() {
    this.profileService = new ProfileService();
    this.db = mongoClient.db();
  }

  async getProfile(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;
      
      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profileCollection = this.db.collection('Profile');
      const profile = await profileCollection.findOne({ clerkId });

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.json({
        id: profile._id.toString(),
        clerkId: profile.clerkId,
        ...profile,
        _id: undefined
      });
    } catch (error) {
      logger.error('Error getting profile:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;
      const updateData = req.body;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profileCollection = this.db.collection('Profile');
      const result = await profileCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: { 
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        },
        { 
          returnDocument: 'after'
        }
      );

      if (!result.value) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      return res.json({
        id: result.value._id.toString(),
        clerkId: result.value.clerkId,
        ...result.value,
        _id: undefined
      });
    } catch (error) {
      logger.error('Error updating profile:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProfile(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;
      const profileData = req.body;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profileCollection = this.db.collection('Profile');
      const existingProfile = await profileCollection.findOne({ clerkId });

      if (existingProfile) {
        return res.status(409).json({ error: 'Profile already exists' });
      }

      const now = new Date().toISOString();
      const newProfile = {
        _id: new ObjectId(),
        clerkId,
        ...profileData,
        createdAt: now,
        updatedAt: now
      };

      await profileCollection.insertOne(newProfile);

      // Create default preferences when profile is created
      const preferencesService = new PreferencesService();
      await preferencesService.createDefaultPreferences(clerkId);

      return res.status(201).json({
        id: newProfile._id.toString(),
        clerkId: newProfile.clerkId,
        ...newProfile,
        _id: undefined
      });
    } catch (error) {
      logger.error('Error creating profile:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProfile(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const profileCollection = this.db.collection('Profile');
      const preferencesCollection = this.db.collection('UserPreferences');

      // Delete both profile and preferences
      await Promise.all([
        profileCollection.deleteOne({ clerkId }),
        preferencesCollection.deleteOne({ clerkId })
      ]);

      return res.status(204).send();
    } catch (error) {
      logger.error('Error deleting profile:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPreferences(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        logger.error('Unauthorized access attempt to preferences');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      logger.info('Getting preferences for user', { clerkId });
      const preferencesService = new PreferencesService();
      const preferences = await preferencesService.getPreferences(clerkId);

      return res.json(preferences);
    } catch (error) {
      logger.error('Error getting preferences:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfilePreferences(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        logger.error('Unauthorized access attempt to update preferences');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      if (!req.body || typeof req.body !== 'object') {
        logger.error('Invalid request body for preferences update', { body: req.body });
        return res.status(400).json({ 
          error: 'Invalid request body. Expected a JSON object with preferences.' 
        });
      }

      // Ensure the body is a valid JSON object
      try {
        const preferencesData = typeof req.body === 'string' 
          ? JSON.parse(req.body) 
          : req.body;

        logger.info('Updating preferences for user', { clerkId, preferencesData });
        const preferencesService = new PreferencesService();
        const preferences = await preferencesService.updatePreferences(clerkId, preferencesData);

        return res.json(preferences);
      } catch (parseError: any) {
        logger.error('Error parsing preferences data', { 
          error: parseError,
          stack: parseError.stack 
        });
        return res.status(400).json({ 
          error: 'Invalid JSON format in request body.',
          details: parseError.message 
        });
      }
    } catch (error) {
      logger.error('Error updating preferences:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      
      if (error instanceof BadRequestError) {
        return res.status(400).json({ error: error.message });
      }
      
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfessionalInfo(req: Request, res: Response) {
    try {
      const clerkId = req.user?.sub || req.userId;

      if (!clerkId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const professionalInfoCollection = this.db.collection('ProfessionalInfo');
      const professionalInfo = await professionalInfoCollection.findOne({ clerkId });

      if (!professionalInfo) {
        return res.status(404).json({ error: 'Professional info not found' });
      }

      return res.json(professionalInfo);
    } catch (error) {
      logger.error('Error getting professional info:', { 
        error, 
        clerkId: req.user?.sub || req.userId,
        stack: error instanceof Error ? error.stack : undefined 
      });
      return res.status(500).json({ error: 'Internal server error' });
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
      const professionalInfoCollection = this.db.collection('ProfessionalInfo');
      
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