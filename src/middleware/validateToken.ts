import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import jwt from 'jsonwebtoken';
import axios from 'axios';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token is required' });
    }

    const token = authHeader.split(' ')[1];
    
    // Validate with auth service
    const { isValid } = await authService.validateToken(token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Decode the JWT to get user ID
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    req.userId = decoded.sub;
    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Token validation failed' });
  }
};

