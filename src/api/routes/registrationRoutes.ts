import { Router } from 'express';
import { RegistrationService } from '../../services/RegistrationService';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';

const router = Router();
const logger = createLogger('registrationRoutes');
const registrationService = new RegistrationService();

router.get('/attempts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const phoneNumber = req.query.phoneNumber as string | undefined;

    if (isNaN(page) || page < 1) {
      throw new BadRequestError('Invalid page number');
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestError('Invalid limit value');
    }

    const attempts = await registrationService.getRegistrationAttempts(page, limit, phoneNumber);
    res.json(attempts);
  } catch (error) {
    logger.error('Error getting registration attempts:', error);
    next(error);
  }
});

export const registrationRoutes = router; 