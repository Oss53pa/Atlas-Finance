/**
 * Treasury Complete Service - Stub
 * Complete treasury management with bank accounts
 */

import { apiService } from './api';
import { treasuryService, BankAccount, CashMovement } from './treasury.service';

interface ExtendedBankAccount extends BankAccount {
  solde_courant?: number;
  actif?: boolean;
}

class BankAccountsService {
  async getActiveAccounts(): Promise<ExtendedBankAccount[]> {
    try {
      const response = await treasuryService.getBankAccounts({ status: 'active' });
      return (response.results || []).map(account => ({
        ...account,
        solde_courant: account.balance,
        actif: account.status === 'active'
      }));
    } catch (error) {
      return [];
    }
  }

  async getAll(): Promise<ExtendedBankAccount[]> {
    try {
      const response = await treasuryService.getBankAccounts({});
      return response.results || [];
    } catch (error) {
      return [];
    }
  }
}

class BankTransactionsService {
  async getTransactions(params?: { accountId?: string; limit?: number }): Promise<CashMovement[]> {
    try {
      const response = await treasuryService.getBankMovements(params);
      return response.results || [];
    } catch (error) {
      return [];
    }
  }

  async getLatest(limit: number = 10): Promise<CashMovement[]> {
    try {
      const response = await treasuryService.getLatestTransactions({ limit });
      return response || [];
    } catch (error) {
      return [];
    }
  }
}

class TreasuryReportsService {
  async getCashFlowReport(params?: any) {
    try {
      const response = await apiService.get('/api/v1/treasury/reports/cash-flow/', { params });
      return response.data;
    } catch { return { inflows: [], outflows: [], net: 0 }; }
  }

  async getForecastReport(params?: any) {
    try {
      const response = await apiService.get('/api/v1/treasury/reports/forecast/', { params });
      return response.data;
    } catch { return { predictions: [] }; }
  }

  async getBankReconciliationReport(params?: any) {
    try {
      const response = await apiService.get('/api/v1/treasury/reports/reconciliation/', { params });
      return response.data;
    } catch { return { matched: [], unmatched: [] }; }
  }
}

export const bankAccountsService = new BankAccountsService();
export const bankTransactionsService = new BankTransactionsService();
export const treasuryReportsService = new TreasuryReportsService();
export { treasuryService } from './treasury.service';
export default bankAccountsService;
