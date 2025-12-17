/**
 * Auth Backend Service - WiseBook ERP
 * Handles authentication with Django backend
 */
import apiService from './api.service';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
  };
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  date_joined?: string;
  last_login?: string;
  company?: string;
  phone?: string;
  permissions?: string[];
}

class AuthBackendService {
  private BASE_PATH = '/api/v1/auth';

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiService.post<LoginResponse>(`${this.BASE_PATH}/login/`, credentials);

    // Store tokens
    if (response.access) {
      localStorage.setItem('authToken', response.access);
    }
    if (response.refresh) {
      localStorage.setItem('refreshToken', response.refresh);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await apiService.post(`${this.BASE_PATH}/logout/`, { refresh: refreshToken });
      }
    } catch (error) {
      console.warn('Logout error (ignored):', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  async getProfile(): Promise<UserProfile> {
    return apiService.get<UserProfile>(`${this.BASE_PATH}/profile/`);
  }

  async refreshToken(): Promise<{ access: string }> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<{ access: string }>(`${this.BASE_PATH}/token/refresh/`, {
      refresh: refreshToken
    });

    if (response.access) {
      localStorage.setItem('authToken', response.access);
    }

    return response;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export const authBackendService = new AuthBackendService();
export default authBackendService;
