import { Request, Response, NextFunction } from 'express';
import { ProfileService, ProfilePreference } from '../services/ProfileService';
import authService from '../services/authService';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.profileService.getProfile(req.params.id);
      res.json(profile);
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedProfile = await this.profileService.updateProfile(req.params.id, req.body);
      res.json(updatedProfile);
    } catch (error) {
      next(error);
    }
  };

  getProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const preferences = await this.profileService.getProfilePreferences(req.params.id);
      if (!preferences) {
        return res.status(404).json({ message: 'Profile preferences not found' });
      }
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  };

  updateProfilePreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updatedPreferences = await this.profileService.updateProfilePreferences(req.params.id, req.body as Partial<ProfilePreference>);
      res.json(updatedPreferences);
    } catch (error) {
      next(error);
    }
  };

  generateApiKey = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.params.id;
      
      // Generate API key using your existing logic
      const apiKey = await this.profileService.generateAndStoreApiKey(profileId);
      
      // Exchange it immediately for tokens
      const tokens = await authService.exchangeApiKey(apiKey);
      
      res.json({
        apiKey,
        tokens
      });
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  };
}

