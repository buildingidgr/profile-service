"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("./shared/utils/logger");
const config_1 = require("./config");
const profileRoutes_1 = require("./api/routes/profileRoutes");
const validateToken_1 = require("./api/middleware/validateToken");
const errorHandler_1 = require("./api/middleware/errorHandler");
const database_1 = require("./shared/utils/database");
const redis_1 = require("./shared/utils/redis");
const requestLogger_1 = require("./api/middleware/requestLogger");
const preferencesRoutes_1 = require("./api/routes/preferencesRoutes");
const professionalRoutes_1 = require("./api/routes/professionalRoutes");
const registrationRoutes_1 = require("./api/routes/registrationRoutes");
const logger = (0, logger_1.createLogger)('api-service');
const app = (0, express_1.default)();
exports.app = app;
app.set('trust proxy', 1);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(requestLogger_1.requestLogger);
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true,
    keyGenerator: (req) => {
        var _a;
        const baseIP = req.ip || 'unknown';
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.sub) || req.userId || '';
        return userId ? `${baseIP}-${userId}` : baseIP;
    }
});
app.use(limiter);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
async function startServer() {
    try {
        logger.info('Connecting to database...');
        await (0, database_1.connectToDatabase)().catch(error => {
            logger.error('Database connection failed:', error);
            throw error;
        });
        try {
            await (0, redis_1.connectRedis)();
        }
        catch (error) {
            logger.warn('Redis connection failed, continuing without Redis:', error);
        }
        app.use('/api/profiles', validateToken_1.validateToken, profileRoutes_1.profileRoutes);
        app.use('/api/preferences', preferencesRoutes_1.preferencesRoutes);
        app.use('/api/professional', professionalRoutes_1.professionalRoutes);
        app.use('/api/registration', registrationRoutes_1.registrationRoutes);
        app.use(errorHandler_1.errorHandler);
        const port = config_1.config.port || 3000;
        const server = app.listen(port, () => {
            logger.info(`API Server is running on port ${port}`);
        });
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM signal received. Starting graceful shutdown...');
            await cleanup();
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });
        process.on('SIGINT', async () => {
            logger.info('SIGINT received. Shutting down gracefully...');
            await cleanup();
            process.exit(0);
        });
        return server;
    }
    catch (error) {
        logger.error('Failed to start server:', {
            error,
            stack: error instanceof Error ? error.stack : undefined,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
        await cleanup();
        process.exit(1);
    }
}
exports.startServer = startServer;
async function cleanup() {
    logger.info('Cleaning up...');
    try {
        await Promise.allSettled([
            (0, database_1.disconnectFromDatabase)().catch(error => {
                logger.error('Error during database disconnect:', error);
            }),
            (0, redis_1.disconnectRedis)().catch(error => {
                logger.error('Error during Redis disconnect:', error);
            })
        ]);
    }
    catch (error) {
        logger.error('Error during cleanup:', error);
    }
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=api-service.js.map