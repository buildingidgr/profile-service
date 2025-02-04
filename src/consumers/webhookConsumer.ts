import { RabbitMQConnection } from '../utils/rabbitmq';
import { createLogger } from '../utils/logger';
import { WebhookService } from '../services/WebhookService';

const logger = createLogger('webhookConsumer');

class WebhookConsumer {
  private connection: RabbitMQConnection;
  private webhookService: WebhookService;

  constructor() {
    this.connection = new RabbitMQConnection();
    this.webhookService = new WebhookService();
  }

  async start() {
    try {
      await this.connection.connect();
      const channel = await this.connection.getChannel();
      
      const queueName = 'webhook-events';
      await channel.assertQueue(queueName, { durable: true });
      
      logger.info('Started consuming from webhook-events queue');
      
      channel.consume(queueName, async (msg) => {
        if (!msg) {
          logger.warn('Received null message from queue');
          return;
        }
        
        try {
          const content = JSON.parse(msg.content.toString());
          logger.info('Processing webhook event:', content);

          await this.webhookService.processWebhookEvent(content);
          
          channel.ack(msg);
          logger.info('Successfully processed webhook event');
        } catch (error) {
          logger.error('Error processing webhook event:', {
            error,
            content: msg.content.toString(),
            stack: error instanceof Error ? error.stack : undefined
          });
          
          // Nack the message and don't requeue it if we can't process it
          channel.nack(msg, false, false);
        }
      });
    } catch (error) {
      logger.error('Error starting webhook consumer:', error);
      throw error;
    }
  }
}

// Create and start the consumer
const consumer = new WebhookConsumer();
consumer.start().catch((error) => {
  logger.error('Failed to start webhook consumer:', error);
  process.exit(1);
}); 