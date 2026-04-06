// @ts-nocheck

/**
 * Service d'orchestration de clôture d'exercice.
 * Coordonne le flux complet: Verrouillage → Résultat → Affectation → Reports à Nouveau.
 *
 * Conforme SYSCOHADA révisé — séquence obligatoire:
 * 1. Verrouillage des écritures de l'exercice (status → 'validated')
 * 2. Calcul du résultat (produits classe 7 − charges classe 6)
 * 3. Affectation du résultat (compte 131/139 → réserves/report)
 * 4. Génération des à-nouveaux (comptes bilan classes 1-5)
 * 5. Enregistrement dans closureSessions
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../utils/money';
import { logAudit } from '../lib/db';
import type { DBJournalEntry, DBJournalLine, DBClosureSession, DBFiscalYear, DBAsset } from '../lib/db';
import { executerCarryForward, previewCarryForward } from './cloture/carryForwardService';
import type { CarryForwardPreview } from './cloture/carryForwardService';
import { posterAmortissements } from './postingService';
import { safeAddEntry } from './entryGuard';
import { genererEcrituresRegularisation } from './cloture/regularisationsService';

// ============================================================================
// TYPES
// ============================================================================

export interface ClosureConfig {
  exerciceId: string;
  openingExerciceId: string;
  openingDate: string;
  initiateur: string;
}

export interface ClosurePreview {
  totalEntries: number;
  entriesToLock: number;
  totalProduits: number;
  totalCharges: number;
  resultatNet: number;
  isBenefice: boolean;
  carryForward: CarryForwardPreview | null;
  missingDepreciation: string[]; // Periods without depreciation entries
  warnings: string[];
}

export interface ClosureResult {
  success: boolean;
  sessionId?: string;
  lockedEntries: number;
  resultatNet: number;
  resultatEntryId?: string;
  carryForwardEntryId?: string;
  errors: string[];
}

export type ClosureStep =
  | 'VERIFICATION'
  | 'AMORTISSEMENTS'
  | 'VERROUILLAGE'
  | 'CALCUL_RESULTAT'
  | 'REPORTS_A_NOUVEAU'
  | 'FINALISATION'
  // SYSCOHADA 15-step keys (used by closureOrchestrator)
  | 'CONTROLES_JOURNAUX'
  | 'RAPPROCHEMENTS'
  | 'LETTRAGE'
  | 'INVENTAIRE_STOCKS'
  | 'REGULARISATIONS'
  | 'PROVISIONS_RISQUES'
  | 'PROVISIONS_DEPRECIATION'
  | 'IMPOT_SOCIETES'
  | 'REGULARISATIONS_HAO'
  | 'DETERMINATION_RESULTAT'
  | 'ETATS_FINANCIERS'
  | 'LIASSE_FISCALE'
  | 'AFFECTATION_REPORT';

export interface ClosureProgress {
  step: ClosureStep;
  progress: number; // 0-100
  detail: string;
}

// ============================================================================
// PREVIEW — Analyse sans modification
// ============================================================================

/**
 * Preview the closure: analyse what would happen without modifying anything.
 */
