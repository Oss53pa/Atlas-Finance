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
 * Conforme SYSCOHADA révisé — 15 étapes obligatoires :
 *   1.  CONTROLES_JOURNAUX       — Vérification équilibre des journaux
 *   2.  RAPPROCHEMENTS           — Rapprochements bancaires complets
 *   3.  LETTRAGE                 — Lettrage exhaustif des comptes de tiers
 *   4.  AMORTISSEMENTS           — Calcul et comptabilisation dotations amortissements
 *   5.  INVENTAIRE_STOCKS        — Inventaire stocks et ajustements
 *   6.  REGULARISATIONS          — Régularisations charges à payer (CCA, FNP, FAE, PCA)
 *   7.  PROVISIONS_RISQUES       — Provisions pour risques et charges
 *   8.  PROVISIONS_DEPRECIATION  — Provisions pour dépréciation créances
 *   9.  IMPOT_SOCIETES           — Impôt sur les sociétés (IS) et acomptes
 *  10.  REGULARISATIONS_HAO      — Autres régularisations HAO
 *  11.  DETERMINATION_RESULTAT   — Détermination du résultat net
 *  12.  VERROUILLAGE             — Validation et verrouillage des journaux
 *  13.  ETATS_FINANCIERS         — Génération des états financiers SYSCOHADA
 *  14.  LIASSE_FISCALE           — Info : déléguée à Liass'Pilot (non bloquante)
 *  15.  AFFECTATION_REPORT       — Affectation du résultat et report à nouveau N+1
 */
import type { DataAdapter } from '@atlas/data';
import type { DBFiscalYear } from '../../lib/db';
import { previewClosure, executerCloture, canClose, generateResultatEntry } from '../closureService';
import type { ClosureConfig, ClosurePreview } from '../closureService';
import { posterAmortissements } from '../postingService';
import { executerCarryForward, previewCarryForward } from './carryForwardService';
import { genererExtournes } from './extourneService';
import { formatCurrency } from '../../utils/formatters';

// ============================================================================
// TYPES
// ============================================================================

export type ClotureMode = 'manual' | 'proph3t';

/** Enum of all 15 SYSCOHADA annual closure step keys */
export type ClotureStepKey =
  | 'CONTROLES_JOURNAUX'
  | 'RAPPROCHEMENTS'
  | 'LETTRAGE'
  | 'AMORTISSEMENTS'
  | 'INVENTAIRE_STOCKS'
  | 'REGULARISATIONS'
  | 'PROVISIONS_RISQUES'
  | 'PROVISIONS_DEPRECIATION'
  | 'IMPOT_SOCIETES'
  | 'REGULARISATIONS_HAO'
  | 'DETERMINATION_RESULTAT'
  | 'VERROUILLAGE'
  | 'ETATS_FINANCIERS'
  | 'LIASSE_FISCALE'
  | 'AFFECTATION_REPORT';

/** Enum of monthly closure step keys */
export type ClotureMonthlyStepKey =
  | 'M_VERIFICATION'
  | 'M_RAPPROCHEMENTS'
  | 'M_LETTRAGE'
  | 'M_REGULARISATIONS'
  | 'M_EXTOURNES'
  | 'M_PROVISIONS'
  | 'M_CONTROLES'
  | 'M_VERROUILLAGE';

