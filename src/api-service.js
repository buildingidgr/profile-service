"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = require("./utils/logger");
const rabbitmq_1 = require("./utils/rabbitmq");
const config_1 = require("./config");
const profileRoutes_1 = require("./routes/profileRoutes");
const validateToken_1 = require("./middleware/validateToken");
const errorHandler_1 = require("./middleware/errorHandler");
require("./consumers/opportunityConsumer");
const logger = (0, logger_1.createLogger)('api-service');
const app = (0, express_1.default)();
// Trust proxy configuration with additional security
app.set('trust proxy', 1); // Only trust first proxy
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rate limiting with more secure configuration
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipFailedRequests: true, // Don't count failed requests
    keyGenerator: (req) => {
        // Use a combination of IP and user ID if authenticated
        const baseIP = req.ip || 'unknown';
        const userId = req.user?.sub || req.userId || '';
        return userId ? `${baseIP}-${userId}` : baseIP;
    }
});
app.use(limiter);
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Connect to RabbitMQ
rabbitmq_1.rabbitmq.connect().catch((error) => {
    logger.error('Failed to connect to RabbitMQ:', error);
});
try {
    // API routes with JWT validation
    app.use('/api/profiles', validateToken_1.validateToken, profileRoutes_1.profileRoutes);
    // Error handling
    app.use(errorHandler_1.errorHandler);
    // Start server
    const port = config_1.config.port || 3000;
    app.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
}
catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
}
