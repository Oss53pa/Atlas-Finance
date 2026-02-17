/**
 * THIRD PARTY SERVICE - ADAPTED FOR BACKEND
 *
 * Service pour la gestion des tiers (clients, fournisseurs, employés, etc.)
 * Adapte les services backend au format attendu par le frontend
 */

import {
  tiersService as backendTiersService,
  adresseTiersService as backendAdresseService,
  contactTiersService as backendContactService,
} from './backend-services.index';
import type { QueryParams as BackendQueryParams } from '../types/backend.types';

/**
 * Types Frontend (à adapter selon votre structure existante)
 */
export interface ThirdParty {
  id: string;
  code: string;
  nom: string;
  type: 'CLIENT' | 'FOURNISSEUR' | 'EMPLOYE' | 'AUTRE';
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE';
  email?: string;
  telephone?: string;
  website?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThirdPartyAddress {
  id: string;
  tiers: string;
  type: 'PRINCIPALE' | 'LIVRAISON' | 'FACTURATION' | 'AUTRE';
  adresse: string;
  ville?: string;
  codePostal?: string;
  pays?: string;
  estPrincipale: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ThirdPartyContact {
  id: string;
  tiers: string;
  nom: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  estPrincipal: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  [key: string]: any;
}

/**
 * SERVICE TIERS
 */
class ThirdPartyService {
  /**
   * Get all third parties
   */
  async getAll(params?: QueryParams): Promise<ThirdParty[]> {
    const response = await backendTiersService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get third party by ID
   */
  async getById(id: string): Promise<ThirdParty> {
    const tiers = await backendTiersService.get(id);
    return this.transformToFrontend(tiers);
  }

  /**
   * Create new third party
   */
  async create(data: Partial<ThirdParty>): Promise<ThirdParty> {
    const backendData = this.transformToBackend(data);
    const tiers = await backendTiersService.create(backendData);
    return this.transformToFrontend(tiers);
  }

  /**
   * Update third party
   */
  async update(id: string, data: Partial<ThirdParty>): Promise<ThirdParty> {
    const backendData = this.transformToBackend(data);
    const tiers = await backendTiersService.update(id, backendData);
    return this.transformToFrontend(tiers);
  }

  /**
   * Delete third party
   */
  async delete(id: string): Promise<void> {
    return backendTiersService.delete(id);
  }

  /**
   * Get all clients
   */
  async getClients(params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listClients(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get all suppliers (fournisseurs)
   */
  async getSuppliers(params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listFournisseurs(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get all employees
   */
  async getEmployees(params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listEmployes(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get active third parties
   */
  async getActive(params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listActive(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get blocked third parties
   */
  async getBlocked(params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listBlocked(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get third parties by type
   */
  async getByType(type: string, params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.listByType(type, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Search third parties
   */
  async search(query: string, params?: QueryParams): Promise<ThirdParty[]> {
    const results = await backendTiersService.search(query, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get third party by code
   */
  async getByCode(code: string): Promise<ThirdParty> {
    const tiers = await backendTiersService.getByCode(code);
    return this.transformToFrontend(tiers);
  }

  /**
   * Block third party
   */
  async block(id: string): Promise<ThirdParty> {
    const tiers = await backendTiersService.block(id);
    return this.transformToFrontend(tiers);
  }

  /**
   * Unblock third party
   */
  async unblock(id: string): Promise<ThirdParty> {
    const tiers = await backendTiersService.unblock(id);
    return this.transformToFrontend(tiers);
  }

  /**
   * Get third party statistics
   */
  async getStatistics(): Promise<any> {
    return backendTiersService.getStatistics();
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(tiers: any): ThirdParty {
    return {
      id: tiers.id,
      code: tiers.code,
      nom: tiers.nom,
      type: tiers.type,
      statut: tiers.statut,
      email: tiers.email || '',
      telephone: tiers.telephone || '',
      website: tiers.website || '',
      notes: tiers.notes || '',
      createdAt: tiers.created_at,
      updatedAt: tiers.updated_at,
    };
  }

  /**
   * Transform frontend format to backend format
   */
  private transformToBackend(tiers: Partial<ThirdParty>): any {
    const data: any = {};
    if (tiers.code) data.code = tiers.code;
    if (tiers.nom) data.nom = tiers.nom;
    if (tiers.type) data.type = tiers.type;
    if (tiers.statut) data.statut = tiers.statut;
    if (tiers.email) data.email = tiers.email;
    if (tiers.telephone) data.telephone = tiers.telephone;
    if (tiers.website) data.website = tiers.website;
    if (tiers.notes) data.notes = tiers.notes;
    return data;
  }
}

/**
 * SERVICE ADRESSES TIERS
 */
class ThirdPartyAddressService {
  /**
   * Get all addresses
   */
  async getAll(params?: QueryParams): Promise<ThirdPartyAddress[]> {
    const response = await backendAdresseService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get address by ID
   */
  async getById(id: string): Promise<ThirdPartyAddress> {
    const adresse = await backendAdresseService.get(id);
    return this.transformToFrontend(adresse);
  }

  /**
   * Create new address
   */
  async create(data: Partial<ThirdPartyAddress>): Promise<ThirdPartyAddress> {
    const backendData = this.transformToBackend(data);
    const adresse = await backendAdresseService.create(backendData);
    return this.transformToFrontend(adresse);
  }

  /**
   * Update address
   */
  async update(id: string, data: Partial<ThirdPartyAddress>): Promise<ThirdPartyAddress> {
    const backendData = this.transformToBackend(data);
    const adresse = await backendAdresseService.update(id, backendData);
    return this.transformToFrontend(adresse);
  }

  /**
   * Delete address
   */
  async delete(id: string): Promise<void> {
    return backendAdresseService.delete(id);
  }

  /**
   * Get addresses by third party
   */
  async getByThirdParty(tiersId: string, params?: QueryParams): Promise<ThirdPartyAddress[]> {
    const results = await backendAdresseService.listByTiers(tiersId, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get addresses by type
   */
  async getByType(type: string, params?: QueryParams): Promise<ThirdPartyAddress[]> {
    const results = await backendAdresseService.listByType(type, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get primary address
   */
  async getPrimary(tiersId: string): Promise<ThirdPartyAddress | null> {
    const adresse = await backendAdresseService.getPrimary(tiersId);
    return adresse ? this.transformToFrontend(adresse) : null;
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(adresse: any): ThirdPartyAddress {
    return {
      id: adresse.id,
      tiers: adresse.tiers,
      type: adresse.type,
      adresse: adresse.adresse,
      ville: adresse.ville || '',
      codePostal: adresse.code_postal || '',
      pays: adresse.pays || '',
      estPrincipale: adresse.est_principale,
      createdAt: adresse.created_at,
      updatedAt: adresse.updated_at,
    };
  }

  /**
   * Transform frontend format to backend format
   */
  private transformToBackend(adresse: Partial<ThirdPartyAddress>): any {
    const data: any = {};
    if (adresse.tiers) data.tiers = adresse.tiers;
    if (adresse.type) data.type = adresse.type;
    if (adresse.adresse) data.adresse = adresse.adresse;
    if (adresse.ville) data.ville = adresse.ville;
    if (adresse.codePostal) data.code_postal = adresse.codePostal;
    if (adresse.pays) data.pays = adresse.pays;
    if (adresse.estPrincipale !== undefined) data.est_principale = adresse.estPrincipale;
    return data;
  }
}

/**
 * SERVICE CONTACTS TIERS
 */
class ThirdPartyContactService {
  /**
   * Get all contacts
   */
  async getAll(params?: QueryParams): Promise<ThirdPartyContact[]> {
    const response = await backendContactService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get contact by ID
   */
  async getById(id: string): Promise<ThirdPartyContact> {
    const contact = await backendContactService.get(id);
    return this.transformToFrontend(contact);
  }

  /**
   * Create new contact
   */
  async create(data: Partial<ThirdPartyContact>): Promise<ThirdPartyContact> {
    const backendData = this.transformToBackend(data);
    const contact = await backendContactService.create(backendData);
    return this.transformToFrontend(contact);
  }

  /**
   * Update contact
   */
  async update(id: string, data: Partial<ThirdPartyContact>): Promise<ThirdPartyContact> {
    const backendData = this.transformToBackend(data);
    const contact = await backendContactService.update(id, backendData);
    return this.transformToFrontend(contact);
  }

  /**
   * Delete contact
   */
  async delete(id: string): Promise<void> {
    return backendContactService.delete(id);
  }

  /**
   * Get contacts by third party
   */
  async getByThirdParty(tiersId: string, params?: QueryParams): Promise<ThirdPartyContact[]> {
    const results = await backendContactService.listByTiers(tiersId, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Get primary contact
   */
  async getPrimary(tiersId: string): Promise<ThirdPartyContact | null> {
    const contact = await backendContactService.getPrimary(tiersId);
    return contact ? this.transformToFrontend(contact) : null;
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(contact: any): ThirdPartyContact {
    return {
      id: contact.id,
      tiers: contact.tiers,
      nom: contact.nom,
      fonction: contact.fonction || '',
      email: contact.email || '',
      telephone: contact.telephone || '',
      estPrincipal: contact.est_principal,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    };
  }

  /**
   * Transform frontend format to backend format
   */
  private transformToBackend(contact: Partial<ThirdPartyContact>): any {
    const data: any = {};
    if (contact.tiers) data.tiers = contact.tiers;
    if (contact.nom) data.nom = contact.nom;
    if (contact.fonction) data.fonction = contact.fonction;
    if (contact.email) data.email = contact.email;
    if (contact.telephone) data.telephone = contact.telephone;
    if (contact.estPrincipal !== undefined) data.est_principal = contact.estPrincipal;
    return data;
  }
}

/**
 * EXPORTS
 */
export const thirdPartyService = new ThirdPartyService();
export const thirdPartyAddressService = new ThirdPartyAddressService();
export const thirdPartyContactService = new ThirdPartyContactService();

// Export par défaut (objet avec tous les services)
export default {
  thirdParty: thirdPartyService,
  address: thirdPartyAddressService,
  contact: thirdPartyContactService,
};
