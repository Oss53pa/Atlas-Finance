import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  forecastCashFlow,
  type CashFlowForecast,
  type ForecastHorizon,
} from '../features/treasury/services/cashFlowForecastService';

// ============================================================================
// Mock DataAdapter
// ============================================================================

function createMockAdapter(balances: Record<string, number> = {}) {
  return {
    getAccountBalance: vi.fn(async (prefixes: string[]) => {
      const prefix = prefixes[0];
      const solde = balances[prefix] ?? 0;
      return { solde, debit: Math.max(0, solde), credit: Math.max(0, -solde) };
    }),
  };
}

describe('forecastCashFlow', () => {
  it('returns a valid forecast structure', async () => {
    const adapter = createMockAdapter({
      '41': 1_000_000,  // Receivables
      '40': -500_000,   // Payables (credit balance)
      '16': -200_000,   // Loans (credit balance)
      '5': 300_000,     // Cash
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    expect(forecast).toBeDefined();
    expect(forecast.horizon).toBe(6);
    expect(forecast.startingCash).toBe(300_000);
    expect(forecast.generatedAt).toBeDefined();
    expect(forecast.summary.totalReceivables).toBe(1_000_000);
    expect(forecast.summary.totalPayables).toBe(500_000);
    expect(forecast.summary.totalLoanRepayments).toBe(200_000);
  });

  it('generates 3 scenarios', async () => {
    const adapter = createMockAdapter({
      '41': 600_000,
      '40': -300_000,
      '16': -100_000,
      '5': 100_000,
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    expect(forecast.optimistic).toBeDefined();
    expect(forecast.central).toBeDefined();
    expect(forecast.pessimistic).toBeDefined();

    expect(forecast.optimistic.label).toBe('optimistic');
    expect(forecast.central.label).toBe('central');
    expect(forecast.pessimistic.label).toBe('pessimistic');
  });

  it('each scenario has the correct number of monthly projections', async () => {
    const adapter = createMockAdapter({
      '41': 120_000,
      '40': -60_000,
      '16': -30_000,
      '5': 50_000,
    });

    for (const horizon of [3, 6, 12] as ForecastHorizon[]) {
      const forecast = await forecastCashFlow(adapter as any, horizon);
      expect(forecast.optimistic.projections).toHaveLength(horizon);
      expect(forecast.central.projections).toHaveLength(horizon);
      expect(forecast.pessimistic.projections).toHaveLength(horizon);
    }
  });

  it('optimistic scenario yields higher cumulative cash than pessimistic', async () => {
    const adapter = createMockAdapter({
      '41': 1_000_000,
      '40': -500_000,
      '16': -100_000,
      '5': 200_000,
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    const optLast = forecast.optimistic.projections[5].cumulativeCash;
    const pesLast = forecast.pessimistic.projections[5].cumulativeCash;

    expect(optLast).toBeGreaterThan(pesLast);
  });

  it('handles zero balances gracefully', async () => {
    const adapter = createMockAdapter({
      '41': 0,
      '40': 0,
      '16': 0,
      '5': 0,
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    expect(forecast.startingCash).toBe(0);
    expect(forecast.summary.totalReceivables).toBe(0);
    expect(forecast.summary.totalPayables).toBe(0);
    expect(forecast.summary.totalLoanRepayments).toBe(0);
    // With zero inflows and outflows, cumulative should remain 0
    forecast.central.projections.forEach((p) => {
      expect(p.cumulativeCash).toBe(0);
    });
  });

  it('handles negative starting cash (overdraft)', async () => {
    const adapter = createMockAdapter({
      '41': 100_000,
      '40': -50_000,
      '16': -10_000,
      '5': -50_000, // Overdraft
    });

    const forecast = await forecastCashFlow(adapter as any, 3);

    expect(forecast.startingCash).toBe(-50_000);
    // First month should start from negative position
    expect(forecast.central.projections[0].cumulativeCash).toBeDefined();
  });

  it('projections have valid month format (YYYY-MM)', async () => {
    const adapter = createMockAdapter({
      '41': 100_000,
      '40': -50_000,
      '16': 0,
      '5': 10_000,
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    forecast.central.projections.forEach((p) => {
      expect(p.month).toMatch(/^\d{4}-\d{2}$/);
      expect(p.year).toBeGreaterThanOrEqual(2024);
      expect(p.monthNumber).toBeGreaterThanOrEqual(1);
      expect(p.monthNumber).toBeLessThanOrEqual(12);
    });
  });

  it('collection rates differ across scenarios', async () => {
    const adapter = createMockAdapter({
      '41': 1_000_000,
      '40': -100_000,
      '16': 0,
      '5': 0,
    });

    const forecast = await forecastCashFlow(adapter as any, 6);

    expect(forecast.optimistic.collectionRate).toBe(0.95);
    expect(forecast.central.collectionRate).toBe(0.85);
    expect(forecast.pessimistic.collectionRate).toBe(0.70);
  });
});
