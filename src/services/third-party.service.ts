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
import type { DataAdapter } from '@atlas/data';
import type { DBThirdParty } from '../lib/db';

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
  [key: string]: string | number | boolean | undefined;
}

/** Backend tiers record shape (snake_case from API) */
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

/** Backend tiers data for create/update (subset of fields) */
interface BackendTiersData {
  code?: string;
  nom?: string;
  type?: string;
  statut?: string;
  email?: string;
  telephone?: string;
  website?: string;
  notes?: string;
}

/** Backend adresse record shape */
interface BackendAdresse {
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

/** Backend adresse data for create/update */
interface BackendAdresseData {
  tiers?: string;
  type?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  est_principale?: boolean;
}

/** Backend contact record shape */
interface BackendContact {
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

/** Backend contact data for create/update */
interface BackendContactData {
  tiers?: string;
  nom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  est_principal?: boolean;
}

/** Statistics returned by getStatistics */
export interface ThirdPartyStatistics {
  totalClients: number;
  totalFournisseurs: number;
  totalEmployes: number;
  totalActive: number;
  totalBlocked: number;
}

/**
 * ============================================================================
 * GESTION DES CONTACTS (écrans Contacts) — adossée à la table `thirdParties`
 * ============================================================================
 *
 * Ces méthodes opèrent directement sur le DataAdapter (local/saas/hybrid) et la
 * table `thirdParties`, conformément au pattern WiseBook (adapter en 1er param).
 * Un « contact » est modélisé comme un tiers ; une « entreprise » l'est aussi.
 */

/** Type de tiers tel qu'affiché par les écrans Contacts */
export type ContactTypeTiers = 'client' | 'fournisseur' | 'prospect' | 'partenaire';

/** Données de formulaire d'un contact (aligné sur ContactFormData côté UI) */
export interface ContactInput {
  civilite?: string;
  prenom?: string;
  nom: string;
  fonction?: string;
  entreprise_id?: string;
  type_tiers?: ContactTypeTiers;
  telephone_fixe?: string;
  telephone_mobile?: string;
  email?: string;
  email_secondaire?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  date_naissance?: string;
  linkedin?: string;
  notes?: string;
}

/** Enregistrement contact renvoyé aux écrans (dérivé d'un tiers) */
export interface ContactRecord {
  id: string;
  code: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  telephone_mobile: string;
  fonction: string;
  type_tiers: ContactTypeTiers;
  entreprise_id: string;
  entreprise_nom: string;
  ville: string;
  pays: string;
  actif: boolean;
}

/** Liste paginée de contacts + compteurs affichés dans les cartes de stats */
export interface ContactsListResult {
  results: ContactRecord[];
  count: number;
  clients_count: number;
  suppliers_count: number;
  prospects_count: number;
}

/** Entreprise renvoyée pour les sélecteurs (id + dénomination) */
export interface CompanyRecord {
  id: string;
  denomination: string;
  code: string;
}

/** Liste paginée d'entreprises */
export interface CompaniesListResult {
  results: CompanyRecord[];
  count: number;
}

/** Paramètres de requête des listes Contacts/Entreprises */
export interface ContactQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type_tiers?: string;
  [key: string]: string | number | boolean | undefined;
}

/** Mapping type tiers stocké (DB) → libellé UI */
const TYPE_TO_UI: Record<DBThirdParty['type'], ContactTypeTiers> = {
  customer: 'client',
  supplier: 'fournisseur',
  both: 'partenaire',
};

/** Mapping libellé UI → type tiers stocké (DB) */
function uiTypeToDb(type?: string): DBThirdParty['type'] {
  switch (type) {
    case 'fournisseur':
      return 'supplier';
    case 'partenaire':
      return 'both';
    case 'client':
    case 'prospect':
    default:
      return 'customer';
  }
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
  async getStatistics(): Promise<ThirdPartyStatistics> {
    return backendTiersService.getStatistics();
  }

  // ==========================================================================
  // CONTACTS / ENTREPRISES (DataAdapter — table `thirdParties`)
  // ==========================================================================

  /**
   * Liste paginée des contacts (tiers), avec filtre recherche/type.
   */
  async getContacts(
    adapter: DataAdapter,
    params: ContactQueryParams = {},
  ): Promise<ContactsListResult> {
    const all = await adapter.getAll<DBThirdParty>('thirdParties');

    const search = String(params.search ?? '').trim().toLowerCase();
    const typeFilter = params.type_tiers ? uiTypeToDb(String(params.type_tiers)) : undefined;

    let filtered = all;
    if (search) {
      filtered = filtered.filter((tp) =>
        `${tp.name} ${tp.email ?? ''} ${tp.code}`.toLowerCase().includes(search),
      );
    }
    if (typeFilter) {
      filtered = filtered.filter((tp) => tp.type === typeFilter);
    }

    const count = filtered.length;
    const clients_count = filtered.filter((tp) => tp.type === 'customer').length;
    const suppliers_count = filtered.filter((tp) => tp.type === 'supplier').length;
    const prospects_count = 0;

    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const page = params.page && params.page > 0 ? params.page : 1;
    const start = (page - 1) * limit;
    const results = filtered.slice(start, start + limit).map(this.toContactRecord);

    return { results, count, clients_count, suppliers_count, prospects_count };
  }

  /**
   * Liste paginée des entreprises (tiers) pour les sélecteurs.
   */
  async getCompanies(
    adapter: DataAdapter,
    params: ContactQueryParams = {},
  ): Promise<CompaniesListResult> {
    const all = await adapter.getAll<DBThirdParty>('thirdParties');

    const search = String(params.search ?? '').trim().toLowerCase();
    let filtered = all;
    if (search) {
      filtered = filtered.filter((tp) => `${tp.name} ${tp.code}`.toLowerCase().includes(search));
    }

    const count = filtered.length;
    const limit = params.limit && params.limit > 0 ? params.limit : 1000;
    const page = params.page && params.page > 0 ? params.page : 1;
    const start = (page - 1) * limit;
    const results = filtered.slice(start, start + limit).map(
      (tp): CompanyRecord => ({ id: tp.id, denomination: tp.name, code: tp.code }),
    );

    return { results, count };
  }

  /**
   * Crée un contact (tiers).
   */
  async createContact(adapter: DataAdapter, data: ContactInput): Promise<ContactRecord> {
    const payload = this.toThirdPartyData(data);
    const created = await adapter.create<DBThirdParty>('thirdParties', payload);
    return this.toContactRecord(created);
  }

  /**
   * Met à jour un contact (tiers).
   */
  async updateContact(
    adapter: DataAdapter,
    id: string,
    data: ContactInput,
  ): Promise<ContactRecord> {
    const patch = this.toThirdPartyPatch(data);
    const updated = await adapter.update<DBThirdParty>('thirdParties', id, patch);
    return this.toContactRecord(updated);
  }

  /**
   * Supprime un contact (tiers).
   */
  async deleteContact(adapter: DataAdapter, id: string): Promise<void> {
    await adapter.delete('thirdParties', id);
  }

  /** Dérive un enregistrement contact à partir d'un tiers stocké. */
  private toContactRecord(tp: DBThirdParty): ContactRecord {
    return {
      id: tp.id,
      code: tp.code,
      nom: tp.name,
      prenom: '',
      email: tp.email ?? '',
      telephone: tp.phone ?? '',
      telephone_mobile: '',
      fonction: '',
      type_tiers: TYPE_TO_UI[tp.type] ?? 'client',
      entreprise_id: '',
      entreprise_nom: tp.name,
      ville: '',
      pays: '',
      actif: tp.isActive,
    };
  }

  /** Construit un tiers complet à insérer à partir des données de formulaire. */
  private toThirdPartyData(data: ContactInput): Omit<DBThirdParty, 'id'> {
    const name = [data.prenom, data.nom].filter(Boolean).join(' ').trim() || (data.nom ?? '');
    const address = [data.adresse, data.code_postal, data.ville, data.pays]
      .filter(Boolean)
      .join(', ');
    return {
      code: `CONT-${crypto.randomUUID().slice(0, 8)}`,
      name,
      type: uiTypeToDb(data.type_tiers),
      email: data.email ?? '',
      phone: data.telephone_fixe || data.telephone_mobile || '',
      address,
      balance: 0,
      isActive: true,
    };
  }

  /** Construit le patch partiel d'un tiers à partir des données de formulaire. */
  private toThirdPartyPatch(data: ContactInput): Partial<DBThirdParty> {
    const patch: Partial<DBThirdParty> = {};
    const name = [data.prenom, data.nom].filter(Boolean).join(' ').trim();
    if (name) patch.name = name;
    if (data.type_tiers) patch.type = uiTypeToDb(data.type_tiers);
    if (data.email !== undefined) patch.email = data.email;
    const phone = data.telephone_fixe || data.telephone_mobile;
    if (phone) patch.phone = phone;
    const address = [data.adresse, data.code_postal, data.ville, data.pays]
      .filter(Boolean)
      .join(', ');
    if (address) patch.address = address;
    return patch;
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(tiers: BackendTiersRecord): ThirdParty {
    return {
      id: tiers.id,
      code: tiers.code,
      nom: tiers.nom,
      type: tiers.type as ThirdParty['type'],
      statut: tiers.statut as ThirdParty['statut'],
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
  private transformToBackend(tiers: Partial<ThirdParty>): BackendTiersData {
    const data: BackendTiersData = {};
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
  private transformToFrontend(adresse: BackendAdresse): ThirdPartyAddress {
    return {
      id: adresse.id,
      tiers: adresse.tiers,
      type: adresse.type as ThirdPartyAddress['type'],
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
  private transformToBackend(adresse: Partial<ThirdPartyAddress>): BackendAdresseData {
    const data: BackendAdresseData = {};
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
  private transformToFrontend(contact: BackendContact): ThirdPartyContact {
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
  private transformToBackend(contact: Partial<ThirdPartyContact>): BackendContactData {
    const data: BackendContactData = {};
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
