// API relative imports
declare module '../utils/logger' {
  import { Logger } from '@utils/logger';
  export const logger: Logger;
  export function createLogger(name: string): Logger;
}

declare module '../utils/database' {
  import { MongoClient, Db } from 'mongodb';
  export const mongoClient: MongoClient;
  export const db: Db;
  export function deepMerge<T>(target: T, source: Partial<T>): T;
}

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

declare module '../config' {
  import { Config } from '@shared/config';
  export const config: Config;
}

declare module '../services/PreferencesService' {
  import { PreferencesService } from '@services/PreferencesService';
  export * from '@services/PreferencesService';
}

declare module '../services/RegistrationService' {
  import { RegistrationService } from '@services/RegistrationService';
  export * from '@services/RegistrationService';
}

// Current directory imports
declare module './logger' {
  export * from '../utils/logger';
}

declare module './database' {
  export * from '../utils/database';
}

declare module './errors' {
  export * from '../utils/errors';
}

declare module './config' {
  export * from '../config';
}

declare module './PreferencesService' {
  export * from '../services/PreferencesService';
}

declare module './RegistrationService' {
  export * from '../services/RegistrationService';
}

// JavaScript file imports
declare module '../utils/logger.js' {
  export * from '../utils/logger';
}

declare module '../utils/database.js' {
  export * from '../utils/database';
}

declare module '../utils/errors.js' {
  export * from '../utils/errors';
}

declare module '../config.js' {
  export * from '../config';
}

declare module '../services/PreferencesService.js' {
  export * from '../services/PreferencesService';
}

declare module '../services/RegistrationService.js' {
  export * from '../services/RegistrationService';
}

declare module './logger.js' {
  export * from './logger';
}

declare module './database.js' {
  export * from './database';
}

declare module './errors.js' {
  export * from './errors';
}

declare module './config.js' {
  export * from './config';
}

declare module './PreferencesService.js' {
  export * from './PreferencesService';
}

declare module './RegistrationService.js' {
  export * from './RegistrationService';
} 