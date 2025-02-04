import { createClient } from 'redis';
import { config } from '../config';
import { createLogger } from './logger';

const logger = createLogger('redis');

const redisClient = createClient({
  url: config.redisUrl
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    process.exit(1);
  }
};

export const redis = redisClient;

