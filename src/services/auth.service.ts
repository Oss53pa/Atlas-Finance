import { apiClient } from '@/lib/api';
import { 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  ChangePasswordRequest, 
  User,
  ApiResponse 
} from '@/types';

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', credentials);
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', userData);
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    return apiClient.post<{ accessToken: string }>('/auth/refresh', { refreshToken });
  }

  static async logout(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/auth/logout');
  }

  static async getProfile(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    return apiClient.put<User>('/auth/profile', userData);
  }

  static async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    return apiClient.put<ApiResponse>('/auth/password', passwordData);
  }

  static async requestPasswordReset(email: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/auth/password-reset-request', { email });
  }

  static async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/auth/password-reset', { token, newPassword });
  }

  static async verifyEmail(token: string): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/auth/verify-email', { token });
  }

  static async resendVerificationEmail(): Promise<ApiResponse> {
    return apiClient.post<ApiResponse>('/auth/resend-verification');
  }
}