"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rabbitmq = exports.RabbitMQConnection = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const config_1 = require("../config");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('rabbitmq');
class RabbitMQConnection {
    constructor() {
        this.connection = null;
        this.channel = null;
        this.reconnectTimeout = null;
        this.isConnecting = false;
    }
    async connect() {
        if (this.isConnecting) {
            logger.info('Connection attempt already in progress');
            return;
        }
        this.isConnecting = true;
        try {
            this.connection = await amqplib_1.default.connect(config_1.config.rabbitmqUrl || '', {
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
        }
        catch (error) {
            logger.error('Failed to connect to RabbitMQ:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
            throw error;
        }
    }
    scheduleReconnect() {
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
    async getChannel() {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not initialized');
        }
        return this.channel;
    }
    async consumeMessages(queue, callback) {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not initialized');
        }
        try {
            await this.channel.assertQueue(queue, { durable: true });
            logger.info(`Consuming messages from queue: ${queue}`);
            this.channel.consume(queue, async (msg) => {
                if (msg) {
                    logger.info(`Received message from queue ${queue}:`, msg.content.toString());
                    try {
                        const content = JSON.parse(msg.content.toString());
                        await callback(content);
                        this.channel?.ack(msg);
                        logger.info(`Acknowledged message from queue ${queue}`);
                    }
                    catch (error) {
                        logger.error(`Error processing message from queue ${queue}:`, error);
                        this.channel?.nack(msg, false, true);
                        logger.info(`Nacked and requeued message from queue ${queue}`);
                    }
                }
            });
        }
        catch (error) {
            logger.error(`Error consuming messages from queue ${queue}:`, error);
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
    async checkHealth() {
        if (!this.connection || !this.channel) {
            return false;
        }
        try {
            await this.channel.checkQueue('webhook-events');
            return true;
        }
        catch (error) {
            logger.error('RabbitMQ health check failed:', error);
            return false;
        }
    }
}
exports.RabbitMQConnection = RabbitMQConnection;
exports.rabbitmq = new RabbitMQConnection();
