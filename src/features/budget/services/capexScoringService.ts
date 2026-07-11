import type { DataAdapter } from '@atlas/data';

/**
 * Priorisation du portefeuille CAPEX (refonte OPEX/CAPEX — Lot 5, §17).
 * Score composite déterministe (poids paramétrables) + ligne de flottaison vs
 * enveloppe. Les BC obligatoires (conformité/sécurité) sont servis hors classement.
 * Calcul 100 % code — PROPH3T ne produit aucun chiffre.
 */

export interface ScoringCritere { critere: string; poids: number; }

export const DEFAULT_CRITERIA: ScoringCritere[] = [
  { critere: 'van', poids: 0.25 },
  { critere: 'tri', poids: 0.15 },
  { critere: 'payback', poids: 0.10 },
  { critere: 'categorie', poids: 0.25 },
  { critere: 'risque', poids: 0.15 },
  { critere: 'urgence', poids: 0.10 },
];

/** Grille de score stratégique par catégorie (0..1). Conformité/sécurité = max. */
const CATEGORIE_SCORE: Record<string, number> = {
  conformite_reglementaire: 1, securite_hsse: 1, croissance: 0.8,
  productivite: 0.6, it_digital: 0.6, remplacement: 0.4,
};

export interface BcScoringInput {
  id: string;
  libelle: string;
  montant: number;            // investissement
  van: number | null;
  tri: number | null;
  paybackMois: number | null;
  categorie: string | null;
  riskPI: number;             // P×I moyen (0..25)
  obligatoire: boolean;
  urgence: boolean;
}

export interface RankedBc extends BcScoringInput {
  score: number;              // 0..100
  cumul: number;              // montant cumulé (obligatoires puis classés)
  passe: boolean;             // sous la ligne de flottaison (dans l'enveloppe)
}

const minMax = (vals: number[]) => {
  const mn = Math.min(...vals), mx = Math.max(...vals);
  return (v: number) => (mx === mn ? 0.5 : (v - mn) / (mx - mn));
};

/**
 * Classe les BC : score composite normalisé (min-max sur l'ensemble), obligatoires
 * en tête hors classement, puis ligne de flottaison cumulée vs enveloppe. Fonction pure.
 */
export function computeRanking(items: BcScoringInput[], weights: ScoringCritere[], enveloppe: number): RankedBc[] {
  if (items.length === 0) return [];
  const w = Object.fromEntries(weights.map((c) => [c.critere, c.poids]));
  const wsum = weights.reduce((s, c) => s + c.poids, 0) || 1;

  const vanRatio = items.map((i) => (i.montant > 0 && i.van != null ? i.van / i.montant : 0));
  const tri = items.map((i) => i.tri ?? 0);
  const paybackInv = items.map((i) => (i.paybackMois && i.paybackMois > 0 ? -i.paybackMois : 0)); // moins = mieux -> négatif pour min-max
  const nVan = minMax(vanRatio), nTri = minMax(tri), nPb = minMax(paybackInv);

  const scored = items.map((i, idx) => {
    const norm: Record<string, number> = {
      van: nVan(vanRatio[idx]),
      tri: nTri(tri[idx]),
      payback: nPb(paybackInv[idx]),
      categorie: i.categorie ? (CATEGORIE_SCORE[i.categorie] ?? 0.5) : 0.5,
      risque: 1 - Math.min(1, i.riskPI / 25),
      urgence: i.urgence ? 1 : 0,
    };
    const score = (Object.entries(norm).reduce((s, [k, v]) => s + (w[k] ?? 0) * v, 0) / wsum) * 100;
    return { ...i, score: Math.round(score * 10) / 10 };
  });

  // obligatoires d'abord (hors classement), puis par score décroissant
  scored.sort((a, b) => Number(b.obligatoire) - Number(a.obligatoire) || b.score - a.score);

  let cumul = 0;
  return scored.map((s) => {
    cumul += s.montant;
    return { ...s, cumul, passe: s.obligatoire || cumul <= enveloppe };
  });
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Critères du tenant (settings via table), sinon défauts. Seed idempotent au besoin. */
export async function listCriteria(adapter: DataAdapter): Promise<ScoringCritere[]> {
  const client = getClient(adapter);
  if (!client) return DEFAULT_CRITERIA;
  const { data } = await client.from('capex_scoring_criteres').select('critere,poids').eq('actif', true);
  if (!data || data.length === 0) return DEFAULT_CRITERIA;
  return data.map((r: any) => ({ critere: r.critere, poids: Number(r.poids) || 0 }));
}

export async function ensureDefaultCriteria(adapter: DataAdapter): Promise<void> {
  const client = getClient(adapter);
  if (!client) return;
  const tenant = await tenantOf(client);
  if (!tenant) return;
  const { data } = await client.from('capex_scoring_criteres').select('id').limit(1);
  if (data && data.length > 0) return;
  await client.from('capex_scoring_criteres').insert(
    DEFAULT_CRITERIA.map((c) => ({ tenant_id: tenant, critere: c.critere, poids: c.poids })),
  );
}
