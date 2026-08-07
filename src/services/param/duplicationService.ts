/**
 * duplicationService — duplication de paramétrage société→société (CDC §3, critère #7).
 *
 * S'appuie sur la fonction souveraine `param_duplicate_config` (SECURITY DEFINER,
 * autorisation par appartenance aux deux sociétés). Copie des blocs plats
 * (paramètres, conditions de paiement, sites) — jamais de données vivantes ni
 * nominatives. Renvoie un rapport de copie.
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

export interface MyCompany { id: string; nom: string; code: string; role: string | null; }
export type DupBlock = 'parametres' | 'conditions_paiement' | 'sites' | 'analytique';

/** `labelKey` et non `label` : la couche service ne fabrique pas de libellé
 *  traduit — l'appelant résout la clé au rendu. */
export const DUP_BLOCKS: Array<{ key: DupBlock; labelKey: string }> = [
  { key: 'parametres',          labelKey: 'duplication.blockParams' },
  { key: 'conditions_paiement', labelKey: 'duplication.blockPaymentTerms' },
  { key: 'sites',               labelKey: 'duplication.blockSites' },
  { key: 'analytique',          labelKey: 'duplication.blockAnalytics' },
];

/** Code d'erreur de validation — traduit par l'appelant. */
export type DuplicationError = 'source_target_required' | 'same_company' | 'no_block';

/** Valide le couple (source, cible). Fonction pure. Renvoie un code d'erreur ou null. */
export function validateDuplication(source: string, target: string, blocks: DupBlock[]): DuplicationError | null {
  if (!source || !target) return 'source_target_required';
  if (source === target) return 'same_company';
  if (blocks.length === 0) return 'no_block';
  return null;
}

/** Sociétés de l'utilisateur courant (pour choisir source & cible). */
export async function listMyCompanies(adapter: DataAdapter): Promise<MyCompany[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.rpc('list_my_companies');
  if (error) throw new Error(error.message);
  return (data ?? []) as MyCompany[];
}

/**
 * Duplique les blocs sélectionnés de source vers cible. Renvoie le rapport de
 * copie fusionné. Les blocs plats passent par param_duplicate_config ; le bloc
 * « analytique » (graphe avec remapping d'ID) passe par ana_duplicate_referentiel.
 */
export async function duplicateConfig(adapter: DataAdapter, source: string, target: string, blocks: DupBlock[]): Promise<Record<string, any>> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  let report: Record<string, any> = {};

  const flat = blocks.filter(b => b !== 'analytique');
  if (flat.length) {
    const { data, error } = await client.rpc('param_duplicate_config', { p_source: source, p_target: target, p_blocks: flat });
    if (error) throw new Error(error.message);
    report = { ...report, ...(data ?? {}) };
  }

  if (blocks.includes('analytique')) {
    const { data, error } = await client.rpc('ana_duplicate_referentiel', { p_source: source, p_target: target });
    if (error) throw new Error(error.message);
    report = { ...report, analytique: data ?? {} };
  }

  return report;
}
