/**
 * Correction #5 — Foreign Currency Payment Service
 * Handles exchange gains/losses at settlement + conversion difference reversal
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ForeignCurrencyPaymentParams {
  invoiceId: string;
  paymentAmountForeign: Decimal;
  paymentCurrency: string;
  spotRate: Decimal;
  historicalRate: Decimal;
  paymentDate: string;
  bankAccountCode: string;
  thirdPartyCode: string;
  thirdPartyName: string;
  isSupplier: boolean;
}

export interface ForeignCurrencyPaymentResult {
  journalEntryId: string;
  exchangeGainLoss: Decimal;
  isGain: boolean;
}

// ============================================================================
// PAYMENT WITH EXCHANGE GAIN/LOSS
// ============================================================================

/**
 * Record a foreign currency payment and compute exchange gain or loss.
 *
 * For supplier payment:
 *   D: 401 (historical XAF) / C: 521 (spot XAF)
 *   If loss (spot > historical): D: 676 Pertes de change
 *   If gain (spot < historical): C: 776 Gains de change
 *
 * For customer receipt:
 *   D: 521 (spot XAF) / C: 411 (historical XAF)
 *   If gain (spot > historical): C: 776
 *   If loss (spot < historical): D: 676
 */
export async function recordForeignCurrencyPayment(
  adapter: DataAdapter,
  params: ForeignCurrencyPaymentParams
): Promise<ForeignCurrencyPaymentResult> {
  const {
    paymentAmountForeign,
    spotRate,
    historicalRate,
    paymentDate,
    bankAccountCode,
    thirdPartyCode,
    thirdPartyName,
    isSupplier,
  } = params;

  // Convert amounts
  const spotXAF = paymentAmountForeign.mul(spotRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const historicalXAF = paymentAmountForeign.mul(historicalRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const difference = spotXAF.minus(historicalXAF); // positive = spot > historical

  const lines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    thirdPartyCode?: string;
    thirdPartyName?: string;
    label: string;
    debit: number;
    credit: number;
  }> = [];

  const label = `Règlement en devise ${params.paymentCurrency} - ${thirdPartyName}`;

  if (isSupplier) {
    // Supplier payment: we pay the supplier
    // D: 401 (historical amount — what we owed)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: thirdPartyCode.startsWith('401') ? thirdPartyCode : '401',
      accountName: `Fournisseur ${thirdPartyName}`,
      thirdPartyCode,
      thirdPartyName,
      label,
      debit: historicalXAF.toNumber(),
      credit: 0,
    });

    // C: 521 (spot amount — what we actually pay)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: bankAccountCode,
      accountName: 'Banque',
      label,
      debit: 0,
      credit: spotXAF.toNumber(),
    });

    if (difference.gt(0)) {
      // Loss: spot > historical → we pay more than booked
      // D: 676 Pertes de change
      lines.push({
        id: crypto.randomUUID(),
        accountCode: '676',
        accountName: 'Pertes de change',
        label: `Perte de change sur règlement ${thirdPartyName}`,
        debit: difference.abs().toNumber(),
        credit: 0,
      });
    } else if (difference.lt(0)) {
      // Gain: spot < historical → we pay less than booked
      // C: 776 Gains de change
      lines.push({
        id: crypto.randomUUID(),
        accountCode: '776',
        accountName: 'Gains de change',
        label: `Gain de change sur règlement ${thirdPartyName}`,
        debit: 0,
        credit: difference.abs().toNumber(),
      });
    }
  } else {
    // Customer receipt: we receive from customer
    // D: 521 (spot amount — what we actually receive)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: bankAccountCode,
      accountName: 'Banque',
      label,
      debit: spotXAF.toNumber(),
      credit: 0,
    });

    // C: 411 (historical amount — what was owed to us)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: thirdPartyCode.startsWith('411') ? thirdPartyCode : '411',
      accountName: `Client ${thirdPartyName}`,
      thirdPartyCode,
      thirdPartyName,
      label,
      debit: 0,
      credit: historicalXAF.toNumber(),
    });

    if (difference.gt(0)) {
      // Gain: spot > historical → we receive more than booked
      // C: 776 Gains de change
      lines.push({
        id: crypto.randomUUID(),
        accountCode: '776',
        accountName: 'Gains de change',
        label: `Gain de change sur encaissement ${thirdPartyName}`,
        debit: 0,
        credit: difference.abs().toNumber(),
      });
    } else if (difference.lt(0)) {
      // Loss: spot < historical → we receive less than booked
      // D: 676 Pertes de change
      lines.push({
        id: crypto.randomUUID(),
        accountCode: '676',
        accountName: 'Pertes de change',
        label: `Perte de change sur encaissement ${thirdPartyName}`,
        debit: difference.abs().toNumber(),
        credit: 0,
      });
    }
  }

  // Verify D = C
  const totalDebit = lines.reduce((sum, l) => sum.plus(new Decimal(l.debit)), new Decimal(0));
  const totalCredit = lines.reduce((sum, l) => sum.plus(new Decimal(l.credit)), new Decimal(0));

  if (!totalDebit.eq(totalCredit)) {
    throw new Error(`Écriture déséquilibrée: D=${totalDebit} C=${totalCredit}`);
  }

  const entry = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'BQ',
    date: paymentDate,
    reference: `FX-${params.invoiceId.substring(0, 8)}`,
    label,
    status: 'validated',
    lines,
    totalDebit: totalDebit.toNumber(),
    totalCredit: totalCredit.toNumber(),
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  return {
    journalEntryId: entry.id,
    exchangeGainLoss: difference.abs(),
    isGain: isSupplier ? difference.lt(0) : difference.gt(0),
  };
}

