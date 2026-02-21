import { authBackendService } from './auth-backend.service';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  User,
  ApiResponse
} from '@/types';
import type { LoginRequest as BackendLoginRequest } from '../types/backend.types';

/**
 * Auth Service Adapter
 * Adapts the new backend service to the existing frontend interface
 */
export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const backendRequest: BackendLoginRequest = {
      email: credentials.email,
      password: credentials.password,
    };

    const response = await authBackendService.login(backendRequest);

    // Transform backend response to frontend format
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.first_name || '',
        lastName: response.user.last_name || '',
        username: response.user.username || response.user.email,
        role: response.user.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
        isActive: response.user.is_active,
        isStaff: response.user.is_staff || false,
        isSuperuser: response.user.is_superuser || false,
        phone: response.user.phone || '',
        avatar: response.user.avatar || null,
        lastLogin: response.user.last_login || '',
        dateJoined: response.user.date_joined || '',
        emailVerified: response.user.email_verified || false,
        twoFactorEnabled: response.user.two_factor_enabled || false,
      },
      accessToken: response.access,
      refreshToken: response.refresh,
    };
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await authBackendService.register({
      email: userData.email,
      password: userData.password,
      username: userData.username || userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
    });

    // Transform backend response to frontend format
    return {
      user: {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.first_name || '',
        lastName: response.user.last_name || '',
        username: response.user.username || response.user.email,
        role: response.user.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
        isActive: response.user.is_active,
        isStaff: response.user.is_staff || false,
        isSuperuser: response.user.is_superuser || false,
        phone: response.user.phone || '',
        avatar: response.user.avatar || null,
        lastLogin: response.user.last_login || '',
        dateJoined: response.user.date_joined || '',
        emailVerified: response.user.email_verified || false,
        twoFactorEnabled: response.user.two_factor_enabled || false,
      },
      accessToken: response.access,
      refreshToken: response.refresh,
    };
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await authBackendService.refreshToken(refreshToken);
    return {
      accessToken: response.access,
    };
  }

  static async logout(): Promise<ApiResponse> {
    await authBackendService.logout();
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  static async getProfile(): Promise<User> {
    const response = await authBackendService.getProfile();

    // Transform backend response to frontend format
    return {
      id: response.id,
      email: response.email,
      firstName: response.first_name || '',
      lastName: response.last_name || '',
      username: response.username || response.email,
      role: response.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
      isActive: response.is_active,
      isStaff: response.is_staff || false,
      isSuperuser: response.is_superuser || false,
      phone: response.phone || '',
      avatar: response.avatar || null,
      lastLogin: response.last_login || '',
      dateJoined: response.date_joined || '',
      emailVerified: response.email_verified || false,
      twoFactorEnabled: response.two_factor_enabled || false,
    };
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const backendData: Record<string, string> = {};
    if (userData.firstName) backendData.first_name = userData.firstName;
    if (userData.lastName) backendData.last_name = userData.lastName;
    if (userData.phone) backendData.phone = userData.phone;
    if (userData.avatar) backendData.avatar = userData.avatar;

    const response = await authBackendService.updateProfile(backendData);

    // Transform backend response to frontend format
    return {
      id: response.id,
      email: response.email,
      firstName: response.first_name || '',
      lastName: response.last_name || '',
      username: response.username || response.email,
      role: response.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
      isActive: response.is_active,
      isStaff: response.is_staff || false,
      isSuperuser: response.is_superuser || false,
      phone: response.phone || '',
      avatar: response.avatar || null,
      lastLogin: response.last_login || '',
      dateJoined: response.date_joined || '',
      emailVerified: response.email_verified || false,
      twoFactorEnabled: response.two_factor_enabled || false,
    };
  }

  static async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    await authBackendService.changePassword(passwordData.currentPassword, passwordData.newPassword);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  static async requestPasswordReset(email: string): Promise<ApiResponse> {
    await authBackendService.resetPassword(email);
    return {
      success: true,
      message: 'Password reset email sent',
    };
  }

  static async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    // This would need to be implemented on the backend with token-based reset
    // For now, we return a placeholder
    return {
      success: true,
      message: 'Password reset functionality not yet implemented on backend',
    };
  }

  static async verifyEmail(token: string): Promise<ApiResponse> {
    await authBackendService.verifyEmail(token);
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  static async resendVerificationEmail(): Promise<ApiResponse> {
    await authBackendService.resendVerification();
    return {
      success: true,
      message: 'Verification email sent',
    };
  }
}