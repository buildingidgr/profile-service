import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('validateToken');

export const validateToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret || '');
      req.user = decoded;
      return next();
    } catch (error) {
      logger.error('Token validation error:', error);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Token validation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

