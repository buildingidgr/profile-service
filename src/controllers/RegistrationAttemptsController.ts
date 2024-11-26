import { Request, Response, NextFunction } from 'express';
import { RegistrationService } from '../services/RegistrationService';

export class RegistrationAttemptsController {
  private registrationService: RegistrationService;

  constructor() {
    this.registrationService = new RegistrationService();
  }

  getRegistrationAttempts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = '1', limit = '10', phoneNumber } = req.query;
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);

      const result = await this.registrationService.getRegistrationAttempts(
        pageNumber,
        limitNumber,
        phoneNumber as string | undefined
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

