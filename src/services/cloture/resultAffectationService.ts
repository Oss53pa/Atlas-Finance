// @ts-nocheck
/**
 * Result Affectation Service — Legal distribution of annual results.
 * Handles profit/loss allocation to reserves, dividends, and carry-forward
 * accounts per SYSCOHADA / OHADA Uniform Act rules.
 *
 * OHADA rules applied:
 * - Legal reserve: minimum 5% of net profit
 * - Legal reserve cap: 20% of share capital (capital social)
 * - Full result must be allocated (ecart = 0)
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';
import { logAudit } from '../../lib/db';
import type { DBJournalLine } from '../../lib/db';
import { safeAddEntry } from '../entryGuard';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AffectationResultat {
  montantResultat: number;
  reserveLegale: number;         // Account 111
  reserveStatutaire: number;     // Account 112
  reserveFacultative: number;    // Account 118
  reportANouveau: number;        // Account 120 (credit) or 129 (debit)
  dividendes: number;            // Account 465
}

export interface AffectationSimulation extends AffectationResultat {
  isValid: boolean;
  ecart: number;
  reserveLegaleMinimale: number;
  reserveLegalePourcentage: number;
  capitalSocial: number;
  reserveLegaleActuelle: number;
  reserveLegalePlafond: number;
  warnings: string[];
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Compute net result for a fiscal year: sum of class 7 credits minus class 6 debits.
 */
async function computeNetResult(adapter: DataAdapter, fiscalYearId: string): Promise<number> {
  const fiscalYear = await adapter.getById('fiscalYears', fiscalYearId);
  if (!fiscalYear) throw new Error(`Exercice ${fiscalYearId} introuvable`);

  const allEntries = await adapter.getAll('journalEntries');
  const entries = allEntries.filter(
    (e: any) => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate
  );

  let totalClass7Credit = money(0);
  let totalClass6Debit = money(0);

  for (const entry of entries) {
    for (const line of (entry as any).lines as DBJournalLine[]) {
      const classCode = line.accountCode.charAt(0);
      if (classCode === '7') {
        totalClass7Credit = totalClass7Credit.add(money(line.credit)).subtract(money(line.debit));
      } else if (classCode === '6') {
        totalClass6Debit = totalClass6Debit.add(money(line.debit)).subtract(money(line.credit));
      }
    }
  }

  return totalClass7Credit.subtract(totalClass6Debit).round(2).toNumber();
}

/**
 * Get the total capital social (accounts starting with '101').
 */
async function getCapitalSocial(adapter: DataAdapter): Promise<number> {
  const accounts = await adapter.getAll('accounts');
  const capitalAccounts = (accounts as any[]).filter(
    (a) => a.code.startsWith('101')
  );

  if (capitalAccounts.length === 0) return 0;

  const allEntries = await adapter.getAll('journalEntries');
  let total = money(0);

  for (const entry of allEntries) {
    for (const line of (entry as any).lines as DBJournalLine[]) {
      if (capitalAccounts.some((a: any) => a.code === line.accountCode)) {
        // Capital accounts are normally credit-balance
        total = total.add(money(line.credit)).subtract(money(line.debit));
      }
    }
  }

  return total.round(2).toNumber();
}

/**
 * Get the current legal reserve balance (account '111').
 */
async function getReserveLegaleActuelle(adapter: DataAdapter): Promise<number> {
  const allEntries = await adapter.getAll('journalEntries');
  let total = money(0);

  for (const entry of allEntries) {
    for (const line of (entry as any).lines as DBJournalLine[]) {
      if (line.accountCode === '111') {
        // Reserve is credit-balance
        total = total.add(money(line.credit)).subtract(money(line.debit));
      }
    }
  }

  return total.round(2).toNumber();
}

// ============================================================================
// SIMULATION
// ============================================================================

/**
 * Simulate result allocation with OHADA rule checks.
 *
 * Computes the net result, capital social, current legal reserve, then
 * validates the proposed allocation against legal requirements.
 */
