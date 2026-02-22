import { db, logAudit } from '../../../lib/db';
import type { DBBudgetLine } from '../../../lib/db';
import {
  BudgetSession,
  BudgetLine,
  DepartmentBudget,
  BudgetStats,
  MonthlyBudget,
  BudgetAlert,
  BudgetForecast,
} from '../types/budgeting.types';

// ============================================================================
// SETTINGS HELPERS — store/retrieve budget sessions as JSON in db.settings
// ============================================================================

const SESSIONS_KEY = 'budget_sessions';

async function loadSessions(): Promise<BudgetSession[]> {
  const setting = await db.settings.get(SESSIONS_KEY);
  if (!setting) return [];
  try {
    return JSON.parse(setting.value) as BudgetSession[];
  } catch {
    return [];
  }
}

async function saveSessions(sessions: BudgetSession[]): Promise<void> {
  await db.settings.put({
    key: SESSIONS_KEY,
    value: JSON.stringify(sessions),
    updatedAt: new Date().toISOString(),
  });
}

class BudgetingService {
  async getSessions(): Promise<BudgetSession[]> {
    return loadSessions();
  }

  async createSession(session: Omit<BudgetSession, 'id'>): Promise<BudgetSession> {
    const sessions = await loadSessions();
    const newSession: BudgetSession = {
      ...session,
      id: Date.now(),
    };
    sessions.push(newSession);
    await saveSessions(sessions);

    await logAudit(
      'BUDGET_SESSION_CREATE',
      'budgetSession',
      String(newSession.id),
      `Creation session budget ${session.department} — ${session.year}`
    );

    return newSession;
  }

  async updateSession(id: number | string, updates: Partial<BudgetSession>): Promise<BudgetSession> {
    const sessions = await loadSessions();
    const index = sessions.findIndex(s => String(s.id) === String(id));
    if (index === -1) throw new Error(`Session ${id} introuvable`);

    sessions[index] = { ...sessions[index], ...updates };
    await saveSessions(sessions);
    return sessions[index];
  }

  async deleteSession(id: number | string): Promise<void> {
    const sessions = await loadSessions();
    const filtered = sessions.filter(s => String(s.id) !== String(id));
    await saveSessions(filtered);
  }

