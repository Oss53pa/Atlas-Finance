/**
 * Service Accounting WiseBook
 * Gestion de la comptabilité SYSCOHADA
 */

import { enhancedApiClient } from '@/lib/enhanced-api-client';
import type {
  FiscalYear,
  FiscalYearCreateRequest,
  FiscalYearUpdateRequest,
  Journal,
  JournalCreateRequest,
  JournalUpdateRequest,
  ChartOfAccounts,
  ChartOfAccountsCreateRequest,
  ChartOfAccountsUpdateRequest,
  AccountByClassParams,
  JournalEntry,
  JournalEntryCreateRequest,
  JournalEntryUpdateRequest,
  JournalEntryValidateResponse,
  JournalEntryStats,
  JournalEntryLine,
  PaginatedResponse,
  QueryParams,
  AccountClass
} from '@/types/backend.types';

// ==================== FISCAL YEARS SERVICE ====================

export class FiscalYearService {
  private readonly baseUrl = '/exercices';

  /**
   * Liste tous les exercices
   * GET /api/v1/exercices/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<FiscalYear>> {
    return enhancedApiClient.getPaginated<FiscalYear>(this.baseUrl, params);
  }

  /**
   * Récupérer un exercice par ID
   * GET /api/v1/exercices/{id}/
   */
  async getById(id: string): Promise<FiscalYear> {
    return enhancedApiClient.get<FiscalYear>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer un nouvel exercice
   * POST /api/v1/exercices/
   */
  async create(data: FiscalYearCreateRequest): Promise<FiscalYear> {
    return enhancedApiClient.post<FiscalYear>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour un exercice
   * PUT /api/v1/exercices/{id}/
   */
  async update(id: string, data: FiscalYearUpdateRequest): Promise<FiscalYear> {
    return enhancedApiClient.put<FiscalYear>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour un exercice (partiel)
   * PATCH /api/v1/exercices/{id}/
   */
  async patch(id: string, data: Partial<FiscalYearUpdateRequest>): Promise<FiscalYear> {
    return enhancedApiClient.patch<FiscalYear>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer un exercice
   * DELETE /api/v1/exercices/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les exercices actifs
   * GET /api/v1/exercices/active/
   */
  async listActive(): Promise<FiscalYear[]> {
    return enhancedApiClient.get<FiscalYear[]>(`${this.baseUrl}/active/`);
  }

  /**
   * Clôturer un exercice
   */
  async close(id: string): Promise<FiscalYear> {
    return this.patch(id, { is_closed: true });
  }

  /**
   * Rouvrir un exercice
   */
  async reopen(id: string): Promise<FiscalYear> {
    return this.patch(id, { is_closed: false });
  }
}

// ==================== JOURNALS SERVICE ====================

export class JournalService {
  private readonly baseUrl = '/journaux';

  /**
   * Liste tous les journaux
   * GET /api/v1/journaux/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<Journal>> {
    return enhancedApiClient.getPaginated<Journal>(this.baseUrl, params);
  }

  /**
   * Récupérer un journal par ID
   * GET /api/v1/journaux/{id}/
   */
  async getById(id: string): Promise<Journal> {
    return enhancedApiClient.get<Journal>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer un nouveau journal
   * POST /api/v1/journaux/
   */
  async create(data: JournalCreateRequest): Promise<Journal> {
    return enhancedApiClient.post<Journal>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour un journal
   * PUT /api/v1/journaux/{id}/
   */
  async update(id: string, data: JournalUpdateRequest): Promise<Journal> {
    return enhancedApiClient.put<Journal>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour un journal (partiel)
   * PATCH /api/v1/journaux/{id}/
   */
  async patch(id: string, data: Partial<JournalUpdateRequest>): Promise<Journal> {
    return enhancedApiClient.patch<Journal>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer un journal
   * DELETE /api/v1/journaux/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les journaux actifs
   */
  async listActive(params?: QueryParams): Promise<PaginatedResponse<Journal>> {
    return this.list({ ...params, is_active: true } as any);
  }
}

// ==================== CHART OF ACCOUNTS SERVICE ====================

export class ChartOfAccountsService {
  private readonly baseUrl = '/comptes';

  /**
   * Liste tous les comptes
   * GET /api/v1/comptes/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return enhancedApiClient.getPaginated<ChartOfAccounts>(this.baseUrl, params);
  }

  /**
   * Récupérer un compte par ID
   * GET /api/v1/comptes/{id}/
   */
  async getById(id: string): Promise<ChartOfAccounts> {
    return enhancedApiClient.get<ChartOfAccounts>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer un nouveau compte
   * POST /api/v1/comptes/
   */
  async create(data: ChartOfAccountsCreateRequest): Promise<ChartOfAccounts> {
    return enhancedApiClient.post<ChartOfAccounts>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour un compte
   * PUT /api/v1/comptes/{id}/
   */
  async update(id: string, data: ChartOfAccountsUpdateRequest): Promise<ChartOfAccounts> {
    return enhancedApiClient.put<ChartOfAccounts>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour un compte (partiel)
   * PATCH /api/v1/comptes/{id}/
   */
  async patch(id: string, data: Partial<ChartOfAccountsUpdateRequest>): Promise<ChartOfAccounts> {
    return enhancedApiClient.patch<ChartOfAccounts>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer un compte
   * DELETE /api/v1/comptes/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les comptes par classe SYSCOHADA
   * GET /api/v1/comptes/by_class/
   */
  async getByClass(params: AccountByClassParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return enhancedApiClient.getPaginated<ChartOfAccounts>(`${this.baseUrl}/by_class/`, params);
  }

  /**
   * Récupérer tous les comptes d'une classe spécifique
   */
  async listByClass(accountClass: AccountClass, params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return this.list({ ...params, account_class: accountClass } as any);
  }

  /**
   * Rechercher des comptes par code ou nom
   */
  async search(query: string, params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return this.list({ ...params, search: query });
  }

  /**
   * Récupérer les comptes actifs uniquement
   */
  async listActive(params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return this.list({ ...params, is_active: true } as any);
  }

  /**
   * Récupérer les comptes auxiliaires (clients/fournisseurs)
   */
  async listAuxiliary(params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return this.list({ ...params, is_auxiliary: true } as any);
  }

  /**
   * Récupérer les comptes lettrables
   */
  async listReconcilable(params?: QueryParams): Promise<PaginatedResponse<ChartOfAccounts>> {
    return this.list({ ...params, is_reconcilable: true } as any);
  }
}

// ==================== JOURNAL ENTRIES SERVICE ====================

export class JournalEntryService {
  private readonly baseUrl = '/ecritures';

  /**
   * Liste toutes les écritures
   * GET /api/v1/ecritures/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return enhancedApiClient.getPaginated<JournalEntry>(this.baseUrl, params);
  }

  /**
   * Récupérer une écriture par ID
   * GET /api/v1/ecritures/{id}/
   */
  async getById(id: string): Promise<JournalEntry> {
    return enhancedApiClient.get<JournalEntry>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer une nouvelle écriture
   * POST /api/v1/ecritures/
   */
  async create(data: JournalEntryCreateRequest): Promise<JournalEntry> {
    return enhancedApiClient.post<JournalEntry>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour une écriture
   * PUT /api/v1/ecritures/{id}/
   */
  async update(id: string, data: JournalEntryUpdateRequest): Promise<JournalEntry> {
    return enhancedApiClient.put<JournalEntry>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Mettre à jour une écriture (partiel)
   * PATCH /api/v1/ecritures/{id}/
   */
  async patch(id: string, data: Partial<JournalEntryUpdateRequest>): Promise<JournalEntry> {
    return enhancedApiClient.patch<JournalEntry>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer une écriture
   * DELETE /api/v1/ecritures/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Valider une écriture
   * POST /api/v1/ecritures/{id}/validate/
   */
  async validate(id: string): Promise<JournalEntryValidateResponse> {
    return enhancedApiClient.post<JournalEntryValidateResponse>(`${this.baseUrl}/${id}/validate/`);
  }

  /**
   * Récupérer les statistiques des écritures
   * GET /api/v1/ecritures/stats/
   */
  async getStats(params?: any): Promise<JournalEntryStats> {
    return enhancedApiClient.get<JournalEntryStats>(`${this.baseUrl}/stats/`, params);
  }

  /**
   * Récupérer les écritures non validées
   */
  async listPending(params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return this.list({ ...params, is_validated: false } as any);
  }

  /**
   * Récupérer les écritures validées
   */
  async listValidated(params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return this.list({ ...params, is_validated: true } as any);
  }

  /**
   * Récupérer les écritures par journal
   */
  async listByJournal(journalId: string, params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return this.list({ ...params, journal: journalId } as any);
  }

  /**
   * Récupérer les écritures par exercice
   */
  async listByFiscalYear(fiscalYearId: string, params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return this.list({ ...params, fiscal_year: fiscalYearId } as any);
  }

  /**
   * Récupérer les écritures par période
   */
  async listByPeriod(startDate: string, endDate: string, params?: QueryParams): Promise<PaginatedResponse<JournalEntry>> {
    return this.list({ ...params, entry_date__gte: startDate, entry_date__lte: endDate } as any);
  }
}

// ==================== JOURNAL ENTRY LINES SERVICE ====================

export class JournalEntryLineService {
  private readonly baseUrl = '/lignes-ecriture';

  /**
   * Liste toutes les lignes d'écriture
   * GET /api/v1/lignes-ecriture/
   */
  async list(params?: QueryParams): Promise<PaginatedResponse<JournalEntryLine>> {
    return enhancedApiClient.getPaginated<JournalEntryLine>(this.baseUrl, params);
  }

  /**
   * Récupérer une ligne par ID
   * GET /api/v1/lignes-ecriture/{id}/
   */
  async getById(id: string): Promise<JournalEntryLine> {
    return enhancedApiClient.get<JournalEntryLine>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Créer une nouvelle ligne
   * POST /api/v1/lignes-ecriture/
   */
  async create(data: Partial<JournalEntryLine>): Promise<JournalEntryLine> {
    return enhancedApiClient.post<JournalEntryLine>(this.baseUrl + '/', data);
  }

  /**
   * Mettre à jour une ligne
   * PUT /api/v1/lignes-ecriture/{id}/
   */
  async update(id: string, data: Partial<JournalEntryLine>): Promise<JournalEntryLine> {
    return enhancedApiClient.put<JournalEntryLine>(`${this.baseUrl}/${id}/`, data);
  }

  /**
   * Supprimer une ligne
   * DELETE /api/v1/lignes-ecriture/{id}/
   */
  async delete(id: string): Promise<void> {
    return enhancedApiClient.delete<void>(`${this.baseUrl}/${id}/`);
  }

  /**
   * Récupérer les lignes d'une écriture
   */
  async listByEntry(entryId: string, params?: QueryParams): Promise<PaginatedResponse<JournalEntryLine>> {
    return this.list({ ...params, journal_entry: entryId } as any);
  }

  /**
   * Récupérer les lignes d'un compte
   */
  async listByAccount(accountId: string, params?: QueryParams): Promise<PaginatedResponse<JournalEntryLine>> {
    return this.list({ ...params, account: accountId } as any);
  }
}

// ==================== SINGLETON INSTANCES ====================

export const fiscalYearService = new FiscalYearService();
export const journalService = new JournalService();
export const chartOfAccountsService = new ChartOfAccountsService();
export const journalEntryService = new JournalEntryService();
export const journalEntryLineService = new JournalEntryLineService();

// Default exports
export default {
  fiscalYear: fiscalYearService,
  journal: journalService,
  chartOfAccounts: chartOfAccountsService,
  journalEntry: journalEntryService,
  journalEntryLine: journalEntryLineService,
};
