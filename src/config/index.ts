/// <reference types="node" />
import 'dotenv/config';

interface Config {
  port: string | undefined;
  nodeEnv: string | undefined;
  appUrl: string | undefined;
  marketingUrl: string | undefined;
  jwtSecret: string | undefined;
  databaseUrl: string;
  redisUrl: string;
  rabbitmqUrl: string;
  railwayEnvironment: string | undefined;
  railwayProjectId: string | undefined;
  authServiceUrl: string | undefined;
  auth: {
    clerkSecretKey: string | undefined;
    clerkPublishableKey: string | undefined;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    from: string;
  };
}

export const config: Config = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  appUrl: process.env.APP_URL,
  marketingUrl: process.env.MARKETING_URL,
  jwtSecret: process.env.JWT_SECRET,
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  rabbitmqUrl: process.env.RABBITMQ_URL || '',
  railwayEnvironment: process.env.RAILWAY_ENVIRONMENT,
  railwayProjectId: process.env.RAILWAY_PROJECT_ID,
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  auth: {
    clerkSecretKey: process.env.CLERK_SECRET_KEY,
    clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@yourdomain.com'
  }
}; 