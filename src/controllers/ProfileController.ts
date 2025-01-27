import { Request, Response } from 'express';
import { ProfileService } from '../services/ProfileService';
import { PreferencesService } from '../services/PreferencesService';
import authService from '../services/authService';
import { createLogger } from '../utils/logger';
import { prisma } from '../utils/database';
import { BadRequestError } from '../utils/errors';

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
  private preferencesService: PreferencesService;

  constructor() {
    this.profileService = new ProfileService();
    this.preferencesService = new PreferencesService();
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
      const { clerkId } = req.params;
      const updateData = req.body;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
      }

      const profile = await prisma.profile.update({
        where: { clerkId },
        data: updateData,
      });

      return res.json(profile);
    } catch (error) {
      logger.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createProfile(req: Request, res: Response) {
    try {
      const profileData = req.body;

      if (!profileData.clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
      }

      const existingProfile = await prisma.profile.findUnique({
        where: { clerkId: profileData.clerkId },
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
      const { clerkId } = req.params;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
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
      const { clerkId } = req.params;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
      }

      const preferences = await prisma.userPreferences.findUnique({
        where: { clerkId },
      });

      if (!preferences) {
        return res.status(404).json({ error: 'Preferences not found' });
      }

      return res.json(preferences);
    } catch (error) {
      logger.error('Error getting preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePreferences(req: Request, res: Response) {
    try {
      const { clerkId } = req.params;
      const preferencesData = req.body;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
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
      const { clerkId } = req.params;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
      }

      const professionalInfo = await prisma.professionalInfo.findUnique({
        where: { clerkId },
      });

      if (!professionalInfo) {
        return res.status(404).json({ error: 'Professional info not found' });
      }

      return res.json(professionalInfo);
    } catch (error) {
      logger.error('Error getting professional info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfessionalInfo(req: Request, res: Response) {
    try {
      const { clerkId } = req.params;
      const professionalData = req.body;

      if (!clerkId) {
        return res.status(400).json({ error: 'Clerk ID is required' });
      }

      const professionalInfo = await prisma.professionalInfo.upsert({
        where: { clerkId },
        update: { professionalInfo: professionalData },
        create: {
          clerkId,
          professionalInfo: professionalData,
        },
      });

      return res.json(professionalInfo);
    } catch (error) {
      logger.error('Error updating professional info:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfilePreferences(req: Request, res: Response) {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const preferences = await this.preferencesService.getPreferences(clerkId);
      return res.json(preferences);
    } catch (error) {
      logger.error('Error getting profile preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfilePreferences(req: Request, res: Response) {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const preferences = await this.preferencesService.updatePreferences(clerkId, req.body);
      return res.json(preferences);
    } catch (error) {
      logger.error('Error updating profile preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async generateApiKey(req: Request, res: Response) {
    try {
      const profileId = req.params.id;
      const requestingUserId = req.userId;

      if (!requestingUserId || profileId !== requestingUserId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only generate API keys for your own profile' 
        });
      }
      
      const apiKey = await this.profileService.generateAndStoreApiKey(profileId);
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