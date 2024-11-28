import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 401) {
      return res.status(401).json({ 
        error: err.response.data.error || 'Authentication failed'
      });
    }
    if (err.response?.status === 400) {
      return res.status(400).json({ 
        error: err.response.data.error || 'Bad request'
      });
    }
  }
  
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
};

