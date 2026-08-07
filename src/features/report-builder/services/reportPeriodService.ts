/**
 * Report Period Service — résolution de la période par défaut d'un rapport.
 *
 * Le Report Builder ouvrait tout nouveau rapport sur le MOIS CALENDAIRE COURANT.
 * Sur un dossier dont les écritures sont sur un exercice antérieur — ou
 * simplement en début de mois — chaque bloc renvoyait alors « Aucune donnée
 * pour cette période », ce qui se lit comme un report builder déconnecté des
 * données alors que la chaîne de données fonctionne.
 *
 * On s'aligne donc sur le reste de l'application : l'exercice comptable actif
 * (table `fiscalYears`), avec repli sur les écritures réellement présentes.
 */

import type { DataAdapter } from '@atlas/data';
import type { PeriodSelection } from '../types';

export interface FiscalYearOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
}

interface RawFiscalYear {
  id?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  isClosed?: boolean;
  // Variantes snake_case selon l'adapter (SaaS/Supabase)
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
  is_closed?: boolean;
}

function normalize(fy: RawFiscalYear): FiscalYearOption | null {
  const startDate = fy.startDate ?? fy.start_date;
  const endDate = fy.endDate ?? fy.end_date;
  if (!startDate || !endDate) return null;
  return {
    id: String(fy.id ?? `${startDate}_${endDate}`),
    name: fy.name ?? `Exercice ${startDate.slice(0, 4)}`,
    startDate,
    endDate,
    isActive: Boolean(fy.isActive ?? fy.is_active),
    isClosed: Boolean(fy.isClosed ?? fy.is_closed),
  };
}

/** Exercices du dossier, triés du plus récent au plus ancien. */
export async function listFiscalYears(adapter: DataAdapter): Promise<FiscalYearOption[]> {
  try {
    const rows = (await adapter.getAll<RawFiscalYear>('fiscalYears')) || [];
    return rows
      .map(normalize)
      .filter((fy): fy is FiscalYearOption => fy !== null)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  } catch {
    return [];
  }
}

/**
 * Exercice à retenir par défaut. Même règle de priorité que les clôtures
 * (`CloturesPeriodiquesPage`) : marqué actif > non clôturé > le plus récent.
 */
export function pickDefaultFiscalYear(years: FiscalYearOption[]): FiscalYearOption | null {
  if (years.length === 0) return null;
  return years.find(fy => fy.isActive)
    ?? years.find(fy => !fy.isClosed)
    ?? years[0];
}

function periodFromFiscalYear(fy: FiscalYearOption): PeriodSelection {
  return {
    type: 'annual',
    startDate: fy.startDate,
    endDate: fy.endDate,
    label: fy.name,
  };
}

/**
 * Repli quand aucun exercice n'est paramétré : on cadre sur l'année civile de
 * l'écriture la plus récente, de sorte que le rapport s'ouvre sur une période
 * qui contient effectivement des données.
 */
async function periodFromLatestEntries(adapter: DataAdapter): Promise<PeriodSelection | null> {
  try {
    const entries = (await adapter.getAll<{ date?: string; status?: string }>('journalEntries')) || [];
    const dates = entries
      .filter(e => e.status !== 'draft')
      .map(e => e.date)
      .filter((d): d is string => typeof d === 'string' && d.length >= 4);
    if (dates.length === 0) return null;
    const year = dates.reduce((max, d) => (d > max ? d : max), dates[0]).slice(0, 4);
    return {
      type: 'annual',
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: `Exercice ${year}`,
    };
  } catch {
    return null;
  }
}

/** Dernier recours : année civile courante (jamais le seul mois courant). */
export function currentYearPeriod(now: Date = new Date()): PeriodSelection {
  const year = now.getFullYear();
  return {
    type: 'annual',
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    label: `Exercice ${year}`,
  };
}

/**
 * Période par défaut d'un nouveau rapport :
 *   1. exercice comptable actif ;
 *   2. sinon, année civile de l'écriture la plus récente ;
 *   3. sinon, année civile courante.
 */
export async function resolveDefaultPeriod(adapter: DataAdapter | null | undefined): Promise<PeriodSelection> {
  if (!adapter) return currentYearPeriod();

  const fiscalYear = pickDefaultFiscalYear(await listFiscalYears(adapter));
  if (fiscalYear) return periodFromFiscalYear(fiscalYear);

  return (await periodFromLatestEntries(adapter)) ?? currentYearPeriod();
}
