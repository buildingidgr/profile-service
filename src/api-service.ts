import 'dotenv/config';
import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import { createLogger } from './utils/logger';
import { rabbitmq } from './utils/rabbitmq';
import { config } from './config';
import { profileRoutes } from './routes/profileRoutes';
import { validateToken } from './middleware/validateToken';
import { errorHandler } from './middleware/errorHandler';
import './consumers/opportunityConsumer';

// Extend Request interface to include custom properties
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub?: string;
    };
    userId?: string;
  }
}

const logger = createLogger('api-service');
const app: Application = express();

// Trust proxy configuration with additional security
app.set('trust proxy', 1); // Only trust first proxy

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting with more secure configuration
const limiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipFailedRequests: true, // Don't count failed requests
  keyGenerator: (req): string => {
    // Use a combination of IP and user ID if authenticated
    const baseIP = req.ip;
    const userId = req.user?.sub || req.userId;
    return userId ? `${baseIP}-${userId}` : baseIP;
  },
  validate: {
    trustProxy: 1,
    xForwardedForHeader: true
  }
});

app.use(limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Connect to RabbitMQ
rabbitmq.connect().catch((error) => {
  logger.error('Failed to connect to RabbitMQ:', error);
});

try {
  // API routes with JWT validation
  app.use('/api/profiles', validateToken, profileRoutes);

  // Error handling
  app.use(errorHandler);

  // Start server
  const port = config.port || 3000;
  app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });
} catch (error) {
  logger.error('Failed to start server:', error);
  process.exit(1);
}

