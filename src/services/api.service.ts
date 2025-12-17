import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Configuration de base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000; // 30 secondes

console.log('🔧 [API Service] Base URL:', API_BASE_URL);

// Types de base pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface QueryParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
  [key: string]: any;
}

// Classe principale du service API
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteur pour ajouter le token d'authentification
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur pour gérer les erreurs
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // ✅ Ne pas rediriger en mode DÉMO
          const token = localStorage.getItem('authToken');
          const isDemoMode = token && (token.startsWith('demo_token_') || import.meta.env.DEV);

          if (!isDemoMode) {
            // Token expiré ou invalide
            localStorage.removeItem('authToken');
            // window.location.href = '/login'; // Désactivé - laisser composants gérer
          } else {
            console.warn('⚠️ [API Service] Erreur 401 en mode DÉMO - pas de redirection');
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Méthodes HTTP de base
  async get<T>(url: string, params?: QueryParams): Promise<T> {
    const response = await this.api.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(url, data);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.api.patch<T>(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.api.delete<T>(url);
    return response.data;
  }

  // Méthode pour les requêtes paginées
  async getPaginated<T>(url: string, params: QueryParams): Promise<PaginatedResponse<T>> {
    const response = await this.get<PaginatedResponse<T>>(url, params);
    return response;
  }

  // Méthode pour télécharger des fichiers
  async downloadFile(url: string, filename: string): Promise<void> {
    const response = await this.api.get(url, {
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
  }

  // Méthode pour uploader des fichiers
  async uploadFile(url: string, file: File, additionalData?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });
    }

    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }
}

// Instance unique du service
const apiService = new ApiService();

export default apiService;
export { apiService };

// Services spécifiques par domaine

// Service pour les écritures comptables
export const journalService = {
  async getEntries(params: QueryParams) {
    return apiService.getPaginated('/journal/entries', params);
  },

  async getEntry(id: string) {
    return apiService.get(`/journal/entries/${id}`);
  },

  async createEntry(data: any) {
    return apiService.post('/journal/entries', data);
  },

  async updateEntry(id: string, data: any) {
    return apiService.put(`/journal/entries/${id}`, data);
  },

  async deleteEntry(id: string) {
    return apiService.delete(`/journal/entries/${id}`);
  },

  async validateEntry(id: string) {
    return apiService.post(`/journal/entries/${id}/validate`);
  },

  async exportEntries(format: 'excel' | 'pdf' | 'csv', params: QueryParams) {
    const queryString = new URLSearchParams(params as any).toString();
    return apiService.downloadFile(
      `/journal/entries/export?format=${format}&${queryString}`,
      `ecritures.${format}`
    );
  },
};

// Service pour les axes analytiques
export const analyticalService = {
  async getAxes(params: QueryParams) {
    return apiService.getPaginated('/analytical/axes', params);
  },

  async getAxis(id: string) {
    return apiService.get(`/analytical/axes/${id}`);
  },

  async createAxis(data: any) {
    return apiService.post('/analytical/axes', data);
  },

  async updateAxis(id: string, data: any) {
    return apiService.put(`/analytical/axes/${id}`, data);
  },

  async deleteAxis(id: string) {
    return apiService.delete(`/analytical/axes/${id}`);
  },

  async getDimensions() {
    return apiService.get('/analytical/dimensions');
  },

  async getAllocationRules() {
    return apiService.get('/analytical/allocation-rules');
  },
};

// Service pour le plan comptable
export const accountService = {
  async getAccounts(params: QueryParams) {
    return apiService.getPaginated('/accounts', params);
  },

  async getAccount(id: string) {
    return apiService.get(`/accounts/${id}`);
  },

  async createAccount(data: any) {
    return apiService.post('/accounts', data);
  },

  async updateAccount(id: string, data: any) {
    return apiService.put(`/accounts/${id}`, data);
  },

  async deleteAccount(id: string) {
    return apiService.delete(`/accounts/${id}`);
  },

  async searchAccounts(query: string) {
    return apiService.get('/accounts/search', { search: query });
  },
};

