// Logger module declarations
declare module '../utils/logger' {
  export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  }
  export const logger: Logger;
  export function createLogger(name: string): Logger;
}

// Config module declarations
declare module '../config' {
  export interface Config {
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
  export const config: Config;
}

// Database module declarations
declare module '../utils/database' {
  import { MongoClient, Db } from 'mongodb';
  export const mongoClient: MongoClient;
  export const db: Db;
  export function deepMerge<T>(target: T, source: Partial<T>): T;
}

// Error module declarations
declare module '../utils/errors' {
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

// PreferencesService module declarations
declare module '../services/PreferencesService' {
  export interface UserPreferences {
    id: string;
    clerkId: string;
    preferences: {
      [key: string]: any;
    };
    createdAt: string;
    updatedAt: string;
  }

  export class PreferencesService {
    getPreferences(clerkId: string): Promise<UserPreferences>;
    updatePreferences(clerkId: string, data: any): Promise<UserPreferences>;
    createDefaultPreferences(clerkId: string): Promise<UserPreferences>;
  }
}

// RegistrationService module declarations
declare module '../services/RegistrationService' {
  export interface RegistrationAttempt {
    id: string;
    email: string;
    attempts: number;
    lastAttempt: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export class RegistrationService {
    recordAttempt(email: string): Promise<RegistrationAttempt>;
    getAttempts(email: string): Promise<RegistrationAttempt | null>;
    resetAttempts(email: string): Promise<void>;
  }
}

// Also declare the same modules with .js extension
declare module '../utils/logger.js' {
  export * from '../utils/logger';
}

declare module '../config.js' {
  export * from '../config';
}

declare module '../utils/database.js' {
  export * from '../utils/database';
}

declare module '../utils/errors.js' {
  export * from '../utils/errors';
}

declare module '../services/PreferencesService.js' {
  export * from '../services/PreferencesService';
}

declare module '../services/RegistrationService.js' {
  export * from '../services/RegistrationService';
}

// Declare relative path variations
declare module './logger' {
  export * from '../utils/logger';
}

declare module './config' {
  export * from '../config';
}

declare module './database' {
  export * from '../utils/database';
}

declare module './errors' {
  export * from '../utils/errors';
}

declare module './PreferencesService' {
  export * from '../services/PreferencesService';
}

declare module './RegistrationService' {
  export * from '../services/RegistrationService';
} 