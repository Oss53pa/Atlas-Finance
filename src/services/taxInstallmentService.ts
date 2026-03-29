/**
 * Correction #6 — Tax Installments: IS quarterly payments, property tax, deficit carry-forward
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface FiscalDeficit {
  fiscalYear: string;
  amount: Decimal;
  remainingAmount: Decimal;
  expiryYear: string;
}

// ============================================================================
// ACOMPTES IS
// ============================================================================

/**
 * Calculate quarterly IS installment (acompte trimestriel).
 * = max(IS N-1, minimum forfaitaire) / 4
 */
export function calculateQuarterlyInstallment(
  previousYearIS: Decimal,
  minimumFlat: Decimal
): Decimal {
  const base = Decimal.max(previousYearIS, minimumFlat);
  return base.div(4).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Record a quarterly IS installment payment.
 * D: 4492 Acomptes IS versés / C: 521 Banque
 */
export async function recordInstallment(
  adapter: DataAdapter,
  companyId: string,
  quarter: 1 | 2 | 3 | 4,
  amount: Decimal,
  bankAccountCode: string,
  fiscalYear: string,
  paymentDate: string
): Promise<string> {
  const label = `Acompte IS T${quarter} ${fiscalYear}`;

  const entry = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: paymentDate,
    reference: `IS-T${quarter}-${fiscalYear}`,
    label,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: '4492',
        accountName: 'Acomptes IS versés',
        label,
        debit: amount.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: bankAccountCode,
        accountName: 'Banque',
        label,
        debit: 0,
        credit: amount.toNumber(),
      },
    ],
    totalDebit: amount.toNumber(),
    totalCredit: amount.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  return entry.id;
}

// ============================================================================
// CONTRIBUTION FONCIÈRE
// ============================================================================

/**
 * Calculate property tax based on rental value and rate.
 */
export function calculatePropertyTax(
  rentalValue: Decimal,
  rate: Decimal
): Decimal {
  return rentalValue.mul(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Record property tax payment.
 * D: 642 Contribution foncière / C: 521 Banque
 */
export async function recordPropertyTax(
  adapter: DataAdapter,
  companyId: string,
  amount: Decimal,
  bankAccountCode: string,
  year: string,
  paymentDate: string
): Promise<string> {
  const label = `Contribution foncière ${year}`;

  const entry = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: paymentDate,
    reference: `CF-${year}`,
    label,
    status: 'validated',
    lines: [
      {
        id: crypto.randomUUID(),
        accountCode: '642',
        accountName: 'Contribution foncière des propriétés bâties',
        label,
        debit: amount.toNumber(),
        credit: 0,
      },
      {
        id: crypto.randomUUID(),
        accountCode: bankAccountCode,
        accountName: 'Banque',
        label,
        debit: 0,
        credit: amount.toNumber(),
      },
    ],
    totalDebit: amount.toNumber(),
    totalCredit: amount.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  return entry.id;
}

// ============================================================================
// REPORT DÉFICIT FISCAL
// ============================================================================

/**
 * Get carry-forward deficits from last 3 fiscal years (CI law).
 * Stored in settings as JSON.
 */
export async function getCarryForwardDeficits(
  adapter: DataAdapter,
  companyId: string
): Promise<FiscalDeficit[]> {
  const settings = await adapter.getAll<{ key: string; value: string }>('settings', {
    where: { key: `fiscal_deficits_${companyId}` },
  });

  if (settings.length === 0) return [];

  try {
    const deficits = JSON.parse(settings[0].value) as Array<{
      fiscalYear: string;
      amount: string;
      remainingAmount: string;
      expiryYear: string;
    }>;

    return deficits.map(d => ({
      fiscalYear: d.fiscalYear,
      amount: new Decimal(d.amount),
      remainingAmount: new Decimal(d.remainingAmount),
      expiryYear: d.expiryYear,
    }));
  } catch {
    return [];
  }
}

/**
 * Apply deficit carry-forward to reduce current year's taxable profit.
 * Oldest deficits are applied first.
 * Returns the remaining taxable profit after deductions.
 */
export function applyDeficitCarryForward(
  currentYearProfit: Decimal,
  deficits: FiscalDeficit[],
  currentYear: string
): { remainingProfit: Decimal; updatedDeficits: FiscalDeficit[] } {
  let remaining = currentYearProfit;
  const updated: FiscalDeficit[] = [];

  // Sort by fiscal year (oldest first)
  const sorted = [...deficits]
    .filter(d => d.remainingAmount.gt(0) && d.expiryYear >= currentYear)
    .sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear));

  for (const deficit of sorted) {
    if (remaining.lte(0)) {
      updated.push(deficit);
      continue;
    }

    const deduction = Decimal.min(remaining, deficit.remainingAmount);
    remaining = remaining.minus(deduction);

    updated.push({
      ...deficit,
      remainingAmount: deficit.remainingAmount.minus(deduction),
    });
  }

  // Add expired/zero deficits that were filtered out
  for (const d of deficits) {
    if (!sorted.find(s => s.fiscalYear === d.fiscalYear)) {
      updated.push(d);
    }
  }

  return {
    remainingProfit: Decimal.max(remaining, new Decimal(0)),
    updatedDeficits: updated,
  };
}

/**
 * Save deficit to carry forward at year-end closure.
 */
export async function saveDeficit(
  adapter: DataAdapter,
  companyId: string,
  fiscalYear: string,
  deficitAmount: Decimal
): Promise<void> {
  const currentDeficits = await getCarryForwardDeficits(adapter, companyId);
  const year = parseInt(fiscalYear, 10);
  const expiryYear = String(year + 3); // 3-year limit in Côte d'Ivoire

  const newDeficit: FiscalDeficit = {
    fiscalYear,
    amount: deficitAmount,
    remainingAmount: deficitAmount,
    expiryYear,
  };

  const allDeficits = [...currentDeficits.filter(d => d.fiscalYear !== fiscalYear), newDeficit];

  const key = `fiscal_deficits_${companyId}`;
  const existing = await adapter.getAll<{ key: string }>('settings', { where: { key } });

  const serialized = JSON.stringify(allDeficits.map(d => ({
    fiscalYear: d.fiscalYear,
    amount: d.amount.toString(),
    remainingAmount: d.remainingAmount.toString(),
    expiryYear: d.expiryYear,
  })));

  if (existing.length > 0) {
    await adapter.update('settings', key, { value: serialized, updatedAt: new Date().toISOString() });
  } else {
    await adapter.create('settings', { key, value: serialized, updatedAt: new Date().toISOString() });
  }
}
