/**
 * SERVICE TRÉSORERIE COMPLET
 *
 * Gestion complète de la trésorerie:
 * - Comptes bancaires (Bank Accounts)
 * - Transactions bancaires (Bank Transactions)
 * - Rapprochements bancaires
 * - Prévisions de trésorerie
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  BankAccount,
  BankTransaction,
  TreasuryQueryParams,
} from '../types/api.types';

/**
 * SERVICE COMPTES BANCAIRES
 */
class BankAccountsService extends BaseApiService<BankAccount> {
  protected readonly basePath = '/api/comptes-bancaires';
  protected readonly entityName = 'compte bancaire';

  /**
   * Obtenir les comptes bancaires actifs
   */
  async getActiveAccounts(): Promise<BankAccount[]> {
    return apiClient.get<BankAccount[]>(this.basePath + '/', {
      actif: true,
    });
  }

  /**
   * Obtenir les comptes par devise
   */
  async getByCurrency(deviseId: string, params?: QueryParams): Promise<BankAccount[]> {
    return apiClient.get<BankAccount[]>(this.basePath + '/', {
      ...params,
      devise: deviseId,
    });
  }

  /**
   * Obtenir les comptes par banque
   */
  async getByBank(banque: string, params?: QueryParams): Promise<BankAccount[]> {
    return apiClient.get<BankAccount[]>(this.basePath + '/', {
      ...params,
      banque,
    });
  }

  /**
   * Obtenir le solde d'un compte à une date donnée
   */
  async getBalanceAtDate(
    accountId: string,
    date: string
  ): Promise<{ solde: number; date: string }> {
    return apiClient.get<{ solde: number; date: string }>(
      `${this.basePath}/${accountId}/balance/`,
      { date }
    );
  }

  /**
   * Obtenir l'historique des soldes
   */
  async getBalanceHistory(
    accountId: string,
    dateDebut: string,
    dateFin: string
  ): Promise<Array<{ date: string; solde: number }>> {
    return apiClient.get<Array<{ date: string; solde: number }>>(
      `${this.basePath}/${accountId}/balance-history/`,
      { date_debut: dateDebut, date_fin: dateFin }
    );
  }

