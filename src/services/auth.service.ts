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
    const user = response.user as any;

    // Transform backend response to frontend format
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username || user.email,
        role: user.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
        isActive: user.is_active,
        isStaff: user.is_staff || false,
        isSuperuser: user.is_superuser || false,
        phone: user.phone || '',
        avatar: user.avatar || null,
        lastLogin: user.last_login || '',
        dateJoined: user.date_joined || '',
        emailVerified: user.email_verified || false,
        twoFactorEnabled: user.two_factor_enabled || false,
      } as unknown as User,
      accessToken: response.access,
      refreshToken: response.refresh,
    };
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await (authBackendService as any).register({
      email: userData.email,
      password: userData.password,
      username: (userData as any).username || userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
    });

    const user = response.user as any;

    // Transform backend response to frontend format
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        username: user.username || user.email,
        role: user.role || { id: '', code: 'user', name: 'User', description: '', is_active: true },
        isActive: user.is_active,
        isStaff: user.is_staff || false,
        isSuperuser: user.is_superuser || false,
        phone: user.phone || '',
        avatar: user.avatar || null,
        lastLogin: user.last_login || '',
        dateJoined: user.date_joined || '',
        emailVerified: user.email_verified || false,
        twoFactorEnabled: user.two_factor_enabled || false,
      } as unknown as User,
      accessToken: response.access,
      refreshToken: response.refresh,
    };
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await (authBackendService as any).refreshToken(refreshToken);
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
    const response = await authBackendService.getProfile() as any;

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
    } as unknown as User;
  }

  static async updateProfile(userData: Partial<User>): Promise<User> {
    const backendData: Record<string, string> = {};
    if (userData.firstName) backendData.first_name = userData.firstName;
    if (userData.lastName) backendData.last_name = userData.lastName;
    if (userData.phone) backendData.phone = userData.phone;
    if ((userData as any).avatar) backendData.avatar = (userData as any).avatar;

    const response = await (authBackendService as any).updateProfile(backendData) as any;

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
    } as unknown as User;
  }

  static async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    await (authBackendService as any).changePassword(passwordData.currentPassword, passwordData.newPassword);
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  static async requestPasswordReset(email: string): Promise<ApiResponse> {
    await (authBackendService as any).resetPassword(email);
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
    await (authBackendService as any).verifyEmail(token);
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  static async resendVerificationEmail(): Promise<ApiResponse> {
    await (authBackendService as any).resendVerification();
    return {
      success: true,
      message: 'Verification email sent',
    };
  }
}
