declare module '../utils/database.js' {
  import { MongoClient, Db } from 'mongodb';
  export const mongoClient: MongoClient;
  export const db: Db;
  export function deepMerge<T>(target: T, source: Partial<T>): T;
}

declare module './database.js' {
  export * from '../utils/database.js';
}

declare module '@utils/database.js' {
  export * from '../utils/database.js';
} 