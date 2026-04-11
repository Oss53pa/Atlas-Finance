/**
 * postSaveAnalysis.ts
 *
 * Background analysis of a just-saved journal entry against SYSCOHADA rules.
 * Non-blocking — the save has already succeeded; this provides advisory
 * warnings via a lightweight BREX + audit pass on the books.
 *
 * Wired from {@link ../../components/accounting/JournalEntryModal} so every
 * successful save triggers a non-blocking SYSCOHADA sanity check.
 */
import type { DataAdapter } from '@atlas/data';

export type PostSaveSeverity = 'bloquant' | 'majeur' | 'mineur' | 'info';

export interface PostSaveWarning {
  severity: PostSaveSeverity;
  code: string;
  message: string;
  article?: string;
  suggestion?: string;
}

export interface PostSaveAnalysisResult {
  warnings: PostSaveWarning[];
  hasBloquants: boolean;
  hasMajeurs: boolean;
  summary: string;
}

/**
 * Normalize any severity-like value (from BREX or audit) to our 4-level enum.
 */
function normalizeSeverity(raw: unknown): PostSaveSeverity {
  if (typeof raw !== 'string') return 'mineur';
  const v = raw.toLowerCase();
  if (v.includes('bloc')) return 'bloquant';
  if (v.includes('majeur') || v === 'erreur') return 'majeur';
  if (v.includes('info')) return 'info';
  return 'mineur';
}

/**
 * Analyze the books after a journal entry is saved.
 * Runs BREX business rules + a lightweight audit cycle on "fondamentaux".
 *
 * All errors are swallowed silently — this is an advisory pass, never
 * a blocker. Callers should simply ignore rejections.
 */
export async function analyzeEntryPostSave(
  adapter: DataAdapter
): Promise<PostSaveAnalysisResult> {
  const warnings: PostSaveWarning[] = [];

  // 1) BREX business rules — call the tool directly on the balance.
  try {
    const brexModule = await import('./tools/controle/MoteurReglesBrex').catch(() => null);
    const tool = brexModule?.brexTools?.appliquer_regles_brex;
    if (tool && typeof tool.execute === 'function') {
      const raw = await tool.execute({}, adapter);
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const violations: unknown[] = Array.isArray(parsed?.violations) ? parsed.violations : [];
      for (const vRaw of violations) {
        const v = vRaw as Record<string, unknown>;
        const type = typeof v.type === 'string' ? v.type : 'alerte';
        const severity: PostSaveSeverity =
          type === 'blocage' ? 'bloquant'
          : type === 'suggestion' ? 'info'
          : 'majeur';
        warnings.push({
          severity,
          code: String(v.regle_id || v.id || 'BREX'),
          message: String(v.message || v.nom || 'Règle métier SYSCOHADA'),
          article: typeof v.reference_legale === 'string' ? v.reference_legale : undefined,
        });
      }
    }
  } catch {
    /* silent — analysis is advisory */
  }

  // 2) Light audit cycle — fondamentaux only, niveau max 3.
  try {
    const auditModule = await import('./audit').catch(() => null);
    const runner = auditModule?.runAuditCycle;
    if (typeof runner === 'function') {
      const result: unknown = await runner(adapter, 'fondamentaux', 3);
      const resultats: unknown[] = Array.isArray((result as { resultats?: unknown[] })?.resultats)
        ? (result as { resultats: unknown[] }).resultats
        : [];
      for (const cRaw of resultats) {
        const c = cRaw as Record<string, unknown>;
        const statut = typeof c.statut === 'string' ? c.statut : '';
        if (statut === 'ALERTE' || statut === 'ERREUR') {
          warnings.push({
            severity: normalizeSeverity(c.severite),
            code: String(c.ref || 'AUDIT'),
            message: String(c.message || c.libelle || 'Contrôle audit SYSCOHADA'),
            article: typeof c.reference === 'string' ? c.reference : undefined,
          });
        }
      }
    }
  } catch {
    /* silent */
  }

  const hasBloquants = warnings.some((w) => w.severity === 'bloquant');
  const hasMajeurs = warnings.some((w) => w.severity === 'majeur');
  const summary =
    warnings.length === 0
      ? 'Aucune anomalie détectée — écriture conforme SYSCOHADA.'
      : `${warnings.length} alerte(s) SYSCOHADA : ` +
        `${warnings.filter((w) => w.severity === 'bloquant').length} bloquante(s), ` +
        `${warnings.filter((w) => w.severity === 'majeur').length} majeure(s).`;

  return { warnings, hasBloquants, hasMajeurs, summary };
}
