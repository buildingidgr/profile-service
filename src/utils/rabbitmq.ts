import amqp from 'amqplib';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('rabbitmq');

const RECONNECT_TIMEOUT = 5000;
const HEARTBEAT_INTERVAL = 60;
const CONNECTION_TIMEOUT = 30000;
const SOCKET_TIMEOUT = 45000;
const DEFAULT_RABBITMQ_URL = 'amqp://localhost:5672';

export class RabbitMQConnection {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private connectionAttempts: number = 0;
  private readonly maxConnectionAttempts: number = 10;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private activeQueues: Set<string> = new Set();
  private queueCallbacks: Map<string, (message: any) => Promise<void>> = new Map();

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

      const rabbitmqUrl = config.rabbitmqUrl || DEFAULT_RABBITMQ_URL;
      
      // Enhanced socket options for better connection stability
      const socketOptions = {
        keepAlive: true,
        keepAliveDelay: 15000, // 15 seconds
        timeout: SOCKET_TIMEOUT,
        noDelay: true
      };

      this.connection = await amqp.connect(config.rabbitmqUrl, {
        heartbeat: HEARTBEAT_INTERVAL,
        timeout: CONNECTION_TIMEOUT,
        socket: socketOptions
      });

      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ successfully');

      // Reset connection attempts on successful connection
      this.connectionAttempts = 0;

      // Setup connection monitoring
      this.setupConnectionMonitoring();

      // Set channel prefetch for better load handling
      await this.channel.prefetch(1);

      // Reassert all active queues and their consumers
      await this.reestablishQueues();

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

  private async reestablishQueues() {
    if (!this.channel) return;

    for (const queue of this.activeQueues) {
      try {
        await this.channel.assertQueue(queue, { durable: true });
        logger.info(`Reasserted queue: ${queue}`);

        const callback = this.queueCallbacks.get(queue);
        if (callback) {
          await this.setupQueueConsumer(queue, callback);
          logger.info(`Reestablished consumer for queue: ${queue}`);
        }
      } catch (error) {
        logger.error(`Failed to reestablish queue ${queue}:`, error);
      }
    }
  }

  private async setupQueueConsumer(queue: string, callback: (message: any) => Promise<void>) {
    if (!this.channel) return;

    try {
      await this.channel.consume(queue, async (msg) => {
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
            await callback(content);
            this.channel?.ack(msg);
            logger.info(`[${messageId}] Successfully processed message from ${queue}`);
          } catch (error) {
            logger.error(`[${messageId}] Error processing message from queue ${queue}:`, {
              error,
              messageId,
              content: msg.content.toString(),
              stack: error instanceof Error ? error.stack : undefined
            });
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.channel?.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      logger.error(`Error setting up consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeMessages(queue: string, callback: (message: any) => Promise<void>) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      // Add to active queues and store callback
      this.activeQueues.add(queue);
      this.queueCallbacks.set(queue, callback);

      await this.channel.assertQueue(queue, { durable: true });
      logger.info(`Started consuming messages from queue: ${queue}`);

      await this.setupQueueConsumer(queue, callback);
    } catch (error) {
      logger.error(`Error setting up message consumption for queue ${queue}:`, {
        error,
        queue,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  private setupConnectionMonitoring() {
    if (!this.connection || !this.channel) return;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
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

    // Setup heartbeat monitoring for all active queues
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (this.channel && this.activeQueues.size > 0) {
          // Check the first active queue as a heartbeat
          const queue = this.activeQueues.values().next().value;
          await this.channel.checkQueue(queue);
        }
      } catch (error) {
        logger.error('Heartbeat check failed:', error);
        this.handleConnectionFailure();
      }
    }, (HEARTBEAT_INTERVAL * 1000) / 2);
  }

  private handleConnectionFailure() {
    this.isConnecting = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.channel = null;
    this.connection = null;

    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.scheduleReconnect();
    } else {
      logger.error('Max reconnection attempts reached. Manual intervention required.', {
        attempts: this.connectionAttempts
      });
      // Reset connection attempts after a longer delay
      setTimeout(() => {
        this.connectionAttempts = 0;
        this.connect().catch(err => {
          logger.error('Failed to reconnect after reset:', err);
        });
      }, 60000); // Wait 1 minute before resetting
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

  async close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Clear queue tracking
    this.activeQueues.clear();
    this.queueCallbacks.clear();

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

