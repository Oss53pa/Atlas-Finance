/**
 * Atlas Finance - Reports Service
 * Service complet pour tous les rapports comptables SYSCOHADA
 *
 * Rapports disponibles:
 * - Balance générale
 * - Balance de vérification
 * - Grand livre (général et analytique)
 * - Compte de résultat
 * - Bilan comptable
 * - Tableau des flux de trésorerie
 *
 * @version 1.0.0 - Phase 1.2 Complete
 * @date 2025-10-19
 */

import { apiClient } from '@/lib/api';
import API_ENDPOINTS from '@/config/apiEndpoints';

// ===========================
// TYPES & INTERFACES
// ===========================

export interface ReportFilters {
  company_id: string;
  fiscal_year_id: string;
  date_from?: string;
  date_to?: string;
  accounts?: string[];
  journals?: string[];
  format?: 'json' | 'pdf' | 'excel';
}

export interface BalanceGeneraleRow {
  account_code: string;
  account_label: string;
  debit_opening: number;
  credit_opening: number;
  debit_period: number;
  credit_period: number;
  debit_closing: number;
  credit_closing: number;
}

export interface BalanceGeneraleResponse {
  balance: BalanceGeneraleRow[];
  totals: {
    total_debit_opening: number;
    total_credit_opening: number;
    total_debit_period: number;
    total_credit_period: number;
    total_debit_closing: number;
    total_credit_closing: number;
  };
}

