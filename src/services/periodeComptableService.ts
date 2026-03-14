/**
 * Service de gestion des périodes comptables (AF-025)
 *
 * Gère la création, clôture et réouverture des périodes comptables
 * pour un exercice fiscal donné. Suit le pattern DataAdapter.
 */

import type { DataAdapter } from '@atlas/data';

export interface PeriodeComptable {
  id?: string;
  tenantId?: string;
  fiscalYearId: string;
  code: string;        // e.g., '2025-01', '2025-02'
  label: string;       // e.g., 'Janvier 2025'
  startDate: string;   // ISO date
  endDate: string;     // ISO date
  status: 'open' | 'closed' | 'locked';
  closedAt?: string;
  closedBy?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

/**
 * Generate 12 monthly periods for a fiscal year.
 */
export async function createPeriodes(
  adapter: DataAdapter,
  fiscalYearId: string,
): Promise<PeriodeComptable[]> {
  const fy = await adapter.getById('fiscalYears', fiscalYearId);
  if (!fy) throw new Error('Exercice fiscal non trouvé');

  const start = new Date((fy as any).startDate);
  const periodes: PeriodeComptable[] = [];

  for (let i = 0; i < 12; i++) {
    const periodeStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const periodeEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);

    const code = `${periodeStart.getFullYear()}-${String(periodeStart.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[periodeStart.getMonth()]} ${periodeStart.getFullYear()}`;

    const periode: PeriodeComptable = {
      fiscalYearId,
      code,
      label,
      startDate: periodeStart.toISOString().split('T')[0],
      endDate: periodeEnd.toISOString().split('T')[0],
      status: 'open',
    };

    periodes.push(periode);
  }

  for (const p of periodes) {
    await adapter.create('fiscalPeriods', p as any);
  }

  return periodes;
}

/**
 * Close an accounting period.
 */
export async function closePeriode(
  adapter: DataAdapter,
  periodeId: string,
  userId?: string,
): Promise<void> {
  const periode = await adapter.getById('fiscalPeriods', periodeId);
  if (!periode) throw new Error('Période comptable non trouvée');
  if ((periode as any).status === 'closed') {
    throw new Error('Cette période est déjà clôturée');
  }

  await adapter.update('fiscalPeriods', periodeId, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedBy: userId,
  } as any);
}

/**
 * Reopen an accounting period (admin only).
 */
export async function reopenPeriode(
  adapter: DataAdapter,
  periodeId: string,
  userId?: string,
): Promise<void> {
  const periode = await adapter.getById('fiscalPeriods', periodeId);
  if (!periode) throw new Error('Période comptable non trouvée');
  if ((periode as any).status !== 'closed') {
    throw new Error('Seule une période clôturée peut être réouverte');
  }

  await adapter.update('fiscalPeriods', periodeId, {
    status: 'open',
    reopenedAt: new Date().toISOString(),
    reopenedBy: userId,
  } as any);
}

/**
 * Get the period status for a given date.
 */
export async function getPeriodeStatus(
  adapter: DataAdapter,
  date: string,
): Promise<'open' | 'closed' | 'locked' | 'no_period'> {
  const allPeriods = await adapter.getAll('fiscalPeriods');
  const matching = (allPeriods as any[]).find(
    p => date >= p.startDate && date <= p.endDate,
  );

  if (!matching) return 'no_period';
  return matching.status as 'open' | 'closed' | 'locked';
}

/**
 * Get all periods for a fiscal year, sorted by start date.
 */
export async function getPeriodesForFiscalYear(
  adapter: DataAdapter,
  fiscalYearId: string,
): Promise<PeriodeComptable[]> {
  const allPeriods = await adapter.getAll('fiscalPeriods');
  return (allPeriods as any[])
    .filter(p => p.fiscalYearId === fiscalYearId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}
