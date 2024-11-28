import { Request, Response, NextFunction } from 'express';
import authService from '../services/authService';
import jwt from 'jsonwebtoken';

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
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // First validate with auth service
    const { isValid } = await authService.validateToken(token);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Decode the JWT to get user ID
    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Attach user ID to request
    req.userId = decoded.sub;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ error: 'Token validation failed' });
  }
};

