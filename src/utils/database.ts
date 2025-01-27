import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'
import { MongoClient, Document } from 'mongodb';

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

// Define an interface matching the Profile document structure
interface ProfileDocument extends Document {
  _id: any;
  clerkId: string;
  email?: string;
  emailVerified: boolean;
  phoneNumber?: string;
  phoneVerified: boolean;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  apiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Custom non-transactional update method with advanced error handling
export async function safeProfileUpdate(clerkId: string, data: any) {
  try {
    // Attempt Prisma update with minimal transaction requirements
    const result = await prisma.$transaction(async (tx) => {
      return tx.profile.update({
        where: { clerkId },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });
    }, {
      // Minimal transaction configuration
      maxWait: 1000,  // 1 second max wait
      timeout: 5000   // 5 seconds total timeout
    });

    return result;
  } catch (error: any) {
    logger.error('Profile update error:', error);
    
    // Specific handling for replica set or transaction-related errors
    if (error.message?.includes('replica set') || 
        error.message?.includes('transaction')) {
      logger.warn('Transaction not supported. Falling back to direct update.');
      
      try {
        // Fallback to direct MongoDB update
        const collection = mongoClient.db().collection('Profile');
        const result = await collection.findOneAndUpdate(
          { clerkId },
          { 
            $set: { 
              ...data, 
              updatedAt: new Date() 
            }
          },
          { 
            returnDocument: 'after',
            upsert: false 
          }
        );
        
        // Transform MongoDB result to Prisma-like response
        const doc = result as unknown as ProfileDocument;
        if (doc) {
          return {
            id: doc._id.toString(),
            clerkId: doc.clerkId,
            email: doc.email || null,
            emailVerified: doc.emailVerified,
            phoneNumber: doc.phoneNumber || null,
            phoneVerified: doc.phoneVerified,
            username: doc.username || null,
            firstName: doc.firstName || null,
            lastName: doc.lastName || null,
            avatarUrl: doc.avatarUrl || null,
            apiKey: doc.apiKey || null,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
            externalAccounts: [] // Add if needed
          };
        }
        
        throw new Error('No document found for update');
      } catch (mongoError) {
        logger.error('Fallback MongoDB update failed:', mongoError);
        throw mongoError;
      }
    }
    
    // Re-throw other types of errors
    throw error;
  }
}

// Optional: Add a global error handler for Prisma operations
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    logger.error('Prisma operation error:', error);
    
    // Log specific error details
    if (error.message?.includes('replica set') || 
        error.message?.includes('transaction')) {
      logger.warn('Transaction or replica set operation not supported.');
    }
    
    throw error;
  }
});

