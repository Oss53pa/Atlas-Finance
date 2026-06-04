/**
 * Treasury Advanced Service
 */
import { apiService } from './api';
import { supabase } from '@/lib/supabase';

/** État de rapprochement d'un compte bancaire. */
export interface AccountReconciliationStatus {
  reconciliation_id: string;
  account_id: string;
  account_label: string;
  created_at: string;
  status: 'balanced' | 'unbalanced';
  total: number;
  reconciled: number;
  pending: number;
}

/** Résultat d'un rapprochement automatique. */
export interface AutoReconcileResult {
  account_id: string;
  statement_date: string;
  matched: number;
  unmatched: number;
  status: 'balanced' | 'unbalanced' | 'error';
}

class TreasuryAdvancedService {
  async getAdvancedAnalytics(companyId: string) {
    try {
      const response = await apiService.get('/api/v1/treasury/advanced/analytics/', {
        params: { company_id: companyId }
      });
      return response.data;
    } catch (err) { /* silent */
      return { metrics: [], trends: [] };
    }
  }

  async getOptimizationSuggestions(companyId: string) {
    try {
      const response = await apiService.get('/api/v1/treasury/advanced/optimize/', {
        params: { company_id: companyId }
      });
      return response.data;
    } catch (err) { /* silent */
      return { suggestions: [] };
    }
  }

  /**
   * État de rapprochement par compte : un mouvement est considéré rapproché
   * lorsqu'il est `EXECUTED` (cf. TreasuryReportsService.generateReconciliationReport).
   * Un compte est `balanced` quand il ne reste aucun mouvement en attente.
   */
  async getReconciliationStatus(companyId: string): Promise<{ reconciliations: AccountReconciliationStatus[] }> {
    try {
      const { data: accounts, error: accErr } = await supabase
        .from('treasury_bank_accounts')
        .select('id, label')
        .eq('company_id', companyId);
      if (accErr) throw accErr;

      const reconciliations = await Promise.all(
        (accounts || []).map(async (acc: { id: string; label: string }) => {
          const { data: movements } = await supabase
            .from('treasury_cash_movements')
            .select('execution_status, updated_at')
            .eq('bank_account_id', acc.id);
          const list = (movements || []) as Array<{ execution_status: string; updated_at: string }>;
          const reconciled = list.filter((m) => m.execution_status === 'EXECUTED');
          const pending = list.length - reconciled.length;
          const lastUpdate = list.reduce<string>(
            (latest, m) => (m.updated_at && m.updated_at > latest ? m.updated_at : latest),
            '',
          );
          return {
            reconciliation_id: acc.id,
            account_id: acc.id,
            account_label: acc.label,
            created_at: lastUpdate || new Date().toISOString(),
            status: pending === 0 ? 'balanced' : 'unbalanced',
            total: list.length,
            reconciled: reconciled.length,
            pending,
          } as AccountReconciliationStatus;
        }),
      );
      return { reconciliations };
    } catch (err) { /* silent */
      return { reconciliations: [] };
    }
  }

  /**
   * Rapprochement automatique : marque `EXECUTED` les mouvements en attente du
   * compte jusqu'à la date du relevé. Renvoie le décompte des rapprochements et
   * un statut `balanced` si tous les mouvements sont rapprochés.
   */
  async autoReconcile(params: {
    company_id: string;
    account_id: string;
    statement_date: string;
    statement_balance: number;
    auto_match?: boolean;
    tolerance_amount?: number;
  }): Promise<AutoReconcileResult> {
    try {
      const { data: movements, error } = await supabase
        .from('treasury_cash_movements')
        .select('id, execution_status')
        .eq('bank_account_id', params.account_id)
        .lte('scheduled_date', params.statement_date);
      if (error) throw error;

      const list = (movements || []) as Array<{ id: string; execution_status: string }>;
      const pending = list.filter((m) => m.execution_status !== 'EXECUTED');

      let matched = 0;
      if (params.auto_match !== false) {
        for (const m of pending) {
          const { error: updErr } = await supabase
            .from('treasury_cash_movements')
            .update({ execution_status: 'EXECUTED', value_date: params.statement_date } as never)
            .eq('id', m.id);
          if (!updErr) matched += 1;
        }
      }

      const unmatched = pending.length - matched;
      return {
        account_id: params.account_id,
        statement_date: params.statement_date,
        matched,
        unmatched,
        status: unmatched === 0 ? 'balanced' : 'unbalanced',
      };
    } catch (err) { /* silent */
      return {
        account_id: params.account_id,
        statement_date: params.statement_date,
        matched: 0,
        unmatched: 0,
        status: 'error',
      };
    }
  }
}

const treasuryAdvancedService = new TreasuryAdvancedService();
export default treasuryAdvancedService;
