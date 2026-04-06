/**
 * Auth Backend Service - Atlas F&A
 * Handles authentication with Django backend
 *
 * SECURITY: Tokens are stored in-memory (module-scoped variables) instead of
 * localStorage to mitigate XSS token-theft. Trade-off: tokens do not survive
 * page refresh, so the user will need to re-authenticate after a full reload.
 * When the Django backend supports httpOnly cookie-based auth, migrate to that.
 */
import apiService from './api.service';

// ── In-memory token store (not accessible from XSS payloads) ──────────────
let _accessToken: string | null = null;
let _refreshToken: string | null = null;

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
    const { data } = await apiService.post<LoginResponse>(`${this.BASE_PATH}/login/`, credentials);

    // Store tokens in memory
    if (data.access) {
      _accessToken = data.access;
    }
    if (data.refresh) {
      _refreshToken = data.refresh;
    }

    return data;
  }

  async logout(): Promise<void> {
    try {
      if (_refreshToken) {
        await apiService.post(`${this.BASE_PATH}/logout/`, { refresh: _refreshToken });
      }
    } catch (_err) {
      // Logout API call failed -- clear tokens regardless
    } finally {
      _accessToken = null;
      _refreshToken = null;
    }
  }

  async getProfile(): Promise<UserProfile> {
    const { data } = await apiService.get<UserProfile>(`${this.BASE_PATH}/profile/`);
    return data;
  }

  async refreshToken(): Promise<{ access: string }> {
    if (!_refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await apiService.post<{ access: string }>(`${this.BASE_PATH}/token/refresh/`, {
      refresh: _refreshToken
    });

    if (data.access) {
      _accessToken = data.access;
    }

    return data;
  }

  isAuthenticated(): boolean {
    return !!_accessToken;
  }

  getToken(): string | null {
    return _accessToken;
  }
}

export const authBackendService = new AuthBackendService();
export default authBackendService;
