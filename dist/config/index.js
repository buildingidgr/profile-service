"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    appUrl: process.env.APP_URL,
    marketingUrl: process.env.MARKETING_URL,
    jwtSecret: process.env.JWT_SECRET,
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL || '',
    rabbitmqUrl: process.env.RABBITMQ_URL || '',
    railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
    railwayProjectId: process.env.RAILWAY_PROJECT_ID,
    authServiceUrl: process.env.AUTH_SERVICE_URL,
    auth: {
        clerkSecretKey: process.env.CLERK_SECRET_KEY,
        clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    },
    smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASSWORD || '',
        from: process.env.SMTP_FROM || 'noreply@yourdomain.com'
    }
};
//# sourceMappingURL=index.js.map