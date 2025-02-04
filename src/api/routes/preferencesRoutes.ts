import { Router } from 'express';
import { PreferencesService } from '../../services/PreferencesService';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';

const router = Router();
const logger = createLogger('preferencesRoutes');
const preferencesService = new PreferencesService();

router.get('/', async (req, res, next) => {
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
});

router.patch('/', async (req, res, next) => {
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
});

export const preferencesRoutes = router; 