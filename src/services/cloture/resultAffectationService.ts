
/**
 * Result Affectation Service — Legal distribution of annual results.
 * Handles profit/loss allocation to reserves, dividends, and carry-forward
 * accounts per SYSCOHADA / OHADA Uniform Act rules.
 *
 * OHADA rules applied:
 * - Legal reserve: minimum 10% of net profit (AUSCGIE art. 546 — 1/10e du bénéfice)
 * - Legal reserve cap: 20% of share capital (capital social)
 * - Full result must be allocated (ecart = 0)
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';
import type { DBJournalLine } from '../../lib/db';

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
  const fiscalYear = await adapter.getById('fiscalYears', fiscalYearId) as unknown as { startDate: string; endDate: string } | null;
  if (!fiscalYear) throw new Error(`Exercice ${fiscalYearId} introuvable`);

  const allEntries = await adapter.getAll<{ date: string; status: string; lines: DBJournalLine[] }>('journalEntries');
  // Le résultat à affecter ne porte que sur les écritures validées/comptabilisées.
  const entries = allEntries.filter(
    (e) => e.status !== 'draft' && e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate
  );

  // Résultat NET = Σ(crédit − débit) sur les classes 6, 7 ET 8 (produits 7 +
  // produits HAO − charges 6 − charges HAO − IS 89). Inclure la classe 89 est
  // REQUIS (résultat net 62 349 583 vs 67 349 583 avant impôt).
  let net = money(0);
  for (const entry of entries) {
    for (const line of entry.lines) {
      const cls = line.accountCode.charAt(0);
      if (cls === '6' || cls === '7' || cls === '8') {
        net = net.add(money(line.credit)).subtract(money(line.debit));
      }
    }
  }

  return net.round(2).toNumber();
}

/**
 * Get the total capital social (accounts starting with '101').
 */
async function getCapitalSocial(adapter: DataAdapter): Promise<number> {
  const accounts = await adapter.getAll<{ code: string }>('accounts');
  const capitalAccounts = accounts.filter(
    (a) => a.code.startsWith('101')
  );

  if (capitalAccounts.length === 0) return 0;

  const allEntries = (await adapter.getAll<{ status: string; lines: DBJournalLine[] }>('journalEntries'))
    .filter((e) => e.status !== 'draft');
  let total = money(0);

  for (const entry of allEntries) {
    for (const line of entry.lines) {
      if (capitalAccounts.some((a) => a.code === line.accountCode)) {
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
  const allEntries = (await adapter.getAll<{ status: string; lines: DBJournalLine[] }>('journalEntries'))
    .filter((e) => e.status !== 'draft');
  let total = money(0);

  for (const entry of allEntries) {
    for (const line of entry.lines) {
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
  // F-02 : OHADA AUSCGIE art. 546 — réserve légale = 1/10e (10 %) du bénéfice net,
  // jusqu'au plafond de 20 % du capital social. La valeur 5 % est non conforme.
  const reserveLegalePourcentage = 10; // 10% OHADA (1/10e du bénéfice)
  const reserveLegaleMinimale = montantResultat > 0
    ? Math.min(
        money(montantResultat).multiply(0.10).round(2).toNumber(),
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
        `OHADA (AUSCGIE art. 546) impose au moins 10% du resultat net jusqu'au plafond de 20% du capital.`
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
// NOTE : posterAffectation a été RETIRÉ (code mort, jamais appelé) pour
// supprimer la divergence avec le service réellement branché à l'UI :
// affectationResultatService.genererEcrituresAffectation (validated, idempotent,
// réserve légale minimale imposée). simulerAffectation reste la source de
// simulation/contrôle OHADA (utilisée par les tests et l'aide à la décision).
