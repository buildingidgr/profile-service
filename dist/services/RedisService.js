"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const redis_1 = require("redis");
const logger_1 = require("@shared/utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const logger = (0, logger_1.createLogger)('RedisService');
class RedisService {
    constructor() {
        this.client = (0, redis_1.createClient)({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        this.client.connect().catch((err) => {
            logger.error('Redis connection error:', err);
        });
    }
    hashApiKey(apiKey) {
        return crypto_1.default.createHash('sha256').update(apiKey).digest('hex');
    }
    async storeApiKey(userId, apiKey) {
        try {
            const hashedKey = this.hashApiKey(apiKey);
            await this.client.set(`api_key:${hashedKey}`, userId);
            logger.info(`Stored API key for user ${userId} in Redis`);
        }
        catch (error) {
            logger.error('Error storing API key in Redis:', error);
            throw new Error('Failed to store API key in Redis');
        }
    }
    async getUserIdByApiKey(apiKey) {
        try {
            const hashedKey = this.hashApiKey(apiKey);
            const userId = await this.client.get(`api_key:${hashedKey}`);
            return userId;
        }
        catch (error) {
            logger.error('Error retrieving user ID from Redis:', error);
            throw new Error('Failed to retrieve user ID from Redis');
        }
    }
    async deleteApiKey(apiKey) {
        try {
            const hashedKey = this.hashApiKey(apiKey);
            await this.client.del(`api_key:${hashedKey}`);
            logger.info(`Deleted API key from Redis`);
        }
        catch (error) {
            logger.error('Error deleting API key from Redis:', error);
            throw new Error('Failed to delete API key from Redis');
        }
    }
}
exports.RedisService = RedisService;
//# sourceMappingURL=RedisService.js.map