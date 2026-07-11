import type { DataAdapter } from '@atlas/data';

/**
 * Service des campagnes budgétaires (refonte OPEX/CAPEX — Lot 1).
 * Cycle : preparation → ouverte → consolidation → arbitrage → votee → cloturee (§11 CDC).
 * Table `budget_campagnes` (tenant_id → societes, RLS get_user_company_id()).
 *
 * Toutes les fonctions prennent `adapter: DataAdapter` en 1er paramètre (pattern maison).
 * SaaS-only : en mode local le client est null → no-op sûr (liste vide / erreur explicite).
 */

export type CampagneStatut =
  | 'preparation' | 'ouverte' | 'consolidation' | 'arbitrage' | 'votee' | 'cloturee';

export interface BudgetCampagne {
  id: string;
  tenant_id: string;
  fiscal_year_id: string;
  libelle: string;
  statut: CampagneStatut;
  date_ouverture: string | null;
  date_limite_soumission: string | null;
  date_vote: string | null;
  taux_indexation_defaut: number | null;
  created_at: string;
}

/** Ordre légal des transitions de statut de campagne. */
const CAMPAGNE_FLOW: Record<CampagneStatut, CampagneStatut[]> = {
  preparation: ['ouverte'],
  ouverte: ['consolidation'],
  consolidation: ['arbitrage', 'ouverte'], // retour possible si soumissions incomplètes
  arbitrage: ['votee', 'consolidation'],
  votee: ['cloturee'],
  cloturee: [],
};

export function canTransitionCampagne(from: CampagneStatut, to: CampagneStatut): boolean {
  return CAMPAGNE_FLOW[from]?.includes(to) ?? false;
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

export async function listCampagnes(adapter: DataAdapter): Promise<BudgetCampagne[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client
    .from('budget_campagnes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({
    ...r,
    taux_indexation_defaut: r.taux_indexation_defaut == null ? null : Number(r.taux_indexation_defaut),
  }));
}

export async function getCampagne(adapter: DataAdapter, id: string): Promise<BudgetCampagne | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data, error } = await client.from('budget_campagnes').select('*').eq('id', id).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function createCampagne(
  adapter: DataAdapter,
  input: {
    fiscalYearId: string;
    libelle: string;
    dateOuverture?: string | null;
    dateLimiteSoumission?: string | null;
    dateVote?: string | null;
    tauxIndexationDefaut?: number | null;
  },
): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Campagnes disponibles en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const { data, error } = await client
    .from('budget_campagnes')
    .insert({
      tenant_id: tenant,
      fiscal_year_id: input.fiscalYearId,
      libelle: input.libelle.trim(),
      statut: 'preparation',
      date_ouverture: input.dateOuverture ?? null,
      date_limite_soumission: input.dateLimiteSoumission ?? null,
      date_vote: input.dateVote ?? null,
      taux_indexation_defaut: input.tauxIndexationDefaut ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function updateCampagne(
  adapter: DataAdapter,
  id: string,
  patch: Partial<Pick<BudgetCampagne,
    'libelle' | 'date_ouverture' | 'date_limite_soumission' | 'date_vote' | 'taux_indexation_defaut'>>,
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Campagnes disponibles en mode SaaS uniquement.');
  const { error } = await client.from('budget_campagnes').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Transition de statut contrôlée (refuse les sauts illégaux). */
export async function setCampagneStatut(
  adapter: DataAdapter,
  id: string,
  to: CampagneStatut,
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Campagnes disponibles en mode SaaS uniquement.');
  const current = await getCampagne(adapter, id);
  if (!current) throw new Error('Campagne introuvable.');
  if (current.statut === to) return;
  if (!canTransitionCampagne(current.statut, to)) {
    throw new Error(`Transition interdite : ${current.statut} → ${to}.`);
  }
  const { error } = await client.from('budget_campagnes').update({ statut: to }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCampagne(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Campagnes disponibles en mode SaaS uniquement.');
  const current = await getCampagne(adapter, id);
  if (current && current.statut !== 'preparation') {
    throw new Error('Seule une campagne en préparation peut être supprimée.');
  }
  const { error } = await client.from('budget_campagnes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
