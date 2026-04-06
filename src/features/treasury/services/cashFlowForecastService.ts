/**
 * Cash Flow Forecast Service
 * Projects cash flow from real accounting data using SYSCOHADA account classes.
 *
 * - Class 40 (Fournisseurs) = upcoming payables
 * - Class 41 (Clients) = upcoming receivables
 * - Class 16 (Emprunts) = loan repayments
 *
 * Returns monthly projections with optimistic/central/pessimistic scenarios.
 */
import type { DataAdapter } from '@atlas/data';
import { Money } from '@/utils/money';

// ============================================================================
// TYPES
// ============================================================================

export type ForecastHorizon = 3 | 6 | 12;

export interface MonthlyProjection {
  /** YYYY-MM format */
  month: string;
  /** Year */
  year: number;
  /** Month number 1-12 */
  monthNumber: number;
  /** Cash inflows (receivables expected to be collected) */
  inflows: number;
  /** Cash outflows (payables + loan repayments) */
  outflows: number;
  /** Net cash flow for the month */
  netCashFlow: number;
  /** Cumulative cash position */
  cumulativeCash: number;
}

export interface CashFlowScenario {
  label: 'optimistic' | 'central' | 'pessimistic';
  /** Collection rate applied to receivables */
  collectionRate: number;
  /** Payment acceleration factor for payables (1 = on time, >1 = faster) */
  paymentFactor: number;
  projections: MonthlyProjection[];
  /** Total net cash flow over the horizon */
  totalNetCashFlow: number;
}

export interface CashFlowForecast {
  /** Date when the forecast was generated */
  generatedAt: string;
  /** Forecast horizon in months */
  horizon: ForecastHorizon;
  /** Starting cash balance (class 5 accounts) */
  startingCash: number;
  /** Three scenarios */
  optimistic: CashFlowScenario;
  central: CashFlowScenario;
  pessimistic: CashFlowScenario;
  /** Summary of underlying data */
  summary: {
    totalReceivables: number;
    totalPayables: number;
    totalLoanRepayments: number;
  };
}

// ============================================================================
// SCENARIO PARAMETERS
// ============================================================================

const SCENARIOS = {
  optimistic: {
    label: 'optimistic' as const,
    collectionRate: 0.95,  // 95% of receivables collected
    paymentFactor: 0.85,   // Payables delayed slightly (only 85% paid on time)
  },
  central: {
    label: 'central' as const,
    collectionRate: 0.85,  // 85% collection rate (historical average)
    paymentFactor: 1.0,    // Payables paid on schedule
  },
  pessimistic: {
    label: 'pessimistic' as const,
    collectionRate: 0.70,  // 70% collection rate (stress scenario)
    paymentFactor: 1.15,   // Payables accelerated (suppliers demand faster payment)
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function generateMonthKeys(startDate: Date, horizon: ForecastHorizon): string[] {
  const keys: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  for (let i = 0; i < horizon; i++) {
    keys.push(getMonthKey(current));
    current.setMonth(current.getMonth() + 1);
  }
  return keys;
}

function distributeEvenly(total: number, months: number): number[] {
  if (months <= 0) return [];
  const perMonth = new Money(total).divide(months).round().toNumber();
  const result = Array(months).fill(perMonth);
  // Adjust last month for rounding
  const distributed = result.reduce((s: number, v: number) => s + v, 0);
  result[result.length - 1] = new Money(result[result.length - 1])
    .add(new Money(total).subtract(new Money(distributed)))
    .toNumber();
  return result;
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Forecast cash flow over the given horizon using real accounting data.
 *
 * Reads:
 * - Class 41 balances (debit solde = receivables outstanding)
 * - Class 40 balances (credit solde = payables outstanding)
 * - Class 16 balances (credit solde = loan obligations)
 * - Class 5 balances (current cash position)
 */
export async function forecastCashFlow(
  adapter: DataAdapter,
  horizon: ForecastHorizon = 6,
): Promise<CashFlowForecast> {
  const now = new Date();
  const monthKeys = generateMonthKeys(now, horizon);

  // ── Fetch real balances from accounting data ──

  // Receivables: Class 41 (Clients et comptes rattaches)
  const receivablesBalance = await adapter.getAccountBalance(['41']);
  const totalReceivables = Math.max(0, receivablesBalance.solde); // Debit solde = amount owed to us

  // Payables: Class 40 (Fournisseurs et comptes rattaches)
  const payablesBalance = await adapter.getAccountBalance(['40']);
  const totalPayables = Math.max(0, -payablesBalance.solde); // Credit solde = amount we owe

  // Loan repayments: Class 16 (Emprunts et dettes assimilees)
  const loansBalance = await adapter.getAccountBalance(['16']);
  const totalLoanRepayments = Math.max(0, -loansBalance.solde); // Credit solde

  // Current cash: Class 5 (Comptes de tresorerie)
  const cashBalance = await adapter.getAccountBalance(['5']);
  const startingCash = cashBalance.solde; // Can be negative (overdraft)

  // ── Distribute amounts over the horizon ──
  // Receivables are distributed evenly (assumes gradual collection)
  const receivablesPerMonth = distributeEvenly(totalReceivables, horizon);

  // Payables distributed evenly
  const payablesPerMonth = distributeEvenly(totalPayables, horizon);

  // Loan repayments distributed evenly (simplified — real schedules would be better)
  const monthlyLoanRepayment = horizon <= 12
    ? distributeEvenly(totalLoanRepayments / 5, horizon) // Assume ~5yr amortization
    : distributeEvenly(totalLoanRepayments / 5, horizon);

  // ── Build scenarios ──
  function buildScenario(params: { label: 'optimistic' | 'central' | 'pessimistic'; collectionRate: number; paymentFactor: number }): CashFlowScenario {
    let cumulative = startingCash;
    const projections: MonthlyProjection[] = [];

    for (let i = 0; i < horizon; i++) {
      const [year, month] = monthKeys[i].split('-').map(Number);
      const inflows = new Money(receivablesPerMonth[i]).multiply(params.collectionRate).round().toNumber();
      const outflows = new Money(payablesPerMonth[i])
        .multiply(params.paymentFactor)
        .add(new Money(monthlyLoanRepayment[i] || 0))
        .round()
        .toNumber();
      const netCashFlow = new Money(inflows).subtract(new Money(outflows)).toNumber();
      cumulative = new Money(cumulative).add(new Money(netCashFlow)).toNumber();

      projections.push({
        month: monthKeys[i],
        year,
        monthNumber: month,
        inflows,
        outflows,
        netCashFlow,
        cumulativeCash: cumulative,
      });
    }

    const totalNetCashFlow = projections.reduce(
      (s, p) => new Money(s).add(new Money(p.netCashFlow)).toNumber(),
      0,
    );

    return {
      label: params.label,
      collectionRate: params.collectionRate,
      paymentFactor: params.paymentFactor,
      projections,
      totalNetCashFlow,
    };
  }

  return {
    generatedAt: now.toISOString(),
    horizon,
    startingCash,
    optimistic: buildScenario(SCENARIOS.optimistic),
    central: buildScenario(SCENARIOS.central),
    pessimistic: buildScenario(SCENARIOS.pessimistic),
    summary: {
      totalReceivables,
      totalPayables,
      totalLoanRepayments,
    },
  };
}
