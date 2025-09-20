import axios from 'axios';
import { User, AuthTokens, API_ENDPOINTS } from '@win5x/common';

// In dev, omit base URL to use Vite proxy so mobile over LAN works without envs
// Force empty baseURL regardless of VITE_API_URL to use Vite proxy
const API_URL = '';

class AuthService {
  private api = axios.create({
    baseURL: API_URL, // Force empty baseURL to use Vite proxy
    timeout: 30000, // Increased timeout to 30 seconds
  });

  constructor() {
    console.log('🔧 AuthService initialized with baseURL:', this.api.defaults.baseURL);
    console.log('🌐 VITE_API_URL:', import.meta.env.VITE_API_URL);
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const tokens = this.getStoredTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = this.getStoredTokens();
            if (tokens?.refreshToken) {
              const newTokens = await this.refreshToken(tokens.refreshToken);
              this.storeTokens(newTokens);
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearStoredTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      console.log('🔐 Attempting login for user:', username);
      console.log('🌐 API URL:', this.api.defaults.baseURL || 'relative');
      console.log('📡 Endpoint:', API_ENDPOINTS.LOGIN);
      console.log('🔧 Full URL will be:', `${this.api.defaults.baseURL || ''}${API_ENDPOINTS.LOGIN}`);
      
      const response = await this.api.post(API_ENDPOINTS.LOGIN, {
        username,
        password,
      });

      console.log('✅ Login successful:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      console.error('❌ Error config:', error.config);
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Request timeout - check network connection');
        throw new Error('Connection timeout. Please check your internet connection and try again.');
      }
      if (error.code === 'ERR_NETWORK') {
        console.error('🌐 Network error - check if backend is running and accessible');
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }

  async register(username: string, email: string, password: string, referralCode?: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      console.log('📝 Attempting registration for user:', username);
      console.log('🌐 API URL:', this.api.defaults.baseURL || 'relative');
      console.log('📡 Endpoint:', API_ENDPOINTS.REGISTER);
      
      const response = await this.api.post(API_ENDPOINTS.REGISTER, {
        username,
        email,
        password,
        referralCode,
      });

      console.log('✅ Registration successful:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Request timeout - check network connection');
        throw new Error('Connection timeout. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.api.post(API_ENDPOINTS.REFRESH, {
      refreshToken,
    });

    return response.data.data;
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const response = await this.api.get(API_ENDPOINTS.VERIFY, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data.type === 'user') {
        return response.data.data.user;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearStoredTokens();
    }
  }

  async logoutAuthenticated(): Promise<void> {
    try {
      await this.api.post('/api/auth/logout-authenticated');
    } catch (error) {
      // Ignore logout errors
    }
  }

  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('user_tokens', JSON.stringify(tokens));
  }

  getStoredTokens(): AuthTokens | null {
    try {
      const stored = localStorage.getItem('user_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  clearStoredTokens(): void {
    localStorage.removeItem('user_tokens');
  }

  getApi() {
    return this.api;
  }
}

export const authService = new AuthService();