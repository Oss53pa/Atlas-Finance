/**
 * Alias Tiers — Mapping statique sous-compte SYSCOHADA → préfixe alias
 * Conforme au plan comptable SYSCOHADA révisé (classes 4 et 5)
 */

export interface AliasPrefixMapping {
  sousCompteCode: string;
  prefix: string;
  typeLabel: string;
}

/**
 * Mapping statique : sous-compte 3 chiffres → préfixe alias
 */
export const ALIAS_PREFIX_MAPPINGS: AliasPrefixMapping[] = [
  // Classe 4 — Tiers
  { sousCompteCode: '411', prefix: 'CLL', typeLabel: 'Client local' },
  { sousCompteCode: '412', prefix: 'CLE', typeLabel: 'Client étranger' },
  { sousCompteCode: '401', prefix: 'FRL', typeLabel: 'Fournisseur local' },
  { sousCompteCode: '402', prefix: 'FRE', typeLabel: 'Fournisseur étranger' },
  { sousCompteCode: '421', prefix: 'E', typeLabel: 'Employé' },
  { sousCompteCode: '431', prefix: 'OS', typeLabel: 'Organisme social' },
  // Classe 5 — Trésorerie
  { sousCompteCode: '521', prefix: 'BL', typeLabel: 'Banque locale' },
  { sousCompteCode: '522', prefix: 'BE', typeLabel: 'Banque étrangère' },
  { sousCompteCode: '523', prefix: 'BE', typeLabel: 'Banque étrangère' },
  { sousCompteCode: '571', prefix: 'C', typeLabel: 'Caisse' },
  { sousCompteCode: '572', prefix: 'C', typeLabel: 'Caisse' },
  { sousCompteCode: '573', prefix: 'C', typeLabel: 'Caisse' },
  { sousCompteCode: '531', prefix: 'ME', typeLabel: 'Mobile/Électronique' },
  { sousCompteCode: '532', prefix: 'ME', typeLabel: 'Mobile/Électronique' },
];

const prefixMap = new Map(ALIAS_PREFIX_MAPPINGS.map(m => [m.sousCompteCode, m]));

/**
 * Retourne le préfixe alias pour un sous-compte donné (3 chiffres).
 */
export function getPrefixForSousCompte(sousCompteCode: string): string | null {
  return prefixMap.get(sousCompteCode)?.prefix ?? null;
}

/**
 * Vérifie si un sous-compte est éligible à un alias tiers.
 */
export function isAliasEligible(sousCompteCode: string): boolean {
  return prefixMap.has(sousCompteCode);
}

/**
 * Retourne le label du type d'alias (ex: "Client local") pour un sous-compte.
 */
export function getAliasTypeLabel(sousCompteCode: string): string | null {
  return prefixMap.get(sousCompteCode)?.typeLabel ?? null;
}
