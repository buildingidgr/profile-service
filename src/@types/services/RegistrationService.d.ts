declare module '@services/RegistrationService' {
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

declare module '../services/RegistrationService' {
  export * from '@services/RegistrationService';
}

declare module './RegistrationService' {
  export * from '@services/RegistrationService';
} 