export interface GrandLivreEntry {
  date: string;
  journal_code: string;
  entry_reference: string;
  label: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface GrandLivreResponse {
  account: {
    code: string;
    label: string;
  };
  entries: GrandLivreEntry[];
  summary: {
    opening_balance: number;
    total_debit: number;
    total_credit: number;
    closing_balance: number;
  };
}

export interface FinancialStatement {
  sections: Array<{
    code: string;
    label: string;
    amount: number;
    subsections?: Array<{
      code: string;
      label: string;
      amount: number;
    }>;
  }>;
  totals: {
    assets?: number;
    liabilities?: number;
    equity?: number;
    revenue?: number;
    expenses?: number;
    net_income?: number;
  };
}

// ===========================
// SERVICE CLASS
// ===========================

class ReportsService {
  /**
   * Balance Générale - Rapport comptable principal SYSCOHADA
   * Liste tous les comptes avec leurs mouvements
   */
  async getBalanceGenerale(filters: ReportFilters): Promise<BalanceGeneraleResponse> {
    try {
      const response = await apiClient.get<BalanceGeneraleResponse>(
        API_ENDPOINTS.REPORTS.BALANCE,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
          accounts: filters.accounts,
          journals: filters.journals,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching balance générale:', error);
      throw new Error('Impossible de charger la balance générale. Vérifiez votre connexion.');
    }
  }

  /**
   * Balance de Vérification
   * Vérifie l'équilibre débit/crédit
   */
  async getTrialBalance(filters: ReportFilters): Promise<BalanceGeneraleResponse> {
    try {
      const response = await apiClient.get<BalanceGeneraleResponse>(
        API_ENDPOINTS.REPORTS.TRIAL_BALANCE,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      throw new Error('Impossible de charger la balance de vérification.');
    }
  }

  /**
   * Grand Livre Général
   * Détail de toutes les écritures d'un compte
   */
  async getGeneralLedger(
    filters: ReportFilters & { account_code: string }
  ): Promise<GrandLivreResponse> {
    try {
      const response = await apiClient.get<GrandLivreResponse>(
        API_ENDPOINTS.REPORTS.GENERAL_LEDGER,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          account_code: filters.account_code,
          date_from: filters.date_from,
          date_to: filters.date_to,
          journals: filters.journals,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching general ledger:', error);
      throw new Error('Impossible de charger le grand livre.');
    }
  }

  /**
   * Balance Analytique
   * Balance détaillée par section analytique
   */
  async getAnalyticalBalance(filters: ReportFilters): Promise<BalanceGeneraleResponse> {
    try {
      const response = await apiClient.get<BalanceGeneraleResponse>(
        API_ENDPOINTS.REPORTS.ANALYTICAL_BALANCE,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching analytical balance:', error);
      throw new Error('Impossible de charger la balance analytique.');
    }
  }

  /**
   * Grand Livre Analytique
   * Grand livre détaillé par section analytique
   */
  async getAnalyticalLedger(
    filters: ReportFilters & { account_code?: string }
  ): Promise<GrandLivreResponse> {
    try {
      const response = await apiClient.get<GrandLivreResponse>(
        API_ENDPOINTS.REPORTS.ANALYTICAL_LEDGER,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          account_code: filters.account_code,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching analytical ledger:', error);
      throw new Error('Impossible de charger le grand livre analytique.');
    }
  }

  /**
   * Compte de Résultat SYSCOHADA
   * État financier des charges et produits
   */
  async getIncomeStatement(filters: ReportFilters): Promise<FinancialStatement> {
    try {
      const response = await apiClient.get<FinancialStatement>(
        API_ENDPOINTS.REPORTS.INCOME_STATEMENT,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching income statement:', error);
      throw new Error('Impossible de charger le compte de résultat.');
    }
  }

  /**
   * Bilan Comptable SYSCOHADA
   * État financier actif/passif
   */
  async getBalanceSheet(filters: ReportFilters): Promise<FinancialStatement> {
    try {
      const response = await apiClient.get<FinancialStatement>(
        API_ENDPOINTS.REPORTS.BALANCE_SHEET,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching balance sheet:', error);
      throw new Error('Impossible de charger le bilan comptable.');
    }
  }

  /**
   * Tableau des Flux de Trésorerie
   * État des mouvements de trésorerie
   */
  async getCashFlowStatement(filters: ReportFilters): Promise<FinancialStatement> {
    try {
      const response = await apiClient.get<FinancialStatement>(
        API_ENDPOINTS.REPORTS.CASH_FLOW_STATEMENT,
        {
          company_id: filters.company_id,
          fiscal_year_id: filters.fiscal_year_id,
          date_from: filters.date_from,
          date_to: filters.date_to,
        }
      );
      return response;
    } catch (error) {
      console.error('Error fetching cash flow statement:', error);
      throw new Error('Impossible de charger le tableau des flux de trésorerie.');
    }
  }

  /**
   * Export Universel de Rapport
   * Télécharge n'importe quel rapport au format souhaité
   */
  async exportReport(
    reportType:
      | 'balance'
      | 'trial-balance'
      | 'general-ledger'
      | 'analytical-balance'
      | 'analytical-ledger'
      | 'income-statement'
      | 'balance-sheet'
      | 'cash-flow',
    filters: ReportFilters
  ): Promise<Blob> {
    try {
      const endpoints: Record<string, string> = {
        'balance': API_ENDPOINTS.REPORTS.BALANCE,
        'trial-balance': API_ENDPOINTS.REPORTS.TRIAL_BALANCE,
        'general-ledger': API_ENDPOINTS.REPORTS.GENERAL_LEDGER,
        'analytical-balance': API_ENDPOINTS.REPORTS.ANALYTICAL_BALANCE,
        'analytical-ledger': API_ENDPOINTS.REPORTS.ANALYTICAL_LEDGER,
        'income-statement': API_ENDPOINTS.REPORTS.INCOME_STATEMENT,
        'balance-sheet': API_ENDPOINTS.REPORTS.BALANCE_SHEET,
        'cash-flow': API_ENDPOINTS.REPORTS.CASH_FLOW_STATEMENT,
      };

      const endpoint = endpoints[reportType];
      if (!endpoint) {
        throw new Error(`Type de rapport invalide: ${reportType}`);
      }

      // Utiliser responseType blob pour les téléchargements
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          format: filters.format || 'pdf',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting report:', error);
      throw new Error(`Impossible d'exporter le rapport ${reportType}.`);
    }
  }

  /**
   * Télécharge automatiquement un rapport exporté
   */
  async downloadReport(
    reportType: string,
    filters: ReportFilters,
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.exportReport(reportType as any, filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = filters.format === 'excel' ? 'xlsx' : filters.format || 'pdf';
      const defaultFilename = `${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`;

      link.setAttribute('download', filename || defaultFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }
}

// ===========================
// EXPORT
// ===========================

export const reportsService = new ReportsService();
export default reportsService;
