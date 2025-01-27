"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = exports.connectRedis = void 0;
const redis_1 = require("redis");
const config_1 = require("../config");
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)('redis');
const redisClient = (0, redis_1.createClient)({
    url: config_1.config.redisUrl
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info('Connected to Redis');
    }
    catch (error) {
        logger.error('Failed to connect to Redis', error);
        process.exit(1);
    }
};
exports.connectRedis = connectRedis;
exports.redis = redisClient;
