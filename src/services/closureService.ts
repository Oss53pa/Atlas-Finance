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
import { money } from '../utils/money';
import { db, logAudit } from '../lib/db';
import type { DBJournalEntry, DBClosureSession } from '../lib/db';
import { executerCarryForward, previewCarryForward } from './cloture/carryForwardService';
import type { CarryForwardPreview } from './cloture/carryForwardService';
import { posterAmortissements } from './postingService';

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
  carryForwardEntryId?: string;
  errors: string[];
}

export type ClosureStep =
  | 'VERIFICATION'
  | 'AMORTISSEMENTS'
  | 'VERROUILLAGE'
  | 'CALCUL_RESULTAT'
  | 'REPORTS_A_NOUVEAU'
  | 'FINALISATION';

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
export async function previewClosure(exerciceId: string): Promise<ClosurePreview> {
  const fiscalYear = await db.fiscalYears.get(exerciceId);
  if (!fiscalYear) throw new Error(`Exercice ${exerciceId} introuvable`);

  const entries = await db.journalEntries
    .where('date')
    .between(fiscalYear.startDate, fiscalYear.endDate, true, true)
    .toArray();

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
        totalProduits += line.credit - line.debit;
      } else if (cls === '6') {
        totalCharges += line.debit - line.credit;
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
  const assets = await db.assets.where('status').equals('active').toArray();

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
  } catch {
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
  config: ClosureConfig,
  onProgress?: (progress: ClosureProgress) => void
): Promise<ClosureResult> {
  const errors: string[] = [];
  const report = (step: ClosureStep, progress: number, detail: string) => {
    onProgress?.({ step, progress, detail });
  };

  // 0. Load fiscal year
  const fiscalYear = await db.fiscalYears.get(config.exerciceId);
  if (!fiscalYear) return { success: false, lockedEntries: 0, resultatNet: 0, errors: [`Exercice ${config.exerciceId} introuvable`] };
  if (fiscalYear.isClosed) return { success: false, lockedEntries: 0, resultatNet: 0, errors: ['Exercice déjà clôturé'] };

  const openingFY = await db.fiscalYears.get(config.openingExerciceId);
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
  await db.closureSessions.add(session);

  try {
    // 1. VERIFICATION
    report('VERIFICATION', 10, 'Vérification des pré-requis...');
    const entries = await db.journalEntries
      .where('date')
      .between(fiscalYear.startDate, fiscalYear.endDate, true, true)
      .toArray();

    const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
    if (unbalanced.length > 0) {
      errors.push(`${unbalanced.length} écriture(s) déséquilibrée(s) — correction requise avant clôture`);
      await updateSessionStatus(sessionId, 'ANNULEE', 10);
      return { success: false, sessionId, lockedEntries: 0, resultatNet: 0, errors };
    }

    // 2. AMORTISSEMENTS — Post missing depreciation
    report('AMORTISSEMENTS', 20, 'Comptabilisation des amortissements manquants...');
    const assets = await db.assets.where('status').equals('active').toArray();
    if (assets.length > 0) {
      const start = new Date(fiscalYear.startDate);
      const end = new Date(fiscalYear.endDate);
      const current = new Date(start);
      while (current <= end) {
        const periode = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        await posterAmortissements(periode);
        current.setMonth(current.getMonth() + 1);
      }
    }
    await updateSessionStatus(sessionId, 'EN_COURS', 30);

    // 3. VERROUILLAGE — Lock all entries for the fiscal year
    report('VERROUILLAGE', 40, 'Verrouillage des écritures...');
    const refreshedEntries = await db.journalEntries
      .where('date')
      .between(fiscalYear.startDate, fiscalYear.endDate, true, true)
      .toArray();

    let lockedCount = 0;
    for (const entry of refreshedEntries) {
      if (entry.status !== 'validated') {
        await db.journalEntries.update(entry.id, {
          status: 'validated',
          updatedAt: new Date().toISOString(),
        });
        lockedCount++;
      }
    }
    await updateSessionStatus(sessionId, 'EN_COURS', 50);

    // 4. CALCUL DU RESULTAT
    report('CALCUL_RESULTAT', 60, 'Calcul du résultat de l\'exercice...');
    let totalProduits = 0;
    let totalCharges = 0;

    for (const entry of refreshedEntries) {
      for (const line of entry.lines) {
        const cls = line.accountCode.charAt(0);
        if (cls === '7') {
          totalProduits += line.credit - line.debit;
        } else if (cls === '6') {
          totalCharges += line.debit - line.credit;
        }
      }
    }

    const resultatNet = money(totalProduits).subtract(money(totalCharges)).toNumber();
    await updateSessionStatus(sessionId, 'EN_COURS', 70);

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
    await db.fiscalYears.update(config.exerciceId, { isClosed: true });

    await updateSessionStatus(sessionId, 'CLOTUREE', 100);

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
      carryForwardEntryId: carryResult.entryId,
      errors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    await updateSessionStatus(sessionId, 'ANNULEE', 0);
    return { success: false, sessionId, lockedEntries: 0, resultatNet: 0, errors };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function updateSessionStatus(
  sessionId: string,
  statut: DBClosureSession['statut'],
  progression: number
): Promise<void> {
  await db.closureSessions.update(sessionId, {
    statut,
    progression,
    dateFin: statut === 'CLOTUREE' || statut === 'ANNULEE' ? new Date().toISOString() : '',
  });
}

/**
 * List all closure sessions.
 */
export async function getClosureSessions(): Promise<DBClosureSession[]> {
  return db.closureSessions.toArray();
}

/**
 * Check if an exercice can be closed.
 */
export async function canClose(exerciceId: string): Promise<{ canClose: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const fiscalYear = await db.fiscalYears.get(exerciceId);

  if (!fiscalYear) {
    reasons.push('Exercice introuvable');
    return { canClose: false, reasons };
  }
  if (fiscalYear.isClosed) {
    reasons.push('Exercice déjà clôturé');
    return { canClose: false, reasons };
  }

  const entries = await db.journalEntries
    .where('date')
    .between(fiscalYear.startDate, fiscalYear.endDate, true, true)
    .toArray();

  if (entries.length === 0) {
    reasons.push('Aucune écriture dans l\'exercice');
  }

  const unbalanced = entries.filter(e => Math.abs(e.totalDebit - e.totalCredit) > 1);
  if (unbalanced.length > 0) {
    reasons.push(`${unbalanced.length} écriture(s) déséquilibrée(s)`);
  }

  return { canClose: reasons.length === 0, reasons };
}
