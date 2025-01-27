import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('errorHandler');

export const errorHandler = (_req: Request, res: Response, _next: NextFunction) => {
  try {
    if (res.locals.error) {
      const error = res.locals.error;
      logger.error('Error:', error);
      
      if (error.status) {
        return res.status(error.status).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    
    return res.status(500).json({ error: 'Unknown Error' });
  } catch (err) {
    logger.error('Error in error handler:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