// Service pour les immobilisations
export const assetsService = {
  async getAssets(params: QueryParams) {
    return apiService.getPaginated('/assets', params);
  },

  async getAsset(id: string) {
    return apiService.get(`/assets/${id}`);
  },

  async createAsset(data: any) {
    return apiService.post('/assets', data);
  },

  async updateAsset(id: string, data: any) {
    return apiService.put(`/assets/${id}`, data);
  },

  async deleteAsset(id: string) {
    return apiService.delete(`/assets/${id}`);
  },

  async calculateDepreciation(id: string, date: string) {
    return apiService.post(`/assets/${id}/depreciation`, { date });
  },

  async disposeAsset(id: string, data: any) {
    return apiService.post(`/assets/${id}/dispose`, data);
  },
};

// Service pour les tiers
export const thirdPartyService = {
  async getClients(params: QueryParams) {
    return apiService.getPaginated('/third-party/clients', params);
  },

  async getSuppliers(params: QueryParams) {
    return apiService.getPaginated('/third-party/suppliers', params);
  },

  async getThirdParty(id: string) {
    return apiService.get(`/third-party/${id}`);
  },

  async createThirdParty(data: any) {
    return apiService.post('/third-party', data);
  },

  async updateThirdParty(id: string, data: any) {
    return apiService.put(`/third-party/${id}`, data);
  },

  async deleteThirdParty(id: string) {
    return apiService.delete(`/third-party/${id}`);
  },

  async getBalance(id: string) {
    return apiService.get(`/third-party/${id}/balance`);
  },

  async getTransactions(id: string, params: QueryParams) {
    return apiService.getPaginated(`/third-party/${id}/transactions`, params);
  },
};

// Service pour les rapports
export const reportService = {
  async getBalance(params: QueryParams) {
    return apiService.get('/reports/balance', params);
  },

  async getIncomeStatement(params: QueryParams) {
    return apiService.get('/reports/income-statement', params);
  },

  async getBalanceSheet(params: QueryParams) {
    return apiService.get('/reports/balance-sheet', params);
  },

  async getCashFlow(params: QueryParams) {
    return apiService.get('/reports/cash-flow', params);
  },

  async getGeneralLedger(params: QueryParams) {
    return apiService.getPaginated('/reports/general-ledger', params);
  },

  async getJournalReport(journalCode: string, params: QueryParams) {
    return apiService.getPaginated(`/reports/journal/${journalCode}`, params);
  },

  async generateReport(reportType: string, params: any) {
    return apiService.post('/reports/generate', { reportType, params });
  },

  async exportReport(reportId: string, format: 'pdf' | 'excel' | 'csv') {
    return apiService.downloadFile(
      `/reports/${reportId}/export?format=${format}`,
      `rapport.${format}`
    );
  },
};

// Service pour la configuration
export const configService = {
  async getCompany() {
    return apiService.get('/config/company');
  },

  async updateCompany(data: any) {
    return apiService.put('/config/company', data);
  },

  async getExercises() {
    return apiService.get('/config/exercises');
  },

  async createExercise(data: any) {
    return apiService.post('/config/exercises', data);
  },

  async getJournals() {
    return apiService.get('/config/journals');
  },

  async createJournal(data: any) {
    return apiService.post('/config/journals', data);
  },

  async updateJournal(id: string, data: any) {
    return apiService.put(`/config/journals/${id}`, data);
  },

  async getTaxRates() {
    return apiService.get('/config/tax-rates');
  },

  async updateTaxRates(data: any) {
    return apiService.put('/config/tax-rates', data);
  },
};

// Service pour l'authentification
export const authService = {
  async login(email: string, password: string) {
    const response = await apiService.post<{ token: string; user: any }>('/auth/login', {
      email,
      password,
    });
    
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    
    return response;
  },

  async logout() {
    localStorage.removeItem('authToken');
    return apiService.post('/auth/logout');
  },

  async refreshToken() {
    return apiService.post('/auth/refresh');
  },

  async getCurrentUser() {
    return apiService.get('/auth/me');
  },

  async updateProfile(data: any) {
    return apiService.put('/auth/profile', data);
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return apiService.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },
};