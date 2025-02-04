"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('errorHandler');
const errorHandler = (_req, res, _next) => {
    try {
        if (res.locals.error) {
            const error = res.locals.error;
            logger.error('Error:', error);
            if (error.status) {
                return res.status(error.status).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        return res.status(500).json({ error: 'Unknown Error' });
    }
    catch (err) {
        logger.error('Error in error handler:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
exports.errorHandler = errorHandler;
