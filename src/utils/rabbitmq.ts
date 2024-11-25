import amqp from 'amqplib';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('rabbitmq');

class RabbitMQConnection {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect() {
    try {
      this.connection = await amqp.connect(config.rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async publishMessage(queue: string, message: any) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      logger.info(`Message published to queue: ${queue}`);
    } catch (error) {
      logger.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeMessages(queue: string, callback: (message: any) => Promise<void>) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.assertQueue(queue, { durable: true });
      this.channel.consume(queue, async (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel?.ack(msg);
        }
      });
      logger.info(`Consuming messages from queue: ${queue}`);
    } catch (error) {
      logger.error(`Error consuming messages from queue ${queue}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      logger.info('Closed RabbitMQ connection');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
}

export const rabbitmq = new RabbitMQConnection();

