/**
 * planService — Plans analytiques (CDC §3.1).
 *
 * Un plan est un univers de ventilation autonome (« Projets », « Frais
 * Généraux »…), chacun avec son propre invariant de réconciliation. Les axes,
 * règles, ventilations et runs sont rattachés à un plan (plan_id NULL = legacy).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export type PlanStatut = 'actif' | 'gele' | 'clos';

export interface AnaPlan {
  id: string;
  code: string;
  libelle: string;
  statut: PlanStatut;
}

export async function listPlans(adapter: DataAdapter): Promise<AnaPlan[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('ana_plan').select('id,code,libelle,statut').order('code');
  return (data ?? []) as AnaPlan[];
}

export async function createPlan(adapter: DataAdapter, plan: { code: string; libelle: string }): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.from('ana_plan')
    .insert({ tenant_id: tenantOf(adapter), code: plan.code.trim(), libelle: plan.libelle.trim() })
    .select('id').single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

/** Retourne l'id du plan PRINCIPAL du tenant, le crée si absent. */
export async function ensureDefaultPlan(adapter: DataAdapter): Promise<string | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client.from('ana_plan').select('id').eq('code', 'PRINCIPAL').limit(1);
  if (data?.[0]?.id) return data[0].id;
  return createPlan(adapter, { code: 'PRINCIPAL', libelle: 'Plan principal' });
}
