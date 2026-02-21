/**
 * Treasury Complete Service - Supabase Direct
 * Bank accounts, payments, fund calls, cash movements
 */
import { supabase } from '@/lib/supabase';
import { queryTable, getById, insertRecord, updateRecord, deleteRecord, callRpc } from './api.service';

// Types
export interface BankAccount {
  id: string;
  company_id: string;
  bank_id: string;
  accounting_account_id: string;
  account_number: string;
  iban: string;
  label: string;
  account_type: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  minimum_balance: number;
  overdraft_limit: number;
  opening_date: string;
  status: string;
  is_main_account: boolean;
  bank?: { code: string; name: string; short_name: string };
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  bank_account_id: string;
  payment_type: string;
  direction: string;
  payment_reference: string;
  amount: number;
  currency: string;
  value_date: string;
  description: string;
  beneficiary_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: string;
  company_id: string;
  bank_account_id: string;
  movement_type: string;
  direction: string;
  movement_reference: string;
  amount: number;
  currency: string;
  scheduled_date: string;
  value_date: string;
  description: string;
  execution_status: string;
  created_at: string;
  updated_at: string;
}

// Bank Accounts Service
class BankAccountsService {
  async getActiveAccounts(): Promise<BankAccount[]> {
    try {
      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .select('*, bank:treasury_banks(code, name, short_name)')
        .eq('status', 'ACTIVE')
        .order('label', { ascending: true });

      if (error) throw error;
      return (data || []) as BankAccount[];
    } catch {
      return [];
    }
  }

  async getAll(params?: { page?: number; page_size?: number; status?: string }): Promise<{ results: BankAccount[]; count: number }> {
    try {
      const filters: Record<string, string> = {};
      if (params?.status) filters.status = params.status;

      const result = await queryTable<BankAccount>('treasury_bank_accounts', {
        select: '*, bank:treasury_banks(code, name, short_name)',
        page: params?.page || 1,
        pageSize: params?.page_size || 50,
        filters,
        sortBy: 'label',
        sortOrder: 'asc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async getById(id: string): Promise<BankAccount | null> {
    try {
      const { data, error } = await supabase
        .from('treasury_bank_accounts')
        .select('*, bank:treasury_banks(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as BankAccount;
    } catch {
      return null;
    }
  }

  async create(data: Partial<Omit<BankAccount, 'id'>>): Promise<BankAccount> {
    return await insertRecord<BankAccount>('treasury_bank_accounts', data as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Omit<BankAccount, 'id'>>): Promise<BankAccount> {
    return await updateRecord<BankAccount>('treasury_bank_accounts', id, data as Record<string, unknown>);
  }

  async delete(id: string): Promise<void> {
    await deleteRecord('treasury_bank_accounts', id);
  }
}

// Bank Transactions Service
class BankTransactionsService {
  async getTransactions(params?: { accountId?: string; limit?: number }): Promise<CashMovement[]> {
    try {
      const filters: Record<string, string> = {};
      if (params?.accountId) filters.bank_account_id = params.accountId;

      const result = await queryTable<CashMovement>('treasury_cash_movements', {
        page: 1,
        pageSize: params?.limit || 50,
        filters,
        sortBy: 'scheduled_date',
        sortOrder: 'desc',
      });
      return result.data;
    } catch {
      return [];
    }
  }

  async getLatest(limit = 10): Promise<CashMovement[]> {
    try {
      const { data, error } = await supabase
        .from('treasury_cash_movements')
        .select('*')
        .order('scheduled_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as CashMovement[];
    } catch {
      return [];
    }
  }
}

// Payments Service
class PaymentsService {
  async getAll(params?: { page?: number; page_size?: number; direction?: string; status?: string }): Promise<{ results: Payment[]; count: number }> {
    try {
      const filters: Record<string, string> = {};
      if (params?.direction) filters.direction = params.direction;
      if (params?.status) filters.status = params.status;

      const result = await queryTable<Payment>('treasury_payments', {
        page: params?.page || 1,
        pageSize: params?.page_size || 20,
        filters,
        sortBy: 'value_date',
        sortOrder: 'desc',
      });
      return { results: result.data, count: result.total };
    } catch {
      return { results: [], count: 0 };
    }
  }

  async create(data: Partial<Omit<Payment, 'id'>>): Promise<Payment> {
    return await insertRecord<Payment>('treasury_payments', data as Record<string, unknown>);
  }

  async update(id: string, data: Partial<Omit<Payment, 'id'>>): Promise<Payment> {
    return await updateRecord<Payment>('treasury_payments', id, data as Record<string, unknown>);
  }
}

// Treasury Reports Service
class TreasuryReportsService {
  async getCashFlowReport(params?: { company_id?: string }): Promise<unknown[]> {
    try {
      const result = await callRpc<unknown[]>('get_treasury_position', {
        p_company_id: params?.company_id || (await supabase.rpc('get_user_company_id')).data,
      });
      return result || [];
    } catch {
      return [];
    }
  }

  async getPosition(): Promise<unknown[]> {
    try {
      const result = await callRpc<unknown[]>('get_treasury_position', {
        p_company_id: (await supabase.rpc('get_user_company_id')).data,
      });
      return result || [];
    } catch {
      return [];
    }
  }
}

export const bankAccountsService = new BankAccountsService();
export const bankTransactionsService = new BankTransactionsService();
export const paymentsService = new PaymentsService();
export const treasuryReportsService = new TreasuryReportsService();

const treasuryServices = {
  bankAccounts: bankAccountsService,
  transactions: bankTransactionsService,
  payments: paymentsService,
  reports: treasuryReportsService,
};

export { treasuryServices as treasuryService };
export default treasuryServices;
