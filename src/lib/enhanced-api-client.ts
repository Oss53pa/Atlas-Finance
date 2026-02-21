/**
 * Enhanced API Client for Atlas Finance
 *
 * Features:
 * - JWT Authentication with auto-refresh
 * - Automatic retry with exponential backoff
 * - Request/Response logging
 * - Error handling and validation
 * - Request cancellation
 * - Request queue management
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import type {
  ApiClientConfig,
  RetryConfig,
  ApiLogEntry,
  LogLevel,
  ApiError,
  PaginatedResponse
} from '@/types/backend.types';

// ==================== CONFIGURATION ====================

const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableLogging: import.meta.env.DEV,
  headers: {
    'Content-Type': 'application/json',
  },
};

const RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoff: 'exponential',
  retryableErrors: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
};

// ==================== LOGGER ====================

class ApiLogger {
  private logs: ApiLogEntry[] = [];
  private maxLogs = 100;
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  log(entry: ApiLogEntry, level: LogLevel = 'info') {
    if (!this.enabled) return;

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest
    }

    // Console output based on level
    const message = `[API] ${entry.method} ${entry.url} - ${entry.status || 'pending'}${entry.duration ? ` (${entry.duration}ms)` : ''}`;

    switch (level) {
      case 'debug':
        console.debug(message, entry);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message, entry);
        break;
      case 'error':
        console.error(message, entry);
        break;
    }
  }

  getRecentLogs(count: number = 20): ApiLogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs() {
    this.logs = [];
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// ==================== RETRY LOGIC ====================

class RetryHandler {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  shouldRetry(error: AxiosError, attemptNumber: number): boolean {
    if (attemptNumber >= this.config.maxAttempts) {
      return false;
    }

    // Don't retry if no response (network error) unless it's a timeout
    if (!error.response && error.code !== 'ECONNABORTED') {
      return false;
    }

    // Don't retry 4xx errors (except specific ones)
    const status = error.response?.status;
    if (status && this.config.retryableErrors?.includes(status)) {
      return true;
    }

    return false;
  }

  getDelay(attemptNumber: number): number {
    if (this.config.backoff === 'exponential') {
      return this.config.delayMs * Math.pow(2, attemptNumber - 1);
    }
    return this.config.delayMs * attemptNumber;
  }

  async wait(attemptNumber: number): Promise<void> {
    const delay = this.getDelay(attemptNumber);
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ==================== ENHANCED API CLIENT ====================

export class EnhancedApiClient {
  private client: AxiosInstance;
  private logger: ApiLogger;
  private retryHandler: RetryHandler;
  private abortControllers: Map<string, AbortController>;
  private requestQueue: Map<string, Promise<unknown>>;

  constructor(config: Partial<ApiClientConfig> = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    this.logger = new ApiLogger(finalConfig.enableLogging);
    this.retryHandler = new RetryHandler(RETRY_CONFIG);
    this.abortControllers = new Map();
    this.requestQueue = new Map();

    this.client = axios.create({
      baseURL: finalConfig.baseURL,
      timeout: finalConfig.timeout,
      headers: finalConfig.headers,
    });

    this.setupInterceptors();
  }

  // ==================== INTERCEPTORS ====================

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const startTime = Date.now();

        // Add auth token from localStorage
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }

        // Store start time for duration tracking
        (config as AxiosRequestConfig & { metadata?: { startTime: number } }).metadata = { startTime };

        // Log request
        this.logger.log({
          timestamp: new Date().toISOString(),
          method: config.method?.toUpperCase() || 'GET',
          url: config.url || '',
          requestData: config.data,
        }, 'debug');

        return config;
      },
      (error) => {
        this.logger.log({
          timestamp: new Date().toISOString(),
          method: '',
          url: '',
          error: error.message,
        }, 'error');
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - ((response.config as AxiosRequestConfig & { metadata?: { startTime: number } }).metadata?.startTime || 0);

        // Log response
        this.logger.log({
          timestamp: new Date().toISOString(),
          method: response.config.method?.toUpperCase() || 'GET',
          url: response.config.url || '',
          status: response.status,
          duration,
          responseData: response.data,
        }, 'info');

        return response;
      },
      async (error: AxiosError) => {
        return this.handleResponseError(error);
      }
    );
  }

  // ==================== ERROR HANDLING ====================

  private async handleResponseError(error: AxiosError): Promise<unknown> {
    const originalRequest = error.config as AxiosRequestConfig & { metadata?: { startTime: number }; _retry?: boolean; _retryCount?: number };
    const duration = Date.now() - (originalRequest.metadata?.startTime || 0);

    // Log error
    this.logger.log({
      timestamp: new Date().toISOString(),
      method: originalRequest.method?.toUpperCase() || 'GET',
      url: originalRequest.url || '',
      status: error.response?.status,
      duration,
      error: error.message,
      responseData: error.response?.data,
    }, 'error');

    // Handle 401 Unauthorized - Token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      return this.handleTokenRefresh(originalRequest);
    }

    // Handle retryable errors
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    if (this.retryHandler.shouldRetry(error, originalRequest._retryCount + 1)) {
      originalRequest._retryCount += 1;

      this.logger.log({
        timestamp: new Date().toISOString(),
        method: originalRequest.method?.toUpperCase() || 'GET',
        url: originalRequest.url || '',
        error: `Retrying (${originalRequest._retryCount}/${RETRY_CONFIG.maxAttempts})`,
      }, 'warn');

      await this.retryHandler.wait(originalRequest._retryCount);
      return this.client(originalRequest);
    }

    // Show error toast
    this.showErrorToast(error);

    return Promise.reject(this.normalizeError(error));
  }

  private async handleTokenRefresh(originalRequest: AxiosRequestConfig & { _retry?: boolean; headers: Record<string, string> }): Promise<unknown> {
    originalRequest._retry = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      const authToken = localStorage.getItem('authToken');
      const isDemoMode = authToken && authToken.startsWith('demo_token_');

      if (!refreshToken) {
        // ✅ Ne pas rediriger en mode DÉMO
        if (!isDemoMode) {
          // Clear auth data and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        } else {
          console.warn('⚠️ [Enhanced API] Pas de refresh token en mode DÉMO - pas de redirection');
        }
        return Promise.reject(new Error('No refresh token available'));
      }

      // Call refresh endpoint (without interceptors to avoid infinite loop)
      const response = await axios.post(
        `${this.client.defaults.baseURL?.replace('/api/v1', '')}/api/v1/auth/token/refresh/`,
        { refresh: refreshToken }
      );

      const { access: newAccessToken } = response.data;
      localStorage.setItem('authToken', newAccessToken);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return this.client(originalRequest);

    } catch (refreshError) {
      // ✅ Ne pas rediriger en mode DÉMO
      const authToken = localStorage.getItem('authToken');
      const isDemoMode = authToken && authToken.startsWith('demo_token_');

      if (!isDemoMode) {
        // Clear auth data and redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        toast.error('Session expirée. Veuillez vous reconnecter.');
        window.location.href = '/login';
      } else {
        console.warn('⚠️ [Enhanced API] Échec refresh en mode DÉMO - pas de redirection');
      }
      return Promise.reject(refreshError);
    }
  }

  private showErrorToast(error: AxiosError) {
    const apiError = error.response?.data as { detail?: string; message?: string; errors?: Record<string, string[]> } | undefined;

    if (apiError?.detail) {
      toast.error(apiError.detail);
    } else if (apiError?.message) {
      toast.error(apiError.message);
    } else if (apiError?.errors) {
      const firstError = Object.values(apiError.errors)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        toast.error(firstError[0]);
      }
    } else if (error.message) {
      // Don't show generic network errors in production
      if (import.meta.env.DEV) {
        toast.error(error.message);
      } else {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
      }
    }
  }

  private normalizeError(error: AxiosError): ApiError {
    const apiError = error.response?.data as { detail?: string; message?: string; errors?: Record<string, string[]> } | undefined;

    return {
      message: apiError?.detail || apiError?.message || error.message || 'Une erreur est survenue',
      detail: apiError?.detail,
      errors: apiError?.errors,
    };
  }

  // ==================== PUBLIC API ====================

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async getPaginated<T>(url: string, params?: Record<string, unknown>): Promise<PaginatedResponse<T>> {
    const response: AxiosResponse<PaginatedResponse<T>> = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // ==================== REQUEST CANCELLATION ====================

  cancelRequest(requestId: string) {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  cancelAllRequests() {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  // ==================== UTILITIES ====================

  getRecentLogs(count?: number) {
    return this.logger.getRecentLogs(count);
  }

  clearLogs() {
    this.logger.clearLogs();
  }

  setLoggingEnabled(enabled: boolean) {
    this.logger.setEnabled(enabled);
  }

  getBaseURL(): string {
    return this.client.defaults.baseURL || '';
  }

  setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }
}

// ==================== SINGLETON INSTANCE ====================

export const enhancedApiClient = new EnhancedApiClient();

// Export for backward compatibility
export const apiClient = enhancedApiClient;

// Export default
export default enhancedApiClient;
