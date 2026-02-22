/**
 * Hook: useFiscalPeriods
 * CRUD for fiscal periods (mensuelle/trimestrielle) stored in fiscalPeriods table.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalPeriod, DBFiscalYear } from '../../../lib/db';

export function useFiscalPeriods(fiscalYearId?: string) {
  const { adapter } = useData();
  const [periods, setPeriods] = useState<DBFiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await adapter.getAll<DBFiscalPeriod>('fiscalPeriods');
      const filtered = fiscalYearId
        ? all.filter(p => p.fiscalYearId === fiscalYearId)
        : all;
      filtered.sort((a, b) => a.startDate.localeCompare(b.startDate));
      setPeriods(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement périodes');
    } finally {
      setLoading(false);
    }
  }, [adapter, fiscalYearId]);

  useEffect(() => { load(); }, [load]);

  const createPeriodsForFY = useCallback(async (fyId: string) => {
    const fy = await adapter.getById<DBFiscalYear>('fiscalYears', fyId);
    if (!fy) throw new Error('Exercice introuvable');

    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const newPeriods: DBFiscalPeriod[] = [];
    const current = new Date(start);

    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const code = `${year}-${String(month + 1).padStart(2, '0')}`;
      const lastDay = new Date(year, month + 1, 0);
      const periodEnd = lastDay > end ? end : lastDay;

      const period: DBFiscalPeriod = {
        id: crypto.randomUUID(),
        fiscalYearId: fyId,
        code,
        label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(current),
        type: 'mensuelle',
        startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        endDate: periodEnd.toISOString().split('T')[0],
        status: 'ouverte',
        progression: 0,
      };

      await adapter.create<DBFiscalPeriod>('fiscalPeriods', period);
      newPeriods.push(period);
      current.setMonth(current.getMonth() + 1);
    }

    await load();
    return newPeriods;
  }, [adapter, load]);

  const lockPeriod = useCallback(async (periodId: string, userId: string) => {
    await adapter.update<DBFiscalPeriod>('fiscalPeriods', periodId, {
      status: 'cloturee',
      closedAt: new Date().toISOString(),
      closedBy: userId,
      progression: 100,
    });
    await load();
  }, [adapter, load]);

  const unlockPeriod = useCallback(async (periodId: string, userId: string) => {
    await adapter.update<DBFiscalPeriod>('fiscalPeriods', periodId, {
      status: 'rouverte',
      reopenedAt: new Date().toISOString(),
      reopenedBy: userId,
    });
    await load();
  }, [adapter, load]);

  const updateProgression = useCallback(async (periodId: string, progression: number) => {
    await adapter.update<DBFiscalPeriod>('fiscalPeriods', periodId, {
      progression,
      status: progression > 0 && progression < 100 ? 'en_cloture' : undefined,
    });
    await load();
  }, [adapter, load]);

  return {
    periods,
    loading,
    error,
    refresh: load,
    createPeriodsForFY,
    lockPeriod,
    unlockPeriod,
    updateProgression,
  };
}
