/**
 * Hook: useBalanceAgeeClients
 * Aging analysis for customer receivables (comptes 411).
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { getAgingAnalysis } from '../../../services/receivableService';
import type { AgingAnalysis } from '../../../services/receivableService';
import { money } from '../../../utils/money';

export function useBalanceAgeeClients() {
  const { adapter } = useData();
  const [analyses, setAnalyses] = useState<AgingAnalysis[]>([]);
  const [totalCreances, setTotalCreances] = useState(0);
  const [totalProvisionRecommandee, setTotalProvisionRecommandee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAgingAnalysis(adapter, 'customer');
      setAnalyses(result);

      let totalDue = money(0);
      let totalProv = money(0);
      for (const a of result) {
        totalDue = totalDue.add(money(a.totalDue));
        // Provision recommendation: 50% of amounts > 90 days
        for (const bucket of a.buckets) {
          if (bucket.min > 90) {
            totalProv = totalProv.add(money(bucket.amount).multiply(0.5));
          }
        }
      }

      setTotalCreances(totalDue.toNumber());
      setTotalProvisionRecommandee(totalProv.toNumber());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement balance âgée clients');
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { load(); }, [load]);

  return {
    analyses,
    totalCreances,
    totalProvisionRecommandee,
    loading,
    error,
    refresh: load,
  };
}
