declare module '@shared/utils/errors' {
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

declare module '@shared/config' {
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