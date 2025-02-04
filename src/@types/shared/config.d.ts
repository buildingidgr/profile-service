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

declare module '../config' {
  export * from '@shared/config';
}

declare module './config' {
  export * from '@shared/config';
} 