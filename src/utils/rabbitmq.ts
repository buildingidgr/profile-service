import amqp from 'amqplib';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('rabbitmq');

export class RabbitMQConnection {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;

  async connect() {
    if (this.isConnecting) {
      logger.info('Connection attempt already in progress');
      return;
    }

    this.isConnecting = true;

    try {
      this.connection = await amqp.connect(config.rabbitmqUrl || '', {
        heartbeat: 30,
      });
      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ');

      const queueName = 'webhook-events';
      await this.channel.assertQueue(queueName, { durable: true });
      logger.info(`Successfully asserted queue: ${queueName}`);

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.scheduleReconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.scheduleReconnect();
      });

      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', err);
      });

      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
      });

      this.isConnecting = false;
      logger.info('RabbitMQ connection established and ready to consume messages');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      logger.info('Attempting to reconnect to RabbitMQ...');
      this.connect().catch((err) => {
        logger.error('Failed to reconnect:', err);
      });
    }, 5000);
  }

  async getChannel(): Promise<amqp.Channel> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }

  async consumeMessages(queue: string, callback: (message: any) => Promise<void>) {
    if (!this.channel) {
      logger.error('Failed to consume messages: RabbitMQ channel not initialized');
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      logger.info(`Started consuming messages from queue: ${queue}`);

      this.channel.consume(queue, async (msg) => {
        if (msg) {
          const messageId = msg.properties.messageId || 'unknown';
          logger.info(`[${messageId}] Processing message from queue ${queue}`, {
            queue,
            messageId,
            content: msg.content.toString(),
            properties: msg.properties
          });

          try {
            const content = JSON.parse(msg.content.toString());
            logger.info(`[${messageId}] Parsed message content`, { 
              messageId,
              eventType: content.type,
              userId: content.data?.id,
              data: content 
            });

            await callback(content);
            this.channel?.ack(msg);
            logger.info(`[${messageId}] Successfully processed and acknowledged message`, {
              messageId,
              eventType: content.type,
              userId: content.data?.id
            });
          } catch (error) {
            logger.error(`[${messageId}] Error processing message from queue ${queue}:`, {
              error,
              messageId,
              content: msg.content.toString(),
              stack: error instanceof Error ? error.stack : undefined
            });
            
            // Add delay before requeuing to prevent immediate reprocessing
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            this.channel?.nack(msg, false, true);
            logger.info(`[${messageId}] Message nacked and requeued after error`, {
              messageId,
              queue
            });
          }
        }
      });
    } catch (error) {
      logger.error(`Error setting up message consumption for queue ${queue}:`, {
        error,
        queue,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  async close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.channel) {
      await this.channel.close();
    }

    if (this.connection) {
      await this.connection.close();
    }

    this.channel = null;
    this.connection = null;
  }

  async checkHealth(): Promise<boolean> {
    if (!this.connection || !this.channel) {
      return false;
    }

    try {
      await this.channel.checkQueue('webhook-events');
      return true;
    } catch (error) {
      logger.error('RabbitMQ health check failed:', error);
      return false;
    }
  }
}

export const rabbitmq = new RabbitMQConnection();

