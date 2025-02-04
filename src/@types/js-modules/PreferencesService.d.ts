declare module '../services/PreferencesService.js' {
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

declare module './PreferencesService.js' {
  export * from '../services/PreferencesService.js';
}

declare module '@services/PreferencesService.js' {
  export * from '../services/PreferencesService.js';
} 