import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';

export const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.get('/', profileController.getProfile);
profileRoutes.get('/me', profileController.getProfile);
profileRoutes.patch('/me', profileController.updateProfile);
profileRoutes.get('/me/preferences', profileController.getProfilePreferences);
profileRoutes.patch('/me/preferences', profileController.updateProfilePreferences);
profileRoutes.post('/me/api-key', profileController.generateApiKey);
profileRoutes.get('/me/professional', profileController.getProfessionalInfo);
profileRoutes.patch('/me/professional', profileController.updateProfessionalInfo);

