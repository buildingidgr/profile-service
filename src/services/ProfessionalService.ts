import { MongoClient } from 'mongodb';
import { createLogger } from '../shared/utils/logger';
import { BadRequestError } from '../shared/utils/errors';
import { mongoClient } from '../shared/utils/database';

const logger = createLogger('ProfessionalService');
const db = mongoClient.db();

export interface ProfessionalInfo {
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
}

const DEFAULT_PROFESSIONAL_INFO: ProfessionalInfo = {
  profession: {
    current: "",
    allowedValues: [
      "Civil Engineer",
      "Architectural Engineer",
      "Mechanical Engineer",
      "Chemical Engineer",
      "Electrical Engineer",
      "Surveying and Rural Engineer",
      "Naval Architect and Marine Engineer",
      "Electronics Engineer",
      "Mining and Metallurgical Engineer",
      "Urban, Regional and Development Planning Engineer",
      "Automation Engineer",
      "Environmental Engineer",
      "Production and Management Engineer",
      "Acoustical Engineer",
      "Materials Engineer",
      "Product and Systems Design Engineer"
    ]
  },
  amtee: "",
  areaOfOperation: {
    primary: "",
    address: "",
    coordinates: {
      latitude: 0,
      longitude: 0
    }
  }
};

export class ProfessionalService {
  async getProfessionalInfo(clerkId: string): Promise<ProfessionalInfo> {
    try {
      const professionalCollection = db.collection('ProfessionalInfo');
      const info = await professionalCollection.findOne({ clerkId });

      if (!info) {
        await this.createDefaultProfessionalInfo(clerkId);
        return DEFAULT_PROFESSIONAL_INFO;
      }

      return info.professionalInfo;
    } catch (error) {
      logger.error('Error getting professional info', { error, clerkId });
      throw new BadRequestError('Failed to get professional info');
    }
  }

  async updateProfessionalInfo(clerkId: string, data: Partial<ProfessionalInfo>): Promise<ProfessionalInfo> {
    try {
      const professionalCollection = db.collection('ProfessionalInfo');
      const currentInfo = await professionalCollection.findOne({ clerkId });

      if (!currentInfo) {
        // If no professional info exists, create with defaults first
        await this.createDefaultProfessionalInfo(clerkId);
        return this.updateProfessionalInfo(clerkId, data);
      }

      // Create update operations for each field in the request
      const updateOperations: { [key: string]: any } = {};

      // Handle profession updates
      if (data.profession?.current) {
        // Validate profession value
        if (!DEFAULT_PROFESSIONAL_INFO.profession.allowedValues.includes(data.profession.current)) {
          throw new BadRequestError(`Invalid profession value. Must be one of: ${DEFAULT_PROFESSIONAL_INFO.profession.allowedValues.join(', ')}`);
        }
        updateOperations['professionalInfo.profession.current'] = data.profession.current;
      }

      // Handle AMTEE updates
      if (data.amtee !== undefined) {
        updateOperations['professionalInfo.amtee'] = data.amtee;
      }

      // Handle area of operation updates
      if (data.areaOfOperation) {
        if (data.areaOfOperation.primary !== undefined) {
          updateOperations['professionalInfo.areaOfOperation.primary'] = data.areaOfOperation.primary;
        }
        if (data.areaOfOperation.address !== undefined) {
          updateOperations['professionalInfo.areaOfOperation.address'] = data.areaOfOperation.address;
        }
        if (data.areaOfOperation.coordinates) {
          if (data.areaOfOperation.coordinates.latitude !== undefined) {
            updateOperations['professionalInfo.areaOfOperation.coordinates.latitude'] = 
              data.areaOfOperation.coordinates.latitude;
          }
          if (data.areaOfOperation.coordinates.longitude !== undefined) {
            updateOperations['professionalInfo.areaOfOperation.coordinates.longitude'] = 
              data.areaOfOperation.coordinates.longitude;
          }
        }
      }

      // If no valid updates, return current info
      if (Object.keys(updateOperations).length === 0) {
        return currentInfo.professionalInfo;
      }

      const result = await professionalCollection.findOneAndUpdate(
        { clerkId },
        { 
          $set: {
            ...updateOperations,
            updatedAt: new Date()
          }
        },
        { 
          returnDocument: 'after'
        }
      );

      if (!result.value) {
        throw new BadRequestError('Failed to update professional info');
      }

      return result.value.professionalInfo;
    } catch (error) {
      logger.error('Error updating professional info', { error, clerkId });
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError('Failed to update professional info');
    }
  }

  private async createDefaultProfessionalInfo(clerkId: string): Promise<void> {
    const professionalCollection = db.collection('ProfessionalInfo');
    await professionalCollection.insertOne({
      clerkId,
      professionalInfo: DEFAULT_PROFESSIONAL_INFO,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
} 