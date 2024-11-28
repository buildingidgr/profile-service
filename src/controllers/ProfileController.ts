import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/ProfileService';
import authService from '../services/authService';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestedProfileId = req.params.id;
      const requestingUserId = req.userId;

      if (!requestingUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const clerkId = requestingUserId.startsWith('user_') 
        ? requestingUserId 
        : `user_${requestingUserId}`;

      if (requestedProfileId !== clerkId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only access your own profile' 
        });
      }

      const profile = await this.profileService.getProfile(requestedProfileId);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.params.id;
      const requestingUserId = req.userId;

      if (!requestingUserId || profileId !== requestingUserId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only update your own profile' 
        });
      }

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

      const profile = await this.profileService.updateProfile(profileId, updateData);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  getProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.params.id;
      const requestingUserId = req.userId;

      if (!requestingUserId || profileId !== requestingUserId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only access your own preferences' 
        });
      }

      const preferences = await this.profileService.getProfilePreferences(profileId);
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.params.id;
      const requestingUserId = req.userId;

      if (!requestingUserId || profileId !== requestingUserId) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You can only update your own preferences' 
        });
      }

      const preferences = await this.profileService.updateProfilePreferences(profileId, req.body);
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
}