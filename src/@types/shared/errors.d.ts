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

declare module '@utils/errors' {
  export * from '@shared/utils/errors';
}

declare module '../utils/errors' {
  export * from '@shared/utils/errors';
}

declare module './errors' {
  export * from '@shared/utils/errors';
} 