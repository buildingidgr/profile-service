import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { validateToken } from './middleware/validateToken';
import { profileRoutes } from './routes/profileRoutes';
import { requestLogger } from './middleware/requestLogger';
import { rabbitmq } from './utils/rabbitmq';
import { createLogger } from './utils/logger';
import { WebhookService } from './services/WebhookService';
import { connectToDatabase } from './utils/database';
import { connectRedis, redis } from './utils/redis';

const logger = createLogger('api-service');
const webhookService = new WebhookService();

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Middleware
app.use(express.json());
app.use(requestLogger);

// JWT validation for protected routes
app.use('/api', validateToken);

// Routes
app.use('/api/profiles', profileRoutes);

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', async (req, res) => {
  const rabbitMQHealth = await rabbitmq.checkHealth();
  res.json({ 
    status: 'ok',
    rabbitMQ: rabbitMQHealth ? 'connected' : 'disconnected'
  });
});

async function startServer() {
  try {
    await connectToDatabase();
    await connectRedis();
    await rabbitmq.connect();
    
    app.listen(config.port, () => {
      logger.info(`API Service running on port ${config.port}`);
    });

    await setupMessageConsumption();

  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

async function setupMessageConsumption() {
  try {
    await rabbitmq.consumeMessages('webhook-events', async (message: any) => {
      logger.info('Received webhook event:', message);
      try {
        await webhookService.processWebhookEvent(message);
        logger.info(`Webhook event processed successfully`);
      } catch (error) {
        logger.error('Error processing webhook event:', error);
        // Here you might want to implement a retry mechanism or dead-letter queue
      }
    });
  } catch (error) {
    logger.error('Error setting up message consumption:', error);
    // Attempt to reconnect after a delay
    setTimeout(setupMessageConsumption, 5000);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Closing HTTP server and connections.');
  await rabbitmq.close();
  await redis.quit();
  process.exit(0);
});

