import { Router } from 'express';
import { ProfileController } from '../controllers/ProfileController';

export const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.get('/:id', profileController.getProfile);
profileRoutes.patch('/:id', profileController.updateProfile);
profileRoutes.get('/:id/preferences', profileController.getProfilePreferences);
profileRoutes.patch('/:id/preferences', profileController.updateProfilePreferences);

