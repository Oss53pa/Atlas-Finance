/**
 * Service d'analyse budgétaire — Budget vs Réalisé vs Écarts.
 * Connecte les budgetLines (Dexie) aux journalEntries pour calculer
 * les écarts automatiquement par compte/période.
 *
 * Conforme SYSCOHADA — classes 6 (charges) et 7 (produits).
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../utils/money';
import type { DBBudgetLine, DBJournalEntry } from '../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface BudgetVsActual {
  accountCode: string;
  accountName: string;
  period: string;
  budgeted: number;
  actual: number;
  ecart: number;
  ecartPercent: number;
  /** 'favorable' if expenses under budget or revenue over budget */
  status: 'favorable' | 'defavorable' | 'neutre';
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalActual: number;
  totalEcart: number;
  globalEcartPercent: number;
  globalStatus: 'favorable' | 'defavorable' | 'neutre';
  byAccount: BudgetVsActual[];
  byPeriod: PeriodSummary[];
}

export interface PeriodSummary {
  period: string;
  budgeted: number;
  actual: number;
  ecart: number;
  ecartPercent: number;
  status: 'favorable' | 'defavorable' | 'neutre';
}

export interface BudgetAlert {
  accountCode: string;
  accountName: string;
  period: string;
  type: 'DEPASSEMENT' | 'SOUS_CONSOMMATION' | 'ALERTE_SEUIL';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  ecartPercent: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Alert thresholds */
const SEUILS = {
  DEPASSEMENT_WARNING: 10,    // +10% over budget → warning
  DEPASSEMENT_CRITICAL: 25,   // +25% over budget → critical
  SOUS_CONSOMMATION: -50,     // -50% under budget → info
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Get actual amounts from journal entries for a given account prefix and period.
 */
async function getActualForPeriod(
  adapter: DataAdapter,
  accountCode: string,
  fiscalYear: string,
  period: string
): Promise<number> {
  const [year, month] = period.split('-').map(Number);
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const allEntries = await adapter.getAll('journalEntries');
  const entries = allEntries.filter(e => e.date >= startDate && e.date <= endDate);

  let total = 0;
  const cls = accountCode.charAt(0);

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!line.accountCode.startsWith(accountCode)) continue;

      if (cls === '6') {
        // Charges: debit increases
        total += line.debit - line.credit;
      } else if (cls === '7') {
        // Produits: credit increases
        total += line.credit - line.debit;
      } else {
        // Other accounts: net movement
        total += line.debit - line.credit;
      }
    }
  }

  return total;
}

/**
 * Determine status from the ecart.
 * For charges (class 6): under budget = favorable
 * For produits (class 7): over budget = favorable
 */
