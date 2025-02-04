import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';

export const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.post('/me', profileController.createProfile);
profileRoutes.get('/', profileController.getProfile);
profileRoutes.get('/me', profileController.getProfile);
profileRoutes.patch('/me', profileController.updateProfile);
profileRoutes.get('/me/preferences', profileController.getPreferences);
profileRoutes.patch('/me/preferences', profileController.updateProfilePreferences);
profileRoutes.post('/me/api-key', profileController.generateApiKey);

