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
export type DupBlock = 'parametres' | 'conditions_paiement' | 'sites';

export const DUP_BLOCKS: Array<{ key: DupBlock; label: string }> = [
  { key: 'parametres',          label: 'Paramètres (valeurs de configuration)' },
  { key: 'conditions_paiement', label: 'Conditions de paiement' },
  { key: 'sites',               label: 'Sites / établissements' },
];

/** Valide le couple (source, cible). Fonction pure. Renvoie un message d'erreur ou null. */
export function validateDuplication(source: string, target: string, blocks: DupBlock[]): string | null {
  if (!source || !target) return 'Sélectionnez une société source et une société cible.';
  if (source === target) return 'La source et la cible doivent être différentes.';
  if (blocks.length === 0) return 'Sélectionnez au moins un bloc à copier.';
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

/** Duplique les blocs sélectionnés de source vers cible. Renvoie le rapport de copie. */
export async function duplicateConfig(adapter: DataAdapter, source: string, target: string, blocks: DupBlock[]): Promise<Record<string, number>> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.rpc('param_duplicate_config', { p_source: source, p_target: target, p_blocks: blocks });
  if (error) throw new Error(error.message);
  return (data ?? {}) as Record<string, number>;
}
