import amqp from 'amqplib';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('rabbitmq');

const RECONNECT_TIMEOUT = 5000;
const HEARTBEAT_INTERVAL = 30;
const CONNECTION_TIMEOUT = 10000;

export class RabbitMQConnection {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 10;

  async connect() {
    if (this.isConnecting) {
      logger.info('Connection attempt already in progress');
      return;
    }

    this.isConnecting = true;
    this.connectionAttempts++;

    try {
      logger.info('Attempting to connect to RabbitMQ', {
        attempt: this.connectionAttempts,
        maxAttempts: this.maxConnectionAttempts
      });

      // Socket options for better connection stability
      const socketOptions = {
        keepAlive: true,
        keepAliveDelay: 15000, // 15 seconds
        timeout: CONNECTION_TIMEOUT
      };

      this.connection = await amqp.connect(config.rabbitmqUrl || '', {
        heartbeat: HEARTBEAT_INTERVAL,
        timeout: CONNECTION_TIMEOUT,
        socket: socketOptions
      });

      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ successfully');

      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;

      const queueName = 'webhook-events';
      try {
        // Create the queue with basic configuration to match existing queue
        await this.channel.assertQueue(queueName, { 
          durable: true
        });
        
        logger.info(`Successfully asserted queue: ${queueName}`);
      } catch (queueError) {
        logger.error(`Failed to setup queue ${queueName}:`, queueError);
        throw queueError;
      }

      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', { error: err, stack: err.stack });
        this.handleConnectionFailure();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        this.handleConnectionFailure();
      });

      this.channel.on('error', (err) => {
        logger.error('RabbitMQ channel error:', { error: err, stack: err.stack });
        this.handleChannelFailure();
      });

      this.channel.on('close', () => {
        logger.warn('RabbitMQ channel closed');
        this.handleChannelFailure();
      });

      // Set channel prefetch for better load handling
      await this.channel.prefetch(1);

      this.isConnecting = false;
      logger.info('RabbitMQ connection established and ready to consume messages');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', { 
        error, 
        stack: error instanceof Error ? error.stack : undefined,
        attempt: this.connectionAttempts
      });
      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure() {
    this.isConnecting = false;
    this.channel = null;
    this.connection = null;

    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.scheduleReconnect();
    } else {
      logger.error('Max reconnection attempts reached. Manual intervention required.', {
        attempts: this.connectionAttempts
      });
      // Here you might want to notify your monitoring system
    }
  }

  private handleChannelFailure() {
    this.channel = null;
    try {
      if (this.connection) {
        this.recreateChannel().catch(err => {
          logger.error('Failed to recreate channel:', { error: err });
          this.handleConnectionFailure();
        });
      } else {
        this.handleConnectionFailure();
      }
    } catch (error) {
      this.handleConnectionFailure();
    }
  }

  private async recreateChannel() {
    try {
      if (this.connection) {
        this.channel = await this.connection.createChannel();
        await this.channel.prefetch(1);
        logger.info('Successfully recreated RabbitMQ channel');
      }
    } catch (error) {
      logger.error('Error recreating channel:', { error });
      throw error;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(RECONNECT_TIMEOUT * Math.pow(2, this.connectionAttempts - 1), 60000);
    logger.info('Scheduling reconnection attempt', { 
      attempt: this.connectionAttempts,
      delayMs: delay 
    });

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((err) => {
        logger.error('Failed to reconnect:', { error: err });
      });
    }, delay);
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

