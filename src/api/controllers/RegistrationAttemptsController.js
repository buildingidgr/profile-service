"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationAttemptsController = void 0;
const RegistrationService_1 = require("../services/RegistrationService");
class RegistrationAttemptsController {
    constructor() {
        this.getRegistrationAttempts = async (req, res, next) => {
            try {
                const { page = '1', limit = '10', phoneNumber } = req.query;
                const pageNumber = parseInt(page, 10);
                const limitNumber = parseInt(limit, 10);
                const result = await this.registrationService.getRegistrationAttempts(pageNumber, limitNumber, phoneNumber);
                res.json(result);
            }
            catch (error) {
                next(error);
            }
        };
        this.registrationService = new RegistrationService_1.RegistrationService();
    }
}
exports.RegistrationAttemptsController = RegistrationAttemptsController;
