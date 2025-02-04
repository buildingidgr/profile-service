import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      source?: string;
    }
  }
}

const logger = createLogger('validateCreateProfileKey');

// This key should be stored in environment variables
const PROFILE_CREATE_API_KEY = process.env.PROFILE_CREATE_API_KEY || 'mh_profile_create_key_123456';

export const validateCreateProfileKey = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      logger.warn('No API key provided for profile creation');
      return res.status(401).json({ error: 'API key is required' });
    }

    if (apiKey !== PROFILE_CREATE_API_KEY) {
      logger.warn('Invalid API key provided for profile creation');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Add source identifier to the request
    req.source = 'external_service';
    next();
  } catch (error) {
    logger.error('Error validating create profile API key:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 