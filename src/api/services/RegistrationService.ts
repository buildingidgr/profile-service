import { createLogger } from '../../shared/utils/logger';
import { BadRequestError } from '../../shared/utils/errors';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('RegistrationService');
const prisma = new PrismaClient();

export class RegistrationService {
  async getRegistrationAttempts(page: number, limit: number, phoneNumber?: string) {
    try {
      const skip = (page - 1) * limit;
      
      const where = phoneNumber ? { phoneNumber } : {};
      
      const [attempts, total] = await Promise.all([
        prisma.registrationAttempt.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.registrationAttempt.count({ where })
      ]);

      return {
        attempts,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting registration attempts:', error);
      throw new BadRequestError('Failed to get registration attempts');
    }
  }
} 