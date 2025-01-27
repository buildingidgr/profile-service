"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfessionalService = void 0;
const mongodb_1 = require("mongodb");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const logger = (0, logger_1.createLogger)('ProfessionalService');
const mongoClient = new mongodb_1.MongoClient(process.env.DATABASE_URL || '');
const db = mongoClient.db();
const DEFAULT_PROFESSIONAL_INFO = {
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
class ProfessionalService {
    async getProfessionalInfo(clerkId) {
        try {
            const professionalCollection = db.collection('ProfessionalInfo');
            const info = await professionalCollection.findOne({ clerkId });
            if (!info) {
                await this.createDefaultProfessionalInfo(clerkId);
                return DEFAULT_PROFESSIONAL_INFO;
            }
            return info.professionalInfo;
        }
        catch (error) {
            logger.error('Error getting professional info', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to get professional info');
        }
    }
    async updateProfessionalInfo(clerkId, data) {
        try {
            const professionalCollection = db.collection('ProfessionalInfo');
            const currentInfo = await professionalCollection.findOne({ clerkId });
            // Validate profession if it's being updated
            if (data.profession?.current && !DEFAULT_PROFESSIONAL_INFO.profession.allowedValues.includes(data.profession.current)) {
                throw new errors_1.BadRequestError('Invalid profession value');
            }
            const updatedInfo = {
                ...DEFAULT_PROFESSIONAL_INFO,
                ...(currentInfo?.professionalInfo || {}),
                ...data
            };
            const result = await professionalCollection.findOneAndUpdate({ clerkId }, {
                $set: {
                    professionalInfo: updatedInfo,
                    updatedAt: new Date()
                }
            }, {
                upsert: true,
                returnDocument: 'after'
            });
            if (!result.value) {
                throw new errors_1.BadRequestError('Failed to update professional info');
            }
            return result.value.professionalInfo;
        }
        catch (error) {
            logger.error('Error updating professional info', { error, clerkId });
            throw new errors_1.BadRequestError('Failed to update professional info');
        }
    }
    async createDefaultProfessionalInfo(clerkId) {
        const professionalCollection = db.collection('ProfessionalInfo');
        await professionalCollection.insertOne({
            clerkId,
            professionalInfo: DEFAULT_PROFESSIONAL_INFO,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}
exports.ProfessionalService = ProfessionalService;
