import 'dotenv/config';
import { createLogger } from '../shared/utils/logger';
import { connectToDatabase } from '../shared/utils/database';
import { WebhookConsumer } from './services/webhookConsumer';

const logger = createLogger('consumer-service');

async function startConsumerService() {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await connectToDatabase();
    logger.info('Database connection established');

    // Initialize webhook consumer
    logger.info('Initializing webhook consumer...');
    const webhookConsumer = WebhookConsumer.getInstance();
    await webhookConsumer.start();
    logger.info('Webhook consumer initialized');

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received. Starting graceful shutdown...');
      await webhookConsumer.stop();
      logger.info('Consumer service stopped');
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception:', {
        error,
        stack: error.stack,
        message: error.message
      });
      await webhookConsumer.stop();
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled rejection:', {
        reason,
        promise
      });
      await webhookConsumer.stop();
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start consumer service:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Only start if this file is being run directly
if (require.main === module) {
  startConsumerService();
}

export { startConsumerService }; 