export async function simulerAffectation(
  adapter: DataAdapter,
  fiscalYearId: string,
  input: Partial<AffectationResultat>
): Promise<AffectationSimulation> {
  // 1. Compute actual figures from accounting data
  const montantResultat = await computeNetResult(adapter, fiscalYearId);
  const capitalSocial = await getCapitalSocial(adapter);
  const reserveLegaleActuelle = await getReserveLegaleActuelle(adapter);

  // 2. OHADA legal reserve rules
  const reserveLegalePlafond = money(capitalSocial).multiply(0.20).round(2).toNumber();
  const reserveLegalePourcentage = 5; // 5% minimum per OHADA
  const reserveLegaleMinimale = montantResultat > 0
    ? Math.min(
        money(montantResultat).multiply(0.05).round(2).toNumber(),
        Math.max(0, money(reserveLegalePlafond).subtract(money(reserveLegaleActuelle)).round(2).toNumber())
      )
    : 0;

  // 3. Build allocation from input (defaults to 0)
  const reserveLegale = input.reserveLegale ?? 0;
  const reserveStatutaire = input.reserveStatutaire ?? 0;
  const reserveFacultative = input.reserveFacultative ?? 0;
  const reportANouveau = input.reportANouveau ?? 0;
  const dividendes = input.dividendes ?? 0;

  // 4. Compute total allocated
  const totalAlloue = money(reserveLegale)
    .add(money(reserveStatutaire))
    .add(money(reserveFacultative))
    .add(money(reportANouveau))
    .add(money(dividendes))
    .round(2)
    .toNumber();

  const ecart = money(montantResultat).subtract(money(totalAlloue)).round(2).toNumber();

  // 5. Warnings
  const warnings: string[] = [];

  if (montantResultat > 0 && reserveLegaleActuelle < reserveLegalePlafond) {
    if (reserveLegale < reserveLegaleMinimale) {
      warnings.push(
        `La dotation a la reserve legale (${reserveLegale}) est inferieure au minimum obligatoire (${reserveLegaleMinimale}). ` +
        `OHADA impose au moins 5% du resultat net.`
      );
    }
  }

  if (dividendes > 0 && reserveLegale < reserveLegaleMinimale) {
    warnings.push(
      `Distribution de dividendes (${dividendes}) alors que la reserve legale n'atteint pas le minimum obligatoire. ` +
      `La dotation a la reserve legale est prioritaire sur les dividendes.`
    );
  }

  if (Math.abs(ecart) > 0.01) {
    warnings.push(
      `Le total des affectations (${totalAlloue}) ne correspond pas au resultat net (${montantResultat}). ` +
      `Ecart: ${ecart}.`
    );
  }

  const isValid = Math.abs(ecart) <= 1 && warnings.filter(w => w.includes('ne correspond pas')).length === 0;

  return {
    montantResultat,
    reserveLegale,
    reserveStatutaire,
    reserveFacultative,
    reportANouveau,
    dividendes,
    isValid,
    ecart,
    reserveLegaleMinimale,
    reserveLegalePourcentage,
    capitalSocial,
    reserveLegaleActuelle,
    reserveLegalePlafond,
    warnings,
  };
}

// ============================================================================
// POSTING
// ============================================================================

/**
 * Post the result allocation as a validated journal entry.
 *
 * Runs simulation first; throws if not valid (ecart > 1).
 * Creates an OD journal entry debiting the result account and crediting
 * reserves, dividends, and/or carry-forward accounts.
 */
export async function posterAffectation(
  adapter: DataAdapter,
  fiscalYearId: string,
  affectation: AffectationResultat
): Promise<void> {
  // 1. Run simulation to validate
  const simulation = await simulerAffectation(adapter, fiscalYearId, affectation);

  if (!simulation.isValid || Math.abs(simulation.ecart) > 1) {
    throw new Error(
      `Affectation invalide (ecart: ${simulation.ecart}). ` +
      `Warnings: ${simulation.warnings.join(' | ')}`
    );
  }

  const { montantResultat } = affectation;
  const isBenefice = montantResultat >= 0;
  const now = new Date().toISOString();
  const dateAffectation = now.split('T')[0];

  // 2. Build journal lines
  const lines: DBJournalLine[] = [];

  // Debit: result account (131 for profit, 139 for loss)
  lines.push({
    id: crypto.randomUUID(),
    accountCode: isBenefice ? '131' : '139',
    accountName: isBenefice ? 'Resultat net - Benefice' : 'Resultat net - Perte',
    label: "Affectation du resultat de l'exercice",
    debit: Math.abs(montantResultat),
    credit: 0,
  });

  // Credits: allocations
  if (affectation.reserveLegale > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '111',
      accountName: 'Reserve legale',
      label: 'Dotation reserve legale',
      debit: 0,
      credit: affectation.reserveLegale,
    });
  }

  if (affectation.reserveStatutaire > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '112',
      accountName: 'Reserves statutaires',
      label: 'Dotation reserves statutaires',
      debit: 0,
      credit: affectation.reserveStatutaire,
    });
  }

  if (affectation.reserveFacultative > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '118',
      accountName: 'Reserves facultatives',
      label: 'Dotation reserves facultatives',
      debit: 0,
      credit: affectation.reserveFacultative,
    });
  }

  if (affectation.reportANouveau > 0) {
    // Credit carry-forward (account 120)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '120',
      accountName: 'Report a nouveau crediteur',
      label: 'Report a nouveau',
      debit: 0,
      credit: affectation.reportANouveau,
    });
  } else if (affectation.reportANouveau < 0) {
    // Debit carry-forward for loss (account 129)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '129',
      accountName: 'Report a nouveau debiteur',
      label: 'Report a nouveau debiteur',
      debit: Math.abs(affectation.reportANouveau),
      credit: 0,
    });
  }

  if (affectation.dividendes > 0) {
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '465',
      accountName: 'Dividendes a payer',
      label: 'Dividendes distribues',
      debit: 0,
      credit: affectation.dividendes,
    });
  }

  // 3. Create journal entry
  const entryNumber = `AFF-${dateAffectation.replace(/-/g, '')}-001`;
  const entryId = crypto.randomUUID();

  await safeAddEntry(adapter, {
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: dateAffectation,
    reference: `AFFECTATION-${fiscalYearId}`,
    label: `Affectation du resultat exercice ${fiscalYearId}`,
    status: 'validated',
    lines,
    createdAt: now,
    createdBy: 'system',
  }, { skipSyncValidation: true });

  // 4. Audit log
  await logAudit('AFFECTATION_RESULTAT', 'journal_entry', entryId, JSON.stringify({
    fiscalYearId,
    affectation,
    simulation: {
      ecart: simulation.ecart,
      warnings: simulation.warnings,
    },
  }));
}
