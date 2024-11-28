import axios from 'axios';
import config from '../config';

class AuthService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.authServiceUrl;
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
    const response = await axios.post(`${this.baseUrl}/v1/token/validate`, {
      token
    });
    return response.data;
  }
}

export default new AuthService(); 