/**
 * Plan de comptes SYCEBNL — comptes différenciants des entités non lucratives.
 *
 * ⚠️ RÉFÉRENCE INDICATIVE : structure des comptes propres au SYCEBNL (2023),
 * documentée mais à valider contre le plan officiel de l'entité. Ne remplace
 * PAS le plan SYSCOHADA : n'ajoute que les comptes SPÉCIFIQUES au secteur non
 * lucratif (fonds propres sans/avec droit de reprise, fonds dédiés, ressources
 * de type cotisations/dons/subventions/legs, et la mécanique de report des
 * ressources affectées). Les classes 2/3/4/5 restent celles du SYSCOHADA.
 */

import { resolveSycebnlPlanAccount } from './sycebnlPlan';

export interface SycebnlAccount {
  code: string;
  libelle: string;
  classe: number;
  /** Nature pour la présentation « ressources / emplois ». */
  nature: 'fonds_propres' | 'fonds_dedies' | 'subvention' | 'ressource' | 'emploi' | 'autre';
}

export const SYCEBNL_ACCOUNTS: SycebnlAccount[] = [
  // ── Classe 1 : Fonds propres et ressources assimilées ─────────────────────
  { code: '102', libelle: 'Fonds propres sans droit de reprise', classe: 1, nature: 'fonds_propres' },
  { code: '103', libelle: 'Fonds propres avec droit de reprise', classe: 1, nature: 'fonds_propres' },
  { code: '106', libelle: 'Réserves', classe: 1, nature: 'fonds_propres' },
  { code: '110', libelle: 'Report à nouveau', classe: 1, nature: 'fonds_propres' },
  { code: '120', libelle: "Résultat de l'exercice — Excédent", classe: 1, nature: 'fonds_propres' },
  { code: '129', libelle: "Résultat de l'exercice — Déficit", classe: 1, nature: 'fonds_propres' },
  // Fonds reportés et fonds dédiés (13) — cœur SYCEBNL
  { code: '131', libelle: 'Fonds dédiés sur subventions de fonctionnement', classe: 1, nature: 'fonds_dedies' },
  { code: '132', libelle: 'Fonds dédiés sur dons manuels affectés', classe: 1, nature: 'fonds_dedies' },
  { code: '133', libelle: 'Fonds dédiés sur legs et donations affectés', classe: 1, nature: 'fonds_dedies' },
  { code: '14',  libelle: "Subventions d'investissement", classe: 1, nature: 'subvention' },
  // ── Classe 6 : Charges (emplois) ──────────────────────────────────────────
  { code: '657', libelle: 'Aides financières et subventions accordées', classe: 6, nature: 'emploi' },
  { code: '689', libelle: 'Engagements à réaliser sur ressources affectées', classe: 6, nature: 'emploi' },
  // ── Classe 7 : Produits (ressources) ──────────────────────────────────────
  { code: '740', libelle: "Subventions d'exploitation", classe: 7, nature: 'subvention' },
  { code: '754', libelle: 'Cotisations', classe: 7, nature: 'ressource' },
  { code: '7551', libelle: 'Dons manuels', classe: 7, nature: 'ressource' },
  { code: '756', libelle: 'Legs et donations', classe: 7, nature: 'ressource' },
  { code: '789', libelle: 'Report des ressources non utilisées des exercices antérieurs', classe: 7, nature: 'ressource' },
];

const BY_CODE = new Map(SYCEBNL_ACCOUNTS.map(a => [a.code, a]));

/**
 * Libellé SYCEBNL d'un compte (préfixe le plus long). Cherche d'abord dans les
 * comptes différenciants, puis dans le plan complet (`SYCEBNL_PLAN`). '' si non
 * couvert par le référentiel SYCEBNL.
 */
export function getSycebnlLabel(code: string): string {
  const c = String(code || '');
  for (let len = c.length; len >= 2; len--) {
    const hit = BY_CODE.get(c.slice(0, len));
    if (hit) return hit.libelle;
  }
  return resolveSycebnlPlanAccount(c)?.libelle ?? '';
}

/** Compte de fonds dédiés (report des ressources affectées, 13x). */
export function isFondsDedies(code: string): boolean {
  return /^13/.test(String(code || ''));
}

/** Compte « engagements à réaliser sur ressources affectées » (dotation, 689). */
export const ENGAGEMENTS_RESSOURCES_AFFECTEES = '689';
/** Compte « report des ressources non utilisées » (reprise, 789). */
export const REPORT_RESSOURCES_NON_UTILISEES = '789';

/** Classe 7 = ressource, classe 6 = emploi (présentation ressources/emplois). */
export function natureRessourceEmploi(code: string): 'ressource' | 'emploi' | 'autre' {
  const c = String(code || '');
  if (c.startsWith('7')) return 'ressource';
  if (c.startsWith('6')) return 'emploi';
  return 'autre';
}
