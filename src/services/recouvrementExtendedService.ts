/**
 * Correction #9 — Extended Recovery: Bad debt write-off with VAT, late interest, risk scoring
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BadDebtInvoice {
  id: string;
  amountHt: Decimal;
  vatAmount: Decimal;
  amountTtc: Decimal;
  provisionAmount?: Decimal;
}

export interface LateInterestLine {
  invoiceRef: string;
  amount: Decimal;
  daysLate: number;
  interest: Decimal;
}

export interface ClientRiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
}

// ============================================================================
// BAD DEBT WRITE-OFF
// ============================================================================

/**
 * Write off bad debts with proper VAT regularization.
 * For each invoice:
 *   D: 651 Pertes créances irrécouvrables (HT)
 *   D: 4431 TVA collectée annulation (VAT)
 *   C: 416 Créances douteuses (TTC)
 * If provision exists:
 *   D: 491 Provisions dépréciation créances
 *   C: 7594 Reprises provisions créances
 */
export async function writeOffBadDebt(
  adapter: DataAdapter,
  companyId: string,
  clientId: string,
  clientName: string,
  invoices: BadDebtInvoice[]
): Promise<string> {
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

  let totalHt = new Decimal(0);
  let totalVat = new Decimal(0);
  let totalTtc = new Decimal(0);
  let totalProvisions = new Decimal(0);

  for (const inv of invoices) {
    totalHt = totalHt.plus(inv.amountHt);
    totalVat = totalVat.plus(inv.vatAmount);
    totalTtc = totalTtc.plus(inv.amountTtc);
    if (inv.provisionAmount) {
      totalProvisions = totalProvisions.plus(inv.provisionAmount);
    }
  }

  // D: 651 Pertes créances irrécouvrables (HT)
  lines.push({
    id: crypto.randomUUID(),
    accountCode: '651',
    accountName: 'Pertes sur créances irrécouvrables',
    label: `Perte créance irrécouvrable ${clientName}`,
    debit: totalHt.toNumber(),
    credit: 0,
  });

  // D: 4431 TVA collectée — annulation
  if (totalVat.gt(0)) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '4431',
      accountName: 'TVA collectée 18% — annulation',
      label: `Régularisation TVA créance irrécouvrable ${clientName}`,
      debit: totalVat.toNumber(),
      credit: 0,
    });
  }

  // C: 416 Créances douteuses (TTC)
  lines.push({
    id: crypto.randomUUID(),
    accountCode: '416',
    accountName: 'Créances douteuses',
    thirdPartyCode: clientId,
    thirdPartyName: clientName,
    label: `Créance irrécouvrable ${clientName}`,
    debit: 0,
    credit: totalTtc.toNumber(),
  });

  // Reprise provisions if they exist
  if (totalProvisions.gt(0)) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '491',
      accountName: 'Provisions pour dépréciation des créances',
      label: `Reprise provision créance ${clientName}`,
      debit: totalProvisions.toNumber(),
      credit: 0,
    });
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '7594',
      accountName: 'Reprises provisions dépréciation créances',
      label: `Reprise provision créance ${clientName}`,
      debit: 0,
      credit: totalProvisions.toNumber(),
    });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const entry = await adapter.saveJournalEntry({
    entryNumber: '',
    journal: 'OD',
    date: new Date().toISOString().slice(0, 10),
    reference: `BAD-${clientId.substring(0, 8)}`,
    label: `Créance irrécouvrable: ${clientName}`,
    status: 'validated',
    lines,
    totalDebit,
    totalCredit,
    updatedAt: new Date().toISOString(),
    createdBy: 'system',
  });

  return entry.id;
}

// ============================================================================
// LATE INTEREST CALCULATION
// ============================================================================

/**
 * Calculate late payment interest for a client.
 * Interest = amount × annual rate × days late / 360
 */
