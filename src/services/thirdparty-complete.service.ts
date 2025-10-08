/**
 * SERVICE TIERS COMPLET
 *
 * Gestion complète des tiers:
 * - Tiers (Third Party) - Clients, Fournisseurs
 * - Contacts
 * - Relations et historique
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  ThirdParty,
  Contact,
} from '../types/api.types';

/**
 * SERVICE TIERS
 */
class ThirdPartyService extends BaseApiService<ThirdParty> {
  protected readonly basePath = '/api/tiers';
  protected readonly entityName = 'tiers';

  /**
   * Obtenir les tiers par type
   */
  async getByType(type: string, params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      type,
    });
  }

  /**
   * Obtenir les clients uniquement
   */
  async getClients(params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      type: 'client',
    });
  }

  /**
   * Obtenir les fournisseurs uniquement
   */
  async getSuppliers(params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      type: 'fournisseur',
    });
  }

  /**
   * Obtenir les clients-fournisseurs
   */
  async getClientSuppliers(params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      type: 'client_fournisseur',
    });
  }

  /**
   * Obtenir les tiers actifs
   */
  async getActiveThirdParties(type?: string): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      actif: true,
      type,
    });
  }

  /**
   * Obtenir les tiers par pays
   */
  async getByCountry(pays: string, params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      pays,
    });
  }

  /**
   * Obtenir les tiers par ville
   */
  async getByCity(ville: string, params?: QueryParams): Promise<ThirdParty[]> {
    return apiClient.get<ThirdParty[]>(this.basePath + '/', {
      ...params,
      ville,
    });
  }

  /**
   * Vérifier si un code tiers existe
   */
  async checkCodeExists(code: string): Promise<boolean> {
    try {
      const parties = await apiClient.get<ThirdParty[]>(this.basePath + '/', {
        code,
      });
      return parties.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Obtenir les contacts d'un tiers
   */
  async getContacts(tiersId: string): Promise<Contact[]> {
    return apiClient.get<Contact[]>(`${this.basePath}/${tiersId}/contacts/`);
  }

  /**
   * Obtenir le solde d'un tiers
   */
  async getBalance(
    tiersId: string,
    dateDebut?: string,
    dateFin?: string
  ): Promise<{
    solde_debiteur: number;
    solde_crediteur: number;
    solde_net: number;
    details: Array<{
      date: string;
      libelle: string;
      debit: number;
      credit: number;
      solde: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/${tiersId}/balance/`, {
      date_debut: dateDebut,
      date_fin: dateFin,
    });
  }

  /**
   * Obtenir les écritures d'un tiers
   */
  async getAccountingEntries(
    tiersId: string,
    params?: {
      date_debut?: string;
      date_fin?: string;
      statut?: string;
    }
  ): Promise<any[]> {
    return apiClient.get<any[]>(`${this.basePath}/${tiersId}/entries/`, params);
  }

  /**
   * Obtenir les factures d'un tiers
   */
  async getInvoices(
    tiersId: string,
    params?: {
      date_debut?: string;
      date_fin?: string;
      statut?: string;
      type?: 'vente' | 'achat';
    }
  ): Promise<any[]> {
    return apiClient.get<any[]>(`${this.basePath}/${tiersId}/invoices/`, params);
  }

  /**
   * Obtenir les paiements d'un tiers
   */
  async getPayments(
    tiersId: string,
    params?: {
      date_debut?: string;
      date_fin?: string;
    }
  ): Promise<any[]> {
    return apiClient.get<any[]>(`${this.basePath}/${tiersId}/payments/`, params);
  }

  /**
   * Obtenir les créances d'un client
   */
  async getReceivables(
    clientId: string
  ): Promise<{
    total: number;
    en_retard: number;
    a_echeance: number;
    details: Array<{
      facture: string;
      date_facture: string;
      date_echeance: string;
      montant: number;
      reste_a_payer: number;
      retard_jours: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/${clientId}/receivables/`);
  }

  /**
   * Obtenir les dettes d'un fournisseur
   */
  async getPayables(
    supplierId: string
  ): Promise<{
    total: number;
    en_retard: number;
    a_echeance: number;
    details: Array<{
      facture: string;
      date_facture: string;
      date_echeance: string;
      montant: number;
      reste_a_payer: number;
      retard_jours: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/${supplierId}/payables/`);
  }

  /**
   * Générer le compte client (compte comptable)
   */
  async generateAccountNumber(type: 'client' | 'fournisseur'): Promise<{ numero: string }> {
    return apiClient.get<{ numero: string }>(`${this.basePath}/generate-account-number/`, {
      type,
    });
  }

  /**
   * Fusionner deux tiers
   */
  async mergeThirdParties(
    sourceId: string,
    targetId: string,
    options?: CrudOptions
  ): Promise<ThirdParty> {
    return this.customAction<ThirdParty>(
      'post',
      'merge',
      undefined,
      {
        source: sourceId,
        target: targetId,
      },
      {
        ...options,
        successMessage: 'Tiers fusionnés avec succès',
      }
    );
  }

  /**
   * Archiver un tiers
   */
  async archive(id: string, options?: CrudOptions): Promise<ThirdParty> {
    return this.customAction<ThirdParty>(
      'post',
      'archive',
      id,
      {},
      {
        ...options,
        successMessage: 'Tiers archivé',
      }
    );
  }

  /**
   * Désarchiver un tiers
   */
  async unarchive(id: string, options?: CrudOptions): Promise<ThirdParty> {
    return this.customAction<ThirdParty>(
      'post',
      'unarchive',
      id,
      {},
      {
        ...options,
        successMessage: 'Tiers désarchivé',
      }
    );
  }

  /**
   * Export des tiers
   */
  async exportThirdParties(
    format: 'excel' | 'pdf' | 'csv',
    params?: QueryParams,
    filename?: string
  ): Promise<void> {
    return this.export(format, params, filename);
  }

  /**
   * Import de tiers
   */
  async importThirdParties(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: number; errors: any[] }> {
    return apiClient.uploadFile<{ success: number; errors: any[] }>(
      this.basePath + '/import/',
      file,
      {},
      onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined
    );
  }
}

/**
 * SERVICE CONTACTS
 */
class ContactsService extends BaseApiService<Contact> {
  protected readonly basePath = '/api/contacts';
  protected readonly entityName = 'contact';

  /**
   * Obtenir les contacts d'un tiers
   */
  async getByThirdParty(tiersId: string, params?: QueryParams): Promise<Contact[]> {
    return apiClient.get<Contact[]>(this.basePath + '/', {
      ...params,
      tiers: tiersId,
    });
  }

  /**
   * Obtenir le contact principal d'un tiers
   */
  async getPrincipalContact(tiersId: string): Promise<Contact | null> {
    const contacts = await apiClient.get<Contact[]>(this.basePath + '/', {
      tiers: tiersId,
      principal: true,
    });
    return contacts.length > 0 ? contacts[0] : null;
  }

  /**
   * Obtenir les contacts actifs
   */
  async getActiveContacts(tiersId?: string): Promise<Contact[]> {
    return apiClient.get<Contact[]>(this.basePath + '/', {
      actif: true,
      tiers: tiersId,
    });
  }

  /**
   * Définir comme contact principal
   */
  async setAsPrincipal(id: string, options?: CrudOptions): Promise<Contact> {
    return this.customAction<Contact>(
      'post',
      'set-principal',
      id,
      {},
      {
        ...options,
        successMessage: 'Contact défini comme principal',
      }
    );
  }

  /**
   * Rechercher des contacts par email
   */
  async searchByEmail(email: string): Promise<Contact[]> {
    return this.search(email, { email });
  }

  /**
   * Rechercher des contacts par téléphone
   */
  async searchByPhone(phone: string): Promise<Contact[]> {
    return this.search(phone, { telephone: phone });
  }
}

/**
 * SERVICE RAPPORTS TIERS
 */
class ThirdPartyReportsService {
  private basePath = '/api/reports/thirdparty';

  /**
   * Générer le rapport clients
   */
  async generateCustomersReport(params?: {
    date_debut?: string;
    date_fin?: string;
  }): Promise<{
    nombre_clients: number;
    clients_actifs: number;
    chiffre_affaires: number;
    creances: number;
    creances_en_retard: number;
    top_clients: Array<{
      tiers: ThirdParty;
      chiffre_affaires: number;
      nombre_factures: number;
      solde: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/customers/`, params);
  }

  /**
   * Générer le rapport fournisseurs
   */
  async generateSuppliersReport(params?: {
    date_debut?: string;
    date_fin?: string;
  }): Promise<{
    nombre_fournisseurs: number;
    fournisseurs_actifs: number;
    total_achats: number;
    dettes: number;
    dettes_en_retard: number;
    top_fournisseurs: Array<{
      tiers: ThirdParty;
      total_achats: number;
      nombre_factures: number;
      solde: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/suppliers/`, params);
  }

  /**
   * Générer le rapport de balance âgée (clients)
   */
  async generateAgedReceivables(params?: {
    date?: string;
  }): Promise<{
    date: string;
    clients: Array<{
      tiers: ThirdParty;
      total: number;
      courant: number;
      a_30_jours: number;
      a_60_jours: number;
      a_90_jours: number;
      plus_90_jours: number;
    }>;
    totaux: {
      total: number;
      courant: number;
      a_30_jours: number;
      a_60_jours: number;
      a_90_jours: number;
      plus_90_jours: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/aged-receivables/`, params);
  }

  /**
   * Générer le rapport de balance âgée (fournisseurs)
   */
  async generateAgedPayables(params?: {
    date?: string;
  }): Promise<{
    date: string;
    fournisseurs: Array<{
      tiers: ThirdParty;
      total: number;
      courant: number;
      a_30_jours: number;
      a_60_jours: number;
      a_90_jours: number;
      plus_90_jours: number;
    }>;
    totaux: {
      total: number;
      courant: number;
      a_30_jours: number;
      a_60_jours: number;
      a_90_jours: number;
      plus_90_jours: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/aged-payables/`, params);
  }

  /**
   * Générer le relevé de compte d'un tiers
   */
  async generateAccountStatement(params: {
    tiers: string;
    date_debut: string;
    date_fin: string;
  }): Promise<{
    tiers: ThirdParty;
    periode: { debut: string; fin: string };
    solde_initial: number;
    operations: Array<{
      date: string;
      piece: string;
      libelle: string;
      debit: number;
      credit: number;
      solde: number;
    }>;
    solde_final: number;
  }> {
    return apiClient.get(`${this.basePath}/account-statement/`, params);
  }

  /**
   * Export rapport clients
   */
  async exportCustomersReport(
    format: 'excel' | 'pdf' | 'csv',
    params?: { date_debut?: string; date_fin?: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `rapport-clients-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/customers/export/`, exportFilename, {
      ...params,
      format,
    });
  }

  /**
   * Export balance âgée
   */
  async exportAgedReceivables(
    format: 'excel' | 'pdf' | 'csv',
    params?: { date?: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `balance-agee-clients-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/aged-receivables/export/`, exportFilename, {
      ...params,
      format,
    });
  }

  /**
   * Export relevé de compte
   */
  async exportAccountStatement(
    format: 'excel' | 'pdf' | 'csv',
    params: { tiers: string; date_debut: string; date_fin: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `releve-compte-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/account-statement/export/`, exportFilename, {
      ...params,
      format,
    });
  }
}

/**
 * EXPORTS
 */
export const thirdPartyService = new ThirdPartyService();
export const contactsService = new ContactsService();
export const thirdPartyReportsService = new ThirdPartyReportsService();

export default {
  thirdParty: thirdPartyService,
  contacts: contactsService,
  reports: thirdPartyReportsService,
};