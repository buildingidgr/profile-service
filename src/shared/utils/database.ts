import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { createLogger } from './logger';
import { Document, ObjectId } from 'mongodb';

const logger = createLogger('database');

// Initialize Prisma client with non-transactional settings
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

// Initialize MongoDB client
let mongoClient: MongoClient;

if (!global.mongoClient) {
  mongoClient = new MongoClient(process.env.DATABASE_URL || config.databaseUrl, {
    directConnection: true,
    retryWrites: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    maxPoolSize: 50,
    minPoolSize: 0,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 10000
  });
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

export async function connectToDatabase() {
  try {
    // Try to connect to MongoDB first
    await mongoClient.connect();
    logger.info('Connected to MongoDB database');

    // Then try to connect to Prisma
    await prisma.$connect();
    logger.info('Connected to Prisma client');
  } catch (error) {
    logger.error('Error connecting to database:', error);
    // If MongoDB connection fails, try to disconnect both clients
    try {
      await disconnectFromDatabase();
    } catch (disconnectError) {
      logger.error('Error during disconnect after failed connection:', disconnectError);
    }
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    const disconnectPromises = [];

    if (mongoClient) {
      disconnectPromises.push(
        mongoClient.close().catch(err => {
          logger.error('Error disconnecting MongoDB:', err);
        })
      );
    }

    if (prisma) {
      disconnectPromises.push(
        prisma.$disconnect().catch(err => {
          logger.error('Error disconnecting Prisma:', err);
        })
      );
    }

    await Promise.allSettled(disconnectPromises);
    logger.info('Disconnected from databases');
  } catch (error) {
    logger.error('Error during database disconnect:', error);
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
    throw error;
  }
}

// Add Prisma middleware for error handling
prisma.$use(async (params, next) => {
  try {
    return await next(params);
  } catch (error: any) {
    logger.error('Prisma operation error:', {
      model: params.model,
      action: params.action,
      error: error.message
    });
    throw error;
  }
});

