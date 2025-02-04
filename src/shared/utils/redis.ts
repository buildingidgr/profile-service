import Redis from 'ioredis';
import { config } from '../../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

let redisClient: Redis | null = null;

try {
  redisClient = new Redis(process.env.REDIS_URL || config.redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10000,
    commandTimeout: 5000
  });

  redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });
} catch (error) {
  logger.warn('Failed to initialize Redis client:', error);
  redisClient = null;
}

export const connectRedis = async () => {
  if (!redisClient) {
    logger.warn('Redis client not initialized, skipping connection');
    return;
  }

  try {
    await redisClient.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    // Don't exit process, just log the error
  }
};

export const disconnectRedis = async () => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
    logger.info('Disconnected from Redis');
  } catch (error) {
    logger.error('Error disconnecting from Redis', error);
  }
};

export const redis = {
  get: async (key: string): Promise<string | null> => {
    if (!redisClient) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  },
  set: async (key: string, value: string, expireSeconds?: number): Promise<boolean> => {
    if (!redisClient) return false;
    try {
      if (expireSeconds) {
        await redisClient.set(key, value, 'EX', expireSeconds);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  },
  del: async (key: string): Promise<boolean> => {
    if (!redisClient) return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error);
      return false;
    }
  }
};

