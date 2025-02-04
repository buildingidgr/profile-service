import Redis from 'ioredis';
import { config } from '../../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

const redisClient = new Redis(config.redisUrl, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    // Don't exit process, just log the error
  }
};

export const disconnectRedis = async () => {
  try {
    await redisClient.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    logger.error('Error disconnecting from Redis', error);
  }
};

export const redis = redisClient;