  /**
   * Get department budgets by aggregating db.budgetLines and computing actual
   * amounts from db.journalEntries for matching account codes.
   */
  async getDepartmentBudgets(year?: string, period?: string): Promise<DepartmentBudget[]> {
    // Query budget lines, optionally filtered
    let budgetLines = await db.budgetLines.toArray();

    if (year) {
      budgetLines = budgetLines.filter(bl => bl.fiscalYear === year);
    }
    if (period) {
      budgetLines = budgetLines.filter(bl => bl.period === period);
    }

    if (budgetLines.length === 0) return [];

    // Group budget lines by account prefix (first 2 digits as department proxy)
    const departmentMap = new Map<string, { budgeted: number; accountCodes: Set<string> }>();

    for (const bl of budgetLines) {
      const prefix = bl.accountCode.substring(0, 2);
      const existing = departmentMap.get(prefix) || { budgeted: 0, accountCodes: new Set<string>() };
      existing.budgeted += bl.budgeted;
      existing.accountCodes.add(bl.accountCode);
      departmentMap.set(prefix, existing);
    }

    // Fetch all journal entries to compute actuals
    const allEntries = await db.journalEntries
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .toArray();

    // Filter by year if provided
    const filteredEntries = year
      ? allEntries.filter(e => e.date.startsWith(year))
      : allEntries;

    // Compute actual amounts per account code
    const actualByAccount = new Map<string, number>();
    for (const entry of filteredEntries) {
      for (const line of entry.lines) {
        const current = actualByAccount.get(line.accountCode) || 0;
        // For expense accounts (class 6), actual = debit - credit
        // For revenue accounts (class 7), actual = credit - debit
        const classNum = parseInt(line.accountCode.charAt(0));
        if (classNum === 6 || classNum === 2) {
          actualByAccount.set(line.accountCode, current + line.debit - line.credit);
        } else if (classNum === 7) {
          actualByAccount.set(line.accountCode, current + line.credit - line.debit);
        } else {
          actualByAccount.set(line.accountCode, current + line.debit - line.credit);
        }
      }
    }

    // Build department budgets
    const departments: DepartmentBudget[] = [];

    // Map account prefixes to department names
    const prefixNames: Record<string, string> = {
      '60': 'Achats',
      '61': 'Services exterieurs',
      '62': 'Autres services exterieurs',
      '63': 'Impots et taxes',
      '64': 'Charges de personnel',
      '65': 'Autres charges',
      '66': 'Charges financieres',
      '67': 'Charges exceptionnelles',
      '68': 'Dotations amortissements',
      '70': 'Ventes',
      '71': 'Production stockee',
      '72': 'Production immobilisee',
      '74': 'Subventions',
      '75': 'Autres produits',
      '76': 'Produits financiers',
      '77': 'Produits exceptionnels',
      '20': 'Immobilisations',
      '21': 'Immobilisations corporelles',
    };

    for (const [prefix, data] of departmentMap) {
      let actual = 0;
      for (const code of data.accountCodes) {
        actual += actualByAccount.get(code) || 0;
      }

      const variance = data.budgeted - actual;
      const variancePercent = data.budgeted !== 0
        ? Math.round((variance / data.budgeted) * 1000) / 10
        : 0;

      departments.push({
        name: prefixNames[prefix] || `Departement ${prefix}`,
        budget: data.budgeted,
        actual,
        variance,
        variancePercent,
      });
    }

    return departments.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get budget lines from Dexie, optionally filtered.
   */
  async getBudgetLines(filters?: {
    department?: string;
    year?: string;
    period?: string;
  }): Promise<BudgetLine[]> {
    let dbLines = await db.budgetLines.toArray();

    if (filters?.year) {
      dbLines = dbLines.filter(bl => bl.fiscalYear === filters.year);
    }
    if (filters?.period) {
      dbLines = dbLines.filter(bl => bl.period === filters.period);
    }

    if (dbLines.length === 0) return [];

    // Fetch actual amounts from journal entries
    const allEntries = await db.journalEntries
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .toArray();

    const filteredEntries = filters?.year
      ? allEntries.filter(e => e.date.startsWith(filters.year!))
      : allEntries;

    const actualByAccount = new Map<string, number>();
    for (const entry of filteredEntries) {
      for (const line of entry.lines) {
        const current = actualByAccount.get(line.accountCode) || 0;
        actualByAccount.set(line.accountCode, current + line.debit - line.credit);
      }
    }

    // Look up account names
    const accounts = await db.accounts.toArray();
    const accountNames = new Map<string, string>();
    for (const acc of accounts) {
      accountNames.set(acc.code, acc.name);
    }

    return dbLines.map(bl => {
      const actual = actualByAccount.get(bl.accountCode) || 0;
      const variance = bl.budgeted - actual;
      const variancePercent = bl.budgeted !== 0
        ? Math.round((variance / bl.budgeted) * 1000) / 10
        : 0;

      return {
        id: bl.id,
        accountCode: bl.accountCode,
        accountLabel: accountNames.get(bl.accountCode) || bl.accountCode,
        budgetAmount: bl.budgeted,
        actualAmount: actual,
        variance,
        variancePercent,
        period: bl.period,
        department: filters?.department || bl.accountCode.substring(0, 2),
        year: bl.fiscalYear,
      };
    });
  }

  async createBudgetLine(line: Omit<BudgetLine, 'id'>): Promise<BudgetLine> {
    const id = crypto.randomUUID();

    const dbLine: DBBudgetLine = {
      id,
      accountCode: line.accountCode,
      fiscalYear: line.year,
      period: line.period,
      budgeted: line.budgetAmount,
      actual: line.actualAmount,
    };

    await db.budgetLines.add(dbLine);

    await logAudit(
      'BUDGET_LINE_CREATE',
      'budgetLine',
      id,
      `Ligne budget ${line.accountCode} — ${line.budgetAmount}`
    );

    return {
      ...line,
      id,
    };
  }

  async updateBudgetLine(id: number | string, updates: Partial<BudgetLine>): Promise<BudgetLine> {
    const sid = String(id);
    const existing = await db.budgetLines.get(sid);
    if (!existing) throw new Error(`Ligne budget ${sid} introuvable`);

    const dbUpdates: Partial<DBBudgetLine> = {};
    if (updates.budgetAmount !== undefined) dbUpdates.budgeted = updates.budgetAmount;
    if (updates.actualAmount !== undefined) dbUpdates.actual = updates.actualAmount;
    if (updates.year !== undefined) dbUpdates.fiscalYear = updates.year;
    if (updates.period !== undefined) dbUpdates.period = updates.period;
    if (updates.accountCode !== undefined) dbUpdates.accountCode = updates.accountCode;

    await db.budgetLines.update(sid, dbUpdates);

    const updated = await db.budgetLines.get(sid);
    return {
      id: sid,
      accountCode: updated?.accountCode || existing.accountCode,
      accountLabel: updates.accountLabel || existing.accountCode,
      budgetAmount: updated?.budgeted || existing.budgeted,
      actualAmount: updated?.actual || existing.actual,
      variance: (updated?.budgeted || existing.budgeted) - (updated?.actual || existing.actual),
      variancePercent: 0,
      period: updated?.period || existing.period,
      department: updates.department || existing.accountCode.substring(0, 2),
      year: updated?.fiscalYear || existing.fiscalYear,
    } as BudgetLine;
  }

  async deleteBudgetLine(id: number | string): Promise<void> {
    await db.budgetLines.delete(String(id));
  }

  /**
   * Compute budget statistics from real data in db.budgetLines and db.journalEntries.
   */
  async getStats(year?: string, period?: string): Promise<BudgetStats> {
    let budgetLines = await db.budgetLines.toArray();

    if (year) {
      budgetLines = budgetLines.filter(bl => bl.fiscalYear === year);
    }
    if (period) {
      budgetLines = budgetLines.filter(bl => bl.period === period);
    }

    const totalBudget = budgetLines.reduce((sum, bl) => sum + bl.budgeted, 0);

    // Compute actual from journal entries
    const allEntries = await db.journalEntries
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .toArray();

    const filteredEntries = year
      ? allEntries.filter(e => e.date.startsWith(year))
      : allEntries;

    const budgetAccountCodes = new Set(budgetLines.map(bl => bl.accountCode));
    let totalActual = 0;
    for (const entry of filteredEntries) {
      for (const line of entry.lines) {
        if (budgetAccountCodes.has(line.accountCode)) {
          totalActual += line.debit - line.credit;
        }
      }
    }

    const totalVariance = totalBudget - totalActual;
    const variancePercent = totalBudget !== 0
      ? Math.round((totalVariance / totalBudget) * 1000) / 10
      : 0;

    // Count unique account prefixes (departments)
    const departments = new Set(budgetLines.map(bl => bl.accountCode.substring(0, 2)));

    // Count active sessions
    const sessions = await loadSessions();
    const activeSessions = sessions.filter(s => s.status === 'active').length;

    return {
      totalBudget,
      totalActual,
      totalVariance,
      variancePercent,
      departmentsCount: departments.size,
      accountsCount: budgetAccountCodes.size,
      activeSessions,
    };
  }

  async getMonthlyBudgets(year: string, department?: string): Promise<MonthlyBudget[]> {
    const months = [
      'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
    ];

    // Get budget lines for the year
    let budgetLines = await db.budgetLines
      .where('fiscalYear')
      .equals(year)
      .toArray();

    if (department) {
      budgetLines = budgetLines.filter(bl => bl.accountCode.startsWith(department));
    }

    // Get journal entries for the year
    const entries = await db.journalEntries
      .where('date')
      .between(`${year}-01-01`, `${year}-12-31`, true, true)
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .toArray();

    const budgetAccountCodes = new Set(budgetLines.map(bl => bl.accountCode));

    // Compute actual per month
    const actualByMonth = new Map<number, number>();
    for (const entry of entries) {
      const month = parseInt(entry.date.substring(5, 7)) - 1; // 0-indexed
      for (const line of entry.lines) {
        if (budgetAccountCodes.has(line.accountCode)) {
          const current = actualByMonth.get(month) || 0;
          actualByMonth.set(month, current + line.debit - line.credit);
        }
      }
    }

    // Distribute total budget evenly across months (or use period-specific if available)
    const totalBudget = budgetLines.reduce((sum, bl) => sum + bl.budgeted, 0);
    const monthlyBudget = totalBudget / 12;

    return months.map((month, index) => {
      const budget = monthlyBudget;
      const actual = actualByMonth.get(index) || 0;
      const variance = budget - actual;
      const variancePercent = budget !== 0
        ? Math.round((variance / budget) * 1000) / 10
        : 0;

      return { month, budget, actual, variance, variancePercent };
    });
  }

  /**
   * Generate alerts from real budget data.
   * Triggers when actual exceeds budget or approaches threshold.
   */
  async getAlerts(): Promise<BudgetAlert[]> {
    const departments = await this.getDepartmentBudgets();
    const alerts: BudgetAlert[] = [];
    let alertId = 1;

    for (const dept of departments) {
      if (dept.budget === 0) continue;

      const ratio = dept.actual / dept.budget;

      if (ratio > 1) {
        // Over budget
        alerts.push({
          id: alertId++,
          type: 'danger',
          title: 'Depassement Budgetaire',
          message: `Le departement ${dept.name} a depasse son budget de ${Math.abs(dept.variancePercent)}%`,
          department: dept.name,
          date: new Date().toISOString(),
          threshold: dept.budget,
          currentValue: dept.actual,
        });
      } else if (ratio > 0.9) {
        // Close to budget
        alerts.push({
          id: alertId++,
          type: 'warning',
          title: 'Budget Proche du Seuil',
          message: `${dept.name} atteint ${Math.round(ratio * 100)}% du budget`,
          department: dept.name,
          date: new Date().toISOString(),
          threshold: dept.budget,
          currentValue: dept.actual,
        });
      }
    }

    return alerts;
  }

  async getForecasts(year: string, department?: string): Promise<BudgetForecast[]> {
    const monthlyBudgets = await this.getMonthlyBudgets(year, department);
    const monthsShort = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

    return monthlyBudgets.map((mb, index) => ({
      month: monthsShort[index],
      projected: mb.budget,
      actual: mb.actual !== 0 ? mb.actual : undefined,
      trend: mb.variance > 0 ? ('down' as const) : mb.variance < 0 ? ('up' as const) : ('stable' as const),
    }));
  }

  async exportBudget(format: 'xlsx' | 'pdf' | 'csv', filters?: Record<string, unknown>): Promise<Blob> {
    const lines = await this.getBudgetLines({
      year: filters?.year as string | undefined,
      department: filters?.department as string | undefined,
      period: filters?.period as string | undefined,
    });

    if (format === 'csv') {
      const header = 'Compte;Libelle;Budget;Reel;Ecart;Ecart %\n';
      const rows = lines.map(l =>
        `${l.accountCode};${l.accountLabel};${l.budgetAmount};${l.actualAmount};${l.variance};${l.variancePercent}%`
      ).join('\n');
      return new Blob([header + rows], { type: 'text/csv' });
    }

    // For xlsx/pdf, return a placeholder (would require external library)
    const data = JSON.stringify(lines, null, 2);
    return new Blob([data], { type: 'application/octet-stream' });
  }

  async importBudget(file: File): Promise<{ success: boolean; imported: number; errors?: string[] }> {
    try {
      const text = await file.text();
      const rows = text.split('\n').filter(r => r.trim().length > 0);

      // Skip header row
      const dataRows = rows.slice(1);
      let imported = 0;
      const errors: string[] = [];

      for (const row of dataRows) {
        const cols = row.split(';');
        if (cols.length < 4) {
          errors.push(`Ligne invalide: ${row}`);
          continue;
        }

        const [accountCode, , budgetStr, , , , period, year] = cols;
        const budgeted = parseFloat(budgetStr);

        if (isNaN(budgeted)) {
          errors.push(`Montant invalide pour compte ${accountCode}`);
          continue;
        }

        await db.budgetLines.add({
          id: crypto.randomUUID(),
          accountCode: accountCode.trim(),
          fiscalYear: year?.trim() || new Date().getFullYear().toString(),
          period: period?.trim() || 'Annuel',
          budgeted,
          actual: 0,
        });

        imported++;
      }

      return { success: errors.length === 0, imported, errors: errors.length > 0 ? errors : undefined };
    } catch (err) {
      return { success: false, imported: 0, errors: [String(err)] };
    }
  }
}

export const budgetingService = new BudgetingService();
