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
          const rawContent = msg.content.toString();
          logger.info('Received raw message from queue:', {
            content: rawContent,
            messageId: msg.properties.messageId
          });

          const content = JSON.parse(rawContent);
          logger.info('Parsed webhook event:', {
            eventType: content.eventType,
            userId: content.data?.data?.id,
            email: content.data?.data?.email_addresses?.[0]?.email_address
          });

          // Log the structure of the message
          logger.info('Message structure:', {
            hasEventType: !!content.eventType,
            hasData: !!content.data,
            hasNestedData: !!content.data?.data,
            dataKeys: content.data ? Object.keys(content.data) : [],
            nestedDataKeys: content.data?.data ? Object.keys(content.data.data) : []
          });

          await this.webhookService.processWebhookEvent(content);
          
          channel.ack(msg);
          logger.info('Successfully processed and acknowledged webhook event', {
            eventType: content.eventType,
            userId: content.data?.data?.id
          });
        } catch (error) {
          logger.error('Error processing webhook event:', {
            error,
            content: msg.content.toString(),
            stack: error instanceof Error ? error.stack : undefined,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Nack the message and don't requeue it if we can't process it
          channel.nack(msg, false, false);
          logger.info('Nacked webhook event due to processing error');
        }
      });
    } catch (error) {
      logger.error('Error starting webhook consumer:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Create and start the consumer
const consumer = new WebhookConsumer();
consumer.start().catch((error) => {
  logger.error('Failed to start webhook consumer:', {
    error,
    stack: error instanceof Error ? error.stack : undefined,
    errorMessage: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
}); 