/**
 * Atlas Finance - Core Service
 *
 * Gestion des entités de base (Devises, etc.).
 * Utilise les endpoints backend: /api/devises/
 *
 * @version 3.0.0
 * @date 2025-10-18
 */

import { apiClient } from '@/lib/api';
import API_ENDPOINTS from '@/config/apiEndpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  is_base_currency: boolean;
  exchange_rate?: number;
  last_update?: string;
}

interface ApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

// ============================================================================
// CORE SERVICE
// ============================================================================

export const coreService = {
  // ==========================================================================
  // CURRENCIES - Devises
  // ==========================================================================

  /**
   * Récupère la liste des devises
   */
  async getCurrencies(params?: {
    search?: string;
    is_active?: boolean;
    is_base_currency?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Currency[]; count?: number }> {
    try {
      const response = await apiClient.get<ApiResponse<Currency>>(
        API_ENDPOINTS.CURRENCIES.LIST,
        params
      );
      return { results: response.results || [], count: response.count };
    } catch (error) {
      console.error('Error fetching currencies:', error);
      throw error;
    }
  },

  /**
   * Récupère une devise par ID
   */
  async getCurrency(id: string): Promise<Currency> {
    try {
      return await apiClient.get<Currency>(API_ENDPOINTS.CURRENCIES.DETAIL(id));
    } catch (error) {
      console.error('Error fetching currency:', error);
      throw error;
    }
  },

  /**
   * Crée une nouvelle devise
   */
  async createCurrency(data: Partial<Currency>): Promise<Currency> {
    try {
      return await apiClient.post<Currency>(API_ENDPOINTS.CURRENCIES.CREATE, data);
    } catch (error) {
      console.error('Error creating currency:', error);
      throw error;
    }
  },

  /**
   * Met à jour une devise
   */
  async updateCurrency(id: string, data: Partial<Currency>): Promise<Currency> {
    try {
      return await apiClient.put<Currency>(
        API_ENDPOINTS.CURRENCIES.UPDATE(id),
        data
      );
    } catch (error) {
      console.error('Error updating currency:', error);
      throw error;
    }
  },

  /**
   * Supprime une devise
   */
  async deleteCurrency(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.CURRENCIES.DELETE(id));
    } catch (error) {
      console.error('Error deleting currency:', error);
      throw error;
    }
  },

  /**
   * Récupère la devise de base
   */
  async getBaseCurrency(): Promise<Currency | null> {
    try {
      const response = await this.getCurrencies({ is_base_currency: true, page_size: 1 });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error('Error fetching base currency:', error);
      throw error;
    }
  },

  /**
   * Récupère les devises actives uniquement
   */
  async getActiveCurrencies(): Promise<Currency[]> {
    try {
      const response = await this.getCurrencies({ is_active: true, page_size: 1000 });
      return response.results;
    } catch (error) {
      console.error('Error fetching active currencies:', error);
      throw error;
    }
  },
};

export default coreService;
