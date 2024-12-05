import express from 'express';
import { rateLimit } from 'express-rate-limit';
import cors from 'cors';
import { corsOptions } from './config/cors';
import { errorHandler } from './middleware/errorHandler';
import { validateToken } from './middleware/validateToken';
import { profileRoutes } from './routes/profileRoutes';
import { requestLogger } from './middleware/requestLogger';
import { createLogger } from './utils/logger';
import { connectToDatabase } from './utils/database';
import { connectRedis } from './utils/redis';
import { rabbitmq } from './utils/rabbitmq';
import { WebhookService } from './services/WebhookService';

const logger = createLogger('api-service');
const webhookService = new WebhookService();

async function startServer() {
  try {
    // Initialize connections
    await connectToDatabase();
    await connectRedis();
    await rabbitmq.connect();

    // Set up webhook event consumer
    await rabbitmq.consumeMessages('webhook-events', async (message) => {
      await webhookService.processWebhookEvent(message);
    });

    const app = express();

    // CORS configuration - must be before other middleware
    app.use(cors(corsOptions));

    // Handle OPTIONS preflight requests
    app.options('*', cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    app.use(limiter);

    // Middleware
    app.use(express.json());
    app.use(requestLogger);

    // Health check endpoint (no auth required)
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    // API routes with JWT validation
    app.use('/api/profiles', validateToken, profileRoutes);

    // Error handling
    app.use(errorHandler);

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

