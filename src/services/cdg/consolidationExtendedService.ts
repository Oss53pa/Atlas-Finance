/**
 * Correction #12 — Consolidation Extension
 * Full consolidation, proportional integration, equity method
 */
import type { DataAdapter } from '@atlas/data';
import Decimal from 'decimal.js';
import {
  determinerMethode,
  calculerInteretsMinoritaires,
  calculerPartGroupe,
  identifierOperationsIntraGroupe,
  eliminerOperationsIntraGroupe,
  type OperationIntraGroupe,
  type LigneConsolidee,
} from './consolidationService';

// ============================================================================
// TYPES
// ============================================================================

export interface SubsidiaryInput {
  companyId: string;
  name: string;
  ownershipPercent: number;
  adapter: DataAdapter;
}

export interface ConsolidatedStatements {
  bilanConsolide: LigneConsolidee[];
  compteResultatConsolide: LigneConsolidee[];
  interetsMinoritaires: {
    bilanPart: Decimal;
    resultatPart: Decimal;
  };
  eliminationsIntraGroupe: {
    count: number;
    totalAmount: Decimal;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function classifyAccount(code: string): 'bilan' | 'resultat' | 'special' {
  const firstChar = code.charAt(0);
  if (['1', '2', '3', '4', '5'].includes(firstChar)) return 'bilan';
  if (['6', '7'].includes(firstChar)) return 'resultat';
  return 'special';
}

async function loadTrialBalance(
  adapter: DataAdapter,
  dateRange?: { start: string; end: string }
): Promise<Map<string, { debit: Decimal; credit: Decimal }>> {
  const tb = await adapter.getTrialBalance(dateRange);
  const map = new Map<string, { debit: Decimal; credit: Decimal }>();

  for (const row of tb) {
    map.set(row.accountCode, {
      debit: new Decimal(row.debitMouvement),
      credit: new Decimal(row.creditMouvement),
    });
  }

  return map;
}

// ============================================================================
// FULL CONSOLIDATION (Intégration Globale)
// ============================================================================

/**
 * Perform full consolidation for a group.
 * 1. Load parent + all subsidiaries trial balances
 * 2. For >50% ownership: add 100% of subsidiary amounts
 * 3. For 20-50%: equity method (only equity + result share)
 * 4. Eliminate intra-group operations
 * 5. Calculate minority interests
 */
export async function performFullConsolidation(
  parentAdapter: DataAdapter,
  subsidiaries: SubsidiaryInput[],
  fiscalYear: { start: string; end: string },
  intraGroupOperations: OperationIntraGroupe[]
): Promise<ConsolidatedStatements> {
  // 1. Load parent balance
  const parentBalance = await loadTrialBalance(parentAdapter, fiscalYear);

  // 2. Consolidated map starts with parent
  const consolidated = new Map<string, { debit: Decimal; credit: Decimal }>();
  for (const [code, bal] of parentBalance) {
    consolidated.set(code, { debit: bal.debit, credit: bal.credit });
  }

  let totalMinoriteBilan = new Decimal(0);
  let totalMinoriteResultat = new Decimal(0);

  // 3. Add each subsidiary
  for (const sub of subsidiaries) {
    const method = determinerMethode(sub.ownershipPercent);
    const subBalance = await loadTrialBalance(sub.adapter, fiscalYear);

    if (method === 'integration_globale') {
      // Add 100% of subsidiary amounts
      for (const [code, bal] of subBalance) {
        const existing = consolidated.get(code) || { debit: new Decimal(0), credit: new Decimal(0) };
        consolidated.set(code, {
          debit: existing.debit.plus(bal.debit),
          credit: existing.credit.plus(bal.credit),
        });
      }

      // Calculate minority interests
      let subEquity = new Decimal(0);
      let subResult = new Decimal(0);

      for (const [code, bal] of subBalance) {
        const net = bal.credit.minus(bal.debit);
        if (code.startsWith('1')) subEquity = subEquity.plus(net); // Class 1 = equity
        if (code.startsWith('7')) subResult = subResult.plus(net); // Class 7 = revenue
        if (code.startsWith('6')) subResult = subResult.minus(bal.debit.minus(bal.credit)); // Class 6 = expenses
      }

      const minorityPct = new Decimal(100 - sub.ownershipPercent).div(100);
      totalMinoriteBilan = totalMinoriteBilan.plus(subEquity.mul(minorityPct));
      totalMinoriteResultat = totalMinoriteResultat.plus(subResult.mul(minorityPct));

    } else if (method === 'integration_proportionnelle') {
      // Add ownership % of each line
      const pct = new Decimal(sub.ownershipPercent).div(100);
      for (const [code, bal] of subBalance) {
        const existing = consolidated.get(code) || { debit: new Decimal(0), credit: new Decimal(0) };
        consolidated.set(code, {
          debit: existing.debit.plus(bal.debit.mul(pct)),
          credit: existing.credit.plus(bal.credit.mul(pct)),
        });
      }

    } else if (method === 'mise_en_equivalence') {
      // Only include share of equity and result
      let subEquity = new Decimal(0);
      let subResult = new Decimal(0);

      for (const [code, bal] of subBalance) {
        const net = bal.credit.minus(bal.debit);
        if (code.startsWith('1')) subEquity = subEquity.plus(net);
        if (code.startsWith('7')) subResult = subResult.plus(net);
        if (code.startsWith('6')) subResult = subResult.minus(bal.debit.minus(bal.credit));
      }

      const pct = new Decimal(sub.ownershipPercent).div(100);
      const shareEquity = subEquity.mul(pct);
      const shareResult = subResult.mul(pct);

      // Add as "Titres mis en équivalence" (account 2961)
      const eqAccount = consolidated.get('2961') || { debit: new Decimal(0), credit: new Decimal(0) };
      consolidated.set('2961', {
        debit: eqAccount.debit.plus(shareEquity),
        credit: eqAccount.credit,
      });

      // Add share of result (account 1200 - Quote-part résultat MEE)
      const resAccount = consolidated.get('1200') || { debit: new Decimal(0), credit: new Decimal(0) };
      consolidated.set('1200', {
        debit: resAccount.debit,
        credit: resAccount.credit.plus(shareResult),
      });
    }
  }

  // 4. Eliminate intra-group operations
  const eliminated = eliminerOperationsIntraGroupe(intraGroupOperations);
  let eliminationTotal = new Decimal(0);

  for (const op of eliminated) {
    if (op.eliminee) {
      eliminationTotal = eliminationTotal.plus(new Decimal(op.montant));

      // Remove from consolidated: reduce both sides
      const debitAccount = consolidated.get(op.compteDebit);
      const creditAccount = consolidated.get(op.compteCredit);
      const amount = new Decimal(op.montant);

      if (debitAccount) {
        debitAccount.debit = debitAccount.debit.minus(amount);
      }
      if (creditAccount) {
        creditAccount.credit = creditAccount.credit.minus(amount);
      }
    }
  }

  // 5. Build output
  const bilanConsolide: LigneConsolidee[] = [];
  const compteResultatConsolide: LigneConsolidee[] = [];

  for (const [code, bal] of consolidated) {
    const type = classifyAccount(code);
    const net = bal.debit.minus(bal.credit);

    const line: LigneConsolidee = {
      compte: code,
      libelle: code, // Would need account name lookup
      montantMere: new Decimal(0).toNumber(),
      montantFiliales: new Decimal(0).toNumber(),
      eliminationIntraGroupe: 0,
      montantConsolide: net.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    };

    if (type === 'bilan') {
      bilanConsolide.push(line);
    } else if (type === 'resultat') {
      compteResultatConsolide.push(line);
    }
  }

  // Sort by account code
  bilanConsolide.sort((a, b) => a.compte.localeCompare(b.compte));
  compteResultatConsolide.sort((a, b) => a.compte.localeCompare(b.compte));

  return {
    bilanConsolide,
    compteResultatConsolide,
    interetsMinoritaires: {
      bilanPart: totalMinoriteBilan.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
      resultatPart: totalMinoriteResultat.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    },
    eliminationsIntraGroupe: {
      count: eliminated.filter(o => o.eliminee).length,
      totalAmount: eliminationTotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP),
    },
  };
}

// ============================================================================
// PROPORTIONAL CONSOLIDATION
// ============================================================================

/**
 * Proportional integration for a single subsidiary.
 * Only includes ownership percentage of each account line.
 */
export async function performProportionalConsolidation(
  parentAdapter: DataAdapter,
  subsidiary: SubsidiaryInput,
  fiscalYear: { start: string; end: string }
): Promise<LigneConsolidee[]> {
  const parentBalance = await loadTrialBalance(parentAdapter, fiscalYear);
  const subBalance = await loadTrialBalance(subsidiary.adapter, fiscalYear);
  const pct = new Decimal(subsidiary.ownershipPercent).div(100);

  const result: LigneConsolidee[] = [];
  const allCodes = new Set([...parentBalance.keys(), ...subBalance.keys()]);

  for (const code of allCodes) {
    const parent = parentBalance.get(code) || { debit: new Decimal(0), credit: new Decimal(0) };
    const sub = subBalance.get(code) || { debit: new Decimal(0), credit: new Decimal(0) };

    const parentNet = parent.debit.minus(parent.credit);
    const subNet = sub.debit.minus(sub.credit).mul(pct);

    result.push({
      compte: code,
      libelle: code,
      montantMere: parentNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      montantFiliales: subNet.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
      eliminationIntraGroupe: 0,
      montantConsolide: parentNet.plus(subNet).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
    });
  }

  return result.sort((a, b) => a.compte.localeCompare(b.compte));
}

// ============================================================================
// EQUITY METHOD
// ============================================================================

/**
 * Equity method: replace investment account with share of subsidiary equity.
 */
export async function performEquityMethodConsolidation(
  parentAdapter: DataAdapter,
  subsidiary: {
    companyId: string;
    ownershipPercent: number;
    investmentAccountCode: string;
    adapter: DataAdapter;
  },
  fiscalYear: { start: string; end: string }
): Promise<{
  adjustmentEntries: Array<{
    accountCode: string;
    label: string;
    debit: Decimal;
    credit: Decimal;
  }>;
  shareOfResult: Decimal;
}> {
  const subBalance = await loadTrialBalance(subsidiary.adapter, fiscalYear);
  const pct = new Decimal(subsidiary.ownershipPercent).div(100);

  // Calculate subsidiary equity (class 1 accounts)
  let subEquity = new Decimal(0);
  for (const [code, bal] of subBalance) {
    if (code.startsWith('1')) {
      subEquity = subEquity.plus(bal.credit.minus(bal.debit));
    }
  }

  // Calculate subsidiary net result (class 7 - class 6)
  let subResult = new Decimal(0);
  for (const [code, bal] of subBalance) {
    if (code.startsWith('7')) {
      subResult = subResult.plus(bal.credit.minus(bal.debit));
    } else if (code.startsWith('6')) {
      subResult = subResult.minus(bal.debit.minus(bal.credit));
    }
  }

  const shareEquity = subEquity.mul(pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const shareResult = subResult.mul(pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // Get current investment book value
  const parentBalance = await loadTrialBalance(parentAdapter, fiscalYear);
  const investmentBal = parentBalance.get(subsidiary.investmentAccountCode) || {
    debit: new Decimal(0),
    credit: new Decimal(0),
  };
  const investmentBookValue = investmentBal.debit.minus(investmentBal.credit);

  const adjustmentEntries: Array<{
    accountCode: string;
    label: string;
    debit: Decimal;
    credit: Decimal;
  }> = [];

  // Remove investment at cost
  adjustmentEntries.push({
    accountCode: subsidiary.investmentAccountCode,
    label: 'Annulation titres de participation',
    debit: new Decimal(0),
    credit: investmentBookValue,
  });

  // Replace with equity method value
  adjustmentEntries.push({
    accountCode: '2961',
    label: 'Titres mis en équivalence',
    debit: shareEquity,
    credit: new Decimal(0),
  });

  // Recognize share of result
  if (shareResult.gt(0)) {
    adjustmentEntries.push({
      accountCode: '1200',
      label: 'Quote-part dans le résultat de la MEE',
      debit: new Decimal(0),
      credit: shareResult,
    });
  } else if (shareResult.lt(0)) {
    adjustmentEntries.push({
      accountCode: '1200',
      label: 'Quote-part dans le résultat de la MEE (perte)',
      debit: shareResult.abs(),
      credit: new Decimal(0),
    });
  }

  // Balance the adjustment (difference = goodwill or discount)
  const totalDebit = adjustmentEntries.reduce((s, e) => s.plus(e.debit), new Decimal(0));
  const totalCredit = adjustmentEntries.reduce((s, e) => s.plus(e.credit), new Decimal(0));
  const diff = totalDebit.minus(totalCredit);

  if (!diff.isZero()) {
    if (diff.gt(0)) {
      // Credit side short → discount on acquisition
      adjustmentEntries.push({
        accountCode: '1071',
        label: 'Écart de consolidation (badwill)',
        debit: new Decimal(0),
        credit: diff,
      });
    } else {
      // Debit side short → goodwill
      adjustmentEntries.push({
        accountCode: '2071',
        label: 'Écart d\'acquisition (goodwill)',
        debit: diff.abs(),
        credit: new Decimal(0),
      });
    }
  }

  return {
    adjustmentEntries,
    shareOfResult: shareResult,
  };
}
