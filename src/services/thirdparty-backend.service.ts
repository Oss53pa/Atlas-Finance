/**
 * Service Third Party WiseBook
 * Gestion des Tiers (Clients/Fournisseurs), Adresses et Contacts
 */

import { enhancedApiClient } from '@/lib/enhanced-api-client';
import type {
  Tiers,
  TiersCreateRequest,
  TiersUpdateRequest,
  TiersFilterParams,
  AdresseTiers,
  AdresseTiersCreateRequest,
  AdresseTiersUpdateRequest,
  ContactTiers,
  ContactTiersCreateRequest,
  ContactTiersUpdateRequest,
  PaginatedResponse,
  QueryParams
} from '@/types/backend.types';

// ==================== TIERS SERVICE ====================

export class TiersService {
  private readonly baseUrl = '/tiers';

  /**
   * Liste tous les tiers
   * GET /api/v1/tiers/
   */
  async list(params?: QueryParams & TiersFilterParams): Promise<PaginatedResponse<Tiers>> {
    return enhancedApiClient.getPaginated<Tiers>(this.baseUrl, params);
  }

  /**
   * Récupérer un tiers par ID
   * GET /api/v1/tiers/{id}/
   */
  async getById(id: string): Promise<Tiers> {
    return enhancedApiClient.get<Tiers>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer un nouveau tiers
   * POST /api/v1/tiers/
   */
  async create(data: TiersCreateRequest): Promise<Tiers> {
    return enhancedApiClient.post<Tiers>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour un tiers (complet)
   * PUT /api/v1/tiers/{id}/
   */
  async update(id: string, data: TiersUpdateRequest): Promise<Tiers> {
    return enhancedApiClient.put<Tiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour un tiers (partiel)
   * PATCH /api/v1/tiers/{id}/
   */
  async patch(id: string, data: Partial<TiersUpdateRequest>): Promise<Tiers> {
    return enhancedApiClient.patch<Tiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer un tiers
   * DELETE /api/v1/tiers/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer uniquement les clients
   * GET /api/v1/tiers/clients/
   */
  async listClients(params?: QueryParams): Promise<Tiers[]> {
    return enhancedApiClient.get<Tiers[]>(`${this.baseUrl}/clients/`, params);
  }

  /**
   * Récupérer uniquement les fournisseurs
   * GET /api/v1/tiers/fournisseurs/
   */
  async listFournisseurs(params?: QueryParams): Promise<Tiers[]> {
    return enhancedApiClient.get<Tiers[]>(`${this.baseUrl}/fournisseurs/`, params);
  }

  /**
   * Rechercher des tiers
   */
  async search(query: string, params?: QueryParams & TiersFilterParams): Promise<PaginatedResponse<Tiers>> {
    return this.list({ ...params, search: query });
  }

  /**
   * Filtrer par type
   */
  async listByType(type: 'CLIENT' | 'FOURNISSEUR' | 'CLIENT_FOURNISSEUR', params?: QueryParams): Promise<PaginatedResponse<Tiers>> {
    return this.list({ ...params, type_tiers: type });
  }

  /**
   * Filtrer par statut
   */
  async listByStatut(statut: 'ACTIF' | 'INACTIF' | 'BLOQUE', params?: QueryParams): Promise<PaginatedResponse<Tiers>> {
    return this.list({ ...params, statut });
  }

  /**
   * Récupérer les tiers actifs uniquement
   */
  async listActive(params?: QueryParams): Promise<PaginatedResponse<Tiers>> {
    return this.listByStatut('ACTIF', params);
  }

  /**
   * Bloquer un tiers
   */
  async block(id: string): Promise<Tiers> {
    return this.patch(id, { statut: 'BLOQUE' });
  }

  /**
   * Débloquer un tiers
   */
  async unblock(id: string): Promise<Tiers> {
    return this.patch(id, { statut: 'ACTIF' });
  }

  /**
   * Désactiver un tiers
   */
  async deactivate(id: string): Promise<Tiers> {
    return this.patch(id, { statut: 'INACTIF' });
  }

  /**
   * Activer un tiers
   */
  async activate(id: string): Promise<Tiers> {
    return this.patch(id, { statut: 'ACTIF' });
  }
}

// ==================== ADRESSES TIERS SERVICE ====================

export class AdresseTiersService {
  private readonly baseUrl = '/adresses-tiers';

  /**
   * Liste toutes les adresses
   * GET /api/v1/adresses-tiers/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<AdresseTiers>> {
    return enhancedApiClient.getPaginated<AdresseTiers>(this.baseUrl, params);
  }

  /**
   * Récupérer une adresse par ID
   * GET /api/v1/adresses-tiers/{id}/
   */
  async getById(id: string): Promise<AdresseTiers> {
    return enhancedApiClient.get<AdresseTiers>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer une nouvelle adresse
   * POST /api/v1/adresses-tiers/
   */
  async create(data: AdresseTiersCreateRequest): Promise<AdresseTiers> {
    return enhancedApiClient.post<AdresseTiers>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour une adresse (complet)
   * PUT /api/v1/adresses-tiers/{id}/
   */
  async update(id: string, data: AdresseTiersUpdateRequest): Promise<AdresseTiers> {
    return enhancedApiClient.put<AdresseTiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour une adresse (partiel)
   * PATCH /api/v1/adresses-tiers/{id}/
   */
  async patch(id: string, data: Partial<AdresseTiersUpdateRequest>): Promise<AdresseTiers> {
    return enhancedApiClient.patch<AdresseTiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer une adresse
   * DELETE /api/v1/adresses-tiers/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les adresses d'un tiers
   */
  async listByTiers(tiersId: string, params?: QueryParams): Promise<PaginatedResponse<AdresseTiers>> {
    return this.list({ ...params, tiers: tiersId } as any);
  }

  /**
   * Récupérer l'adresse principale d'un tiers
   */
  async getPrimaryByTiers(tiersId: string): Promise<AdresseTiers | null> {
    const response = await this.list({ tiers: tiersId, est_principale: true, page_size: 1 } as any);
    return response.results.length > 0 ? response.results[0] : null;
  }

  /**
   * Définir une adresse comme principale
   */
  async setPrimary(id: string): Promise<AdresseTiers> {
    return this.patch(id, { est_principale: true });
  }
}

// ==================== CONTACTS TIERS SERVICE ====================

export class ContactTiersService {
  private readonly baseUrl = '/contacts-tiers';

  /**
   * Liste tous les contacts
   * GET /api/v1/contacts-tiers/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<ContactTiers>> {
    return enhancedApiClient.getPaginated<ContactTiers>(this.baseUrl, params);
  }

  /**
   * Récupérer un contact par ID
   * GET /api/v1/contacts-tiers/{id}/
   */
  async getById(id: string): Promise<ContactTiers> {
    return enhancedApiClient.get<ContactTiers>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer un nouveau contact
   * POST /api/v1/contacts-tiers/
   */
  async create(data: ContactTiersCreateRequest): Promise<ContactTiers> {
    return enhancedApiClient.post<ContactTiers>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour un contact (complet)
   * PUT /api/v1/contacts-tiers/{id}/
   */
  async update(id: string, data: ContactTiersUpdateRequest): Promise<ContactTiers> {
    return enhancedApiClient.put<ContactTiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour un contact (partiel)
   * PATCH /api/v1/contacts-tiers/{id}/
   */
  async patch(id: string, data: Partial<ContactTiersUpdateRequest>): Promise<ContactTiers> {
    return enhancedApiClient.patch<ContactTiers>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer un contact
   * DELETE /api/v1/contacts-tiers/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les contacts d'un tiers
   */
  async listByTiers(tiersId: string, params?: QueryParams): Promise<PaginatedResponse<ContactTiers>> {
    return this.list({ ...params, tiers: tiersId } as any);
  }

  /**
   * Récupérer le contact principal d'un tiers
   */
  async getPrimaryByTiers(tiersId: string): Promise<ContactTiers | null> {
    const response = await this.list({ tiers: tiersId, est_principal: true, page_size: 1 } as any);
    return response.results.length > 0 ? response.results[0] : null;
  }

  /**
   * Définir un contact comme principal
   */
  async setPrimary(id: string): Promise<ContactTiers> {
    return this.patch(id, { est_principal: true });
  }
}

// ==================== SINGLETON INSTANCES ====================

export const tiersService = new TiersService();
export const adresseTiersService = new AdresseTiersService();
export const contactTiersService = new ContactTiersService();

// Default exports
export default {
  tiers: tiersService,
  adresse: adresseTiersService,
  contact: contactTiersService,
};
