declare module '../utils/logger.js' {
  export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  }
  export const logger: Logger;
  export function createLogger(name: string): Logger;
}

declare module './logger.js' {
  export * from '../utils/logger.js';
}

declare module '@utils/logger.js' {
  export * from '../utils/logger.js';
} 