export async function previewClosure(adapter: DataAdapter, exerciceId: string): Promise<ClosurePreview> {
  const fiscalYear = await adapter.getById<DBFiscalYear>('fiscalYears', exerciceId);
  if (!fiscalYear) throw new Error(`Exercice ${exerciceId} introuvable`);

  const allEntries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
    .filter(e => e.status !== 'draft');
  const entries = allEntries.filter(e => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate);

  const warnings: string[] = [];

  // Count entries to lock
  const entriesToLock = entries.filter(e => e.status === 'draft' || e.status === 'posted').length;

  // Compute result: classe 7 (produits) - classe 6 (charges)
  let totalProduits = 0;
  let totalCharges = 0;

  for (const entry of entries) {
    for (const line of entry.lines) {
      const cls = line.accountCode.charAt(0);
      if (cls === '7') {
        totalProduits = money(totalProduits).add(money(line.credit)).subtract(money(line.debit)).toNumber();
      } else if (cls === '6') {
        totalCharges = money(totalCharges).add(money(line.debit)).subtract(money(line.credit)).toNumber();
      }
    }
  }

  const resultatNet = money(totalProduits).subtract(money(totalCharges)).toNumber();

  // Check for unbalanced entries
  const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
  if (unbalanced.length > 0) {
    warnings.push(`${unbalanced.length} écriture(s) déséquilibrée(s) détectée(s)`);
  }

  // Check missing depreciation periods
  const missingDepreciation: string[] = [];
  const start = new Date(fiscalYear.startDate);
  const end = new Date(fiscalYear.endDate);
  const assets = await adapter.getAll<DBAsset>('assets', { where: { status: 'active' } });

  if (assets.length > 0) {
    const current = new Date(start);
    while (current <= end) {
      const periode = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const amortEntries = entries.filter(e =>
        e.reference?.startsWith(`AMORT-${periode}`)
      );
      if (amortEntries.length === 0) {
        missingDepreciation.push(periode);
      }
      current.setMonth(current.getMonth() + 1);
    }
  }

  if (missingDepreciation.length > 0) {
    warnings.push(`Amortissements manquants pour ${missingDepreciation.length} période(s)`);
  }

  // Preview carry forward
  let carryForward: CarryForwardPreview | null = null;
  try {
    carryForward = await previewCarryForward({
      closingExerciceId: exerciceId,
      openingExerciceId: exerciceId, // Just for preview, doesn't matter
      openingDate: '',
    });
  } catch (err) { /* silent */
    warnings.push('Impossible de pré-calculer les à-nouveaux');
  }

  return {
    totalEntries: entries.length,
    entriesToLock,
    totalProduits,
    totalCharges,
    resultatNet,
    isBenefice: resultatNet > 0,
    carryForward,
    missingDepreciation,
    warnings,
  };
}

// ============================================================================
// EXECUTION — Clôture complète
// ============================================================================

/**
 * Execute the full closure sequence.
 * @param config Closure configuration
 * @param onProgress Optional progress callback
 */
