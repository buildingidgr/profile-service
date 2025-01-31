import { PrismaClient } from '@prisma/client'
import { createLogger } from './logger'
import { config } from '../config'
import { MongoClient, Document, ObjectId } from 'mongodb';

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

interface PreferencesDocument extends Document {
  _id: ObjectId;
  clerkId: string;
  preferences: any;
  createdAt: Date;
  updatedAt: Date;
}

// Custom non-transactional update method with advanced error handling
export async function safeProfileUpdate(clerkId: string, data: any) {
  try {
    // Attempt direct Prisma update without transaction
    const result = await prisma.profile.update({
      where: { clerkId },
      data: {
        ...data,
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
        const updateResult = await collection.updateOne(
          { clerkId },
          { 
            $set: { 
              ...data, 
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

// Method to retrieve user preferences with consistent return structure
export async function safeGetPreferences(clerkId: string) {
  try {
    // Try Prisma first
    const preferences = await prisma.userPreferences.findUnique({
      where: { clerkId }
    });

    if (preferences) {
      return preferences;
    }

    // Fallback to direct MongoDB retrieval
    const collection = mongoClient.db().collection('UserPreferences');
    const doc = await collection.findOne({ clerkId }) as PreferencesDocument;

    if (doc) {
      return {
        id: doc._id.toString(),
        clerkId: doc.clerkId,
        preferences: doc.preferences,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      };
    }

    // If no preferences found
    throw new Error('Preferences not found');
  } catch (error) {
    logger.error('Error retrieving preferences:', error);
    throw error;
  }
}

// Method to safely update user preferences
export async function safeUpdatePreferences(clerkId: string, preferencesData: any) {
  try {
    // Try Prisma update first
    try {
      const preferences = await prisma.userPreferences.upsert({
        where: { clerkId },
        update: { preferences: preferencesData },
        create: {
          clerkId,
          preferences: preferencesData,
        },
      });

      return preferences;
    } catch (prismaError: any) {
      // If Prisma fails due to replica set, fall back to MongoDB
      if (prismaError.message?.includes('replica set') || 
          prismaError.message?.includes('transaction')) {
        logger.warn('Prisma update failed. Falling back to direct MongoDB update.');
        
        const collection = mongoClient.db().collection('UserPreferences');
        
        // Perform upsert operation directly in MongoDB
        await collection.updateOne(
          { clerkId },
          { 
            $set: { 
              preferences: preferencesData,
              updatedAt: new Date() 
            },
            $setOnInsert: { 
              clerkId,
              createdAt: new Date() 
            }
          },
          { upsert: true }
        );

        // Retrieve the updated document
        const updatedDoc = await collection.findOne({ clerkId }) as PreferencesDocument;

        if (updatedDoc) {
          // Transform MongoDB result to match Prisma structure
          return {
            id: updatedDoc._id.toString(),
            clerkId: updatedDoc.clerkId,
            preferences: updatedDoc.preferences,
            createdAt: updatedDoc.createdAt,
            updatedAt: updatedDoc.updatedAt
          };
        }

        throw new Error('Failed to update preferences');
      }

      // Re-throw other Prisma errors
      throw prismaError;
    }
  } catch (error) {
    logger.error('Error updating preferences:', error);
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

