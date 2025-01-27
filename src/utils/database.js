"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoClient = exports.prisma = void 0;
exports.connectToDatabase = connectToDatabase;
const client_1 = require("@prisma/client");
const logger_1 = require("./logger");
const config_1 = require("../config");
const mongodb_1 = require("mongodb");
const logger = (0, logger_1.createLogger)('database');
exports.prisma = global.prisma || new client_1.PrismaClient({
    datasources: {
        db: {
            url: config_1.config.databaseUrl,
        },
    },
    log: ['query', 'info', 'warn', 'error'],
});
exports.mongoClient = global.mongoClient || new mongodb_1.MongoClient(config_1.config.databaseUrl);
if (process.env.NODE_ENV !== 'production') {
    global.prisma = exports.prisma;
    global.mongoClient = exports.mongoClient;
}
async function connectToDatabase() {
    try {
        await exports.prisma.$connect();
        await exports.mongoClient.connect();
        logger.info('Connected to MongoDB database');
    }
    catch (error) {
        logger.error('Failed to connect to MongoDB database', error);
        process.exit(1);
    }
}
