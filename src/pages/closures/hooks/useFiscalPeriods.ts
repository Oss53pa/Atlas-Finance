/**
 * Hook: useFiscalPeriods
 * CRUD for fiscal periods (mensuelle/trimestrielle/semestrielle) stored in fiscalPeriods table.
 */
import { useState, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalPeriod, DBFiscalYear } from '../../../lib/db';

export type Periodicite = 'mensuelle' | 'trimestrielle' | 'semestrielle';

/** Format a Date as YYYY-MM-DD in local time (no UTC shift). */
function fmtLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const TRIMESTRE_LABEL = ['1er', '2e', '3e', '4e'];

/** closed_by / reopened_by sont des colonnes UUID : n'écrire que si l'identifiant
 *  fourni est un UUID valide (le front peut passer un libellé ou undefined). */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v?: string): v is string => !!v && UUID_RE.test(v);

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

  const createPeriodsForFY = useCallback(async (
    fyId: string,
    periodicite: Periodicite = 'mensuelle',
  ) => {
    const fy = await adapter.getById<DBFiscalYear>('fiscalYears', fyId);
    if (!fy) throw new Error('Exercice introuvable');

    const start = new Date(fy.startDate);
    const end = new Date(fy.endDate);
    const newPeriods: DBFiscalPeriod[] = [];

    const persist = async (p: DBFiscalPeriod) => {
      await adapter.create<DBFiscalPeriod>('fiscalPeriods', p);
      newPeriods.push(p);
    };

    if (periodicite === 'trimestrielle') {
      // 4 trimestres, bornés à fy.endDate
      for (let q = 0; q < 4; q++) {
        const qStart = new Date(start.getFullYear(), start.getMonth() + q * 3, 1);
        if (qStart > end) break;
        const qLast = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);
        const qEnd = qLast > end ? end : qLast;
        const year = qStart.getFullYear();
        await persist({
          id: crypto.randomUUID(),
          fiscalYearId: fyId,
          code: `${year}-T${q + 1}`,
          label: `${TRIMESTRE_LABEL[q]} trimestre ${year}`,
          type: 'trimestrielle',
          startDate: fmtLocalDate(qStart),
          endDate: fmtLocalDate(qEnd),
          status: 'ouverte',
          progression: 0,
        });
      }
    } else if (periodicite === 'semestrielle') {
      // 2 semestres : S1 fy.start → 30/06, S2 01/07 → fy.end
      const year = start.getFullYear();
      const midEnd = new Date(year, 5, 30); // 30 juin
      const s1End = midEnd > end ? end : midEnd;
      await persist({
        id: crypto.randomUUID(),
        fiscalYearId: fyId,
        code: `${year}-S1`,
        label: `1er semestre ${year}`,
        type: 'semestrielle',
        startDate: fy.startDate,
        endDate: fmtLocalDate(s1End),
        status: 'ouverte',
        progression: 0,
      });
      const s2Start = new Date(year, 6, 1); // 1er juillet
      if (s2Start <= end) {
        await persist({
          id: crypto.randomUUID(),
          fiscalYearId: fyId,
          code: `${year}-S2`,
          label: `2e semestre ${year}`,
          type: 'semestrielle',
          startDate: fmtLocalDate(s2Start),
          endDate: fy.endDate,
          status: 'ouverte',
          progression: 0,
        });
      }
    } else {
      // mensuelle : 12 périodes (comportement historique)
      const current = new Date(start);
      while (current <= end) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const code = `${year}-${String(month + 1).padStart(2, '0')}`;
        const lastDay = new Date(year, month + 1, 0);
        const periodEnd = lastDay > end ? end : lastDay;
        await persist({
          id: crypto.randomUUID(),
          fiscalYearId: fyId,
          code,
          label: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(current),
          type: 'mensuelle',
          startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
          endDate: fmtLocalDate(periodEnd),
          status: 'ouverte',
          progression: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }
    }

    await load();
    return newPeriods;
  }, [adapter, load]);

  /** Supprime toutes les périodes d'un exercice. Refuse si l'une est (en) clôturée. */
  const deletePeriodsForFY = useCallback(async (fyId: string) => {
    const all = await adapter.getAll<DBFiscalPeriod>('fiscalPeriods');
    const forFY = all.filter(p => p.fiscalYearId === fyId);
    const locked = forFY.filter(p => p.status === 'cloturee' || p.status === 'en_cloture');
    if (locked.length > 0) {
      throw new Error(`${locked.length} période(s) déjà (en) clôturée(s) — régénération impossible`);
    }
    for (const p of forFY) {
      await adapter.delete('fiscalPeriods', p.id);
    }
    await load();
  }, [adapter, load]);

  const lockPeriod = useCallback(async (periodId: string, userId?: string) => {
    await adapter.update<DBFiscalPeriod>('fiscalPeriods', periodId, {
      status: 'cloturee',
      closedAt: new Date().toISOString(),
      ...(isUuid(userId) ? { closedBy: userId } : {}),
      progression: 100,
    });
    await load();
  }, [adapter, load]);

  const unlockPeriod = useCallback(async (periodId: string, userId?: string) => {
    await adapter.update<DBFiscalPeriod>('fiscalPeriods', periodId, {
      status: 'rouverte',
      reopenedAt: new Date().toISOString(),
      ...(isUuid(userId) ? { reopenedBy: userId } : {}),
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
    deletePeriodsForFY,
    lockPeriod,
    unlockPeriod,
    updateProgression,
  };
}
