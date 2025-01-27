"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = (0, logger_1.createLogger)('validateToken');
const validateToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret || '');
            req.user = decoded;
            return next();
        }
        catch (error) {
            logger.error('Token validation error:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }
    catch (error) {
        logger.error('Token validation error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.validateToken = validateToken;
