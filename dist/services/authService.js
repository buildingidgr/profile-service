"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
class AuthService {
    constructor() {
        if (!config_1.config.auth.serviceUrl) {
            throw new Error('AUTH_SERVICE_URL is not configured');
        }
        this.baseUrl = config_1.config.auth.serviceUrl.replace(/\/+$/, '');
    }
    async exchangeApiKey(apiKey) {
        const response = await axios_1.default.post(`${this.baseUrl}/v1/token/exchange`, {
            apiKey
        });
        return response.data;
    }
    async refreshToken(refreshToken) {
        const response = await axios_1.default.post(`${this.baseUrl}/v1/token/refresh`, {
            refresh_token: refreshToken
        });
        return response.data;
    }
    async validateToken(token) {
        if (!token) {
            throw new Error('Token is required');
        }
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/v1/token/validate`, {
                token
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error('Auth service error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    url: `${this.baseUrl}/v1/token/validate`
                });
            }
            throw error;
        }
    }
}
exports.default = new AuthService();
