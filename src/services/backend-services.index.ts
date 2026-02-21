/**
 * Backend Services Index
 * Re-exports backend services for frontend adaptation
 */
import { apiService } from './api';
import type { QueryParams } from '../types/backend.types';

const BASE_PATH = '/api/v1';

// ============================================================================
// SHARED TYPES
// ============================================================================

/** Generic paginated API response */
interface PaginatedResult<T> {
  results: T[];
  count: number;
  next?: string | null;
  previous?: string | null;
}

/** Backend tiers record (snake_case from API) */
interface BackendTiersRecord {
  id: string;
  code: string;
  nom: string;
  type: string;
  statut: string;
  email?: string;
  telephone?: string;
  website?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

/** Backend tiers write data */
interface BackendTiersWriteData {
  code?: string;
  nom?: string;
  type?: string;
  statut?: string;
  email?: string;
  telephone?: string;
  website?: string;
  notes?: string;
}

/** Backend adresse record */
interface BackendAdresseRecord {
  id: string;
  tiers: string;
  type: string;
  adresse: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  est_principale: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Backend adresse write data */
interface BackendAdresseWriteData {
  tiers?: string;
  type?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  est_principale?: boolean;
}

/** Backend contact record */
interface BackendContactRecord {
  id: string;
  tiers: string;
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  est_principal: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Backend contact write data */
interface BackendContactWriteData {
  tiers?: string;
  nom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  est_principal?: boolean;
}

/** Backend societe record */
interface BackendSocieteRecord {
  id: string;
  code: string;
  nom: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  forme_juridique?: string;
  numero_rccm?: string;
  numero_fiscal?: string;
  adresse?: string;
  site_web?: string;
  capital_social?: number;
  devise?: { code: string };
  date_creation?: string;
  is_active?: boolean;
  regime_fiscal?: string;
  longueur_compte?: number;
  gestion_analytique?: boolean;
  logo?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Backend societe write data */
interface BackendSocieteWriteData {
  code?: string;
  nom?: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  forme_juridique?: string;
  numero_rccm?: string;
  numero_fiscal?: string;
  adresse?: string;
  site_web?: string;
  capital_social?: number;
  regime_fiscal?: string;
  longueur_compte?: number;
  gestion_analytique?: boolean;
}

/** Tiers statistics */
interface TiersStatistics {
  totalClients: number;
  totalFournisseurs: number;
  totalEmployes: number;
  totalActive: number;
  totalBlocked: number;
}

// ============================================================================
// TIERS SERVICE (Third Party)
// ============================================================================

class TiersService {
  async getAll(params?: QueryParams): Promise<PaginatedResult<BackendTiersRecord>> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, { params: params as Record<string, string> });
    return response.data;
  }

  async getById(id: string): Promise<BackendTiersRecord> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${id}/`);
    return response.data;
  }

  async create(data: BackendTiersWriteData): Promise<BackendTiersRecord> {
    const response = await apiService.post(`${BASE_PATH}/tiers/`, data);
    return response.data;
  }

  async update(id: string, data: BackendTiersWriteData): Promise<BackendTiersRecord> {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/tiers/${id}/`);
  }

  // Aliases expected by third-party.service.ts
  async list(params?: QueryParams): Promise<PaginatedResult<BackendTiersRecord>> {
    return this.getAll(params);
  }

  async get(id: string): Promise<BackendTiersRecord> {
    return this.getById(id);
  }

  async listClients(params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, type: 'CLIENT' } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async listFournisseurs(params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, type: 'FOURNISSEUR' } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async listEmployes(params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, type: 'EMPLOYE' } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async listActive(params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, statut: 'ACTIF' } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async listBlocked(params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, statut: 'BLOQUE' } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async listByType(type: string, params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, type } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async search(query: string, params?: QueryParams): Promise<BackendTiersRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { ...params, search: query } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results || [];
  }

  async getByCode(code: string): Promise<BackendTiersRecord> {
    const response = await apiService.get(`${BASE_PATH}/tiers/`, {
      params: { code } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendTiersRecord>;
    return data.results[0];
  }

  async block(id: string): Promise<BackendTiersRecord> {
    return this.update(id, { statut: 'BLOQUE' });
  }

  async unblock(id: string): Promise<BackendTiersRecord> {
    return this.update(id, { statut: 'ACTIF' });
  }

  async getStatistics(): Promise<TiersStatistics> {
    const response = await apiService.get(`${BASE_PATH}/tiers/statistics/`);
    return response.data;
  }
}

// ============================================================================
// ADRESSE TIERS SERVICE
// ============================================================================

class AdresseTiersService {
  // Flat CRUD methods (used by third-party.service.ts)
  async list(params?: QueryParams): Promise<PaginatedResult<BackendAdresseRecord>> {
    const response = await apiService.get(`${BASE_PATH}/adresses/`, { params: params as Record<string, string> });
    return response.data;
  }

  async get(id: string): Promise<BackendAdresseRecord> {
    const response = await apiService.get(`${BASE_PATH}/adresses/${id}/`);
    return response.data;
  }

  async create(data: BackendAdresseWriteData): Promise<BackendAdresseRecord> {
    const response = await apiService.post(`${BASE_PATH}/adresses/`, data);
    return response.data;
  }

  async update(id: string, data: BackendAdresseWriteData): Promise<BackendAdresseRecord> {
    const response = await apiService.patch(`${BASE_PATH}/adresses/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/adresses/${id}/`);
  }

  // Nested-route methods (for tiers-scoped access)
  async getByTiersId(tiersId: string): Promise<BackendAdresseRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/adresses/`);
    return response.data;
  }

  async createForTiers(tiersId: string, data: BackendAdresseWriteData): Promise<BackendAdresseRecord> {
    const response = await apiService.post(`${BASE_PATH}/tiers/${tiersId}/adresses/`, data);
    return response.data;
  }

  async updateForTiers(tiersId: string, adresseId: string, data: BackendAdresseWriteData): Promise<BackendAdresseRecord> {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${tiersId}/adresses/${adresseId}/`, data);
    return response.data;
  }

  async deleteForTiers(tiersId: string, adresseId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/tiers/${tiersId}/adresses/${adresseId}/`);
  }

  // Query methods
  async listByTiers(tiersId: string, params?: QueryParams): Promise<BackendAdresseRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/adresses/`, {
      params: params as Record<string, string>,
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data as PaginatedResult<BackendAdresseRecord>).results || [];
  }

  async listByType(type: string, params?: QueryParams): Promise<BackendAdresseRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/adresses/`, {
      params: { ...params, type } as Record<string, string>,
    });
    const data = response.data as PaginatedResult<BackendAdresseRecord>;
    return data.results || [];
  }

  async getPrimary(tiersId: string): Promise<BackendAdresseRecord | null> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/adresses/`, {
      params: { est_principale: 'true' } as Record<string, string>,
    });
    const data = response.data;
    const results = Array.isArray(data) ? data : (data as PaginatedResult<BackendAdresseRecord>).results || [];
    return results[0] || null;
  }
}

