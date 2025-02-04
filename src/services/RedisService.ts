import { createClient } from 'redis';
import { promisify } from 'util';
import { createLogger } from '@shared/utils/logger';
import crypto from 'crypto';

const logger = createLogger('RedisService');

export class RedisService {
  private client;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.client.connect().catch((err) => {
      logger.error('Redis connection error:', err);
    });
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  async storeApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      const hashedKey = this.hashApiKey(apiKey);
      await this.client.set(`api_key:${hashedKey}`, userId);
      logger.info(`Stored API key for user ${userId} in Redis`);
    } catch (error) {
      logger.error('Error storing API key in Redis:', error);
      throw new Error('Failed to store API key in Redis');
    }
  }

  async getUserIdByApiKey(apiKey: string): Promise<string | null> {
    try {
      const hashedKey = this.hashApiKey(apiKey);
      const userId = await this.client.get(`api_key:${hashedKey}`);
      return userId;
    } catch (error) {
      logger.error('Error retrieving user ID from Redis:', error);
      throw new Error('Failed to retrieve user ID from Redis');
    }
  }

  async deleteApiKey(apiKey: string): Promise<void> {
    try {
      const hashedKey = this.hashApiKey(apiKey);
      await this.client.del(`api_key:${hashedKey}`);
      logger.info(`Deleted API key from Redis`);
    } catch (error) {
      logger.error('Error deleting API key from Redis:', error);
      throw new Error('Failed to delete API key from Redis');
    }
  }
}

