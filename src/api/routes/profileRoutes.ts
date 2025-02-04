import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';
import { validateToken } from '../middleware/validateToken';
import { validateCreateProfileKey } from '../middleware/validateCreateProfileKey';

export const profileRoutes = Router();
const profileController = new ProfileController();

// Create profile endpoint with special API key auth only
profileRoutes.post('/me', validateCreateProfileKey, profileController.createProfile);

// All other endpoints with JWT auth
profileRoutes.get('/', validateToken, profileController.getProfile);
profileRoutes.get('/me', validateToken, profileController.getProfile);
profileRoutes.patch('/me', validateToken, profileController.updateProfile);
profileRoutes.get('/me/preferences', validateToken, profileController.getPreferences);
profileRoutes.patch('/me/preferences', validateToken, profileController.updateProfilePreferences);
profileRoutes.post('/me/api-key', validateToken, profileController.generateApiKey);
profileRoutes.get('/me/professional', validateToken, profileController.getProfessionalInfo);
profileRoutes.patch('/me/professional', validateToken, profileController.updateProfessionalInfo);