function determineStatus(
  accountCode: string,
  budgeted: number,
  actual: number
): 'favorable' | 'defavorable' | 'neutre' {
  if (budgeted === 0 && actual === 0) return 'neutre';

  const cls = accountCode.charAt(0);
  const ecart = actual - budgeted;

  if (Math.abs(ecart) < 1) return 'neutre'; // Tolerance 1 FCFA

  if (cls === '6') {
    // Charges: less spent is favorable
    return ecart < 0 ? 'favorable' : 'defavorable';
  } else if (cls === '7') {
    // Produits: more earned is favorable
    return ecart > 0 ? 'favorable' : 'defavorable';
  }

  return 'neutre';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get budget vs actual analysis for a fiscal year.
 */
export async function getBudgetAnalysis(adapter: DataAdapter, fiscalYear: string): Promise<BudgetSummary> {
  const budgetLines = await adapter.getAll('budgetLines', { where: { fiscalYear } });

  if (budgetLines.length === 0) {
    return {
      totalBudgeted: 0,
      totalActual: 0,
      totalEcart: 0,
      globalEcartPercent: 0,
      globalStatus: 'neutre',
      byAccount: [],
      byPeriod: [],
    };
  }

  const byAccount: BudgetVsActual[] = [];
  const periodMap = new Map<string, { budgeted: number; actual: number }>();

  // Get account names
  const accounts = await adapter.getAll('accounts');
  const accountNames = new Map(accounts.map(a => [a.code, a.name]));

  for (const bl of budgetLines) {
    const actual = await getActualForPeriod(adapter, bl.accountCode, fiscalYear, bl.period);
    const ecart = money(actual).subtract(money(bl.budgeted)).toNumber();
    const ecartPercent = bl.budgeted !== 0
      ? money(ecart).divide(bl.budgeted).multiply(100).toNumber()
      : 0;

    const status = determineStatus(bl.accountCode, bl.budgeted, actual);
    const accountName = accountNames.get(bl.accountCode) || bl.accountCode;

    byAccount.push({
      accountCode: bl.accountCode,
      accountName,
      period: bl.period,
      budgeted: bl.budgeted,
      actual,
      ecart,
      ecartPercent,
      status,
    });

    // Aggregate by period
    const existing = periodMap.get(bl.period) || { budgeted: 0, actual: 0 };
    existing.budgeted += bl.budgeted;
    existing.actual += actual;
    periodMap.set(bl.period, existing);

    // Update the actual field in the budget line for real-time tracking
    if (bl.actual !== actual) {
      await adapter.update('budgetLines', bl.id, { actual });
    }
  }

  // Build period summaries
  const byPeriod: PeriodSummary[] = [];
  for (const [period, data] of periodMap) {
    const ecart = money(data.actual).subtract(money(data.budgeted)).toNumber();
    const ecartPercent = data.budgeted !== 0
      ? money(ecart).divide(data.budgeted).multiply(100).toNumber()
      : 0;

    byPeriod.push({
      period,
      budgeted: data.budgeted,
      actual: data.actual,
      ecart,
      ecartPercent,
      status: Math.abs(ecartPercent) < 1 ? 'neutre' : ecart > 0 ? 'defavorable' : 'favorable',
    });
  }

  byPeriod.sort((a, b) => a.period.localeCompare(b.period));

  // Global totals
  const totalBudgeted = byAccount.reduce((s, a) => s + a.budgeted, 0);
  const totalActual = byAccount.reduce((s, a) => s + a.actual, 0);
  const totalEcart = money(totalActual).subtract(money(totalBudgeted)).toNumber();
  const globalEcartPercent = totalBudgeted !== 0
    ? money(totalEcart).divide(totalBudgeted).multiply(100).toNumber()
    : 0;

  return {
    totalBudgeted,
    totalActual,
    totalEcart,
    globalEcartPercent,
    globalStatus: Math.abs(globalEcartPercent) < 1 ? 'neutre' : totalEcart > 0 ? 'defavorable' : 'favorable',
    byAccount,
    byPeriod,
  };
}

/**
 * Generate budget alerts based on thresholds.
 */
export async function getBudgetAlerts(adapter: DataAdapter, fiscalYear: string): Promise<BudgetAlert[]> {
  const analysis = await getBudgetAnalysis(adapter, fiscalYear);
  const alerts: BudgetAlert[] = [];

  for (const item of analysis.byAccount) {
    if (item.budgeted === 0) continue;

    const cls = item.accountCode.charAt(0);

    if (cls === '6' && item.ecartPercent > SEUILS.DEPASSEMENT_CRITICAL) {
      alerts.push({
        accountCode: item.accountCode,
        accountName: item.accountName,
        period: item.period,
        type: 'DEPASSEMENT',
        severity: 'critical',
        message: `Dépassement critique: ${item.accountName} dépasse le budget de ${item.ecartPercent.toFixed(1)}%`,
        ecartPercent: item.ecartPercent,
      });
    } else if (cls === '6' && item.ecartPercent > SEUILS.DEPASSEMENT_WARNING) {
      alerts.push({
        accountCode: item.accountCode,
        accountName: item.accountName,
        period: item.period,
        type: 'ALERTE_SEUIL',
        severity: 'warning',
        message: `Attention: ${item.accountName} dépasse le budget de ${item.ecartPercent.toFixed(1)}%`,
        ecartPercent: item.ecartPercent,
      });
    }

    if (item.ecartPercent < SEUILS.SOUS_CONSOMMATION) {
      alerts.push({
        accountCode: item.accountCode,
        accountName: item.accountName,
        period: item.period,
        type: 'SOUS_CONSOMMATION',
        severity: 'info',
        message: `Sous-consommation: ${item.accountName} n'utilise que ${(100 + item.ecartPercent).toFixed(1)}% du budget`,
        ecartPercent: item.ecartPercent,
      });
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get budget execution rate for a fiscal year.
 */
export async function getTauxExecution(adapter: DataAdapter, fiscalYear: string): Promise<number> {
  const analysis = await getBudgetAnalysis(adapter, fiscalYear);
  if (analysis.totalBudgeted === 0) return 0;
  return money(analysis.totalActual).divide(analysis.totalBudgeted).multiply(100).toNumber();
}