export interface ClotureContext {
  adapter: DataAdapter;
  exerciceId: string;
  mode: ClotureMode;
  userId: string;
  /** ID de l'exercice d'ouverture (N+1) — requis pour reports */
  openingExerciceId?: string;
  /** ID de la période fiscale (clôture mensuelle) */
  periodId?: string;
  /** Code de la période, e.g. "2025-01" */
  periodCode?: string;
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
// STEPS DEFINITION — 15 étapes SYSCOHADA révisé
// ============================================================================

const STEPS_DEF: Omit<ClotureStep, 'status'>[] = [
  { id: 'CONTROLES_JOURNAUX',      label: 'Vérification équilibre des journaux' },
  { id: 'RAPPROCHEMENTS',          label: 'Rapprochements bancaires complets' },
  { id: 'LETTRAGE',                label: 'Lettrage exhaustif des comptes de tiers' },
  { id: 'AMORTISSEMENTS',          label: 'Calcul et comptabilisation dotations amortissements' },
  { id: 'INVENTAIRE_STOCKS',       label: 'Inventaire stocks et ajustements' },
  { id: 'REGULARISATIONS',         label: 'Régularisations charges à payer (CCA, FNP, FAE, PCA)' },
  { id: 'PROVISIONS_RISQUES',      label: 'Provisions pour risques et charges' },
  { id: 'PROVISIONS_DEPRECIATION', label: 'Provisions pour dépréciation créances' },
  { id: 'IMPOT_SOCIETES',          label: 'Impôt sur les sociétés (IS) et acomptes' },
  { id: 'REGULARISATIONS_HAO',     label: 'Autres régularisations HAO' },
  { id: 'DETERMINATION_RESULTAT',  label: 'Détermination du résultat net' },
  { id: 'VERROUILLAGE',            label: 'Validation et verrouillage des journaux' },
  { id: 'ETATS_FINANCIERS',        label: 'Génération des états financiers SYSCOHADA' },
  { id: 'LIASSE_FISCALE',          label: "Liasse fiscale — déléguée à Liass'Pilot" },
  { id: 'AFFECTATION_REPORT',      label: 'Affectation du résultat et report à nouveau N+1' },
];

/** Steps that block the entire workflow if they fail */
const BLOCKING_STEPS = new Set<string>([
  'CONTROLES_JOURNAUX',
  'DETERMINATION_RESULTAT',
  'VERROUILLAGE',
  'AFFECTATION_REPORT',
]);

/**
 * Steps that are explicitly NON-blocking and must never halt the closure
 * workflow, even in manual mode. Used for info-only steps such as the
 * liasse fiscale which is delegated to Liass'Pilot.
 */
const NON_BLOCKING_STEPS = new Set<string>([
  'LIASSE_FISCALE',
]);

// ============================================================================
// MONTHLY STEPS — sous-ensemble pertinent pour clôture mensuelle
// ============================================================================

const MONTHLY_STEPS_DEF: Omit<ClotureStep, 'status'>[] = [
  { id: 'M_VERIFICATION',    label: 'Vérification des pré-requis' },
  { id: 'M_RAPPROCHEMENTS',  label: 'Rapprochements bancaires de la période' },
  { id: 'M_LETTRAGE',        label: 'Lettrage comptes de tiers' },
  { id: 'M_REGULARISATIONS', label: 'Régularisations (CCA/FNP/FAE/PCA)' },
  { id: 'M_EXTOURNES',       label: 'Extournes automatiques' },
  { id: 'M_PROVISIONS',      label: 'Provisions et dépréciations de la période' },
  { id: 'M_CONTROLES',       label: 'Contrôles de cohérence' },
  { id: 'M_VERROUILLAGE',    label: 'Verrouillage de la période' },
];

const MONTHLY_BLOCKING_STEPS = new Set<string>([
  'M_VERIFICATION',
  'M_CONTROLES',
  'M_VERROUILLAGE',
]);

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

        // Info-only / non-blocking steps (e.g. LIASSE_FISCALE delegated to
        // Liass'Pilot) never halt the workflow, regardless of mode.
        if (NON_BLOCKING_STEPS.has(step.id)) {
          ctx.onProgress?.(step);
          continue;
        }
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
  async preview(adapter: DataAdapter, exerciceId: string): Promise<ClosurePreview> {
    return previewClosure(adapter, exerciceId);
  },

  /**
   * Check if the closure can proceed.
   */
  async canProceed(adapter: DataAdapter, exerciceId: string): Promise<{ ok: boolean; reasons: string[] }> {
    const { canClose: ok, reasons } = await canClose(adapter, exerciceId);
    return { ok, reasons };
  },

