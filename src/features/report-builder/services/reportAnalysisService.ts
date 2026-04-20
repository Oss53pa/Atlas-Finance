/**
 * Report Analysis Service — Calls PROPH3T (ProphetV2) to analyze a report
 * and returns commentaires, recommandations, prédictions, alertes, and a health score.
 *
 * Gracefully falls back to a heuristic analysis when PROPH3T is unavailable.
 */
import type { DataAdapter } from '@atlas/data';
import type { PeriodSelection } from '../types';
import { fetchKPIValue } from './blockDataService';
import { ProphetV2Service } from '../../../services/prophet/ProphetV2';

export type AnalysisScope = 'bilan' | 'resultat' | 'tafire' | 'global';

export interface ReportAnalysisResult {
  commentaires: string[];
  recommandations: string[];
  predictions: string[];
  alertes: string[];
  /** 0..100 — health score */
  score: number;
  /** Whether the AI was actually reached (false = fallback heuristic used) */
  usedAI: boolean;
  /** ISO timestamp */
  generatedAt: string;
}

interface AnalyzeReportInput {
  adapter: DataAdapter;
  period: PeriodSelection;
  scope?: AnalysisScope;
  countryCode?: string;
}

/**
 * Run a full analysis of the report data using PROPH3T.
 * Returns structured findings usable by the Report Builder UI.
 */
