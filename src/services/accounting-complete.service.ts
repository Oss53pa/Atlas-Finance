/**
 * SERVICE COMPTABILITÉ COMPLET - ADAPTED FOR BACKEND
 *
 * Gestion complète de la comptabilité:
 * - Plan comptable (Chart of Accounts)
 * - Journaux (Journals)
 * - Écritures comptables (Accounting Entries)
 * - Lignes d'écriture (Entry Lines)
 * - Validation et lettrage
 *
 * This service adapts the backend services to the existing frontend interface
 */

import {
  chartOfAccountsService as backendChartService,
  journalService as backendJournalService,
  journalEntryService as backendEntryService,
  journalEntryLineService as backendLineService,
} from './backend-services.index';
import { QueryParams } from '../lib/api-client';
import {
  ChartOfAccount,
  CreateAccountingEntryDto,
  UpdateAccountingEntryDto,
  Journal,
  AccountingEntry,
  AccountingEntryLine,
  AccountingQueryParams,
  BalanceResponse,
} from '../types/api.types';
import type { QueryParams as BackendQueryParams } from '../types/backend.types';

/**
 * SERVICE PLAN COMPTABLE
 */
class ChartOfAccountsService {
  /**
   * Get all accounts
   */
  async getAll(params?: QueryParams): Promise<ChartOfAccount[]> {
    const response = await backendChartService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];

