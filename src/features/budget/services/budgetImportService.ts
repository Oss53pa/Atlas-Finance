import type { DataAdapter } from '@atlas/data';
import { inferBudgetType, type BudgetImportLine } from './budgetService';

/**
 * Validation d'import budgétaire en 3 passes (refonte OPEX/CAPEX — Lot 3, §10.3).
 * Aucune écriture partielle silencieuse : on classe chaque ligne valide/rejetée
 * AVANT toute écriture. Le rapport (motifs ligne à ligne) est rendu à l'utilisateur
 * qui choisit tout-ou-rien ou « accepter les valides » (l'écriture reste importBudget).
 *
 * Passe 1 structure · Passe 2 référentiels · Passe 3 montants.
 */

export interface RawImportRow {
  rowNumber: number;                              // n° de ligne source (rapport)
  account_code: string;
  section_code?: string | null;
  periods: Record<number, number | string>;      // brut (string FR tolérée)
}

export interface RejectedRow { rowNumber: number; account_code: string; reasons: string[]; }
export interface ClassifyResult { valid: BudgetImportLine[]; rejected: RejectedRow[]; }

export interface ClassifyContext {
  validSectionCodes: Set<string>;
  knownAccounts: Set<string>;
  allowedClasses?: string[];                      // défaut ['6','7','2']
  allowNegative?: boolean;                        // défaut false
}

/** Parse un montant au format FR ("1 234,56", espaces insécables) → number | NaN. */
export function parseMontantFR(v: number | string | null | undefined): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/ /g, '').replace(/\s/g, '').replace(/,/g, '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Classe les lignes en valides / rejetées (fonction pure, testable).
 * Détecte les doublons de maille (compte × section) au sein du lot.
 */
export function classifyImportRows(rows: RawImportRow[], ctx: ClassifyContext): ClassifyResult {
  const allowed = ctx.allowedClasses ?? ['6', '7', '2'];
  const valid: BudgetImportLine[] = [];
  const rejected: RejectedRow[] = [];

  // Détection des doublons de maille dans le lot (passe 1).
  const seen = new Map<string, number>();
  const dupKeys = new Set<string>();
  for (const r of rows) {
    const key = `${(r.account_code || '').trim()}|${(r.section_code || '').trim()}`;
    if (seen.has(key)) dupKeys.add(key); else seen.set(key, r.rowNumber);
  }

  for (const r of rows) {
    const reasons: string[] = [];
    const code = (r.account_code || '').trim();
    const section = (r.section_code || '').trim();
    const key = `${code}|${section}`;

    // Passe 1 — structure
    if (!code) reasons.push('Compte manquant');
    if (dupKeys.has(key)) reasons.push('Maille en doublon dans le fichier');

    // Passe 2 — référentiels
    if (code) {
      if (!allowed.includes(code[0])) reasons.push(`Classe ${code[0]} non autorisée (attendu ${allowed.join('/')})`);
      else if (!ctx.knownAccounts.has(code)) reasons.push('Compte inconnu au plan comptable');
    }
    if (section && !ctx.validSectionCodes.has(section)) reasons.push(`Section « ${section} » inconnue ou inactive`);

    // Passe 3 — montants
    const periods: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      const parsed = parseMontantFR(r.periods?.[m]);
      if (Number.isNaN(parsed)) { reasons.push(`Montant non numérique (mois ${m})`); continue; }
      if (parsed < 0 && !ctx.allowNegative) { reasons.push(`Montant négatif (mois ${m})`); continue; }
      periods[m] = Math.round(parsed * 100) / 100;
    }

    if (reasons.length) {
      rejected.push({ rowNumber: r.rowNumber, account_code: code, reasons });
    } else {
      valid.push({ account_code: code, budget_type: inferBudgetType(code), section_code: section || null, periods });
    }
  }
  return { valid, rejected };
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

/** Construit le contexte de validation (sections actives + comptes du plan) depuis la base. */
export async function buildImportContext(adapter: DataAdapter, opts?: Partial<ClassifyContext>): Promise<ClassifyContext> {
  const client = getClient(adapter);
  const validSectionCodes = new Set<string>();
  const knownAccounts = new Set<string>();
  if (client) {
    const [{ data: sections }, { data: accounts }] = await Promise.all([
      client.from('sections_analytiques').select('code').eq('actif', true),
      client.from('accounts').select('code'),
    ]);
    for (const s of sections ?? []) validSectionCodes.add(String(s.code).trim());
    for (const a of accounts ?? []) knownAccounts.add(String(a.code).trim());
  }
  return { validSectionCodes, knownAccounts, allowedClasses: ['6', '7', '2'], ...opts };
}

/** Valide un lot brut : renvoie le rapport (valides + rejetées) sans rien écrire. */
export async function validateImport(adapter: DataAdapter, rows: RawImportRow[]): Promise<ClassifyResult> {
  const ctx = await buildImportContext(adapter);
  return classifyImportRows(rows, ctx);
}