export async function analyzeReport(
  input: AnalyzeReportInput,
): Promise<ReportAnalysisResult> {
  const { adapter, period, scope = 'global', countryCode = 'CI' } = input;

  // 1) Pre-compute a compact snapshot so the LLM has something to chew on.
  const snapshot = await buildSnapshot(adapter, period);

  // 2) Heuristic baseline (used both as AI context and as fallback).
  const baseline = buildHeuristic(snapshot, scope);

  // 3) Try PROPH3T.
  try {
    const prophet = new ProphetV2Service({ countryCode }, adapter);
    prophet.setAdapter(adapter);
    const prompt = buildPrompt(scope, snapshot, baseline);
    const response = await prophet.send(prompt);
    const parsed = tryParseJSON(response.content);
    if (parsed) {
      return {
        commentaires: toStringArray(parsed.commentaires) ?? baseline.commentaires,
        recommandations: toStringArray(parsed.recommandations) ?? baseline.recommandations,
        predictions: toStringArray(parsed.predictions) ?? baseline.predictions,
        alertes: toStringArray(parsed.alertes) ?? baseline.alertes,
        score: typeof parsed.score === 'number' ? clamp(parsed.score, 0, 100) : baseline.score,
        usedAI: true,
        generatedAt: new Date().toISOString(),
      };
    }
    // AI responded but we couldn't parse JSON — use its free-form text as a commentaire.
    if (response.content) {
      return {
        ...baseline,
        commentaires: [response.content, ...baseline.commentaires],
        usedAI: true,
        generatedAt: new Date().toISOString(),
      };
    }
  } catch {
    // fall through to baseline
  }

  return { ...baseline, usedAI: false, generatedAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface Snapshot {
  ca: number;
  resultatNet: number;
  ebitda: number;
  margeBrute: number;
  tresorerieNette: number;
  bfr: number;
  dso: number;
  dpo: number;
  ratioLiquidite: number;
  ratioEndettement: number;
  caf: number;
  variationTresorerie: number;
}

async function buildSnapshot(adapter: DataAdapter, period: PeriodSelection): Promise<Snapshot> {
  const get = async (src: string) => {
    try {
      const r = await fetchKPIValue(adapter, src, period);
      return r.value ?? 0;
    } catch {
      return 0;
    }
  };

  return {
    ca: await get('kpi.ca_total'),
    resultatNet: await get('kpi.resultat_net'),
    ebitda: await get('kpi.ebitda'),
    margeBrute: await get('kpi.marge_brute'),
    tresorerieNette: await get('kpi.tresorerie_nette'),
    bfr: await get('kpi.bfr'),
    dso: await get('kpi.dso'),
    dpo: await get('kpi.dpo'),
    ratioLiquidite: await get('kpi.ratio_liquidite'),
    ratioEndettement: await get('kpi.ratio_endettement'),
    caf: await get('kpi.caf'),
    variationTresorerie: await get('kpi.variation_tresorerie'),
  };
}

function buildHeuristic(s: Snapshot, scope: AnalysisScope): ReportAnalysisResult {
  const commentaires: string[] = [];
  const recommandations: string[] = [];
  const predictions: string[] = [];
  const alertes: string[] = [];
  let score = 70; // neutral baseline

  if (s.ca > 0) {
    const margeNette = (s.resultatNet / s.ca) * 100;
    commentaires.push(
      `CA de la période : ${fmt(s.ca)} FCFA ; marge nette ${margeNette.toFixed(1)}%.`,
    );
    if (margeNette > 10) score += 10;
    if (margeNette < 0) { score -= 20; alertes.push('Marge nette négative — pertes sur la période.'); }
  } else {
    commentaires.push('Aucun chiffre d\'affaires détecté sur la période.');
    score -= 10;
  }

  if (s.ratioLiquidite > 0 && s.ratioLiquidite < 1) {
    alertes.push(`Ratio de liquidité critique (${s.ratioLiquidite.toFixed(2)}).`);
    recommandations.push('Renforcer la trésorerie ou rééchelonner la dette à court terme.');
    score -= 15;
  } else if (s.ratioLiquidite >= 1.5) {
    score += 5;
  }

  if (s.ratioEndettement > 200) {
    alertes.push(`Taux d'endettement élevé : ${s.ratioEndettement.toFixed(0)}%.`);
    recommandations.push('Réduire l\'endettement ou renforcer les fonds propres.');
    score -= 10;
  }

  if (s.dso > 60) {
    recommandations.push(`DSO élevé (${s.dso.toFixed(0)}j) — intensifier le recouvrement.`);
    score -= 5;
  }
  if (s.dpo > 90) {
    recommandations.push(`DPO élevé (${s.dpo.toFixed(0)}j) — attention aux relations fournisseurs.`);
  }

  if (s.caf > 0) {
    predictions.push(`CAF positive (${fmt(s.caf)} FCFA) — capacité à autofinancer les investissements.`);
  } else if (s.caf < 0) {
    predictions.push('CAF négative — la structure ne dégage pas de ressources internes suffisantes.');
    score -= 10;
  }

  if (s.variationTresorerie < 0) {
    predictions.push(`Variation de trésorerie négative (${fmt(s.variationTresorerie)} FCFA) — vigilance.`);
  }

  // Scope-specific hints
  if (scope === 'tafire') {
    commentaires.push(`Analyse orientée TAFIRE : CAF ${fmt(s.caf)} FCFA, Variation trésorerie ${fmt(s.variationTresorerie)} FCFA.`);
  } else if (scope === 'bilan') {
    commentaires.push(`Structure bilan : BFR ${fmt(s.bfr)} FCFA, Ratio liquidité ${s.ratioLiquidite.toFixed(2)}.`);
  } else if (scope === 'resultat') {
    commentaires.push(`Performance : EBITDA ${fmt(s.ebitda)} FCFA, Marge brute ${s.margeBrute.toFixed(1)}%.`);
  }

  if (commentaires.length === 0) commentaires.push('Analyse heuristique générée (PROPH3T indisponible).');
  if (recommandations.length === 0) recommandations.push('Aucune recommandation critique détectée.');
  if (predictions.length === 0) predictions.push('Pas de prédiction saillante sur cette période.');
  if (alertes.length === 0) alertes.push('Aucune alerte critique.');

  return {
    commentaires,
    recommandations,
    predictions,
    alertes,
    score: clamp(Math.round(score), 0, 100),
    usedAI: false,
    generatedAt: new Date().toISOString(),
  };
}

function buildPrompt(scope: AnalysisScope, s: Snapshot, baseline: ReportAnalysisResult): string {
  return [
    'Analyse financière SYSCOHADA — réponds STRICTEMENT en JSON valide (UTF-8).',
    `Scope: ${scope}`,
    'Snapshot KPIs (FCFA):',
    JSON.stringify(s, null, 2),
    'Baseline heuristique (à enrichir) :',
    JSON.stringify(
      {
        commentaires: baseline.commentaires,
        recommandations: baseline.recommandations,
        predictions: baseline.predictions,
        alertes: baseline.alertes,
        score: baseline.score,
      },
      null,
      2,
    ),
    '',
    'Retourne UNIQUEMENT un objet JSON de forme :',
    '{',
    '  "commentaires": ["..."],',
    '  "recommandations": ["..."],',
    '  "predictions": ["..."],',
    '  "alertes": ["..."],',
    '  "score": 0-100',
    '}',
  ].join('\n');
}

function tryParseJSON(text: string): Record<string, unknown> | null {
  if (!text) return null;
  // Try strict JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract first {...} block
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function toStringArray(v: unknown): string[] | null {
  if (Array.isArray(v) && v.every(x => typeof x === 'string')) return v as string[];
  if (typeof v === 'string') return [v];
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/,/g, ' ');
}