export async function calculateLateInterest(
  adapter: DataAdapter,
  companyId: string,
  clientId: string,
  asOfDate: string,
  contractualRate: Decimal
): Promise<{ total: Decimal; details: LateInterestLine[] }> {
  // Get unpaid invoices from journal entries (411 debit balance lines)
  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  // Build client balance per entry
  const unpaidEntries: Array<{
    ref: string;
    date: string;
    amount: Decimal;
  }> = [];

  for (const entry of entries) {
    const entryData = entry as {
      date: string;
      reference: string;
      lines: Array<{ accountCode: string; thirdPartyCode?: string; debit: number; credit: number }>;
    };

    for (const line of entryData.lines || []) {
      if (line.accountCode.startsWith('411') && line.thirdPartyCode === clientId && line.debit > 0) {
        unpaidEntries.push({
          ref: entryData.reference || entryData.date,
          date: entryData.date,
          amount: new Decimal(line.debit),
        });
      }
    }
  }

  const asOf = new Date(asOfDate);
  const details: LateInterestLine[] = [];
  let total = new Decimal(0);

  for (const item of unpaidEntries) {
    const dueDate = new Date(item.date);
    const daysLate = Math.max(0, Math.floor((asOf.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysLate > 0) {
      // Interest = amount × rate × days / 360
      const interest = item.amount
        .mul(contractualRate)
        .mul(daysLate)
        .div(360)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

      details.push({
        invoiceRef: item.ref,
        amount: item.amount,
        daysLate,
        interest,
      });

      total = total.plus(interest);
    }
  }

  return { total: total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP), details };
}

// ============================================================================
// CLIENT RISK SCORING
// ============================================================================

/**
 * Calculate risk score for a client (0-100).
 * Based on: payment history, outstanding amount, average days late
 */
export async function calculateClientRiskScore(
  adapter: DataAdapter,
  companyId: string,
  clientId: string
): Promise<ClientRiskScore> {
  const entries = await adapter.getJournalEntries({
    where: { status: 'validated' },
  });

  let totalInvoiced = new Decimal(0);
  let totalPaid = new Decimal(0);
  let totalOutstanding = new Decimal(0);
  let invoiceCount = 0;
  let latePaymentCount = 0;
  const paymentDelays: number[] = [];

  for (const entry of entries) {
    const entryData = entry as {
      date: string;
      lines: Array<{ accountCode: string; thirdPartyCode?: string; debit: number; credit: number }>;
    };

    for (const line of entryData.lines || []) {
      if (line.thirdPartyCode === clientId) {
        if (line.accountCode.startsWith('411') && line.debit > 0) {
          totalInvoiced = totalInvoiced.plus(new Decimal(line.debit));
          invoiceCount++;
        }
        if (line.accountCode.startsWith('411') && line.credit > 0) {
          totalPaid = totalPaid.plus(new Decimal(line.credit));
        }
      }
    }
  }

  totalOutstanding = totalInvoiced.minus(totalPaid);

  const factors: string[] = [];
  let score = 0;

  // Factor 1: Outstanding ratio (0-30 points)
  if (totalInvoiced.gt(0)) {
    const outstandingRatio = totalOutstanding.div(totalInvoiced).toNumber();
    const outstandingScore = Math.min(30, Math.round(outstandingRatio * 60));
    score += outstandingScore;
    if (outstandingRatio > 0.5) factors.push(`Encours élevé (${Math.round(outstandingRatio * 100)}% impayé)`);
  }

  // Factor 2: Number of invoices unpaid (0-30 points)
  const unpaidRatio = invoiceCount > 0 ? latePaymentCount / invoiceCount : 0;
  score += Math.min(30, Math.round(unpaidRatio * 60));
  if (unpaidRatio > 0.3) factors.push(`${Math.round(unpaidRatio * 100)}% de factures en retard`);

  // Factor 3: Amount outstanding (0-20 points)
  if (totalOutstanding.gt(10000000)) {
    score += 20;
    factors.push('Encours > 10M FCFA');
  } else if (totalOutstanding.gt(5000000)) {
    score += 15;
    factors.push('Encours > 5M FCFA');
  } else if (totalOutstanding.gt(1000000)) {
    score += 10;
    factors.push('Encours > 1M FCFA');
  }

  // Factor 4: Average payment delay (0-20 points)
  if (paymentDelays.length > 0) {
    const avgDelay = paymentDelays.reduce((a, b) => a + b, 0) / paymentDelays.length;
    score += Math.min(20, Math.round(avgDelay / 3));
    if (avgDelay > 60) factors.push(`Délai moyen de paiement: ${Math.round(avgDelay)} jours`);
  }

  // Clamp score 0-100
  score = Math.max(0, Math.min(100, score));

  let level: ClientRiskScore['level'];
  if (score <= 25) level = 'low';
  else if (score <= 50) level = 'medium';
  else if (score <= 75) level = 'high';
  else level = 'critical';

  if (factors.length === 0) factors.push('Aucun facteur de risque identifié');

  return { score, level, factors };
}
