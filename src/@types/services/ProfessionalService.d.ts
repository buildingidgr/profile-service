declare module '@services/ProfessionalService' {
  export interface ProfessionalInfo {
    profession: {
      current: string;
      allowedValues: string[];
    };
    [key: string]: any;
  }

  export class ProfessionalService {
    getProfessionalInfo(clerkId: string): Promise<ProfessionalInfo>;
    updateProfessionalInfo(clerkId: string, data: Partial<ProfessionalInfo>): Promise<ProfessionalInfo>;
    createDefaultProfessionalInfo(clerkId: string): Promise<void>;
  }
} 