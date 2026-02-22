/**
 * Orchestrateur central de clôture comptable.
 *
 * Centralise l'exécution des étapes de clôture, quel que soit le déclencheur :
 * - Mode MANUAL : le comptable exécute étape par étape via les boutons UI
 * - Mode PROPH3T : l'IA lance le workflow complet ou partiel
 *
 * Chaque écriture générée porte un champ `createdBy` traçable :
 *   'manual:<userId>' ou 'proph3t:<userId>'
 *
 * Conforme SYSCOHADA révisé — séquence :
 *   1. Contrôles de cohérence (lecture seule)
 *   2. Régularisations (CCA/FNP/FAE/PCA)
 *   3. Dotations aux amortissements
 *   4. Provisions
 *   5. Calcul IS
 *   6. Solde comptes de gestion → Résultat
 *   7. Verrouillage exercice
 *   8. Reports à nouveau N+1
 *   9. Archivage états financiers
 */
import type { DataAdapter } from '@atlas/data';
import type { DBFiscalYear } from '../../lib/db';
import { previewClosure, executerCloture, canClose } from '../closureService';
import type { ClosureConfig, ClosurePreview } from '../closureService';
import { posterAmortissements } from '../postingService';
import { executerCarryForward, previewCarryForward } from './carryForwardService';
import { genererExtournes } from './extourneService';
import { formatCurrency } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

export type ClotureMode = 'manual' | 'proph3t';

export interface ClotureContext {
  adapter: DataAdapter;
  exerciceId: string;
  mode: ClotureMode;
  userId: string;
  /** ID de l'exercice d'ouverture (N+1) — requis pour reports */
  openingExerciceId?: string;
  onProgress?: (step: ClotureStep) => void;
  onError?: (step: ClotureStep, error: Error) => void;
}

export interface ClotureStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  message?: string;
  timestamp?: string;
}

// ============================================================================
// STEPS DEFINITION
// ============================================================================

const STEPS_DEF: Omit<ClotureStep, 'status'>[] = [
  { id: 'CONTROLES',       label: 'Contrôles de cohérence' },
  { id: 'AMORTISSEMENTS',  label: 'Dotations aux amortissements' },
  { id: 'REGULARISATIONS', label: 'Extournes des régularisations' },
  { id: 'VERROUILLAGE',    label: 'Verrouillage des écritures' },
  { id: 'CALCUL_RESULTAT', label: 'Calcul du résultat' },
  { id: 'REPORTS',         label: 'Reports à nouveau N+1' },
  { id: 'FINALISATION',    label: 'Clôture de l\'exercice' },
];

