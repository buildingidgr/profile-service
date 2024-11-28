import dotenv from 'dotenv';

dotenv.config();

function validateUrl(url: string | undefined, name: string): string {
  if (!url) {
    throw new Error(`${name} is not defined in the environment variables`);
  }
  
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return url;
}

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: validateUrl(process.env.DATABASE_URL, 'DATABASE_URL'),
  redisUrl: validateUrl(process.env.REDIS_URL, 'REDIS_URL'),
  rabbitmqUrl: validateUrl(process.env.RABBITMQ_URL, 'RABBITMQ_URL'),
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID,
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  auth: {
    serviceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001'
  }
} as const;

