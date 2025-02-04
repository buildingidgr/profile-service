"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationService = void 0;
const logger_1 = require("@shared/utils/logger");
const database_1 = require("@shared/utils/database");
const logger = (0, logger_1.createLogger)('RegistrationService');
const db = database_1.mongoClient.db();
class RegistrationService {
    async storeRegistrationAttempt(payload) {
        try {
            logger.info('Storing registration attempt');
            const registrationAttemptsCollection = db.collection('registration.attempts');
            const result = await registrationAttemptsCollection.insertOne({
                ...payload,
                createdAt: new Date()
            });
            logger.info('Registration attempt stored successfully', { id: result.insertedId });
            return result.insertedId;
        }
        catch (error) {
            logger.error('Error storing registration attempt', { error });
            throw new Error('Failed to store registration attempt');
        }
    }
    async getRegistrationAttempts(page, limit, phoneNumber) {
        try {
            logger.info('Fetching registration attempts', { page, limit, phoneNumber });
            const registrationAttemptsCollection = db.collection('registration.attempts');
            const query = phoneNumber ? { 'data.data.to_phone_number': phoneNumber } : {};
            const totalCount = await registrationAttemptsCollection.countDocuments(query);
            const attempts = await registrationAttemptsCollection
                .find(query)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray();
            logger.info('Registration attempts fetched successfully', { count: attempts.length });
            return {
                attempts,
                totalCount,
                currentPage: page,
                totalPages: Math.ceil(totalCount / limit)
            };
        }
        catch (error) {
            logger.error('Error fetching registration attempts', { error });
            throw new Error('Failed to fetch registration attempts');
        }
    }
}
exports.RegistrationService = RegistrationService;
//# sourceMappingURL=RegistrationService.js.map