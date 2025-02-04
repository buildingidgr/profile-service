declare module '../utils/database' {
  import { MongoClient, Db } from 'mongodb';
  
  export const mongoClient: MongoClient;
  export const db: Db;
  export function deepMerge<T>(target: T, source: Partial<T>): T;
}

declare module './database' {
  export * from '../utils/database';
}

declare module '@utils/database' {
  export * from '../utils/database';
} 