import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/ProfileService';
import { PreferencesService } from '../services/PreferencesService';
import authService from '../services/authService';
import { ProfessionalService } from '../services/ProfessionalService';

export class ProfileController {
  private profileService: ProfileService;
  private preferencesService: PreferencesService;
  private professionalService: ProfessionalService;

  constructor() {
    this.profileService = new ProfileService();
    this.preferencesService = new PreferencesService();
    this.professionalService = new ProfessionalService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const profile = await this.profileService.getProfile(clerkId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const { firstName, lastName, avatarUrl, ...otherFields } = req.body;

      if (Object.keys(otherFields).length > 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Only firstName, lastName, and avatarUrl can be updated'
        });
      }

      const updateData = {
        firstName,
        lastName,
        avatarUrl
      };

      const profile = await this.profileService.updateProfile(clerkId, updateData);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  getProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const preferences = await this.preferencesService.getPreferences(clerkId);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const preferences = await this.preferencesService.updatePreferences(clerkId, req.body);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  };

  generateApiKey = async (req: Request, res: Response, next: NextFunction) => {
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
      
      res.json({
        apiKey,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type,
        expires_in: tokens.expires_in
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  };

  getProfessionalInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const info = await this.professionalService.getProfessionalInfo(clerkId);
      res.json(info);
    } catch (error) {
      next(error);
    }
  };

  updateProfessionalInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      const info = await this.professionalService.updateProfessionalInfo(clerkId, req.body);
      res.json(info);
    } catch (error) {
      next(error);
    }
  };
}