// ============================================================================
// CONTACT TIERS SERVICE
// ============================================================================

class ContactTiersService {
  // Flat CRUD methods (used by third-party.service.ts)
  async list(params?: QueryParams): Promise<PaginatedResult<BackendContactRecord>> {
    const response = await apiService.get(`${BASE_PATH}/contacts/`, { params: params as Record<string, string> });
    return response.data;
  }

  async get(id: string): Promise<BackendContactRecord> {
    const response = await apiService.get(`${BASE_PATH}/contacts/${id}/`);
    return response.data;
  }

  async create(data: BackendContactWriteData): Promise<BackendContactRecord> {
    const response = await apiService.post(`${BASE_PATH}/contacts/`, data);
    return response.data;
  }

  async update(id: string, data: BackendContactWriteData): Promise<BackendContactRecord> {
    const response = await apiService.patch(`${BASE_PATH}/contacts/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/contacts/${id}/`);
  }

  // Nested-route methods (for tiers-scoped access)
  async getByTiersId(tiersId: string): Promise<BackendContactRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/contacts/`);
    return response.data;
  }

  async createForTiers(tiersId: string, data: BackendContactWriteData): Promise<BackendContactRecord> {
    const response = await apiService.post(`${BASE_PATH}/tiers/${tiersId}/contacts/`, data);
    return response.data;
  }

  async updateForTiers(tiersId: string, contactId: string, data: BackendContactWriteData): Promise<BackendContactRecord> {
    const response = await apiService.patch(`${BASE_PATH}/tiers/${tiersId}/contacts/${contactId}/`, data);
    return response.data;
  }

  async deleteForTiers(tiersId: string, contactId: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/tiers/${tiersId}/contacts/${contactId}/`);
  }

  // Query methods
  async listByTiers(tiersId: string, params?: QueryParams): Promise<BackendContactRecord[]> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/contacts/`, {
      params: params as Record<string, string>,
    });
    const data = response.data;
    return Array.isArray(data) ? data : (data as PaginatedResult<BackendContactRecord>).results || [];
  }

  async getPrimary(tiersId: string): Promise<BackendContactRecord | null> {
    const response = await apiService.get(`${BASE_PATH}/tiers/${tiersId}/contacts/`, {
      params: { est_principal: 'true' } as Record<string, string>,
    });
    const data = response.data;
    const results = Array.isArray(data) ? data : (data as PaginatedResult<BackendContactRecord>).results || [];
    return results[0] || null;
  }
}

// ============================================================================
// SOCIETE SERVICE (Company)
// ============================================================================

class SocieteService {
  async list(params?: QueryParams): Promise<PaginatedResult<BackendSocieteRecord>> {
    const response = await apiService.get(`${BASE_PATH}/societes/`, { params: params as Record<string, string> });
    return response.data;
  }

  async getById(id: string): Promise<BackendSocieteRecord> {
    const response = await apiService.get(`${BASE_PATH}/societes/${id}/`);
    return response.data;
  }

  async create(data: BackendSocieteWriteData): Promise<BackendSocieteRecord> {
    const response = await apiService.post(`${BASE_PATH}/societes/`, data);
    return response.data;
  }

  async patch(id: string, data: Partial<BackendSocieteRecord>): Promise<BackendSocieteRecord> {
    const response = await apiService.patch(`${BASE_PATH}/societes/${id}/`, data);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/societes/${id}/`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tiersService = new TiersService();
export const adresseTiersService = new AdresseTiersService();
export const contactTiersService = new ContactTiersService();
export const societeService = new SocieteService();