    return results.map(this.transformToFrontend);
  }

  /**
   * Get account by ID
   */
  async getById(id: string): Promise<ChartOfAccount> {
    const account = await backendChartService.get(id);
    return this.transformToFrontend(account);
  }

  /**
   * Create new account
   */
  async create(data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const backendData = this.transformToBackend(data);
    const account = await backendChartService.create(backendData);
    return this.transformToFrontend(account);
  }

  /**
   * Update account
   */
  async update(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const backendData = this.transformToBackend(data);
    const account = await backendChartService.update(id, backendData);
    return this.transformToFrontend(account);
  }

  /**
   * Delete account
   */
  async delete(id: string): Promise<void> {
    return backendChartService.delete(id);
  }

  /**
   * Rechercher des comptes par numéro ou libellé
   */
  async searchAccounts(query: string): Promise<ChartOfAccount[]> {
    const results = await backendChartService.search(query);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les comptes par classe
   */
  async getByClass(classe: string, params?: QueryParams): Promise<ChartOfAccount[]> {
    const results = await backendChartService.listByClasse(classe, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir l'arbre hiérarchique des comptes
   */
  async getHierarchy(): Promise<ChartOfAccount[]> {
    const tree = await backendChartService.tree();
    return tree.map(this.transformToFrontend);
  }

  /**
   * Obtenir les comptes de détail (utilisables dans les écritures)
   */
  async getDetailAccounts(params?: QueryParams): Promise<ChartOfAccount[]> {
    const results = await backendChartService.listDetail(params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Vérifier si un numéro de compte existe
   */
  async checkAccountExists(numero: string): Promise<boolean> {
    try {
      await backendChartService.getByCode(numero);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Import du plan comptable SYSCOHADA
   */
  async importSYSCOHADA(): Promise<void> {
    // This would be implemented on the backend
    console.warn('importSYSCOHADA not yet implemented on backend');
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(account: any): ChartOfAccount {
    return {
      id: account.id,
      numero: account.code,
      libelle: account.name,
      type: account.type_compte,
      classe: account.classe,
      actif: account.is_active,
      parent: account.parent,
      description: account.description || '',
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    };
  }

  /**
   * Transform frontend format to backend format
   */
  private transformToBackend(account: Partial<ChartOfAccount>): any {
    const data: any = {};
    if (account.numero) data.code = account.numero;
    if (account.libelle) data.name = account.libelle;
    if (account.type) data.type_compte = account.type;
    if (account.classe) data.classe = account.classe;
    if (account.actif !== undefined) data.is_active = account.actif;
    if (account.parent) data.parent = account.parent;
    if (account.description) data.description = account.description;
    return data;
  }
}

/**
 * SERVICE JOURNAUX
 */
class JournalsService {
  /**
   * Get all journals
   */
  async getAll(params?: QueryParams): Promise<Journal[]> {
    const response = await backendJournalService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get journal by ID
   */
  async getById(id: string): Promise<Journal> {
    const journal = await backendJournalService.get(id);
    return this.transformToFrontend(journal);
  }

  /**
   * Create new journal
   */
  async create(data: Partial<Journal>): Promise<Journal> {
    const backendData = this.transformToBackend(data);
    const journal = await backendJournalService.create(backendData);
    return this.transformToFrontend(journal);
  }

  /**
   * Update journal
   */
  async update(id: string, data: Partial<Journal>): Promise<Journal> {
    const backendData = this.transformToBackend(data);
    const journal = await backendJournalService.update(id, backendData);
    return this.transformToFrontend(journal);
  }

  /**
   * Delete journal
   */
  async delete(id: string): Promise<void> {
    return backendJournalService.delete(id);
  }

  /**
   * Obtenir les journaux par type
   */
  async getByType(type: string, params?: QueryParams): Promise<Journal[]> {
    const results = await backendJournalService.listByType(type, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les journaux actifs
   */
  async getActiveJournals(): Promise<Journal[]> {
    const results = await backendJournalService.listActive();
    return results.map(this.transformToFrontend);
  }

  /**
   * Vérifier si un code de journal existe
   */
  async checkCodeExists(code: string): Promise<boolean> {
    try {
      await backendJournalService.getByCode(code);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(journal: any): Journal {
    return {
      id: journal.id,
      code: journal.code,
      libelle: journal.name,
      type: journal.type,
      actif: journal.is_active,
      description: journal.description || '',
      createdAt: journal.created_at,
      updatedAt: journal.updated_at,
    };
  }

  /**
   * Transform frontend format to backend format
   */
  private transformToBackend(journal: Partial<Journal>): any {
    const data: any = {};
    if (journal.code) data.code = journal.code;
    if (journal.libelle) data.name = journal.libelle;
    if (journal.type) data.type = journal.type;
    if (journal.actif !== undefined) data.is_active = journal.actif;
    if (journal.description) data.description = journal.description;
    return data;
  }
}

/**
 * SERVICE ÉCRITURES COMPTABLES
 */
class AccountingEntriesService {
  /**
   * Get all entries
   */
  async getAll(params?: AccountingQueryParams): Promise<AccountingEntry[]> {
    const response = await backendEntryService.list(params as any);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get entry by ID
   */
  async getById(id: string): Promise<AccountingEntry> {
    const entry = await backendEntryService.get(id);
    return this.transformToFrontend(entry);
  }

  /**
   * Create new entry
   */
  async create(data: CreateAccountingEntryDto): Promise<AccountingEntry> {
    const backendData = this.transformCreateToBackend(data);
    const entry = await backendEntryService.create(backendData);
    return this.transformToFrontend(entry);
  }

  /**
   * Update entry
   */
  async update(id: string, data: UpdateAccountingEntryDto): Promise<AccountingEntry> {
    const backendData = this.transformUpdateToBackend(data);
    const entry = await backendEntryService.update(id, backendData);
    return this.transformToFrontend(entry);
  }

  /**
   * Delete entry
   */
  async delete(id: string): Promise<void> {
    return backendEntryService.delete(id);
  }

  /**
   * Obtenir les écritures par journal
   */
  async getByJournal(journalId: string, params?: AccountingQueryParams): Promise<AccountingEntry[]> {
    const results = await backendEntryService.listByJournal(journalId, params as any);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les écritures par période
   */
  async getByPeriod(dateDebut: string, dateFin: string, params?: QueryParams): Promise<AccountingEntry[]> {
    const results = await backendEntryService.listByPeriod(dateDebut, dateFin, params as any);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les écritures par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<AccountingEntry[]> {
    const results = await backendEntryService.listByStatus(statut, params as any);
    return results.map(this.transformToFrontend);
  }

  /**
   * Valider une écriture
   */
  async validate(id: string): Promise<AccountingEntry> {
    const result = await backendEntryService.validate(id);
    return this.transformToFrontend(result.entry);
  }

  /**
   * Contrepasser une écriture
   */
  async reverse(id: string, date: string, pieceNumber?: string): Promise<AccountingEntry> {
    const entry = await backendEntryService.reverse(id, date, pieceNumber);
    return this.transformToFrontend(entry);
  }

  /**
   * Lettrer des écritures
   */
  async reconcile(entryIds: string[]): Promise<{ success: boolean; lettrage_id: string }> {
    // This would need to be implemented on the backend
    console.warn('reconcile not yet fully implemented');
    return { success: true, lettrage_id: '' };
  }

  /**
   * Dé-lettrer une écriture
   */
  async unreconcile(id: string): Promise<AccountingEntry> {
    // This would need to be implemented on the backend
    console.warn('unreconcile not yet fully implemented');
    const entry = await backendEntryService.get(id);
    return this.transformToFrontend(entry);
  }

  /**
   * Générer le numéro de pièce suivant
   */
  async getNextPieceNumber(journalCode: string): Promise<string> {
    // This would need to be implemented on the backend
    const now = new Date();
    return `${journalCode}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-001`;
  }

  /**
   * Valider le solde d'une écriture (débit = crédit)
   */
  validateBalance(lignes: AccountingEntryLine[]): {
    isValid: boolean;
    totalDebit: number;
    totalCredit: number;
    difference: number;
  } {
    const totalDebit = lignes.reduce((sum, ligne) => sum + (ligne.debit || 0), 0);
    const totalCredit = lignes.reduce((sum, ligne) => sum + (ligne.credit || 0), 0);
    const difference = Math.abs(totalDebit - totalCredit);
    const isValid = difference < 0.01;

    return {
      isValid,
      totalDebit,
      totalCredit,
      difference,
    };
  }

  /**
   * Dupliquer une écriture
   */
  async duplicate(id: string, newDate?: string): Promise<AccountingEntry> {
    // This would need to be implemented on the backend
    const entry = await backendEntryService.get(id);
    return this.transformToFrontend(entry);
  }

  /**
   * Export des écritures
   */
  async exportEntries(format: 'excel' | 'pdf' | 'csv', params?: AccountingQueryParams, filename?: string): Promise<void> {
    console.warn('exportEntries not yet implemented');
  }

  /**
   * Import d'écritures depuis fichier
   */
  async importEntries(file: File, journalId: string, onProgress?: (progress: number) => void): Promise<{ success: number; errors: any[] }> {
    console.warn('importEntries not yet implemented');
    return { success: 0, errors: [] };
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(entry: any): AccountingEntry {
    return {
      id: entry.id,
      journal: entry.journal,
      pieceNumber: entry.piece_number,
      date: entry.entry_date,
      description: entry.description,
      statut: entry.status,
      lignes: entry.lines || [],
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    };
  }

  /**
   * Transform create DTO to backend format
   */
  private transformCreateToBackend(data: CreateAccountingEntryDto): any {
    return {
      journal: data.journal,
      piece_number: data.pieceNumber,
      entry_date: data.date,
      description: data.description,
      lines: data.lignes?.map((ligne: any) => ({
        account: ligne.compte,
        debit: ligne.debit || 0,
        credit: ligne.credit || 0,
        description: ligne.description,
        third_party: ligne.tiers,
      })),
    };
  }

  /**
   * Transform update DTO to backend format
   */
  private transformUpdateToBackend(data: UpdateAccountingEntryDto): any {
    const backendData: any = {};
    if (data.pieceNumber) backendData.piece_number = data.pieceNumber;
    if (data.date) backendData.entry_date = data.date;
    if (data.description) backendData.description = data.description;
    return backendData;
  }
}

/**
 * SERVICE LIGNES D'ÉCRITURE
 */
class EntryLinesService {
  /**
   * Get all lines
   */
  async getAll(params?: QueryParams): Promise<AccountingEntryLine[]> {
    const response = await backendLineService.list(params as BackendQueryParams);
    const results = Array.isArray(response) ? response : response.results || [];
    return results.map(this.transformToFrontend);
  }

  /**
   * Get line by ID
   */
  async getById(id: string): Promise<AccountingEntryLine> {
    const line = await backendLineService.get(id);
    return this.transformToFrontend(line);
  }

  /**
   * Obtenir les lignes d'une écriture
   */
  async getByEntry(entryId: string): Promise<AccountingEntryLine[]> {
    const results = await backendLineService.listByEntry(entryId);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les lignes par compte
   */
  async getByAccount(accountId: string, params?: QueryParams): Promise<AccountingEntryLine[]> {
    const results = await backendLineService.listByAccount(accountId, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Obtenir les lignes par tiers
   */
  async getByThirdParty(tiersId: string, params?: QueryParams): Promise<AccountingEntryLine[]> {
    const results = await backendLineService.listByThirdParty(tiersId, params as BackendQueryParams);
    return results.map(this.transformToFrontend);
  }

  /**
   * Transform backend format to frontend format
   */
  private transformToFrontend(line: any): AccountingEntryLine {
    return {
      id: line.id,
      ecriture: line.entry,
      compte: line.account,
      debit: line.debit,
      credit: line.credit,
      description: line.description || '',
      tiers: line.third_party,
      createdAt: line.created_at,
      updatedAt: line.updated_at,
    };
  }
}

/**
 * SERVICE REPORTS COMPTABLES
 */
class AccountingReportsService {
  /**
   * Générer la balance générale
   */
  async generateBalance(params: AccountingQueryParams): Promise<BalanceResponse> {
    // This would need to be implemented on the backend
    console.warn('generateBalance not yet implemented on backend');
    return {
      comptes: [],
      totalDebit: 0,
      totalCredit: 0,
      balanced: true,
    };
  }

  /**
   * Générer le grand livre
   */
  async generateGeneralLedger(params: AccountingQueryParams): Promise<any> {
    // This would need to be implemented on the backend
    console.warn('generateGeneralLedger not yet implemented on backend');
    return {};
  }

  /**
   * Générer le journal
   */
  async generateJournal(journalCode: string, params: AccountingQueryParams): Promise<any> {
    // This would need to be implemented on the backend
    console.warn('generateJournal not yet implemented on backend');
    return {};
  }

  /**
   * Export balance
   */
  async exportBalance(format: 'excel' | 'pdf' | 'csv', params: AccountingQueryParams, filename?: string): Promise<void> {
    console.warn('exportBalance not yet implemented');
  }

  /**
   * Export grand livre
   */
  async exportGeneralLedger(format: 'excel' | 'pdf' | 'csv', params: AccountingQueryParams, filename?: string): Promise<void> {
    console.warn('exportGeneralLedger not yet implemented');
  }
}

/**
 * EXPORTS
 */
export const chartOfAccountsService = new ChartOfAccountsService();
export const journalsService = new JournalsService();
export const accountingEntriesService = new AccountingEntriesService();
export const entryLinesService = new EntryLinesService();
export const accountingReportsService = new AccountingReportsService();

// Export par défaut (objet avec tous les services)
export default {
  chartOfAccounts: chartOfAccountsService,
  journals: journalsService,
  entries: accountingEntriesService,
  entryLines: entryLinesService,
  reports: accountingReportsService,
};