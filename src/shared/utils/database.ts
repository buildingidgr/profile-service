import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { createLogger } from './logger';
import { Document, ObjectId } from 'mongodb';

const logger = createLogger('database');

// Initialize Prisma client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Initialize MongoDB client
let mongoClient: MongoClient;

if (!global.mongoClient) {
  mongoClient = new MongoClient(config.databaseUrl);
  global.mongoClient = mongoClient;
} else {
  mongoClient = global.mongoClient;
}

export { mongoClient };
export const db = mongoClient.db();

// Type-safe deep merge utility
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        output[key] = deepMerge(targetValue, sourceValue as DeepPartial<typeof targetValue>);
      } else if (sourceValue !== undefined) {
        output[key] = sourceValue as T[typeof key];
      }
    }
  }

  return output;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Add global type declarations
declare global {
  var prisma: PrismaClient | undefined;
  var mongoClient: MongoClient | undefined;
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Configure Prisma client with non-transactional settings
export const prismaClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || config.databaseUrl
    }
  },
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error']
});

export async function connectToDatabase() {
  try {
    await prismaClient.$connect();
    await mongoClient.connect();
    logger.info('Connected to MongoDB database');
  } catch (error) {
    logger.error('Error connecting to database:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await prismaClient.$disconnect();
    await mongoClient.close();
    logger.info('Disconnected from MongoDB database');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
    throw error;
  }
}

// Define interfaces for document structures
interface ProfileDocument extends Document {
  _id: ObjectId;
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
    // Get the current profile first
    const currentProfile = await prismaClient.profile.findUnique({
      where: { clerkId }
    });

    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    // Only update fields that are provided in the data object
    const updateData = Object.keys(data).reduce((acc: any, key) => {
      if (data[key] !== undefined) {
        acc[key] = data[key];
      }
      return acc;
    }, {});

    // Attempt direct Prisma update without transaction
    const result = await prismaClient.profile.update({
      where: { clerkId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
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
        
        // Only update fields that are provided in the data object
        const updateData = Object.keys(data).reduce((acc: any, key) => {
          if (data[key] !== undefined) {
            acc[key] = data[key];
          }
          return acc;
        }, {});

        const updateResult = await collection.updateOne(
          { clerkId },
          { 
            $set: { 
              ...updateData, 
              updatedAt: new Date() 
            }
          }
        );

        // If update was successful, retrieve the updated document
        if (updateResult.modifiedCount > 0) {
          const doc = await collection.findOne({ clerkId }) as ProfileDocument;
          
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
        }
        
        throw new Error('No document found or updated');
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
prismaClient.$use(async (params, next) => {
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

