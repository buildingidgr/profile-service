// Type definitions for base modules
interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

interface Config {
  port: number;
  jwtSecret: string;
  auth: {
    serviceUrl: string;
  };
  redis: {
    host: string;
    port: number;
  };
  mongodb: {
    uri: string;
  };
}

interface UserPreferences {
  id: string;
  clerkId: string;
  preferences: {
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

interface RegistrationAttempt {
  id: string;
  email: string;
  attempts: number;
  lastAttempt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Express Rate Limit declarations
declare module 'express-rate-limit' {
  import { Request, Response, NextFunction } from 'express';
  
  interface Options {
    windowMs?: number;
    max?: number;
    message?: string | object;
    statusCode?: number;
    legacyHeaders?: boolean;
    standardHeaders?: boolean;
    requestPropertyName?: string;
    skipFailedRequests?: boolean;
    skipSuccessfulRequests?: boolean;
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response, next: NextFunction) => void;
    skip?: (req: Request, res: Response) => boolean;
    requestWasSuccessful?: (req: Request, res: Response) => boolean;
    onLimitReached?: (req: Request, res: Response, optionsUsed: Options) => void;
  }

  export default function rateLimit(options?: Options): (req: Request, res: Response, next: NextFunction) => void;
}

// Module declarations for all possible import paths
declare module '@utils/logger' {
  export const logger: Logger;
  export function createLogger(name: string): Logger;
}

declare module '@shared/config' {
  export const config: Config;
}

declare module '@utils/database' {
  import { MongoClient, Db } from 'mongodb';
  export const mongoClient: MongoClient;
  export const db: Db;
  export function deepMerge<T>(target: T, source: Partial<T>): T;
}

declare module '@utils/errors' {
  export class BadRequestError extends Error {
    constructor(message: string);
  }
  export class UnauthorizedError extends Error {
    constructor(message: string);
  }
  export class NotFoundError extends Error {
    constructor(message: string);
  }
}

declare module '@services/PreferencesService' {
  export class PreferencesService {
    getPreferences(clerkId: string): Promise<UserPreferences>;
    updatePreferences(clerkId: string, data: any): Promise<UserPreferences>;
    createDefaultPreferences(clerkId: string): Promise<UserPreferences>;
  }
}

declare module '@services/RegistrationService' {
  export class RegistrationService {
    recordAttempt(email: string): Promise<RegistrationAttempt>;
    getAttempts(email: string): Promise<RegistrationAttempt | null>;
    resetAttempts(email: string): Promise<void>;
  }
}

// Relative path declarations for src/api
declare module '../utils/logger' { export * from '@utils/logger'; }
declare module '../utils/database' { export * from '@utils/database'; }
declare module '../utils/errors' { export * from '@utils/errors'; }
declare module '../config' { export * from '@shared/config'; }
declare module '../services/PreferencesService' { export * from '@services/PreferencesService'; }
declare module '../services/RegistrationService' { export * from '@services/RegistrationService'; }

// Relative path declarations for current directory
declare module './logger' { export * from '@utils/logger'; }
declare module './database' { export * from '@utils/database'; }
declare module './errors' { export * from '@utils/errors'; }
declare module './config' { export * from '@shared/config'; }
declare module './PreferencesService' { export * from '@services/PreferencesService'; }
declare module './RegistrationService' { export * from '@services/RegistrationService'; }

// Declarations for .js files
declare module '../utils/logger.js' { export * from '@utils/logger'; }
declare module '../utils/database.js' { export * from '@utils/database'; }
declare module '../utils/errors.js' { export * from '@utils/errors'; }
declare module '../config.js' { export * from '@shared/config'; }
declare module '../services/PreferencesService.js' { export * from '@services/PreferencesService'; }
declare module '../services/RegistrationService.js' { export * from '@services/RegistrationService'; }
declare module './logger.js' { export * from '@utils/logger'; }
declare module './database.js' { export * from '@utils/database'; }
declare module './errors.js' { export * from '@utils/errors'; }
declare module './config.js' { export * from '@shared/config'; }
declare module './PreferencesService.js' { export * from '@services/PreferencesService'; }
declare module './RegistrationService.js' { export * from '@services/RegistrationService'; } 