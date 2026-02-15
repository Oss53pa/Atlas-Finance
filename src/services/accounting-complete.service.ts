/**
 * Accounting Complete Service - Supabase Direct
 * Full accounting functionality via Supabase PostgREST + RPC
 */
import { supabase } from '@/lib/supabase';
import { queryTable, getById, insertRecord, updateRecord, deleteRecord, callRpc } from './api.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ChartOfAccount {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_class: string;
  account_type: string;
  parent_account_id?: string | null;
  level: number;
  normal_balance: string;
  is_reconcilable: boolean;
  is_auxiliary: boolean;
  allow_direct_entry: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Journal {
  id: string;
  company_id: string;
  code: string;
  name: string;
  journal_type: string;
  default_debit_account_id?: string | null;
  default_credit_account_id?: string | null;
  numbering_prefix: string;
  last_number: number;
  require_validation: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountingEntryLine {
  id?: string;
  entry_id?: string;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  label: string;
  third_party_id?: string | null;
  currency?: string;
  line_number?: number;
}

export interface AccountingEntry {
  id: string;
  company_id: string;
  fiscal_year_id: string;
  journal_id: string;
  piece_number: string;
  reference: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  is_validated: boolean;
  validation_date?: string | null;
  source_document: string;
  lines?: AccountingEntryLine[];
  // Joined fields
  journal?: { code: string; name: string };
  created_at: string;
  updated_at: string;
}

export interface AccountingQueryParams {
  page?: number;
  page_size?: number;
  search?: string;
  journal_id?: string;
  account_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}

export interface BalanceResponse {
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
}

// ============================================================================
// CHART OF ACCOUNTS SERVICE
// ============================================================================

class ChartOfAccountsService {
  async getAll(params?: any): Promise<{ results: ChartOfAccount[]; count: number }> {
    try {
      const filters: Record<string, any> = {};
      if (params?.account_class) filters.account_class = params.account_class;
      if (params?.account_type) filters.account_type = params.account_type;
      if (params?.is_active !== undefined) filters.is_active = params.is_active;

      const result = await queryTable<ChartOfAccount>('chart_of_accounts', {
        page: params?.page || 1,
        pageSize: params?.page_size || 100,
        filters,
        search: params?.search ? { column: 'code', value: params.search } : null,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<ChartOfAccount | null> {
    try {
      return await getById<ChartOfAccount>('chart_of_accounts', id);
    } catch {
      return null;
    }
  }

  async create(data: any): Promise<ChartOfAccount> {
    return await insertRecord<ChartOfAccount>('chart_of_accounts', data);
  }

  async update(id: string, data: any): Promise<ChartOfAccount> {
    return await updateRecord<ChartOfAccount>('chart_of_accounts', id, data);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('chart_of_accounts', id);
  }

  async getTree(): Promise<ChartOfAccount[]> {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('code', { ascending: true });

      if (error) throw error;
      return (data || []) as ChartOfAccount[];
    } catch {
      return [];
    }
  }

  async search(searchTerm: string, limit = 20): Promise<ChartOfAccount[]> {
    try {
      const result = await callRpc<ChartOfAccount[]>('search_accounts', {
        p_company_id: (await supabase.rpc('get_user_company_id')).data,
        p_search: searchTerm,
        p_limit: limit,
      });
      return result || [];
    } catch {
      return [];
    }
  }
}

// ============================================================================
// JOURNALS SERVICE
// ============================================================================

class JournalsService {
  async getAll(params?: any): Promise<{ results: Journal[]; count: number }> {
    try {
      const filters: Record<string, any> = {};
      if (params?.journal_type) filters.journal_type = params.journal_type;
      if (params?.is_active !== undefined) filters.is_active = params.is_active;

      const result = await queryTable<Journal>('journals', {
        page: params?.page || 1,
        pageSize: params?.page_size || 50,
        filters,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<Journal | null> {
    try {
      return await getById<Journal>('journals', id);
    } catch {
      return null;
    }
  }

  async create(data: any): Promise<Journal> {
    return await insertRecord<Journal>('journals', data);
  }

  async update(id: string, data: any): Promise<Journal> {
    return await updateRecord<Journal>('journals', id, data);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('journals', id);
  }
}

// ============================================================================
// ACCOUNTING ENTRIES SERVICE
// ============================================================================

class AccountingEntriesService {
  async getAll(params?: AccountingQueryParams): Promise<{ results: AccountingEntry[]; count: number }> {
    try {
      const filters: Record<string, any> = {};
      if (params?.journal_id) filters.journal_id = params.journal_id;
      if (params?.status === 'validated') filters.is_validated = true;
      if (params?.status === 'draft') filters.is_validated = false;

      const result = await queryTable<AccountingEntry>('journal_entries', {
        select: '*, journal:journals(code, name)',
        page: params?.page || 1,
        pageSize: params?.page_size || 20,
        filters,
        search: params?.search ? { column: 'description', value: params.search } : null,
        sortBy: 'entry_date',
        sortOrder: 'desc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<AccountingEntry | null> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal:journals(code, name),
          lines:journal_entry_lines(
            *,
            account:chart_of_accounts(code, name)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Map account info to flat fields on lines
      if (data?.lines) {
        data.lines = data.lines.map((line: any) => ({
          ...line,
          account_code: line.account?.code,
          account_name: line.account?.name,
        }));
      }

      return data as AccountingEntry;
    } catch {
      return null;
    }
  }

  async create(data: any): Promise<AccountingEntry> {
    const { lines, ...entryData } = data;

    // Insert entry
    const entry = await insertRecord<AccountingEntry>('journal_entries', entryData);

    // Insert lines if provided
    if (lines && lines.length > 0) {
      const linesWithEntryId = lines.map((line: any, index: number) => ({
        ...line,
        entry_id: entry.id,
        line_number: index + 1,
        currency: line.currency || 'XAF',
      }));

      const { error } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntryId);

      if (error) throw error;
    }

    return entry;
  }

  async update(id: string, data: any): Promise<AccountingEntry> {
    const { lines, ...entryData } = data;

    const entry = await updateRecord<AccountingEntry>('journal_entries', id, entryData);

    // Replace lines if provided
    if (lines) {
      // Delete existing lines
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('entry_id', id);

      // Insert new lines
      if (lines.length > 0) {
        const linesWithEntryId = lines.map((line: any, index: number) => ({
          ...line,
          entry_id: id,
          line_number: index + 1,
          currency: line.currency || 'XAF',
        }));

        const { error } = await supabase
          .from('journal_entry_lines')
          .insert(linesWithEntryId);

        if (error) throw error;
      }
    }

    return entry;
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('journal_entries', id);
  }

  async validate(id: string): Promise<AccountingEntry> {
    try {
      await callRpc('validate_journal_entry', { p_entry_id: id });
      return (await this.getById(id))!;
    } catch (error) {
      throw error;
    }
  }

  async post(id: string): Promise<AccountingEntry> {
    return await updateRecord<AccountingEntry>('journal_entries', id, {
      is_validated: true,
      validation_date: new Date().toISOString(),
    });
  }
}

// ============================================================================
// ENTRY LINES SERVICE
// ============================================================================

class EntryLinesService {
  async getByEntry(entryId: string): Promise<AccountingEntryLine[]> {
    try {
      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select('*, account:chart_of_accounts(code, name)')
        .eq('entry_id', entryId)
        .order('line_number', { ascending: true });

      if (error) throw error;

      return (data || []).map((line: any) => ({
        ...line,
        account_code: line.account?.code,
        account_name: line.account?.name,
      }));
    } catch {
      return [];
    }
  }

  async create(entryId: string, data: any): Promise<AccountingEntryLine> {
    return await insertRecord<AccountingEntryLine>('journal_entry_lines', {
      ...data,
      entry_id: entryId,
    });
  }

  async update(entryId: string, lineId: string, data: any): Promise<AccountingEntryLine> {
    return await updateRecord<AccountingEntryLine>('journal_entry_lines', lineId, data);
  }

  async delete(entryId: string, lineId: string): Promise<void> {
    await deleteRecord('journal_entry_lines', lineId);
  }
}

// ============================================================================
// ACCOUNTING REPORTS SERVICE
// ============================================================================

class AccountingReportsService {
  async getBalance(params?: any): Promise<BalanceResponse[]> {
    try {
      const result = await callRpc<BalanceResponse[]>('get_trial_balance', {
        p_company_id: params?.company_id || (await supabase.rpc('get_user_company_id')).data,
        p_start: params?.date_from || '1900-01-01',
        p_end: params?.date_to || new Date().toISOString().split('T')[0],
      });
      return result || [];
    } catch {
      return [];
    }
  }

  async getTrialBalance(params?: any): Promise<{ accounts: BalanceResponse[]; totals: { debit: number; credit: number } }> {
    try {
      const accounts = await this.getBalance(params);
      const totals = accounts.reduce(
        (acc, row) => ({
          debit: acc.debit + (row.debit || 0),
          credit: acc.credit + (row.credit || 0),
        }),
        { debit: 0, credit: 0 }
      );
      return { accounts, totals };
    } catch {
      return { accounts: [], totals: { debit: 0, credit: 0 } };
    }
  }

  async getGeneralLedger(params?: any): Promise<{ entries: any[]; account: ChartOfAccount | null }> {
    try {
      if (!params?.account_id) return { entries: [], account: null };

      const [account, ledger] = await Promise.all([
        getById<ChartOfAccount>('chart_of_accounts', params.account_id),
        callRpc('get_account_ledger', {
          p_account_id: params.account_id,
          p_start: params.date_from || '1900-01-01',
          p_end: params.date_to || new Date().toISOString().split('T')[0],
        }),
      ]);

      return { entries: ledger || [], account };
    } catch {
      return { entries: [], account: null };
    }
  }

  async getIncomeStatement(params?: any): Promise<any> {
    try {
      const result = await callRpc('get_income_statement', {
        p_company_id: params?.company_id || (await supabase.rpc('get_user_company_id')).data,
        p_fiscal_year_id: params?.fiscal_year_id,
      });
      return result || { income: [], expenses: [], net_income: 0 };
    } catch {
      return { income: [], expenses: [], net_income: 0 };
    }
  }

  async getBalanceSheet(params?: any): Promise<any> {
    try {
      const result = await callRpc('get_balance_sheet', {
        p_company_id: params?.company_id || (await supabase.rpc('get_user_company_id')).data,
        p_fiscal_year_id: params?.fiscal_year_id,
      });
      return result || { assets: [], liabilities: [], equity: [] };
    } catch {
      return { assets: [], liabilities: [], equity: [] };
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const chartOfAccountsService = new ChartOfAccountsService();
export const journalsService = new JournalsService();
export const accountingEntriesService = new AccountingEntriesService();
export const entryLinesService = new EntryLinesService();
export const accountingReportsService = new AccountingReportsService();

const accountingServices = {
  chartOfAccounts: chartOfAccountsService,
  journals: journalsService,
  entries: accountingEntriesService,
  entryLines: entryLinesService,
  reports: accountingReportsService,
};

export { accountingServices as accountingService };
export default accountingServices;
