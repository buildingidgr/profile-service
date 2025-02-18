import { Router } from 'express';
import { ProfessionalService } from '../../services/ProfessionalService';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';

const router = Router();
const logger = createLogger('professionalRoutes');
const professionalService = new ProfessionalService();

router.get('/', async (req, res, next) => {
  try {
    const clerkId = req.user?.sub;
    if (!clerkId) {
      throw new BadRequestError('User ID is required');
    }

    const info = await professionalService.getProfessionalInfo(clerkId);
    res.json(info);
  } catch (error) {
    logger.error('Error getting professional info:', error);
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const clerkId = req.user?.sub;
    if (!clerkId) {
      throw new BadRequestError('User ID is required');
    }

    const info = await professionalService.updateProfessionalInfo(clerkId, req.body);
    res.json(info);
  } catch (error) {
    logger.error('Error updating professional info:', error);
    next(error);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const clerkId = req.user?.sub;
    if (!clerkId) {
      throw new BadRequestError('User ID is required');
    }

    if (Object.keys(req.body).length === 0) {
      throw new BadRequestError('Request body cannot be empty for PATCH operation');
    }

    const info = await professionalService.updateProfessionalInfo(clerkId, req.body);
    res.json(info);
  } catch (error) {
    logger.error('Error patching professional info:', error);
    next(error);
  }
});

export const professionalRoutes = router; 