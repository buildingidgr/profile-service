import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../../services/ProfileService';
import { PreferencesService } from '../../services/PreferencesService';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError, UnauthorizedError } from '../../shared/utils/errors';

const logger = createLogger('ProfileController');
const profileService = new ProfileService();
const preferencesService = new PreferencesService();

export class ProfileController {
  async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { clerkId, apiKey, ...profileData } = req.body;
      
      // Validate clerkId presence
      if (!clerkId) {
        throw new BadRequestError('clerkId is required in request body');
      }

      // Validate API key format and presence
      if (!apiKey) {
        throw new BadRequestError('API key is required');
      }

      if (!apiKey.startsWith('mk_') || apiKey.length !== 67) {
        throw new BadRequestError('Invalid API key format');
      }

      const data = {
        clerkId,
        apiKey,
        ...profileData,
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

  async getProfileById(req: Request, res: Response, next: NextFunction) {
    try {
      const requestedClerkId = req.params.clerkId;
      const authenticatedUserId = req.user?.sub;

      if (!authenticatedUserId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // Only allow users to access their own profile
      if (authenticatedUserId !== requestedClerkId) {
        throw new UnauthorizedError('You can only access your own profile');
      }

      const profile = await profileService.getProfile(requestedClerkId);
      res.json(profile);
    } catch (error) {
      logger.error('Error getting profile by ID:', error);
      next(error);
    }
  }
}