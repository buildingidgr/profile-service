import { Router } from 'express';
import { RegistrationAttemptsController } from '../controllers/RegistrationAttemptsController';

export const registrationAttemptsRoutes = Router();
const registrationAttemptsController = new RegistrationAttemptsController();

registrationAttemptsRoutes.get('/', registrationAttemptsController.getRegistrationAttempts);

