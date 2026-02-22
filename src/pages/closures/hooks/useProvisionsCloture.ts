/**
 * Hook: useProvisionsCloture
 * Provisions calculation and comparison with recorded provisions.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { calculerProvisions } from '../../../services/receivableService';
import type { ProvisionCreanceDouteuse } from '../../../services/receivableService';
import type { DBProvision } from '../../../lib/db';
import { money } from '../../../utils/money';

export function useProvisionsCloture(sessionId?: string) {
  const { adapter } = useData();
  const [provisionsCalculees, setProvisionsCalculees] = useState<ProvisionCreanceDouteuse[]>([]);
  const [provisionsEnregistrees, setProvisionsEnregistrees] = useState<DBProvision[]>([]);
  const [totalCalcule, setTotalCalcule] = useState(0);
  const [totalEnregistre, setTotalEnregistre] = useState(0);
  const [ecart, setEcart] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Calculate provisions from aging analysis
      const result = await calculerProvisions(adapter, sessionId);
      setProvisionsCalculees(result.provisions);
      setTotalCalcule(result.totalProvision);

      // Load recorded provisions from DB
      const allProvisions = await adapter.getAll<DBProvision>('provisions');
      const filtered = sessionId
        ? allProvisions.filter(p => p.sessionId === sessionId)
        : allProvisions;
      setProvisionsEnregistrees(filtered);

      const totalEnr = filtered.reduce((sum, p) => money(sum).add(money(p.montantProvision)).toNumber(), 0);
      setTotalEnregistre(totalEnr);

      setEcart(money(result.totalProvision).subtract(money(totalEnr)).toNumber());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement provisions');
    } finally {
      setLoading(false);
    }
  }, [adapter, sessionId]);

  useEffect(() => { load(); }, [load]);

  return {
    provisionsCalculees,
    provisionsEnregistrees,
    totalCalcule,
    totalEnregistre,
    ecart,
    loading,
    error,
    refresh: load,
  };
}
