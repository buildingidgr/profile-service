export interface Professional {
  id: string;
  clerkId: string;
  professionalInfo: {
    profession: {
      current: string;
      allowedValues: string[];
    };
    amtee: string;
    areaOfOperation: {
      primary: string;
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
    };
  };
  createdAt: Date;
  updatedAt: Date;
} 