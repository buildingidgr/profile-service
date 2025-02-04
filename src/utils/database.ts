import { PrismaClient, Prisma } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'
import { MongoClient, Document, ObjectId } from 'mongodb';

const logger = createLogger('database');

// Deep merge utility function
function deepMerge(target: any, source: any): any {
  if (typeof source !== 'object' || source === null) {
    return source;
  }

  if (typeof target !== 'object' || target === null) {
    return deepMergeObjects({}, source);
  }

  return deepMergeObjects(target, source);
}

function deepMergeObjects(target: any, source: any): any {
  const result = { ...target };

  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        result[key] = deepMergeObjects(target[key], source[key]);
      } else {
        result[key] = deepMergeObjects({}, source[key]);
      }
    } else {
      result[key] = source[key];
    }
  });

  return result;
}

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
    const currentProfile = await prisma.profile.findUnique({
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
    const result = await prisma.profile.update({
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

