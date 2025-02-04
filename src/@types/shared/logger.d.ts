declare module '@shared/utils/logger' {
  export interface Logger {
    info(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
  }

  export const logger: Logger;
  export function createLogger(name: string): Logger;
}

declare module '@utils/logger' {
  export * from '@shared/utils/logger';
}

declare module '../utils/logger' {
  export * from '@shared/utils/logger';
}

declare module './logger' {
  export * from '@shared/utils/logger';
} 