/**
 * Hook: useBalanceAgeeFournisseurs
 * Aging analysis for supplier payables (comptes 401).
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { getAgingAnalysis } from '../../../services/receivableService';
import type { AgingAnalysis } from '../../../services/receivableService';
import { money } from '../../../utils/money';

export function useBalanceAgeeFournisseurs() {
  const { adapter } = useData();
  const [analyses, setAnalyses] = useState<AgingAnalysis[]>([]);
  const [totalDettes, setTotalDettes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAgingAnalysis(adapter, 'supplier');
      setAnalyses(result);

      let total = money(0);
      for (const a of result) {
        total = total.add(money(a.totalDue));
      }
      setTotalDettes(total.toNumber());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement balance âgée fournisseurs');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  return {
    analyses,
    totalDettes,
    loading,
    error,
    refresh: load,
  };
}
