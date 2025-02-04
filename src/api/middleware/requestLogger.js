"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('requestLogger');
const requestLogger = (req, _res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
};
exports.requestLogger = requestLogger;
