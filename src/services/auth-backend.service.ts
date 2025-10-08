/**
 * Service d'authentification WiseBook
 * Aligné avec le backend Django REST Framework + JWT
 */

import { enhancedApiClient } from '@/lib/enhanced-api-client';
import type {
  LoginRequest,
  LoginResponse,
  TokenRefreshRequest,
  TokenRefreshResponse,
  User,
  RegisterRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirm,
  ApiResponse
} from '@/types/backend.types';

export class AuthBackendService {
  private readonly baseUrl = '/auth';

  /**
   * Connexion utilisateur
   * POST /api/v1/auth/login/
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return enhancedApiClient.post<LoginResponse>(`${this.baseUrl}/login/`, credentials);
  }

  /**
   * Déconnexion utilisateur
   * POST /api/v1/auth/logout/
   */
  async logout(): Promise<ApiResponse> {
    return enhancedApiClient.post<ApiResponse>(`${this.baseUrl}/logout/`);
  }

  /**
   * Récupérer le profil utilisateur connecté
   * GET /api/v1/auth/profile/
   */
  async getProfile(): Promise<User> {
    return enhancedApiClient.get<User>(`${this.baseUrl}/profile/`);
  }

  /**
   * Obtenir un token JWT
   * POST /api/v1/auth/token/
   */
  async getToken(credentials: LoginRequest): Promise<LoginResponse> {
    return enhancedApiClient.post<LoginResponse>(`${this.baseUrl}/token/`, credentials);
  }

  /**
   * Rafraîchir le token JWT
   * POST /api/v1/auth/token/refresh/
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponse> {
    const request: TokenRefreshRequest = { refresh: refreshToken };
    return enhancedApiClient.post<TokenRefreshResponse>(`${this.baseUrl}/token/refresh/`, request);
  }

  /**
   * Enregistrer un nouvel utilisateur (si activé)
   * POST /api/v1/auth/register/
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    return enhancedApiClient.post<LoginResponse>(`${this.baseUrl}/register/`, userData);
  }

  /**
   * Changer le mot de passe
   * PUT /api/v1/auth/password/
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse> {
    return enhancedApiClient.put<ApiResponse>(`${this.baseUrl}/password/`, passwordData);
  }

  /**
   * Demander une réinitialisation de mot de passe
   * POST /api/v1/auth/password-reset-request/
   */
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    const request: PasswordResetRequest = { email };
    return enhancedApiClient.post<ApiResponse>(`${this.baseUrl}/password-reset-request/`, request);
  }

  /**
   * Confirmer la réinitialisation de mot de passe
   * POST /api/v1/auth/password-reset/
   */
  async resetPassword(data: PasswordResetConfirm): Promise<ApiResponse> {
    return enhancedApiClient.post<ApiResponse>(`${this.baseUrl}/password-reset/`, data);
  }

  /**
   * Vérifier l'email
   * POST /api/v1/auth/verify-email/
   */
  async verifyEmail(token: string): Promise<ApiResponse> {
    return enhancedApiClient.post<ApiResponse>(`${this.baseUrl}/verify-email/`, { token });
  }

  /**
   * Renvoyer l'email de vérification
   * POST /api/v1/auth/resend-verification/
   */
  async resendVerificationEmail(): Promise<ApiResponse> {
    return enhancedApiClient.post<ApiResponse>(`${this.baseUrl}/resend-verification/`);
  }
}

// Singleton instance
export const authBackendService = new AuthBackendService();

// Default export
export default authBackendService;
