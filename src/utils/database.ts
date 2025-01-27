import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'
import { MongoClient } from 'mongodb';

const logger = createLogger('database');

declare global {
  var prisma: PrismaClient | undefined
  var mongoClient: MongoClient | undefined
}

// Configure Prisma client with error handling
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || config.databaseUrl
    }
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error']
});

export const mongoClient = global.mongoClient || new MongoClient(config.databaseUrl);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
  global.mongoClient = mongoClient
}

export async function connectToDatabase() {
  try {
    await prisma.$connect()
    await mongoClient.connect()
    logger.info('Connected to MongoDB database')
  } catch (error) {
    logger.error('Failed to connect to MongoDB database', error)
    process.exit(1)
  }
}

// Custom error handling middleware
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    // Log the specific error
    logger.error('Prisma operation error:', error);
    
    // Specific handling for replica set or transaction-related errors
    if (error.message?.includes('replica set') || 
        error.message?.includes('transaction')) {
      logger.warn('Transaction or replica set operation not supported. Falling back to standard operation.');
      
      // Optional: Implement custom fallback logic
      // For example, you might retry the operation without transactions
      // or provide a more specific error response
    }
    
    // Re-throw the error after logging
    throw error;
  }
});

