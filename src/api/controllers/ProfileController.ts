import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../../services/ProfileService';
import { PreferencesService } from '../../services/PreferencesService';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';

const logger = createLogger('ProfileController');
const profileService = new ProfileService();
const preferencesService = new PreferencesService();

export class ProfileController {
  async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const { apiKey, ...profileData } = req.body;
      
      // Validate API key format and presence
      if (!apiKey) {
        throw new BadRequestError('API key is required');
      }

      if (!apiKey.startsWith('mk_') || apiKey.length !== 67) {
        throw new BadRequestError('Invalid API key format');
      }

      const data = {
        ...profileData,
        clerkId,
        apiKey,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const profile = await profileService.createProfile(data);
      res.status(201).json(profile);
    } catch (error) {
      logger.error('Error creating profile:', error);
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const profile = await profileService.getProfile(clerkId);
      res.json(profile);
    } catch (error) {
      logger.error('Error getting profile:', error);
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const profile = await profileService.updateProfile(clerkId, req.body);
      res.json(profile);
    } catch (error) {
      logger.error('Error updating profile:', error);
      next(error);
    }
  }

  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const preferences = await preferencesService.getPreferences(clerkId);
      res.json(preferences);
    } catch (error) {
      logger.error('Error getting preferences:', error);
      next(error);
    }
  }

  async updateProfilePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const preferences = await preferencesService.updatePreferences(clerkId, req.body);
      res.json(preferences);
    } catch (error) {
      logger.error('Error updating preferences:', error);
      next(error);
    }
  }

  async generateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const clerkId = req.user?.sub;
      if (!clerkId) {
        throw new BadRequestError('User ID is required');
      }

      const apiKey = await profileService.generateAndStoreApiKey(clerkId);
      res.json({ apiKey });
    } catch (error) {
      logger.error('Error generating API key:', error);
      next(error);
    }
  }
}