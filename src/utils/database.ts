import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'
import { MongoClient } from 'mongodb';

const logger = createLogger('database');

declare global {
  var prisma: PrismaClient | undefined
  var mongoClient: MongoClient | undefined
}

// Configure Prisma client with non-transactional settings
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

// Custom non-transactional update method
export async function safeProfileUpdate(clerkId: string, data: any) {
  try {
    // Direct update without transaction
    const result = await prisma.profile.update({
      where: { clerkId },
      data
    });
    return result;
  } catch (error: any) {
    logger.error('Profile update error:', error);
    
    // Fallback to direct MongoDB update if Prisma fails
    if (error.message.includes('replica set')) {
      try {
        const collection = mongoClient.db().collection('Profile');
        const result = await collection.updateOne(
          { clerkId },
          { $set: { ...data, updatedAt: new Date() } }
        );
        return result;
      } catch (mongoError) {
        logger.error('Fallback MongoDB update failed:', mongoError);
        throw mongoError;
      }
    }
    
    throw error;
  }
}

// Remove transaction middleware
// prisma.$use is removed as it's no longer needed

