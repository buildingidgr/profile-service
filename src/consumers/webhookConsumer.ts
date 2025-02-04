import { RabbitMQConnection } from '../utils/rabbitmq';
import { createLogger } from '../utils/logger';
import { WebhookService } from '../services/WebhookService';
import { Channel, ConsumeMessage } from 'amqplib';

const logger = createLogger('webhookConsumer');

export class WebhookConsumer {
  private connection: RabbitMQConnection;
  private webhookService: WebhookService;
  private channel: Channel | null = null;
  private isStarted: boolean = false;

  constructor() {
    this.connection = new RabbitMQConnection();
    this.webhookService = new WebhookService();
  }

  async start() {
    if (this.isStarted) {
      logger.warn('Webhook consumer already started');
      return;
    }

    try {
      await this.connection.connect();
      this.channel = await this.connection.getChannel();
      
      const queueName = 'webhook-events';
      await this.channel.assertQueue(queueName, { durable: true });
      
      logger.info('Started consuming from webhook-events queue');
      
      await this.channel.consume(queueName, async (msg: ConsumeMessage | null) => {
        if (!msg) {
          logger.warn('Received null message from queue');
          return;
        }
        
        try {
          const rawContent = msg.content.toString();
          console.log('DEBUG - Raw webhook content:', rawContent);

          logger.info('Received raw message from queue:', {
            content: rawContent,
            messageId: msg.properties.messageId,
            properties: msg.properties,
            fields: msg.fields
          });

          const content = JSON.parse(rawContent);
          console.log('DEBUG - Parsed content:', JSON.stringify(content, null, 2));

          logger.info('Parsed webhook event:', {
            eventType: content.eventType,
            userId: content.data?.data?.id,
            email: content.data?.data?.email_addresses?.[0]?.email_address,
            fullContent: content
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

          console.log('DEBUG - Transformed event:', JSON.stringify(transformedEvent, null, 2));

          await this.webhookService.processWebhookEvent(transformedEvent);
          
          if (this.channel) {
            this.channel.ack(msg);
            logger.info('Successfully processed and acknowledged webhook event', {
              eventType: content.eventType,
              userId: content.data?.data?.id,
              transformedEvent
            });
          }
        } catch (error) {
          console.error('DEBUG - Error processing webhook:', error);
          
          logger.error('Error processing webhook event:', {
            error,
            content: msg.content.toString(),
            stack: error instanceof Error ? error.stack : undefined,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error
          });
          
          // Nack the message and don't requeue it if we can't process it
          if (this.channel) {
            this.channel.nack(msg, false, false);
            logger.info('Nacked webhook event due to processing error');
          }
        }
      });

      this.isStarted = true;
      logger.info('Webhook consumer successfully started');
    } catch (error) {
      console.error('DEBUG - Error starting consumer:', error);
      
      logger.error('Error starting webhook consumer:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw error;
    }
  }

  async stop() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isStarted = false;
      logger.info('Webhook consumer stopped');
    } catch (error) {
      logger.error('Error stopping webhook consumer:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Only create and start the consumer if this file is being run directly
if (require.main === module) {
  const consumer = new WebhookConsumer();
  consumer.start().catch((error) => {
    console.error('DEBUG - Failed to start consumer:', error);
    
    logger.error('Failed to start webhook consumer:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error
    });
    process.exit(1);
  });
} 