/** Steps that block the entire workflow if they fail */
const BLOCKING_STEPS = new Set(['CONTROLES', 'VERROUILLAGE', 'CALCUL_RESULTAT']);

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export const closureOrchestrator = {

  /** Return a fresh set of steps with 'pending' status */
  getSteps(): ClotureStep[] {
    return STEPS_DEF.map(s => ({ ...s, status: 'pending' as const }));
  },

  /**
   * Execute ALL steps sequentially (mode Proph3t full workflow or manual "tout exécuter").
   * Stops on blocking errors.
   */
  async executeAll(ctx: ClotureContext): Promise<ClotureStep[]> {
    const results: ClotureStep[] = this.getSteps();
    const initiatedBy = `${ctx.mode}:${ctx.userId}`;

    for (const step of results) {
      step.status = 'running';
      step.timestamp = new Date().toISOString();
      ctx.onProgress?.(step);

      try {
        const message = await this._executeStep(step.id, ctx, initiatedBy);
        step.status = 'done';
        step.message = message || 'OK';
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        step.status = 'error';
        step.message = err.message;
        ctx.onError?.(step, err);

        // In manual mode, always stop on error
        // In proph3t mode, stop only on blocking steps
        if (ctx.mode === 'manual' || BLOCKING_STEPS.has(step.id)) break;
      }
      ctx.onProgress?.(step);
    }

    await this._logAudit(ctx, results);
    return results;
  },

  /**
   * Execute ONE step (manual mode — the accountant clicks one button at a time).
   */
  async executeStep(stepId: string, ctx: ClotureContext): Promise<ClotureStep> {
    const def = STEPS_DEF.find(s => s.id === stepId);
    const step: ClotureStep = {
      id: stepId,
      label: def?.label || stepId,
      status: 'running',
      timestamp: new Date().toISOString(),
    };
    const initiatedBy = `${ctx.mode}:${ctx.userId}`;

    try {
      const message = await this._executeStep(stepId, ctx, initiatedBy);
      step.status = 'done';
      step.message = message || 'OK';
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      step.status = 'error';
      step.message = err.message;
    }

    await this._logAudit(ctx, [step]);
    return step;
  },

  /**
   * Preview the closure without modifying anything.
   */
  async preview(exerciceId: string): Promise<ClosurePreview> {
    return previewClosure(exerciceId);
  },

  /**
   * Check if the closure can proceed.
   */
  async canProceed(exerciceId: string): Promise<{ ok: boolean; reasons: string[] }> {
    const { canClose: ok, reasons } = await canClose(exerciceId);
    return { ok, reasons };
  },

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  async _executeStep(
    stepId: string,
    ctx: ClotureContext,
    initiatedBy: string
  ): Promise<string> {
    const fy = await ctx.adapter.getById<DBFiscalYear>('fiscalYears', ctx.exerciceId);
    if (!fy) throw new Error(`Exercice ${ctx.exerciceId} introuvable`);

    switch (stepId) {
      case 'CONTROLES': {
        const check = await canClose(ctx.exerciceId);
        if (!check.canClose) {
          throw new Error(`Pré-requis non satisfaits : ${check.reasons.join(', ')}`);
        }
        const preview = await previewClosure(ctx.exerciceId);
        const msgs = [
          `${preview.totalEntries} écritures`,
          `${preview.entriesToLock} à verrouiller`,
        ];
        if (preview.warnings.length > 0) {
          msgs.push(`${preview.warnings.length} avertissement(s)`);
        }
        return msgs.join(' — ');
      }

      case 'AMORTISSEMENTS': {
        const start = new Date(fy.startDate);
        const end = new Date(fy.endDate);
        let totalPosted = 0;
        const current = new Date(start);
        while (current <= end) {
          const periode = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          const result = await posterAmortissements(ctx.adapter, periode);
          totalPosted += result.assetsProcessed;
          current.setMonth(current.getMonth() + 1);
        }
        return `${totalPosted} dotation(s) comptabilisée(s)`;
      }

      case 'REGULARISATIONS': {
        // Auto-extourne des régularisations de l'exercice précédent
        const result = await genererExtournes(ctx.adapter, {
          exerciceClotureId: ctx.exerciceId,
          dateExtourne: fy.startDate,
        });
        return result.count
          ? `${result.count} extourne(s) générée(s)`
          : 'Aucune régularisation à extourner';
      }

      case 'VERROUILLAGE': {
        const allEntries = await ctx.adapter.getAll('journalEntries');
        const entries = (allEntries as any[]).filter(
          e => e.date >= fy.startDate && e.date <= fy.endDate && e.status !== 'validated'
        );

        for (const entry of entries) {
          await ctx.adapter.update('journalEntries', entry.id, {
            status: 'validated',
            updatedAt: new Date().toISOString(),
          });
        }
        return `${entries.length} écriture(s) verrouillée(s)`;
      }

      case 'CALCUL_RESULTAT': {
        const preview = await previewClosure(ctx.exerciceId);
        const { resultatNet, isBenefice, totalProduits, totalCharges } = preview;
        return `${isBenefice ? 'Bénéfice' : 'Perte'} : ${formatCurrency(resultatNet)} (Produits: ${formatCurrency(totalProduits)}, Charges: ${formatCurrency(totalCharges)})`;
      }

      case 'REPORTS': {
        const openingId = ctx.openingExerciceId;
        if (!openingId) throw new Error('Exercice N+1 non défini — requis pour les reports à nouveau');

        const openingFY = await ctx.adapter.getById<DBFiscalYear>('fiscalYears', openingId);
        if (!openingFY) throw new Error(`Exercice d'ouverture ${openingId} introuvable`);

        const result = await executerCarryForward(ctx.adapter, {
          closingExerciceId: ctx.exerciceId,
          openingExerciceId: openingId,
          openingDate: openingFY.startDate,
          includeResultat: true,
        });

        if (!result.success) throw new Error(result.errors.join(', '));
        return `${result.lineCount} compte(s) reporté(s), D=${formatCurrency(result.totalDebit)} C=${formatCurrency(result.totalCredit)}`;
      }

      case 'FINALISATION': {
        await ctx.adapter.update('fiscalYears', ctx.exerciceId, { isClosed: true });
        await ctx.adapter.logAudit({
          action: 'CLOSURE_COMPLETE',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({ mode: ctx.mode, userId: ctx.userId, initiatedBy }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `Exercice ${fy.name} clôturé`;
      }

      default:
        throw new Error(`Étape inconnue: ${stepId}`);
    }
  },

  _isBlocking(stepId: string): boolean {
    return BLOCKING_STEPS.has(stepId);
  },

  async _logAudit(ctx: ClotureContext, steps: ClotureStep[]): Promise<void> {
    const completed = steps.filter(s => s.status === 'done').length;
    const failed = steps.filter(s => s.status === 'error').length;
    await ctx.adapter.logAudit({
      action: 'CLOTURE_ORCHESTRATOR',
      entityType: 'closureSession',
      entityId: ctx.exerciceId,
      details: JSON.stringify({
        mode: ctx.mode,
        userId: ctx.userId,
        steps: steps.map(s => ({ id: s.id, status: s.status, message: s.message })),
        summary: `${completed} ok, ${failed} erreur(s)`,
      }),
      timestamp: new Date().toISOString(),
      previousHash: '',
    });
  },
};
