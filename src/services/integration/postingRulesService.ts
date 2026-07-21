/**
 * Détermination comptable — accès et résolution des règles de posting.
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L2
 *
 * Généralise `stock_gl_determination` (clés SAP BSX/GBB/WRX/PRD/UMB) à tous
 * les types d'événements de la Suite Atlas. C'est ICI, et nulle part ailleurs,
 * que se décide quel compte SYSCOHADA porte quel rôle fonctionnel.
 */

import type { DataAdapter } from '@atlas/data';
import type { LineRole, PostingRule } from './types';

/** Cache par tenant — les règles changent rarement, le posting les lit souvent. */
let rulesCache: { key: string; rules: PostingRule[]; ts: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidatePostingRulesCache(): void {
  rulesCache = null;
}

export async function getPostingRules(
  adapter: DataAdapter,
  eventType?: string,
): Promise<PostingRule[]> {
  const key = `${adapter.getMode()}:${eventType ?? '*'}`;
  if (rulesCache && rulesCache.key === key && Date.now() - rulesCache.ts < CACHE_TTL_MS) {
    return rulesCache.rules;
  }
  const rows = await adapter.getAll<PostingRule>(
    'postingRules',
    eventType ? { where: { eventType } } : undefined,
  );
  const rules = (rows ?? []).filter(r => r.active !== false);
  rulesCache = { key, rules, ts: Date.now() };
  return rules;
}

/**
 * Résout la règle applicable à un rôle de ligne.
 *
 * Spécificité décroissante : `matchKey` exact d'abord, repli sur la règle par
 * défaut (`matchKey === ''`). À spécificité égale, `priority` la plus basse
 * gagne (convention SQL : 50 = spécifique, 100 = défaut).
 *
 * Retourne `null` si aucune règle : l'appelant DOIT rejeter l'événement.
 * Jamais de compte deviné.
 */
export function resolveRule(
  rules: PostingRule[],
  eventType: string,
  lineRole: LineRole | string,
  matchKey?: string,
): PostingRule | null {
  const candidates = rules.filter(
    r => r.eventType === eventType && r.lineRole === lineRole && r.active !== false,
  );
  if (candidates.length === 0) return null;

  const byKey = matchKey
    ? candidates.filter(r => r.matchKey === matchKey)
    : [];
  const pool = byKey.length > 0 ? byKey : candidates.filter(r => !r.matchKey);
  if (pool.length === 0) return null;

  return [...pool].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))[0];
}

export async function upsertPostingRule(
  adapter: DataAdapter,
  rule: Partial<PostingRule> & { eventType: string; lineRole: string },
): Promise<PostingRule> {
  invalidatePostingRulesCache();
  if (rule.id) {
    return adapter.update<PostingRule>('postingRules', rule.id, rule);
  }
  return adapter.create<PostingRule>('postingRules', {
    matchKey: '',
    analytic: false,
    thirdParty: false,
    priority: rule.matchKey ? 50 : 100,
    active: true,
    ...rule,
  } as any);
}

export async function deletePostingRule(adapter: DataAdapter, id: string): Promise<void> {
  invalidatePostingRulesCache();
  await adapter.delete('postingRules', id);
}

/**
 * Contrôle de complétude : quels rôles d'un type d'événement n'ont aucune règle ?
 *
 * Alimente l'écran d'administration — un trou de paramétrage doit se voir
 * AVANT qu'un satellite n'émette, pas après le rejet du premier événement.
 */
export function findMissingRules(
  rules: PostingRule[],
  eventType: string,
  requiredRoles: Array<LineRole | string>,
): string[] {
  return requiredRoles.filter(role => !resolveRule(rules, eventType, role));
}
