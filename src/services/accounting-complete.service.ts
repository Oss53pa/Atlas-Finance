/**
 * Accounting Complete Service - Provides full accounting functionality
 */
import { apiService } from './api';

const BASE_PATH = '/api/v1/accounting';

export interface ChartOfAccount { id: string; code: string; name: string; type: string; parent_id?: string; level: number; is_active: boolean; is_detail: boolean; balance?: number; }
export interface Journal { id: string; code: string; name: string; type: string; is_active: boolean; }
export interface AccountingEntry { id: string; journal_id: string; entry_number: string; entry_date: string; description: string; reference?: string; status: string; total_debit: number; total_credit: number; lines: AccountingEntryLine[]; created_at: string; updated_at: string; }
export interface AccountingEntryLine { id: string; entry_id: string; account_id: string; account_code?: string; account_name?: string; description?: string; debit: number; credit: number; third_party_id?: string; }
export interface CreateAccountingEntryDto { journal_id: string; entry_date: string; description: string; reference?: string; lines: any[]; }
export interface UpdateAccountingEntryDto { description?: string; reference?: string; lines?: any[]; }
export interface AccountingQueryParams { page?: number; page_size?: number; search?: string; journal_id?: string; account_id?: string; date_from?: string; date_to?: string; status?: string; }
export interface BalanceResponse { account_id: string; account_code: string; account_name: string; debit: number; credit: number; balance: number; }

class ChartOfAccountsService {
  async getAll(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/accounts/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/accounts/${id}/`); return r.data; } catch { return null; } }
  async create(data: any) { const r = await apiService.post(`${BASE_PATH}/accounts/`, data); return r.data; }
  async update(id: string, data: any) { const r = await apiService.patch(`${BASE_PATH}/accounts/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/accounts/${id}/`); }
  async getTree() { try { const r = await apiService.get(`${BASE_PATH}/accounts/tree/`); return r.data; } catch { return []; } }
}

class JournalsService {
  async getAll(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/journals/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/journals/${id}/`); return r.data; } catch { return null; } }
  async create(data: any) { const r = await apiService.post(`${BASE_PATH}/journals/`, data); return r.data; }
  async update(id: string, data: any) { const r = await apiService.patch(`${BASE_PATH}/journals/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/journals/${id}/`); }
}

class AccountingEntriesService {
  async getAll(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/entries/`, { params }); return r.data; } catch { return { results: [], count: 0 }; } }
  async getById(id: string) { try { const r = await apiService.get(`${BASE_PATH}/entries/${id}/`); return r.data; } catch { return null; } }
  async create(data: any) { const r = await apiService.post(`${BASE_PATH}/entries/`, data); return r.data; }
  async update(id: string, data: any) { const r = await apiService.patch(`${BASE_PATH}/entries/${id}/`, data); return r.data; }
  async delete(id: string) { await apiService.delete(`${BASE_PATH}/entries/${id}/`); }
  async validate(id: string) { const r = await apiService.post(`${BASE_PATH}/entries/${id}/validate/`); return r.data; }
  async post(id: string) { const r = await apiService.post(`${BASE_PATH}/entries/${id}/post/`); return r.data; }
}

class EntryLinesService {
  async getByEntry(entryId: string) { try { const r = await apiService.get(`${BASE_PATH}/entries/${entryId}/lines/`); return r.data; } catch { return []; } }
  async create(entryId: string, data: any) { const r = await apiService.post(`${BASE_PATH}/entries/${entryId}/lines/`, data); return r.data; }
  async update(entryId: string, lineId: string, data: any) { const r = await apiService.patch(`${BASE_PATH}/entries/${entryId}/lines/${lineId}/`, data); return r.data; }
  async delete(entryId: string, lineId: string) { await apiService.delete(`${BASE_PATH}/entries/${entryId}/lines/${lineId}/`); }
}

class AccountingReportsService {
  async getBalance(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/balance/`, { params }); return r.data; } catch { return []; } }
  async getTrialBalance(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/trial-balance/`, { params }); return r.data; } catch { return { accounts: [], totals: { debit: 0, credit: 0 } }; } }
  async getGeneralLedger(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/general-ledger/`, { params }); return r.data; } catch { return { entries: [], account: null }; } }
  async getIncomeStatement(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/income-statement/`, { params }); return r.data; } catch { return { income: [], expenses: [], net_income: 0 }; } }
  async getBalanceSheet(params?: any) { try { const r = await apiService.get(`${BASE_PATH}/reports/balance-sheet/`, { params }); return r.data; } catch { return { assets: [], liabilities: [], equity: [] }; } }
}

export const chartOfAccountsService = new ChartOfAccountsService();
export const journalsService = new JournalsService();
export const accountingEntriesService = new AccountingEntriesService();
export const entryLinesService = new EntryLinesService();
export const accountingReportsService = new AccountingReportsService();

export { accountingService } from './accounting.service';
export { accountingService as default } from './accounting.service';