export async function executerCloture(
  adapter: DataAdapter,
  config: ClosureConfig,
  onProgress?: (progress: ClosureProgress) => void
): Promise<ClosureResult> {
  const errors: string[] = [];
  const report = (step: ClosureStep, progress: number, detail: string) => {
    onProgress?.({ step, progress, detail });
  };

  // 0. Load fiscal year
  const fiscalYear = await adapter.getById<DBFiscalYear>('fiscalYears', config.exerciceId);
  if (!fiscalYear) return { success: false, lockedEntries: 0, resultatNet: 0, errors: [`Exercice ${config.exerciceId} introuvable`] };
  if (fiscalYear.isClosed) return { success: false, lockedEntries: 0, resultatNet: 0, errors: ['Exercice déjà clôturé'] };

  const openingFY = await adapter.getById<DBFiscalYear>('fiscalYears', config.openingExerciceId);
  if (!openingFY) return { success: false, lockedEntries: 0, resultatNet: 0, errors: [`Exercice d'ouverture ${config.openingExerciceId} introuvable`] };

  // Create closure session
  const sessionId = crypto.randomUUID();
  const session: DBClosureSession = {
    id: sessionId,
    type: 'ANNUELLE',
    periode: `${fiscalYear.startDate}/${fiscalYear.endDate}`,
    exercice: fiscalYear.code,
    dateDebut: new Date().toISOString(),
    dateFin: '',
    dateCreation: new Date().toISOString(),
    statut: 'EN_COURS',
    creePar: config.initiateur,
    progression: 0,
  };
  await adapter.create<DBClosureSession>('closureSessions', session);

  try {
    // 1. VERIFICATION
    report('VERIFICATION', 10, 'Vérification des pré-requis...');
    const allEntries = (await adapter.getAll<DBJournalEntry>('journalEntries'))
      .filter(e => e.status !== 'draft');
    const entries = allEntries.filter(e => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate);

    const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
    if (unbalanced.length > 0) {
      errors.push(`${unbalanced.length} écriture(s) déséquilibrée(s) — correction requise avant clôture`);
      await updateSessionStatus(adapter, sessionId, 'ANNULEE', 10);
      return { success: false, sessionId, lockedEntries: 0, resultatNet: 0, errors };
    }

    // 2. AMORTISSEMENTS — Post missing depreciation
    report('AMORTISSEMENTS', 20, 'Comptabilisation des amortissements manquants...');
    const assets = await adapter.getAll<DBAsset>('assets', { where: { status: 'active' } });
    if (assets.length > 0) {
      const start = new Date(fiscalYear.startDate);
      const end = new Date(fiscalYear.endDate);
      const current = new Date(start);
      while (current <= end) {
        const periode = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        await posterAmortissements(adapter, periode);
        current.setMonth(current.getMonth() + 1);
      }
    }
    await updateSessionStatus(adapter, sessionId, 'EN_COURS', 30);

    // 2bis. RÉGULARISATIONS — CCA/FNP/FAE/PCA (Art. 59-65 SYSCOHADA révisé)
    report('VERROUILLAGE', 35, 'Génération des écritures de régularisation...');
    try {
      // Charger les régularisations saisies pour cet exercice
      const allRegularisations = await adapter.getAll('regularisations');
      const exerciceRegs = (allRegularisations as Record<string, unknown>[]).filter(
        (r: any) => r.exerciceId === config.exerciceId && r.status !== 'comptabilisee'
      );
      if (exerciceRegs.length > 0) {
        const regResult = await genererEcrituresRegularisation(adapter, {
          exerciceId: config.exerciceId,
          dateRegularisation: fiscalYear.endDate,
          regularisations: exerciceRegs,
        });
        if (regResult.ecritures && regResult.ecritures.length > 0) {
          report('VERROUILLAGE', 38, `${regResult.ecritures.length} écriture(s) de régularisation générée(s)`);
        }
      }
    } catch (regError) {
      // Les régularisations sont optionnelles (dépendent des données saisies)
    }

    // 3. VERROUILLAGE — Lock all entries for the fiscal year
    report('VERROUILLAGE', 40, 'Verrouillage des écritures...');
    const allRefreshed = await adapter.getAll<DBJournalEntry>('journalEntries');
    const refreshedEntries = allRefreshed.filter(e => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate);

    // AF-010: Draft entries must be validated before closure — fail if any remain
    const draftEntries = refreshedEntries.filter(e => e.status === 'draft');
    if (draftEntries.length > 0) {
      errors.push(`${draftEntries.length} écriture(s) au brouillon — toutes les écritures doivent être validées avant clôture`);
      await updateSessionStatus(adapter, sessionId, 'ANNULEE', 40);
      return { success: false, sessionId, lockedEntries: 0, resultatNet: 0, errors };
    }

    // Promote 'validated' entries to 'posted'; leave 'posted' entries as-is
    let lockedCount = 0;
    for (const entry of refreshedEntries) {
      if (entry.status === 'validated') {
        await adapter.update<DBJournalEntry>('journalEntries', entry.id, {
          status: 'posted',
          updatedAt: new Date().toISOString(),
        });
        lockedCount++;
      }
    }
    await updateSessionStatus(adapter, sessionId, 'EN_COURS', 50);

    // 4. CALCUL DU RESULTAT
    report('CALCUL_RESULTAT', 60, 'Calcul du résultat de l\'exercice...');
    let totalProduits = 0;
    let totalCharges = 0;

    for (const entry of refreshedEntries) {
      for (const line of entry.lines) {
        const cls = line.accountCode.charAt(0);
        if (cls === '7') {
          totalProduits = money(totalProduits).add(money(line.credit)).subtract(money(line.debit)).toNumber();
        } else if (cls === '6') {
          totalCharges = money(totalCharges).add(money(line.debit)).subtract(money(line.credit)).toNumber();
        }
      }
    }

    const resultatNet = money(totalProduits).subtract(money(totalCharges)).toNumber();

    // AF-007: Generate the actual result determination entry (solde comptes de gestion)
    let resultatEntryId: string | undefined;
    try {
      const resultatResult = await generateResultatEntry(adapter, config.exerciceId, config.initiateur);
      resultatEntryId = resultatResult.entryId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Non-blocking if accounts are already at zero
      if (!msg.includes('déjà à zéro')) {
        errors.push(`Détermination du résultat: ${msg}`);
      }
    }
    await updateSessionStatus(adapter, sessionId, 'EN_COURS', 70);

    // 5. REPORTS A NOUVEAU
    report('REPORTS_A_NOUVEAU', 80, 'Génération des à-nouveaux...');
    const carryResult = await executerCarryForward({
      closingExerciceId: config.exerciceId,
      openingExerciceId: config.openingExerciceId,
      openingDate: config.openingDate,
      includeResultat: true,
    });

    if (!carryResult.success) {
      errors.push(...carryResult.errors);
    }

    // 6. FINALISATION
    report('FINALISATION', 90, 'Finalisation de la clôture...');

    // Mark fiscal year as closed
    await adapter.update<DBFiscalYear>('fiscalYears', config.exerciceId, { isClosed: true });

    await updateSessionStatus(adapter, sessionId, 'CLOTUREE', 100);

    await logAudit(
      'CLOSURE_COMPLETE',
      'fiscalYear',
      config.exerciceId,
      `Clôture exercice ${fiscalYear.name}: ${lockedCount} écritures verrouillées, résultat=${resultatNet} FCFA`
    );

    report('FINALISATION', 100, 'Clôture terminée');

    return {
      success: true,
      sessionId,
      lockedEntries: lockedCount,
      resultatNet,
      resultatEntryId,
      carryForwardEntryId: carryResult.entryId,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    await updateSessionStatus(adapter, sessionId, 'ANNULEE', 0);
    return { success: false, sessionId, lockedEntries: 0, resultatNet: 0, errors };
  }
}

// ============================================================================
// AF-007 — Détermination du résultat : solde des comptes de gestion
// ============================================================================

export interface ResultatEntryResult {
  entryId: string;
  resultatNet: number;
  isBenefice: boolean;
  linesCount: number;
}

/**
 * Génère l'écriture de détermination du résultat (AF-007).
 *
 * Pour chaque compte de classe 6 (charges) et 7 (produits), calcule le solde net
 * et génère une écriture de clôture qui :
 * - Débite chaque compte de classe 7 (crédit naturel) pour le ramener à zéro
 * - Crédite chaque compte de classe 6 (débit naturel) pour le ramener à zéro
 * - La contrepartie va au compte 1200 (bénéfice) ou 1290 (perte)
 *
 * L'écriture est équilibrée par construction (total débits = total crédits).
 */
export async function generateResultatEntry(
  adapter: DataAdapter,
  exerciceId: string,
  initiateur: string,
): Promise<ResultatEntryResult> {
  const fiscalYear = await adapter.getById<DBFiscalYear>('fiscalYears', exerciceId);
  if (!fiscalYear) throw new Error(`Exercice ${exerciceId} introuvable`);

  // 1. Load all validated/posted entries for the fiscal year
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const entries = (allEntries as DBJournalEntry[]).filter(
    e => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate
      && (e.status === 'validated' || e.status === 'posted'),
  );

  // 2. Compute net balance per account for classes 6 and 7
  const balances = new Map<string, { accountName: string; solde: number }>();

  for (const entry of entries) {
    for (const line of entry.lines) {
      const cls = line.accountCode.charAt(0);
      if (cls !== '6' && cls !== '7') continue;

      const existing = balances.get(line.accountCode) ?? { accountName: line.accountName, solde: 0 };
      existing.solde = money(existing.solde).add(money(line.debit)).subtract(money(line.credit)).toNumber();
      balances.set(line.accountCode, existing);
    }
  }

  // 3. Build journal entry lines
  const lines: DBJournalLine[] = [];
  let totalResultatDebits = 0;
  let totalResultatCredits = 0;

  for (const [accountCode, { accountName, solde }] of balances) {
    if (Math.abs(solde) < 0.01) continue; // Skip zero balances

    const cls = accountCode.charAt(0);

    if (cls === '7') {
      // Produits have a natural credit balance (solde < 0 means credit excess)
      // To zero: debit the account by credit balance amount
      const creditBalance = money(0).subtract(money(solde)).toNumber(); // positive if credit > debit
      if (creditBalance > 0) {
        lines.push({
          id: crypto.randomUUID(),
          accountCode,
          accountName,
          label: `Solde du compte ${accountCode} — détermination du résultat`,
          debit: creditBalance,
          credit: 0,
        });
        totalResultatDebits = money(totalResultatDebits).add(money(creditBalance)).toNumber();
      } else if (creditBalance < 0) {
        // Unusual: class 7 with debit balance — credit to zero
        lines.push({
          id: crypto.randomUUID(),
          accountCode,
          accountName,
          label: `Solde du compte ${accountCode} — détermination du résultat`,
          debit: 0,
          credit: Math.abs(creditBalance),
        });
        totalResultatCredits = money(totalResultatCredits).add(money(Math.abs(creditBalance))).toNumber();
      }
    } else if (cls === '6') {
      // Charges have a natural debit balance (solde > 0 means debit excess)
      // To zero: credit the account by debit balance amount
      if (solde > 0) {
        lines.push({
          id: crypto.randomUUID(),
          accountCode,
          accountName,
          label: `Solde du compte ${accountCode} — détermination du résultat`,
          debit: 0,
          credit: solde,
        });
        totalResultatCredits = money(totalResultatCredits).add(money(solde)).toNumber();
      } else if (solde < 0) {
        // Unusual: class 6 with credit balance — debit to zero
        lines.push({
          id: crypto.randomUUID(),
          accountCode,
          accountName,
          label: `Solde du compte ${accountCode} — détermination du résultat`,
          debit: Math.abs(solde),
          credit: 0,
        });
        totalResultatDebits = money(totalResultatDebits).add(money(Math.abs(solde))).toNumber();
      }
    }
  }

  // 4. Counterpart line: bénéfice (1200) or perte (1290)
  const resultatNet = money(totalResultatDebits).subtract(money(totalResultatCredits)).toNumber();
  // totalResultatDebits = produits zeroed out; totalResultatCredits = charges zeroed out
  // If debits > credits → produits > charges → bénéfice → credit 1200
  // If credits > debits → charges > produits → perte → debit 1290

  if (Math.abs(resultatNet) >= 0.01) {
    const isBenefice = resultatNet > 0;
    lines.push({
      id: crypto.randomUUID(),
      accountCode: isBenefice ? '1200' : '1290',
      accountName: isBenefice ? 'Résultat de l\'exercice (bénéfice)' : 'Résultat de l\'exercice (perte)',
      label: isBenefice
        ? `Bénéfice de l'exercice ${fiscalYear.name}`
        : `Perte de l'exercice ${fiscalYear.name}`,
      debit: isBenefice ? 0 : Math.abs(resultatNet),
      credit: isBenefice ? resultatNet : 0,
    });
  }

  if (lines.length === 0) {
    throw new Error('Aucun solde à virer — les comptes de gestion sont déjà à zéro');
  }

  // 5. Persist via safeAddEntry
  const entryId = await safeAddEntry(adapter, {
    id: crypto.randomUUID(),
    entryNumber: `CL-RES-${fiscalYear.code}`,
    journal: 'CL',
    date: fiscalYear.endDate,
    reference: `RESULTAT-${fiscalYear.code}`,
    label: `Détermination du résultat — exercice ${fiscalYear.name}`,
    status: 'posted',
    nature: 'cloture',
    lines,
    createdAt: new Date().toISOString(),
    createdBy: initiateur,
  }, { skipSyncValidation: true });

  return {
    entryId,
    resultatNet: money(totalResultatDebits).subtract(money(totalResultatCredits)).toNumber(),
    isBenefice: resultatNet > 0,
    linesCount: lines.length,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

async function updateSessionStatus(
  adapter: DataAdapter,
  sessionId: string,
  statut: DBClosureSession['statut'],
  progression: number
): Promise<void> {
  await adapter.update<DBClosureSession>('closureSessions', sessionId, {
    statut,
    progression,
    dateFin: statut === 'CLOTUREE' || statut === 'ANNULEE' ? new Date().toISOString() : '',
  });
}

/**
 * List all closure sessions.
 */
export async function getClosureSessions(adapter: DataAdapter): Promise<DBClosureSession[]> {
  return adapter.getAll<DBClosureSession>('closureSessions');
}

/**
 * Check if an exercice can be closed.
 */
export async function canClose(adapter: DataAdapter, exerciceId: string): Promise<{ canClose: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const fiscalYear = await adapter.getById<DBFiscalYear>('fiscalYears', exerciceId);

  if (!fiscalYear) {
    reasons.push('Exercice introuvable');
    return { canClose: false, reasons };
  }
  if (fiscalYear.isClosed) {
    reasons.push('Exercice déjà clôturé');
    return { canClose: false, reasons };
  }

  const allCanCloseEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const entries = allCanCloseEntries.filter(e => e.date >= fiscalYear.startDate && e.date <= fiscalYear.endDate);

  if (entries.length === 0) {
    reasons.push('Aucune écriture dans l\'exercice');
  }

  const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
  if (unbalanced.length > 0) {
    reasons.push(`${unbalanced.length} écriture(s) déséquilibrée(s)`);
  }

  return { canClose: reasons.length === 0, reasons };
}
