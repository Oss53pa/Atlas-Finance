/**
 * SERVICE FRONTEND ACCOUNTING - WiseBook ERP v4.1.0
 * BASE PATH: /api/v1/accounting/
 *
 * Alignement 100% avec backend Django REST Framework
 * Architecture standardisée selon P0/P1 audit integration
 *
 * Gestion complète de la comptabilité:
 * - Sociétés (Companies)
 * - Exercices fiscaux (Fiscal Years)
 * - Journaux comptables (Journals)
 * - Plan comptable (Chart of Accounts)
 * - Écritures comptables (Journal Entries)
 * - Appels de fonds (Fund Calls)
 */

import { apiService } from './api';

const BASE_PATH = '/api/v1/accounting';

// ============================================================================
// INTERFACES TYPESCRIPT
// ============================================================================

export interface Company {
  id: string;
  name: string;
  code: string;
  legal_form: string;
  activity_sector?: string;
  rccm_number?: string;
  tax_number?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  currency: string;
  is_active: boolean;
  fiscal_years_count?: number;
  active_fiscal_year?: FiscalYear;
  created_at?: string;
  updated_at?: string;
}

export interface FiscalYear {
  id: string;
  company: string;
  company_name?: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  is_active: boolean;
  is_current?: boolean;
  entries_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Journal {
  id: string;
  company: string;
  company_name?: string;
  code: string;
  name: string;
  journal_type: 'sale' | 'purchase' | 'bank' | 'cash' | 'misc';
  description?: string;
  is_active: boolean;
  entries_count?: number;
  last_entry_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChartOfAccount {
  id: string;
  company: string;
  company_name?: string;
  account_number: string;
  name: string;
  account_class: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent?: string;
  parent_name?: string;
  is_analytical: boolean;
  is_active: boolean;
  description?: string;
  children_count?: number;
  balance_info?: {
    has_movements: boolean;
    account_class: string;
    debit_nature: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryLine {
  id?: string;
  account: string;
  account_number?: string;
  account_name?: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  analytical_account?: string;
  cost_center?: string;
  reference?: string;
}

export interface JournalEntry {
  id?: string;
  company: string;
  company_name?: string;
  journal: string;
  journal_name?: string;
  fiscal_year: string;
  fiscal_year_name?: string;
  reference?: string;
  entry_date: string;
  description: string;
  status: 'draft' | 'validated' | 'posted';
  validated_at?: string;
  posted_at?: string;
  lines: JournalEntryLine[];
  total_debit?: number;
  total_credit?: number;
  is_balanced?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FundCall {
  id: string;
  company: string;
  company_name?: string;
  fiscal_year: string;
  fiscal_year_name?: string;
  reference: string;
  call_date: string;
  due_date: string;
  amount: number;
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue';
  description?: string;
  notes?: string;
  journal_entry?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrialBalance {
  id: string;
  company: string;
  company_name?: string;
  fiscal_year: string;
  fiscal_year_name?: string;
  period_type: 'monthly' | 'quarterly' | 'annual';
  period_start: string;
  period_end: string;
  generated_at: string;
  accounts_data: any;
  total_debit: number;
  total_credit: number;
}

export interface AccountBalance {
  account_number: string;
  account_name: string;
  debit_balance: number;
  credit_balance: number;
  net_balance: number;
  balance_type: 'debit' | 'credit';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class AccountingService {
  // ============================================================================
  // SECTION 1: CRUD SOCIÉTÉS
  // ============================================================================

  /**
   * Récupère la liste des sociétés
   */
  async getCompanies(params?: {
    search?: string;
    legal_form?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Company[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/companies/`, { params });
    return response.data;
  }

  /**
   * Récupère une société par ID
   */
  async getCompanyById(id: string): Promise<Company> {
    const response = await apiService.get(`${BASE_PATH}/companies/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle société
   */
  async createCompany(data: Partial<Company>): Promise<Company> {
    const response = await apiService.post(`${BASE_PATH}/companies/`, data);
    return response.data;
  }

  /**
   * Met à jour une société
   */
  async updateCompany(id: string, data: Partial<Company>): Promise<Company> {
    const response = await apiService.patch(`${BASE_PATH}/companies/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une société
   */
  async deleteCompany(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/companies/${id}/`);
  }

  /**
   * Récupère la société active
   */
  async getActiveCompany(): Promise<Company> {
    const response = await apiService.get(`${BASE_PATH}/companies/`, {
      params: { is_active: true, page_size: 1 },
    });
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    throw new Error('No active company found');
  }

  // ============================================================================
  // SECTION 2: CRUD EXERCICES FISCAUX
  // ============================================================================

  /**
   * Récupère la liste des exercices fiscaux
   */
  async getFiscalYears(params?: {
    company?: string;
    is_active?: boolean;
    is_closed?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: FiscalYear[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/fiscal-years/`, { params });
    return response.data;
  }

  /**
   * Récupère un exercice fiscal par ID
   */
  async getFiscalYearById(id: string): Promise<FiscalYear> {
    const response = await apiService.get(`${BASE_PATH}/fiscal-years/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouvel exercice fiscal
   */
  async createFiscalYear(data: Partial<FiscalYear>): Promise<FiscalYear> {
    const response = await apiService.post(`${BASE_PATH}/fiscal-years/`, data);
    return response.data;
  }

  /**
   * Met à jour un exercice fiscal
   */
  async updateFiscalYear(id: string, data: Partial<FiscalYear>): Promise<FiscalYear> {
    const response = await apiService.patch(`${BASE_PATH}/fiscal-years/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un exercice fiscal
   */
  async deleteFiscalYear(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/fiscal-years/${id}/`);
  }

  /**
   * Clôture un exercice fiscal
   */
  async closeFiscalYear(id: string): Promise<FiscalYear> {
    const response = await apiService.post(`${BASE_PATH}/fiscal-years/${id}/close/`);
    return response.data;
  }

  /**
   * Réouvre un exercice fiscal
   */
  async reopenFiscalYear(id: string): Promise<FiscalYear> {
    const response = await apiService.post(`${BASE_PATH}/fiscal-years/${id}/reopen/`);
    return response.data;
  }

  /**
   * Récupère l'exercice fiscal actif
   */
  async getActiveFiscalYear(companyId?: string): Promise<FiscalYear> {
    const params: any = { is_active: true, page_size: 1 };
    if (companyId) {
      params.company = companyId;
    }
    const response = await apiService.get(`${BASE_PATH}/fiscal-years/`, { params });
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    throw new Error('No active fiscal year found');
  }

  // ============================================================================
  // SECTION 3: CRUD JOURNAUX COMPTABLES
  // ============================================================================

  /**
   * Récupère la liste des journaux
   */
  async getJournals(params?: {
    company?: string;
    journal_type?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Journal[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/journals/`, { params });
    return response.data;
  }

  /**
   * Récupère un journal par ID
   */
  async getJournalById(id: string): Promise<Journal> {
    const response = await apiService.get(`${BASE_PATH}/journals/${id}/`);
    return response.data;
  }

  /**
   * Crée un nouveau journal
   */
  async createJournal(data: Partial<Journal>): Promise<Journal> {
    const response = await apiService.post(`${BASE_PATH}/journals/`, data);
    return response.data;
  }

  /**
   * Met à jour un journal
   */
  async updateJournal(id: string, data: Partial<Journal>): Promise<Journal> {
    const response = await apiService.patch(`${BASE_PATH}/journals/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un journal
   */
  async deleteJournal(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/journals/${id}/`);
  }

  /**
   * Récupère les journaux par type
   */
  async getJournalsByType(type: string, companyId?: string): Promise<Journal[]> {
    const params: any = { journal_type: type };
    if (companyId) {
      params.company = companyId;
    }
    const response = await apiService.get(`${BASE_PATH}/journals/`, { params });
    return response.data.results || [];
  }

  // ============================================================================
  // SECTION 4: CRUD PLAN COMPTABLE
  // ============================================================================

  /**
   * Récupère le plan comptable
   */
  async getChartOfAccounts(params?: {
    company?: string;
    account_class?: string;
    account_type?: string;
    is_analytical?: boolean;
    is_active?: boolean;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: ChartOfAccount[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/`, { params });
    return response.data;
  }

  /**
   * Récupère un compte par ID
   */
  async getAccountById(id: string): Promise<ChartOfAccount> {
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/${id}/`);
    return response.data;
  }

  /**
   * Récupère un compte par numéro
   */
  async getAccountByNumber(accountNumber: string, companyId?: string): Promise<ChartOfAccount> {
    const params: any = { search: accountNumber };
    if (companyId) {
      params.company = companyId;
    }
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/`, { params });
    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0];
    }
    throw new Error(`Account ${accountNumber} not found`);
  }

  /**
   * Crée un nouveau compte
   */
  async createAccount(data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const response = await apiService.post(`${BASE_PATH}/chart-of-accounts/`, data);
    return response.data;
  }

  /**
   * Met à jour un compte
   */
  async updateAccount(id: string, data: Partial<ChartOfAccount>): Promise<ChartOfAccount> {
    const response = await apiService.patch(`${BASE_PATH}/chart-of-accounts/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un compte
   */
  async deleteAccount(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/chart-of-accounts/${id}/`);
  }

  /**
   * Import du plan comptable depuis un fichier
   */
  async importChartOfAccounts(file: File, companyId: string): Promise<{
    imported_count: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_id', companyId);

    const response = await apiService.post(`${BASE_PATH}/chart-of-accounts/import/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Export du plan comptable
   */
  async exportChartOfAccounts(companyId: string, format: 'excel' | 'csv' = 'excel'): Promise<{
    download_url: string;
    filename: string;
  }> {
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/export/`, {
      params: { company: companyId, format },
    });
    return response.data;
  }

  // ============================================================================
  // SECTION 5: CRUD ÉCRITURES COMPTABLES
  // ============================================================================

  /**
   * Récupère la liste des écritures comptables
   */
  async getJournalEntries(params?: {
    company?: string;
    journal?: string;
    fiscal_year?: string;
    status?: string;
    entry_date_from?: string;
    entry_date_to?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: JournalEntry[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/journal-entries/`, { params });
    return response.data;
  }

  /**
   * Récupère une écriture par ID
   */
  async getJournalEntryById(id: string): Promise<JournalEntry> {
    const response = await apiService.get(`${BASE_PATH}/journal-entries/${id}/`);
    return response.data;
  }

  /**
   * Crée une nouvelle écriture comptable
   */
  async createJournalEntry(data: Partial<JournalEntry>): Promise<JournalEntry> {
    const response = await apiService.post(`${BASE_PATH}/journal-entries/`, data);
    return response.data;
  }

  /**
   * Met à jour une écriture comptable
   */
  async updateJournalEntry(id: string, data: Partial<JournalEntry>): Promise<JournalEntry> {
    const response = await apiService.patch(`${BASE_PATH}/journal-entries/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime une écriture comptable
   */
  async deleteJournalEntry(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/journal-entries/${id}/`);
  }

  /**
   * Valide une écriture comptable
   */
  async validateJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiService.post(`${BASE_PATH}/journal-entries/${id}/validate/`);
    return response.data;
  }

  /**
   * Comptabilise une écriture
   */
  async postJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiService.post(`${BASE_PATH}/journal-entries/${id}/post/`);
    return response.data;
  }

  /**
   * Décomptabilise une écriture
   */
  async unpostJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiService.post(`${BASE_PATH}/journal-entries/${id}/unpost/`);
    return response.data;
  }

  /**
   * Vérifie l'équilibre d'une écriture
   */
  async checkBalance(lines: JournalEntryLine[]): Promise<{
    is_balanced: boolean;
    total_debit: number;
    total_credit: number;
    difference: number;
  }> {
    const response = await apiService.post(`${BASE_PATH}/journal-entries/check-balance/`, {
      lines,
    });
    return response.data;
  }

  // ============================================================================
  // SECTION 6: CRUD APPELS DE FONDS
  // ============================================================================

  /**
   * Récupère la liste des appels de fonds
   */
  async getFundCalls(params?: {
    company?: string;
    fiscal_year?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: FundCall[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/fund-call/`, { params });
    return response.data;
  }

  /**
   * Récupère un appel de fonds par ID
   */
  async getFundCallById(id: string): Promise<FundCall> {
    const response = await apiService.get(`${BASE_PATH}/fund-call/${id}/`);
    return response.data;
  }

  /**
   * Crée un appel de fonds
   */
  async createFundCall(data: Partial<FundCall>): Promise<FundCall> {
    const response = await apiService.post(`${BASE_PATH}/fund-call/`, data);
    return response.data;
  }

  /**
   * Met à jour un appel de fonds
   */
  async updateFundCall(id: string, data: Partial<FundCall>): Promise<FundCall> {
    const response = await apiService.patch(`${BASE_PATH}/fund-call/${id}/`, data);
    return response.data;
  }

  /**
   * Supprime un appel de fonds
   */
  async deleteFundCall(id: string): Promise<void> {
    await apiService.delete(`${BASE_PATH}/fund-call/${id}/`);
  }

  /**
   * Marque un appel de fonds comme payé
   */
  async markFundCallAsPaid(id: string, paymentData?: {
    payment_date?: string;
    payment_reference?: string;
  }): Promise<FundCall> {
    const response = await apiService.post(`${BASE_PATH}/fund-call/${id}/mark-paid/`, paymentData || {});
    return response.data;
  }

  // ============================================================================
  // SECTION 7: BALANCE & REPORTING
  // ============================================================================

  /**
   * Génère une balance de vérification
   */
  async generateTrialBalance(params: {
    company: string;
    fiscal_year: string;
    period_start: string;
    period_end: string;
    period_type?: 'monthly' | 'quarterly' | 'annual';
  }): Promise<TrialBalance> {
    const response = await apiService.post(`${BASE_PATH}/trial-balance/generate/`, params);
    return response.data;
  }

  /**
   * Récupère les balances de vérification
   */
  async getTrialBalances(params?: {
    company?: string;
    fiscal_year?: string;
    period_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: TrialBalance[]; count: number }> {
    const response = await apiService.get(`${BASE_PATH}/trial-balance/`, { params });
    return response.data;
  }

  /**
   * Récupère le solde d'un compte
   */
  async getAccountBalance(
    accountId: string,
    params?: {
      fiscal_year?: string;
      date_from?: string;
      date_to?: string;
    }
  ): Promise<AccountBalance> {
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/${accountId}/balance/`, {
      params,
    });
    return response.data;
  }

  /**
   * Récupère le grand livre d'un compte
   */
  async getAccountLedger(
    accountId: string,
    params?: {
      fiscal_year?: string;
      date_from?: string;
      date_to?: string;
      page?: number;
      page_size?: number;
    }
  ): Promise<{
    account: ChartOfAccount;
    entries: JournalEntry[];
    opening_balance: number;
    closing_balance: number;
    total_debit: number;
    total_credit: number;
  }> {
    const response = await apiService.get(`${BASE_PATH}/chart-of-accounts/${accountId}/ledger/`, {
      params,
    });
    return response.data;
  }
}

export const accountingService = new AccountingService();
export default accountingService;
