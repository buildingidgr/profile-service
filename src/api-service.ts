import 'dotenv/config';
import express, { Request } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createLogger } from './shared/utils/logger';
import { config } from './config';
import { profileRoutes } from './api/routes/profileRoutes';
import { validateToken } from './api/middleware/validateToken';
import { errorHandler } from './api/middleware/errorHandler';
import { connectToDatabase, disconnectFromDatabase } from './shared/utils/database';
import { connectRedis, disconnectRedis } from './shared/utils/redis';
import { requestLogger } from './api/middleware/requestLogger';
import { preferencesRoutes } from './api/routes/preferencesRoutes';
import { professionalRoutes } from './api/routes/professionalRoutes';
import { registrationRoutes } from './api/routes/registrationRoutes';

// Augment the Express Request interface
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user: any;
    }
  }
}

const logger = createLogger('api-service');
const app = express();

// Trust proxy configuration with additional security
app.set('trust proxy', 1); // Only trust first proxy

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Rate limiting with more secure configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipFailedRequests: true, // Don't count failed requests
  keyGenerator: (req: Request): string => {
    // Use a combination of IP and user ID if authenticated
    const baseIP = req.ip || 'unknown';
    const userId = req.user?.sub || req.userId || '';
    return userId ? `${baseIP}-${userId}` : baseIP;
  }
});

app.use(limiter);

// Health check
app.get('/health', (_req: Request, res: express.Response) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    logger.info('Connecting to database...');
    await connectToDatabase().catch(error => {
      logger.error('Database connection failed:', error);
      throw error;
    });

    // Try to connect to Redis but don't fail if it doesn't connect
    try {
      await connectRedis();
    } catch (error) {
      logger.warn('Redis connection failed, continuing without Redis:', error);
    }

    // API routes with JWT validation
    app.use('/api/profiles', validateToken, profileRoutes);
    app.use('/api/preferences', validateToken, preferencesRoutes);
    app.use('/api/professional', validateToken, professionalRoutes);
    app.use('/api/registration', validateToken, registrationRoutes);

    // Error handling
    app.use(errorHandler);

    // Start server
    const port = config.port || 3000;
    const server = app.listen(port, () => {
      logger.info(`API Server is running on port ${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received. Starting graceful shutdown...');
      await cleanup();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      await cleanup();
      process.exit(0);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    await cleanup();
    process.exit(1);
  }
}

async function cleanup() {
  logger.info('Cleaning up...');
  try {
    await Promise.allSettled([
      disconnectFromDatabase().catch(error => {
        logger.error('Error during database disconnect:', error);
      }),
      disconnectRedis().catch(error => {
        logger.error('Error during Redis disconnect:', error);
      })
    ]);
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}

// Only start the server if this file is being run directly
if (require.main === module) {
  startServer();
}

export { app, startServer };

