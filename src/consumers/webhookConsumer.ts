import { RabbitMQConnection } from '../utils/rabbitmq';
import { createLogger } from '../utils/logger';
import { WebhookService } from '../services/WebhookService';

const logger = createLogger('webhookConsumer');

export class WebhookConsumer {
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
          console.log('DEBUG - Raw webhook content:', rawContent); // Direct console log for debugging

          logger.info('Received raw message from queue:', {
            content: rawContent,
            messageId: msg.properties.messageId,
            properties: msg.properties,
            fields: msg.fields
          });

          const content = JSON.parse(rawContent);
          console.log('DEBUG - Parsed content:', JSON.stringify(content, null, 2)); // Direct console log for debugging

          logger.info('Parsed webhook event:', {
            eventType: content.eventType,
            userId: content.data?.data?.id,
            email: content.data?.data?.email_addresses?.[0]?.email_address,
            fullContent: content // Log the full content for debugging
          });

          // Log the structure of the message
          logger.info('Message structure:', {
            hasEventType: !!content.eventType,
            hasData: !!content.data,
            hasNestedData: !!content.data?.data,
            dataKeys: content.data ? Object.keys(content.data) : [],
            nestedDataKeys: content.data?.data ? Object.keys(content.data.data) : [],
            fullStructure: {
              eventType: content.eventType,
              dataType: typeof content.data,
              nestedDataType: typeof content.data?.data
            }
          });

          // Transform the event to match WebhookService expectations
          const transformedEvent = {
            type: content.eventType,
            data: content.data,
            eventType: content.eventType
          };

          console.log('DEBUG - Transformed event:', JSON.stringify(transformedEvent, null, 2)); // Direct console log for debugging

          await this.webhookService.processWebhookEvent(transformedEvent);
          
          channel.ack(msg);
          logger.info('Successfully processed and acknowledged webhook event', {
            eventType: content.eventType,
            userId: content.data?.data?.id,
            transformedEvent
          });
        } catch (error) {
          console.error('DEBUG - Error processing webhook:', error); // Direct console log for debugging
          
          logger.error('Error processing webhook event:', {
            error,
            content: msg.content.toString(),
            stack: error instanceof Error ? error.stack : undefined,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error
          });
          
          // Nack the message and don't requeue it if we can't process it
          channel.nack(msg, false, false);
          logger.info('Nacked webhook event due to processing error');
        }
      });
    } catch (error) {
      console.error('DEBUG - Error starting consumer:', error); // Direct console log for debugging
      
      logger.error('Error starting webhook consumer:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }
}

// Only create and start the consumer if this file is being run directly
if (require.main === module) {
  const consumer = new WebhookConsumer();
  consumer.start().catch((error) => {
    console.error('DEBUG - Failed to start consumer:', error); // Direct console log for debugging
    
    logger.error('Failed to start webhook consumer:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    process.exit(1);
  });
} 