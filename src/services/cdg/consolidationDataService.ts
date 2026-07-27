/**
 * Alimentation du moteur de consolidation en données RÉELLES (cross-tenant).
 *
 * Le moteur (consolidationEngine) est pur : il consolide des balances par
 * entité. Ce service fournit ces balances, agrégées côté SERVEUR par l'Edge
 * Function `consolidation-balances` (l'app est mono-tenant sous RLS), qui ne
 * renvoie que les sociétés dont l'utilisateur est membre.
 */

import type { DataAdapter } from '@atlas/data';
import type { EntityBalance } from './consolidationEngine';

export interface ConsolidationBalancesResult {
  entities: EntityBalance[];
  generatedAt?: string;
}

/**
 * Charge les balances réelles des sociétés du périmètre via l'Edge Function.
 * En local/hors client, renvoie un périmètre vide (cross-tenant hors serveur).
 */
export async function getConsolidationBalances(
  adapter: DataAdapter,
  companyIds: string[],
): Promise<ConsolidationBalancesResult> {
  if (!companyIds || companyIds.length === 0) return { entities: [] };
  const client = (adapter as any).client;
  if (!client?.functions?.invoke) return { entities: [] };
  const { data, error } = await client.functions.invoke('consolidation-balances', {
    body: { companyIds },
  });
  if (error) throw new Error(error.message ?? 'Balances de consolidation indisponibles');
  const entities: EntityBalance[] = Array.isArray(data?.entities)
    ? data.entities.map((e: any) => ({
        societeId: e.societeId,
        soldes: e.soldes ?? {},
        resultat: Number(e.resultat ?? 0),
      }))
    : [];
  return { entities, generatedAt: data?.generatedAt };
}

/** Sépare mère et filiales à partir des entités et de l'id de la société mère. */
export function partitionEntities(
  entities: EntityBalance[],
  mereId: string,
): { mere: EntityBalance | null; filiales: EntityBalance[] } {
  const mere = entities.find(e => e.societeId === mereId) ?? null;
  const filiales = entities.filter(e => e.societeId !== mereId);
  return { mere, filiales };
}
