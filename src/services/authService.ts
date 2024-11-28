import axios from 'axios';
import { config } from '../config';

class AuthService {
  private baseUrl: string;

  constructor() {
    if (!config.auth.serviceUrl) {
      throw new Error('AUTH_SERVICE_URL is not configured');
    }
    this.baseUrl = config.auth.serviceUrl.replace(/\/+$/, '');
  }

  async exchangeApiKey(apiKey: string) {
    const response = await axios.post(`${this.baseUrl}/v1/token/exchange`, {
      apiKey
    });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await axios.post(`${this.baseUrl}/v1/token/refresh`, {
      refresh_token: refreshToken
    });
    return response.data;
  }

  async validateToken(token: string) {
    if (!token) {
      throw new Error('Token is required');
    }
    
    try {
      const response = await axios.post(`${this.baseUrl}/v1/token/validate`, {
        token
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
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

export default new AuthService(); 