// ============================================================================
// EXTOURNE DES ECARTS DE CONVERSION
// ============================================================================

/**
 * Reverse conversion differences (476/477) at start of new fiscal year.
 * This implements the SYSCOHADA requirement to extourne écarts de conversion
 * at January 1st of N+1.
 */
export async function extourneEcartsConversion(
  adapter: DataAdapter,
  companyId: string,
  dateExtourne: string
): Promise<string[]> {
  // Find all journal entries with conversion accounts
  const allEntries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  const conversionEntries: Array<{
    entryId: string;
    lines: Array<{ accountCode: string; accountName: string; label: string; debit: number; credit: number }>;
  }> = [];

  for (const entry of allEntries) {
    const entryData = entry as {
      id: string;
      date: string;
      lines: Array<{ accountCode: string; accountName: string; label: string; debit: number; credit: number }>;
    };

    // Only reverse entries from the previous year (before the extourne date)
    if (entryData.date >= dateExtourne) continue;

    const conversionLines = (entryData.lines || []).filter(
      l => l.accountCode.startsWith('476') || l.accountCode.startsWith('477')
    );

    if (conversionLines.length > 0) {
      conversionEntries.push({ entryId: entryData.id, lines: entryData.lines });
    }
  }

  const reversalIds: string[] = [];

  for (const ce of conversionEntries) {
    // Create reversal entry (swap debits and credits)
    const reversalLines = ce.lines.map(l => ({
      id: crypto.randomUUID(),
      accountCode: l.accountCode,
      accountName: l.accountName,
      label: `Extourne écarts de conversion - ${l.label}`,
      debit: l.credit,
      credit: l.debit,
    }));

    const totalDebit = reversalLines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = reversalLines.reduce((s, l) => s + l.credit, 0);

    const reversal = await adapter.saveJournalEntry({
      entryNumber: '',
      journal: 'OD',
      date: dateExtourne,
      reference: `EXT-${ce.entryId.substring(0, 8)}`,
      label: 'Extourne écarts de conversion N-1',
      status: 'validated',
      lines: reversalLines,
      totalDebit,
      totalCredit,
      reversalOf: ce.entryId,
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    });

    reversalIds.push(reversal.id);
  }

  return reversalIds;
}