  /**
   * Obtenir les transactions d'un compte
   */
  async getTransactions(
    accountId: string,
    params?: TreasuryQueryParams
  ): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(
      `${this.basePath}/${accountId}/transactions/`,
      params
    );
  }

  /**
   * Vérifier si un numéro de compte existe
   */
  async checkAccountExists(numeroCompte: string): Promise<boolean> {
    try {
      const accounts = await apiClient.get<BankAccount[]>(this.basePath + '/', {
        numero_compte: numeroCompte,
      });
      return accounts.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clôturer un compte bancaire
   */
  async closeAccount(id: string, dateCloture: string, options?: CrudOptions): Promise<BankAccount> {
    return this.customAction<BankAccount>(
      'post',
      'close',
      id,
      { date_fermeture: dateCloture },
      {
        ...options,
        successMessage: 'Compte bancaire clôturé avec succès',
      }
    );
  }

  /**
   * Réactiver un compte bancaire
   */
  async reopenAccount(id: string, options?: CrudOptions): Promise<BankAccount> {
    return this.customAction<BankAccount>(
      'post',
      'reopen',
      id,
      {},
      {
        ...options,
        successMessage: 'Compte bancaire réactivé avec succès',
      }
    );
  }
}

/**
 * SERVICE TRANSACTIONS BANCAIRES
 */
class BankTransactionsService extends BaseApiService<BankTransaction> {
  protected readonly basePath = '/api/transactions-bancaires';
  protected readonly entityName = 'transaction bancaire';

  /**
   * Obtenir les transactions par compte
   */
  async getByAccount(
    compteId: string,
    params?: TreasuryQueryParams
  ): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(this.basePath + '/', {
      ...params,
      compte_bancaire: compteId,
    });
  }

  /**
   * Obtenir les transactions par période
   */
  async getByPeriod(
    dateDebut: string,
    dateFin: string,
    params?: QueryParams
  ): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(this.basePath + '/', {
      ...params,
      date_debut: dateDebut,
      date_fin: dateFin,
    });
  }

  /**
   * Obtenir les transactions par statut
   */
  async getByStatus(
    statut: string,
    params?: QueryParams
  ): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir les transactions par type
   */
  async getByType(
    type: string,
    params?: QueryParams
  ): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(this.basePath + '/', {
      ...params,
      type_operation: type,
    });
  }

  /**
   * Obtenir les transactions non rapprochées
   */
  async getUnreconciled(compteId?: string): Promise<BankTransaction[]> {
    return apiClient.get<BankTransaction[]>(this.basePath + '/', {
      statut: 'en_attente',
      compte_bancaire: compteId,
    });
  }

  /**
   * Rapprocher une transaction
   */
  async reconcile(
    id: string,
    ecritureId: string,
    options?: CrudOptions
  ): Promise<BankTransaction> {
    return this.customAction<BankTransaction>(
      'post',
      'reconcile',
      id,
      { ecriture_comptable: ecritureId },
      {
        ...options,
        successMessage: 'Transaction rapprochée avec succès',
      }
    );
  }

  /**
   * Dé-rapprocher une transaction
   */
  async unreconcile(id: string, options?: CrudOptions): Promise<BankTransaction> {
    return this.customAction<BankTransaction>(
      'post',
      'unreconcile',
      id,
      {},
      {
        ...options,
        successMessage: 'Transaction dé-rapprochée avec succès',
      }
    );
  }

  /**
   * Lettrer une transaction
   */
  async letterTransaction(id: string, options?: CrudOptions): Promise<BankTransaction> {
    return this.customAction<BankTransaction>(
      'post',
      'letter',
      id,
      {},
      {
        ...options,
        successMessage: 'Transaction lettrée avec succès',
      }
    );
  }

  /**
   * Import de relevé bancaire
   */
  async importBankStatement(
    file: File,
    compteId: string,
    format: 'ofx' | 'qif' | 'csv',
    onProgress?: (progress: number) => void
  ): Promise<{ success: number; errors: any[]; duplicates: number }> {
    return apiClient.uploadFile<{ success: number; errors: any[]; duplicates: number }>(
      this.basePath + '/import-statement/',
      file,
      { compte_bancaire: compteId, format },
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

  /**
   * Créer une transaction avec écriture comptable automatique
   */
  async createWithAccounting(
    data: Partial<BankTransaction>,
    options?: CrudOptions
  ): Promise<{ transaction: BankTransaction; ecriture: any }> {
    return this.customAction<{ transaction: BankTransaction; ecriture: any }>(
      'post',
      'create-with-accounting',
      undefined,
      data,
      {
        ...options,
        successMessage: 'Transaction créée avec écriture comptable',
      }
    );
  }

  /**
   * Export des transactions
   */
  async exportTransactions(
    format: 'excel' | 'pdf' | 'csv',
    params?: TreasuryQueryParams,
    filename?: string
  ): Promise<void> {
    return this.export(format, params, filename);
  }
}

/**
 * SERVICE RAPPORTS TRÉSORERIE
 */
class TreasuryReportsService {
  private basePath = '/api/reports/treasury';

  /**
   * Générer la position de trésorerie
   */
  async generateTreasuryPosition(params?: {
    date?: string;
    devise?: string;
  }): Promise<{
    date: string;
    comptes: Array<{
      compte: BankAccount;
      solde: number;
      solde_prevu?: number;
    }>;
    total: number;
    total_prevu?: number;
  }> {
    return apiClient.get(`${this.basePath}/position/`, params);
  }

  /**
   * Générer les prévisions de trésorerie
   */
  async generateCashFlowForecast(params: {
    date_debut: string;
    date_fin: string;
    compte_bancaire?: string;
  }): Promise<{
    periodes: Array<{
      date: string;
      solde_initial: number;
      entrees: number;
      sorties: number;
      solde_final: number;
    }>;
    total_entrees: number;
    total_sorties: number;
  }> {
    return apiClient.get(`${this.basePath}/forecast/`, params);
  }

  /**
   * Générer le flux de trésorerie
   */
  async generateCashFlow(params: {
    date_debut: string;
    date_fin: string;
    compte_bancaire?: string;
  }): Promise<{
    exploitation: number;
    investissement: number;
    financement: number;
    variation_tresorerie: number;
    solde_initial: number;
    solde_final: number;
    details: Array<{
      categorie: string;
      montant: number;
      operations: Array<{
        date: string;
        libelle: string;
        montant: number;
      }>;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/cash-flow/`, params);
  }

  /**
   * Générer le rapprochement bancaire
   */
  async generateReconciliationReport(params: {
    compte_bancaire: string;
    date_debut: string;
    date_fin: string;
  }): Promise<{
    compte: BankAccount;
    periode: { debut: string; fin: string };
    solde_banque: number;
    solde_comptable: number;
    ecart: number;
    operations_non_rapprochees: {
      banque: BankTransaction[];
      comptabilite: any[];
    };
    operations_rapprochees: number;
  }> {
    return apiClient.get(`${this.basePath}/reconciliation/`, params);
  }

  /**
   * Export position de trésorerie
   */
  async exportTreasuryPosition(
    format: 'excel' | 'pdf' | 'csv',
    params?: { date?: string; devise?: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `tresorerie-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/position/export/`, exportFilename, {
      ...params,
      format,
    });
  }

  /**
   * Export flux de trésorerie
   */
  async exportCashFlow(
    format: 'excel' | 'pdf' | 'csv',
    params: { date_debut: string; date_fin: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `flux-tresorerie-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/cash-flow/export/`, exportFilename, {
      ...params,
      format,
    });
  }

  /**
   * Export rapprochement bancaire
   */
  async exportReconciliation(
    format: 'excel' | 'pdf' | 'csv',
    params: { compte_bancaire: string; date_debut: string; date_fin: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `rapprochement-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/reconciliation/export/`, exportFilename, {
      ...params,
      format,
    });
  }
}

/**
 * EXPORTS
 */
export const bankAccountsService = new BankAccountsService();
export const bankTransactionsService = new BankTransactionsService();
export const treasuryReportsService = new TreasuryReportsService();

export default {
  bankAccounts: bankAccountsService,
  bankTransactions: bankTransactionsService,
  reports: treasuryReportsService,
};