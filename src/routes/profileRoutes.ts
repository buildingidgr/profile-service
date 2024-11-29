import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';

export const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.get('/me', profileController.getProfile);
profileRoutes.patch('/me', profileController.updateProfile);
profileRoutes.get('/me/preferences', profileController.getProfilePreferences);
profileRoutes.patch('/me/preferences', profileController.updateProfilePreferences);
profileRoutes.post('/me/api-key', profileController.generateApiKey);

