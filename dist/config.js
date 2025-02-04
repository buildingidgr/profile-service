"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function validateUrl(url, name, defaultUrl) {
    if (!url) {
        if (defaultUrl) {
            return defaultUrl;
        }
        throw new Error(`${name} is not defined in the environment variables`);
    }
    try {
        new URL(url);
    }
    catch (error) {
        throw new Error(`Invalid ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return url;
}
exports.config = {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL,
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl: validateUrl(process.env.DATABASE_URL, 'DATABASE_URL'),
    redisUrl: validateUrl(process.env.REDIS_URL, 'REDIS_URL'),
    rabbitmqUrl: validateUrl(process.env.RABBITMQ_URL, 'RABBITMQ_URL', 'amqp://localhost:5672'),
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
    railwayProjectId: process.env.RAILWAY_PROJECT_ID,
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    auth: {
        serviceUrl: process.env.NODE_ENV === 'production'
            ? process.env.RAILWAY_INTERNAL_URL_AUTH_SERVICE || process.env.AUTH_SERVICE_URL
            : process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
    }
};
//# sourceMappingURL=config.js.map