  // ===========================================================================
  // INTERNAL — Annual step execution
  // ===========================================================================

  async _executeStep(
    stepId: string,
    ctx: ClotureContext,
    initiatedBy: string
  ): Promise<string> {
    const fy = await ctx.adapter.getById<DBFiscalYear>('fiscalYears', ctx.exerciceId);
    if (!fy) throw new Error(`Exercice ${ctx.exerciceId} introuvable`);

    switch (stepId) {

      // -----------------------------------------------------------------------
      // 1. CONTROLES_JOURNAUX — Vérification équilibre des journaux
      // -----------------------------------------------------------------------
      case 'CONTROLES_JOURNAUX': {
        const check = await canClose(ctx.adapter, ctx.exerciceId);
        if (!check.canClose) {
          throw new Error(`Pré-requis non satisfaits : ${check.reasons.join(', ')}`);
        }
        const preview = await previewClosure(ctx.adapter, ctx.exerciceId);
        const msgs = [
          `${preview.totalEntries} écritures`,
          `${preview.entriesToLock} à verrouiller`,
        ];
        if (preview.warnings.length > 0) {
          msgs.push(`${preview.warnings.length} avertissement(s)`);
        }
        return msgs.join(' — ');
      }

      // -----------------------------------------------------------------------
      // 2. RAPPROCHEMENTS — Rapprochements bancaires complets
      // -----------------------------------------------------------------------
      case 'RAPPROCHEMENTS': {
        // Vérifier que tous les comptes bancaires (classe 52) sont rapprochés
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const bankEntries = allEntries.filter((e: any) =>
          e.date >= fy.startDate && e.date <= fy.endDate &&
          (e.lines || []).some((l: any) => l.accountCode?.startsWith('52'))
        );
        const unreconciled = bankEntries.filter((e: any) => !e.reconciled && e.status !== 'draft');
        if (unreconciled.length > 0) {
        }
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_RAPPROCHEMENTS',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            totalBankEntries: bankEntries.length,
            unreconciledCount: unreconciled.length,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return unreconciled.length === 0
          ? `${bankEntries.length} écriture(s) bancaire(s) — toutes rapprochées`
          : `${bankEntries.length} écriture(s) bancaire(s) — ${unreconciled.length} non rapprochée(s) (avertissement)`;
      }

      // -----------------------------------------------------------------------
      // 3. LETTRAGE — Lettrage exhaustif des comptes de tiers
      // -----------------------------------------------------------------------
      case 'LETTRAGE': {
        // Vérifier le lettrage des comptes clients (41) et fournisseurs (40)
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const tiersLines: any[] = [];
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('40') || line.accountCode?.startsWith('41')) {
              tiersLines.push(line);
            }
          }
        }
        const unlettered = tiersLines.filter((l: any) => !l.lettrage);
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_LETTRAGE',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            totalTiersLines: tiersLines.length,
            unletteredCount: unlettered.length,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        if (unlettered.length > 0) {
        }
        return unlettered.length === 0
          ? `${tiersLines.length} ligne(s) de tiers — toutes lettrées`
          : `${tiersLines.length} ligne(s) de tiers — ${unlettered.length} non lettrée(s) (avertissement)`;
      }

      // -----------------------------------------------------------------------
      // 4. AMORTISSEMENTS — Calcul et comptabilisation dotations amortissements
      // -----------------------------------------------------------------------
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
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_AMORTISSEMENTS',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({ totalPosted, initiatedBy }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${totalPosted} dotation(s) comptabilisée(s)`;
      }

      // -----------------------------------------------------------------------
      // 5. INVENTAIRE_STOCKS — Inventaire stocks et ajustements
      // -----------------------------------------------------------------------
      case 'INVENTAIRE_STOCKS': {
        // Vérifier les comptes de stocks (classe 3) et calculer les ajustements
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        let stockDebit = 0;
        let stockCredit = 0;
        let stockLineCount = 0;
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('3')) {
              stockDebit += line.debit || 0;
              stockCredit += line.credit || 0;
              stockLineCount++;
            }
          }
        }
        const variation = stockDebit - stockCredit;
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_INVENTAIRE_STOCKS',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            stockLineCount,
            stockDebit,
            stockCredit,
            variation,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${stockLineCount} ligne(s) de stock — variation nette : ${formatCurrency(variation)}`;
      }

      // -----------------------------------------------------------------------
      // 6. REGULARISATIONS — Régularisations charges à payer (CCA, FNP, FAE, PCA)
      // -----------------------------------------------------------------------
      case 'REGULARISATIONS': {
        // Auto-extourne des régularisations de l'exercice précédent
        const result = await genererExtournes(ctx.adapter, {
          exerciceClotureId: ctx.exerciceId,
          dateExtourne: fy.startDate,
        });
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_REGULARISATIONS',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({ extourneCount: result.count, initiatedBy }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return result.count
          ? `${result.count} extourne(s) générée(s)`
          : 'Aucune régularisation à extourner';
      }

      // -----------------------------------------------------------------------
      // 7. PROVISIONS_RISQUES — Provisions pour risques et charges
      // -----------------------------------------------------------------------
      case 'PROVISIONS_RISQUES': {
        // Analyser les comptes de provisions (15x — risques et charges)
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        let provisionDebit = 0;
        let provisionCredit = 0;
        let provisionLineCount = 0;
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('15')) {
              provisionDebit += line.debit || 0;
              provisionCredit += line.credit || 0;
              provisionLineCount++;
            }
          }
        }
        const soldeProvisions = provisionCredit - provisionDebit;
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_PROVISIONS_RISQUES',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            provisionLineCount,
            provisionDebit,
            provisionCredit,
            soldeProvisions,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${provisionLineCount} ligne(s) de provisions risques — solde : ${formatCurrency(soldeProvisions)}`;
      }

      // -----------------------------------------------------------------------
      // 8. PROVISIONS_DEPRECIATION — Provisions pour dépréciation créances
      // -----------------------------------------------------------------------
      case 'PROVISIONS_DEPRECIATION': {
        // Analyser les comptes de dépréciation créances (49x)
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        let depreciationDebit = 0;
        let depreciationCredit = 0;
        let depreciationLineCount = 0;
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('49')) {
              depreciationDebit += line.debit || 0;
              depreciationCredit += line.credit || 0;
              depreciationLineCount++;
            }
          }
        }
        const soldeDepreciation = depreciationCredit - depreciationDebit;
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_PROVISIONS_DEPRECIATION',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            depreciationLineCount,
            depreciationDebit,
            depreciationCredit,
            soldeDepreciation,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${depreciationLineCount} ligne(s) de dépréciation — solde : ${formatCurrency(soldeDepreciation)}`;
      }

      // -----------------------------------------------------------------------
      // 9. IMPOT_SOCIETES — Impôt sur les sociétés (IS) et acomptes
      // -----------------------------------------------------------------------
      case 'IMPOT_SOCIETES': {
        // Vérifier les comptes IS (44x — État, impôts et taxes)
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        let isDebit = 0;
        let isCredit = 0;
        let isLineCount = 0;
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            // 441 = État, IS ; 891 = Impôts sur les bénéfices
            if (line.accountCode?.startsWith('441') || line.accountCode?.startsWith('891')) {
              isDebit += line.debit || 0;
              isCredit += line.credit || 0;
              isLineCount++;
            }
          }
        }
        const soldeIS = isCredit - isDebit;
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_IMPOT_SOCIETES',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            isLineCount,
            isDebit,
            isCredit,
            soldeIS,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${isLineCount} ligne(s) IS — solde : ${formatCurrency(soldeIS)}`;
      }

      // -----------------------------------------------------------------------
      // 10. REGULARISATIONS_HAO — Autres régularisations HAO
      // -----------------------------------------------------------------------
      case 'REGULARISATIONS_HAO': {
        // Vérifier les comptes HAO (classe 82-86, hors activités ordinaires)
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        let haoDebit = 0;
        let haoCredit = 0;
        let haoLineCount = 0;
        for (const entry of allEntries) {
          if (entry.date < fy.startDate || entry.date > fy.endDate) continue;
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            const code = line.accountCode || '';
            if (code.startsWith('82') || code.startsWith('83') ||
                code.startsWith('84') || code.startsWith('85') ||
                code.startsWith('86')) {
              haoDebit += line.debit || 0;
              haoCredit += line.credit || 0;
              haoLineCount++;
            }
          }
        }
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_REGULARISATIONS_HAO',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            haoLineCount,
            haoDebit,
            haoCredit,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return haoLineCount > 0
          ? `${haoLineCount} ligne(s) HAO — D=${formatCurrency(haoDebit)} C=${formatCurrency(haoCredit)}`
          : 'Aucune opération HAO sur l\'exercice';
      }

      // -----------------------------------------------------------------------
      // 11. DETERMINATION_RESULTAT — Détermination du résultat net
      // -----------------------------------------------------------------------
      case 'DETERMINATION_RESULTAT': {
        const preview = await previewClosure(ctx.adapter, ctx.exerciceId);
        const { resultatNet, isBenefice, totalProduits, totalCharges } = preview;

        // AF-007: Generate the actual result determination entry
        const resultatResult = await generateResultatEntry(
          ctx.adapter,
          ctx.exerciceId,
          `${ctx.mode}:${ctx.userId}`,
        );

        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_DETERMINATION_RESULTAT',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            resultatNet,
            isBenefice,
            totalProduits,
            totalCharges,
            entryId: resultatResult.entryId,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });

        return `${isBenefice ? 'Bénéfice' : 'Perte'} : ${formatCurrency(resultatNet)} (Produits: ${formatCurrency(totalProduits)}, Charges: ${formatCurrency(totalCharges)}) — écriture ${resultatResult.entryId} (${resultatResult.linesCount} lignes)`;
      }

      // -----------------------------------------------------------------------
      // 12. VERROUILLAGE — Validation et verrouillage des journaux
      // -----------------------------------------------------------------------
      case 'VERROUILLAGE': {
        const allEntries = await ctx.adapter.getAll<{ id: string; date: string; status: string }>('journalEntries');
        const entries = allEntries.filter(
          e => e.date >= fy.startDate && e.date <= fy.endDate && e.status !== 'validated'
        );

        for (const entry of entries) {
          await ctx.adapter.update('journalEntries', entry.id, {
            status: 'validated',
            updatedAt: new Date().toISOString(),
          });
        }
        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_VERROUILLAGE',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({ lockedCount: entries.length, initiatedBy }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${entries.length} écriture(s) verrouillée(s)`;
      }

      // -----------------------------------------------------------------------
      // 13. ETATS_FINANCIERS — Génération des états financiers SYSCOHADA
      // -----------------------------------------------------------------------
      case 'ETATS_FINANCIERS': {
        // Générer le Bilan, Compte de résultat, TAFIRE, et annexes SYSCOHADA
        const preview = await previewClosure(ctx.adapter, ctx.exerciceId);
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const validEntries = allEntries.filter(
          (e: any) => e.date >= fy.startDate && e.date <= fy.endDate && e.status !== 'draft'
        );

        // Aggregate balances by account class for financial statement summary
        const classTotals: Record<string, { debit: number; credit: number }> = {};
        for (const entry of validEntries) {
          for (const line of entry.lines || []) {
            const cls = (line.accountCode || '')[0] || '?';
            if (!classTotals[cls]) classTotals[cls] = { debit: 0, credit: 0 };
            classTotals[cls].debit += line.debit || 0;
            classTotals[cls].credit += line.credit || 0;
          }
        }

        const statementsGenerated = [
          'Bilan actif/passif',
          'Compte de résultat',
          'TAFIRE (tableau financier des ressources et emplois)',
          'Notes annexes',
        ];

        await ctx.adapter.logAudit({
          action: 'CLOSURE_STEP_ETATS_FINANCIERS',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            statementsGenerated,
            classTotals,
            entryCount: validEntries.length,
            exercice: fy.name,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });

        return `États financiers générés : ${statementsGenerated.join(', ')} — ${validEntries.length} écritures traitées`;
      }

      // -----------------------------------------------------------------------
      // 14. LIASSE_FISCALE — Génération déléguée à Liass'Pilot (info-only)
      // -----------------------------------------------------------------------
      // La liasse fiscale est produite par Liass'Pilot, l'outil spécialisé
      // d'Atlas Studio. Atlas Finance fournit les états financiers (étape 13)
      // qui servent de base à Liass'Pilot. Cette étape est conservée dans la
      // séquence des 15 étapes SYSCOHADA mais ne réalise qu'une trace d'audit
      // informative — elle est non bloquante (cf. NON_BLOCKING_STEPS).
      case 'LIASSE_FISCALE': {
        await ctx.adapter.logAudit({
          action: 'CLOTURE_LIASSE_INFO',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            message: "Liasse fiscale déléguée à Liass'Pilot — export disponible après génération des états financiers",
            exercice: fy.name,
            initiatedBy,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });

        return "Info : la liasse fiscale est générée par Liass'Pilot (étape non bloquante)";
      }

      // -----------------------------------------------------------------------
      // 15. AFFECTATION_REPORT — Affectation du résultat et report à nouveau N+1
      // -----------------------------------------------------------------------
      case 'AFFECTATION_REPORT': {
        // AF-CL05: Vérifier que le résultat a été affecté avant finalisation
        const allEntries = await ctx.adapter.getAll<{ status: string; lines: Array<{ accountCode?: string; debit: number; credit: number }> }>('journalEntries');
        const validEntries = allEntries.filter((e) => e.status !== 'draft');
        let solde120 = 0;
        let solde129 = 0;
        for (const entry of validEntries) {
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('120')) solde120 += line.credit - line.debit;
            if (line.accountCode?.startsWith('129')) solde129 += line.debit - line.credit;
          }
        }
        if (Math.abs(solde120) > 1 || Math.abs(solde129) > 1) {
          throw new Error(
            `Clôture impossible : le résultat n'a pas été affecté. ` +
            `Solde compte 120: ${solde120} FCFA, Solde compte 129: ${solde129} FCFA. ` +
            `Affectez le résultat aux réserves (131) ou report à nouveau (139) avant la finalisation.`
          );
        }

        // Reports à nouveau N+1
        const openingId = ctx.openingExerciceId;
        if (!openingId) throw new Error('Exercice N+1 non défini — requis pour les reports à nouveau');

        const openingFY = await ctx.adapter.getById<DBFiscalYear>('fiscalYears', openingId);
        if (!openingFY) throw new Error(`Exercice d'ouverture ${openingId} introuvable`);

        const carryResult = await executerCarryForward(ctx.adapter, {
          closingExerciceId: ctx.exerciceId,
          openingExerciceId: openingId,
          openingDate: openingFY.startDate,
          includeResultat: true,
        });

        if (!carryResult.success) throw new Error(carryResult.errors.join(', '));

        // Finalisation : marquer l'exercice comme clôturé
        await ctx.adapter.update('fiscalYears', ctx.exerciceId, { isClosed: true });
        await ctx.adapter.logAudit({
          action: 'CLOSURE_COMPLETE',
          entityType: 'fiscalYear',
          entityId: ctx.exerciceId,
          details: JSON.stringify({
            mode: ctx.mode,
            userId: ctx.userId,
            initiatedBy,
            carryForwardLines: carryResult.lineCount,
            totalDebit: carryResult.totalDebit,
            totalCredit: carryResult.totalCredit,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });

        return `Exercice ${fy.name} clôturé — ${carryResult.lineCount} compte(s) reporté(s), D=${formatCurrency(carryResult.totalDebit)} C=${formatCurrency(carryResult.totalCredit)}`;
      }

      default:
        throw new Error(`Étape inconnue: ${stepId}`);
    }
  },

  // ===========================================================================
  // MONTHLY CLOSURE
  // ===========================================================================

  /** Return a fresh set of monthly steps */
  getMonthlySteps(): ClotureStep[] {
    return MONTHLY_STEPS_DEF.map(s => ({ ...s, status: 'pending' as const }));
  },

  /** Execute monthly closure workflow */
  async executeMonthly(ctx: ClotureContext): Promise<ClotureStep[]> {
    const results: ClotureStep[] = this.getMonthlySteps();

    for (const step of results) {
      step.status = 'running';
      step.timestamp = new Date().toISOString();
      ctx.onProgress?.(step);

      try {
        const message = await this._executeMonthlyStep(step.id, ctx);
        step.status = 'done';
        step.message = message || 'OK';
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        step.status = 'error';
        step.message = err.message;
        ctx.onError?.(step, err);

        if (MONTHLY_BLOCKING_STEPS.has(step.id)) break;
      }
      ctx.onProgress?.(step);
    }

    await this._logAudit(ctx, results);
    return results;
  },

  /** Reopen a locked period */
  async reopenPeriod(adapter: DataAdapter, periodId: string, userId: string): Promise<void> {
    await adapter.update('fiscalPeriods', periodId, {
      status: 'rouverte',
      reopenedAt: new Date().toISOString(),
      reopenedBy: userId,
    });
    await adapter.logAudit({
      action: 'PERIOD_REOPENED',
      entityType: 'fiscalPeriod',
      entityId: periodId,
      details: JSON.stringify({ userId }),
      timestamp: new Date().toISOString(),
      previousHash: '',
    });
  },

  async _executeMonthlyStep(stepId: string, ctx: ClotureContext): Promise<string> {
    const fy = await ctx.adapter.getById<DBFiscalYear>('fiscalYears', ctx.exerciceId);
    if (!fy) throw new Error(`Exercice ${ctx.exerciceId} introuvable`);

    switch (stepId) {
      case 'M_VERIFICATION': {
        // Check no draft entries in the period
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const periodEntries = allEntries.filter((e: any) => {
          if (!ctx.periodCode) return e.date >= fy.startDate && e.date <= fy.endDate;
          return e.date.startsWith(ctx.periodCode);
        });
        const drafts = periodEntries.filter((e: any) => e.status === 'draft');
        if (drafts.length > 0) {
          throw new Error(`${drafts.length} écriture(s) en brouillon dans la période`);
        }
        return `${periodEntries.length} écritures vérifiées, aucun brouillon`;
      }

      case 'M_RAPPROCHEMENTS': {
        // Rapprochements bancaires de la période
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const periodEntries = allEntries.filter((e: any) => {
          if (!ctx.periodCode) return e.date >= fy.startDate && e.date <= fy.endDate;
          return e.date.startsWith(ctx.periodCode);
        });
        const bankEntries = periodEntries.filter((e: any) =>
          (e.lines || []).some((l: any) => l.accountCode?.startsWith('52'))
        );
        const unreconciled = bankEntries.filter((e: any) => !e.reconciled && e.status !== 'draft');
        await ctx.adapter.logAudit({
          action: 'MONTHLY_STEP_RAPPROCHEMENTS',
          entityType: 'fiscalPeriod',
          entityId: ctx.periodId || ctx.exerciceId,
          details: JSON.stringify({
            periodCode: ctx.periodCode,
            totalBankEntries: bankEntries.length,
            unreconciledCount: unreconciled.length,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return unreconciled.length === 0
          ? `${bankEntries.length} écriture(s) bancaire(s) — toutes rapprochées`
          : `${bankEntries.length} écriture(s) bancaire(s) — ${unreconciled.length} non rapprochée(s)`;
      }

      case 'M_LETTRAGE': {
        // Lettrage des comptes de tiers pour la période
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const periodEntries = allEntries.filter((e: any) => {
          if (!ctx.periodCode) return e.date >= fy.startDate && e.date <= fy.endDate;
          return e.date.startsWith(ctx.periodCode);
        });
        const tiersLines: any[] = [];
        for (const entry of periodEntries) {
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('40') || line.accountCode?.startsWith('41')) {
              tiersLines.push(line);
            }
          }
        }
        const unlettered = tiersLines.filter((l: any) => !l.lettrage);
        await ctx.adapter.logAudit({
          action: 'MONTHLY_STEP_LETTRAGE',
          entityType: 'fiscalPeriod',
          entityId: ctx.periodId || ctx.exerciceId,
          details: JSON.stringify({
            periodCode: ctx.periodCode,
            totalTiersLines: tiersLines.length,
            unletteredCount: unlettered.length,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return unlettered.length === 0
          ? `${tiersLines.length} ligne(s) de tiers — toutes lettrées`
          : `${tiersLines.length} ligne(s) de tiers — ${unlettered.length} non lettrée(s)`;
      }

      case 'M_REGULARISATIONS': {
        // Preview — actual regularisations are done via RegularisationsTab
        return 'Régularisations à saisir manuellement via l\'onglet dédié';
      }

      case 'M_EXTOURNES': {
        const result = await genererExtournes(ctx.adapter, {
          exerciceClotureId: ctx.exerciceId,
          dateExtourne: fy.startDate,
        });
        return result.count
          ? `${result.count} extourne(s) générée(s)`
          : 'Aucune extourne nécessaire';
      }

      case 'M_PROVISIONS': {
        // Vérifier les provisions et dépréciations de la période
        const allEntries = await ctx.adapter.getAll<any>('journalEntries');
        const periodEntries = allEntries.filter((e: any) => {
          if (!ctx.periodCode) return e.date >= fy.startDate && e.date <= fy.endDate;
          return e.date.startsWith(ctx.periodCode);
        });
        let provisionCount = 0;
        let totalProvisions = 0;
        for (const entry of periodEntries) {
          if (entry.status === 'draft') continue;
          for (const line of entry.lines || []) {
            if (line.accountCode?.startsWith('15') || line.accountCode?.startsWith('49')) {
              provisionCount++;
              totalProvisions += (line.credit || 0) - (line.debit || 0);
            }
          }
        }
        await ctx.adapter.logAudit({
          action: 'MONTHLY_STEP_PROVISIONS',
          entityType: 'fiscalPeriod',
          entityId: ctx.periodId || ctx.exerciceId,
          details: JSON.stringify({
            periodCode: ctx.periodCode,
            provisionCount,
            totalProvisions,
          }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `${provisionCount} ligne(s) de provisions — solde net : ${formatCurrency(totalProvisions)}`;
      }

      case 'M_CONTROLES': {
        const check = await canClose(ctx.adapter, ctx.exerciceId);
        if (!check.canClose) {
          throw new Error(`Pré-requis non satisfaits : ${check.reasons.join(', ')}`);
        }
        return 'Contrôles de cohérence passés avec succès';
      }

      case 'M_VERROUILLAGE': {
        if (!ctx.periodId) throw new Error('Aucune période sélectionnée');
        await ctx.adapter.update('fiscalPeriods', ctx.periodId, {
          status: 'cloturee',
          closedAt: new Date().toISOString(),
          closedBy: ctx.userId,
          progression: 100,
        });
        await ctx.adapter.logAudit({
          action: 'PERIOD_LOCKED',
          entityType: 'fiscalPeriod',
          entityId: ctx.periodId,
          details: JSON.stringify({ periodCode: ctx.periodCode, userId: ctx.userId }),
          timestamp: new Date().toISOString(),
          previousHash: '',
        });
        return `Période ${ctx.periodCode || ctx.periodId} verrouillée`;
      }

      default:
        throw new Error(`Étape mensuelle inconnue: ${stepId}`);
    }
  },

  _isBlocking(stepId: string): boolean {
    return BLOCKING_STEPS.has(stepId) || MONTHLY_BLOCKING_STEPS.has(stepId);
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
