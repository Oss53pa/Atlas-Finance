/**
 * Service Core WiseBook
 * Gestion des Sociétés et Devises
 */

import { enhancedApiClient } from '@/lib/enhanced-api-client';
import type {
  Societe,
  SocieteCreateRequest,
  SocieteUpdateRequest,
  Devise,
  DeviseCreateRequest,
  DeviseUpdateRequest,
  PaginatedResponse,
  QueryParams
} from '@/types/backend.types';

// ==================== SOCIETES SERVICE ====================

export class SocieteService {
  private readonly baseUrl = '/societes';

  /**
   * Liste toutes les sociétés
   * GET /api/v1/societes/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<Societe>> {
    return enhancedApiClient.getPaginated<Societe>(this.baseUrl, params);
  }

  /**
   * Récupérer une société par ID
   * GET /api/v1/societes/{id}/
   */
  async getById(id: string): Promise<Societe> {
    return enhancedApiClient.get<Societe>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer une nouvelle société
   * POST /api/v1/societes/
   */
  async create(data: SocieteCreateRequest): Promise<Societe> {
    return enhancedApiClient.post<Societe>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour une société (complète)
   * PUT /api/v1/societes/{id}/
   */
  async update(id: string, data: SocieteUpdateRequest): Promise<Societe> {
    return enhancedApiClient.put<Societe>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour une société (partielle)
   * PATCH /api/v1/societes/{id}/
   */
  async patch(id: string, data: Partial<SocieteUpdateRequest>): Promise<Societe> {
    return enhancedApiClient.patch<Societe>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer une société
   * DELETE /api/v1/societes/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Rechercher des sociétés
   */
  async search(query: string, params?: QueryParams): Promise<PaginatedResponse<Societe>> {
    return this.list({ ...params, search: query });
  }
}

// ==================== DEVISES SERVICE ====================

export class DeviseService {
  private readonly baseUrl = '/devises';

  /**
   * Liste toutes les devises
   * GET /api/v1/devises/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<Devise>> {
    return enhancedApiClient.getPaginated<Devise>(this.baseUrl, params);
  }

  /**
   * Récupérer une devise par ID
   * GET /api/v1/devises/{id}/
   */
  async getById(id: string): Promise<Devise> {
    return enhancedApiClient.get<Devise>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer une nouvelle devise
   * POST /api/v1/devises/
   */
  async create(data: DeviseCreateRequest): Promise<Devise> {
    return enhancedApiClient.post<Devise>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour une devise (complète)
   * PUT /api/v1/devises/{id}/
   */
  async update(id: string, data: DeviseUpdateRequest): Promise<Devise> {
    return enhancedApiClient.put<Devise>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour une devise (partielle)
   * PATCH /api/v1/devises/{id}/
   */
  async patch(id: string, data: Partial<DeviseUpdateRequest>): Promise<Devise> {
    return enhancedApiClient.patch<Devise>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer une devise
   * DELETE /api/v1/devises/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les devises actives uniquement
   */
  async listActive(params?: QueryParams): Promise<PaginatedResponse<Devise>> {
    return this.list({ ...params, is_active: true } as any);
  }

  /**
   * Récupérer une devise par code ISO
   */
  async getByCode(code: string): Promise<Devise> {
    const response = await this.list({ search: code, page_size: 1 });
    if (response.results.length === 0) {
      throw new Error(`Devise ${code} not found`);
    }
    return response.results[0];
  }
}

// ==================== SINGLETON INSTANCES ====================

export const societeService = new SocieteService();
export const deviseService = new DeviseService();

// Default exports
export default {
  societe: societeService,
  devise: deviseService,
};
