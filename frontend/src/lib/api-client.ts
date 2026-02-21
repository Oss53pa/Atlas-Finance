/**
 * CLIENT API ROBUSTE - ATLAS FINANCE
 *
 * Client Axios configuré avec:
 * - Intercepteurs authentification JWT
 * - Gestion d'erreurs globale
 * - Retry automatique
 * - Timeout configuré
 * - Logging en développement
 * - Refresh token automatique
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import { toast } from 'react-hot-toast';
import { isDemoMode, hasMockData, getMockData } from './mockData';

// Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 secondes
const MAX_RETRIES = 3;

/**
 * Interface pour les erreurs API standardisées
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
  details?: Record<string, unknown>;
}

/**
 * Interface pour les réponses paginées
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Interface pour les paramètres de requête
 */
export interface QueryParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Classe principale du client API
 */
class ApiClient {
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (error?: unknown) => void;
  }> = [];

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Configuration des intercepteurs
   */
  private setupInterceptors(): void {
    // Intercepteur de requête - Ajout du token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // MODE DÉMO : Intercepter les requêtes et retourner des données mockées
        if (isDemoMode() && config.url && hasMockData(config.url)) {
          const mockData = getMockData(config.url);


          // Retourner une promesse résolue avec des données mockées
          return Promise.reject({
            config,
            response: {
              data: mockData,
              status: 200,
              statusText: 'OK (Mock)',
              headers: {},
              config,
            },
            isAxiosError: false,
            toJSON: () => ({}),
            name: 'MockResponse',
            message: 'Mock data',
            _isMockResponse: true,  // Flag pour identifier les réponses mockées
          });
        }

        const token = this.getAccessToken();

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Dev logging removed for production cleanliness

        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse - Gestion des erreurs
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Dev logging removed for production cleanliness

        return response;
      },
      async (error: AxiosError & { _isMockResponse?: boolean; response?: AxiosResponse }) => {
        // MODE DÉMO : Gérer les réponses mockées
        if ((error as Record<string, unknown>)._isMockResponse) {
          return Promise.resolve(error.response);
        }

        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Log erreur
        console.error('❌ API Error:', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        // Gestion du 401 - Token expiré
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Si déjà en cours de refresh, mettre en queue
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.axiosInstance(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();

            // Résoudre toutes les requêtes en queue
            this.failedQueue.forEach((promise) => {
              promise.resolve(newToken);
            });
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }

            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Échec du refresh - Déconnexion
            this.failedQueue.forEach((promise) => {
              promise.reject(refreshError);
            });
            this.failedQueue = [];

            this.handleAuthError();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Gestion d'autres erreurs
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Formatage des erreurs API
   */
  private formatError(error: AxiosError): ApiError {
    const response = error.response;

    if (response) {
      // Erreur serveur
      const apiError: ApiError = {
        message: this.extractErrorMessage(response.data),
        status: response.status,
        code: (response.data as Record<string, unknown>)?.code as string | undefined,
        errors: (response.data as Record<string, unknown>)?.errors as Record<string, string[]> | undefined,
        details: response.data as Record<string, unknown>,
      };

      // Afficher toast selon le type d'erreur
      if (response.status === 400) {
        toast.error(apiError.message || 'Données invalides');
      } else if (response.status === 403) {
        toast.error('Accès refusé');
      } else if (response.status === 404) {
        toast.error('Ressource non trouvée');
      } else if (response.status === 500) {
        toast.error('Erreur serveur. Veuillez réessayer.');
      }

      return apiError;
    } else if (error.request) {
      // Erreur réseau
      const networkError: ApiError = {
        message: 'Erreur de connexion. Vérifiez votre connexion internet.',
        code: 'NETWORK_ERROR',
      };
      toast.error(networkError.message);
      return networkError;
    } else {
      // Autre erreur
      const genericError: ApiError = {
        message: error.message || 'Une erreur est survenue',
        code: 'UNKNOWN_ERROR',
      };
      toast.error(genericError.message);
      return genericError;
    }
  }

  /**
   * Extraction du message d'erreur
   */
  private extractErrorMessage(data: unknown): string {
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      if (typeof d.message === 'string') return d.message;
      if (typeof d.detail === 'string') return d.detail;
      if (typeof d.error === 'string') return d.error;

      // Erreurs de validation Django
      if (d.errors && typeof d.errors === 'object') {
        const firstError = Object.values(d.errors)[0];
        if (Array.isArray(firstError) && typeof firstError[0] === 'string') {
          return firstError[0];
        }
      }
    }

    return 'Une erreur est survenue';
  }

  /**
   * Gestion de l'erreur d'authentification
   */
  private handleAuthError(): void {
    // ✅ Ne pas rediriger en mode DÉMO
    const token = localStorage.getItem('authToken');
    const isDemoMode = token && token.startsWith('demo_token_');

    if (isDemoMode) {
      console.warn('⚠️ [API Client] Erreur auth en mode DÉMO - pas de redirection');
      return;
    }

    // Supprimer les tokens
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Rediriger vers login
    if (window.location.pathname !== '/login') {
      toast.error('Session expirée. Veuillez vous reconnecter.');
      window.location.href = '/login';
    }
  }

  /**
   * Récupération du token d'accès
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Récupération du refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Refresh du token d'accès
   */
  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // ✅ Ne pas essayer de refresh en mode DÉMO
    if (refreshToken.startsWith('demo_refresh_')) {
      console.warn('⚠️ [API Client] Tentative de refresh en mode DÉMO - ignoré');
      throw new Error('Demo mode - no refresh');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/token/refresh/`,
        { refresh: refreshToken }
      );

      const newAccessToken = response.data.access;
      localStorage.setItem('authToken', newAccessToken);

      return newAccessToken;
    } catch (error) {
      throw error;
    }
  }

  /**
   * MÉTHODES HTTP PRINCIPALES
   */

  /**
   * GET Request
   */
  async get<T = unknown>(url: string, params?: QueryParams, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * POST Request
   */
  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT Request
   */
  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH Request
   */
  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE Request
   */
  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  /**
   * GET Request avec pagination
   */
  async getPaginated<T = unknown>(
    url: string,
    params?: QueryParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedResponse<T>> {
    const response = await this.axiosInstance.get<PaginatedResponse<T>>(url, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * Upload de fichier
   */
  async uploadFile<T = any>(
    url: string,
    file: File,
    additionalData?: Record<string, any>,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await this.axiosInstance.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });

    return response.data;
  }

  /**
   * Téléchargement de fichier
   */
  async downloadFile(url: string, filename: string, params?: QueryParams): Promise<void> {
    const response = await this.axiosInstance.get(url, {
      params,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    toast.success('Fichier téléchargé avec succès');
  }

  /**
   * Request avec retry automatique
   */
  async requestWithRetry<T = any>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    dataOrParams?: any,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    try {
      if (method === 'get') {
        return await this.get<T>(url, dataOrParams);
      } else if (method === 'delete') {
        return await this.delete<T>(url, dataOrParams);
      } else {
        return await (this[method] as any)<T>(url, dataOrParams);
      }
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error as AxiosError)) {
        console.warn(`⚠️ Retry ${MAX_RETRIES - retries + 1}/${MAX_RETRIES} for ${url}`);
        await this.delay(1000 * (MAX_RETRIES - retries + 1)); // Backoff exponentiel
        return this.requestWithRetry<T>(method, url, dataOrParams, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Vérifier si l'erreur est retry-able
   */
  private isRetryableError(error: AxiosError): boolean {
    return (
      !error.response ||
      error.response.status === 408 || // Request Timeout
      error.response.status === 429 || // Too Many Requests
      error.response.status >= 500 // Server Errors
    );
  }

  /**
   * Délai pour retry
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Obtenir l'instance Axios brute (pour cas particuliers)
   */
  getInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export instance singleton
export const apiClient = new ApiClient();

// Export classe pour tests
export { ApiClient };

// Export types
export type { AxiosInstance, AxiosRequestConfig, AxiosResponse };