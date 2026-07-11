import type { DataAdapter } from '@atlas/data';

/**
 * Gouvernance budgétaire par section analytique (refonte OPEX/CAPEX — Lot 1).
 *
 * Décision D1 : pas de table `org_units`. La hiérarchie organisationnelle EST
 * `sections_analytiques` (axes centre_cout / centre_profit / projet, arbre via parent_id).
 * Cette table attache à chaque section un *owner* (responsable de budget) et un
 * *contrôleur* (contrôleur de gestion référent) — c'est eux que le moteur de
 * validation (MVA) route pour BUD-SOUMISSION / BUD-REVISION, etc.
 *
 * Table `section_governance` (tenant_id → societes, unique (tenant_id, section_id)).
 */

export interface SectionGovernance {
  section_id: string;
  owner_user_id: string | null;
  controller_user_id: string | null;
}

/** Section analytique enrichie de sa gouvernance (pour les écrans org). */
export interface SectionOrgNode {
  id: string;
  code: string;
  libelle: string;
  parent_id: string | null;
  axe_id: string;
  type_axe: string | null;
  responsable: string | null;
  owner_user_id: string | null;
  controller_user_id: string | null;
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Gouvernance de toutes les sections du tenant, indexée par section_id. */
export async function listGovernance(
  adapter: DataAdapter,
): Promise<Record<string, SectionGovernance>> {
  const client = getClient(adapter);
  if (!client) return {};
  const { data, error } = await client
    .from('section_governance')
    .select('section_id,owner_user_id,controller_user_id');
  if (error) throw new Error(error.message);
  const out: Record<string, SectionGovernance> = {};
  for (const r of data || []) out[r.section_id] = r;
  return out;
}

/**
 * Arbre org = sections analytiques (axes centre_cout / centre_profit / projet)
 * jointes à leur gouvernance. Renvoyé à plat ; l'UI reconstruit la hiérarchie via parent_id.
 */
export async function listOrgTree(adapter: DataAdapter): Promise<SectionOrgNode[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client
    .from('sections_analytiques')
    .select('id,code,libelle,parent_id,axe_id,responsable,axes_analytiques(type_axe)')
    .eq('actif', true)
    .order('code', { ascending: true });
  if (error) throw new Error(error.message);
  const gov = await listGovernance(adapter);
  return (data || []).map((s: any) => ({
    id: s.id,
    code: s.code,
    libelle: s.libelle,
    parent_id: s.parent_id,
    axe_id: s.axe_id,
    type_axe: s.axes_analytiques?.type_axe ?? null,
    responsable: s.responsable,
    owner_user_id: gov[s.id]?.owner_user_id ?? null,
    controller_user_id: gov[s.id]?.controller_user_id ?? null,
  }));
}

/** Upsert (owner, contrôleur) d'une section — idempotent sur (tenant_id, section_id). */
export async function setSectionGovernance(
  adapter: DataAdapter,
  sectionId: string,
  gov: { ownerUserId?: string | null; controllerUserId?: string | null },
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Gouvernance disponible en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const { error } = await client
    .from('section_governance')
    .upsert(
      {
        tenant_id: tenant,
        section_id: sectionId,
        owner_user_id: gov.ownerUserId ?? null,
        controller_user_id: gov.controllerUserId ?? null,
      },
      { onConflict: 'tenant_id,section_id' },
    );
  if (error) throw new Error(error.message);
}

/**
 * Résout le contrôleur d'une section en remontant l'arbre (parent_id) jusqu'à
 * trouver un contrôleur défini. Utile au routage MVA quand une feuille n'a pas
 * de contrôleur propre mais hérite de celui de son département/direction.
 */
export function resolveController(
  nodes: SectionOrgNode[],
  sectionId: string,
): string | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let cur = byId.get(sectionId) ?? null;
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    if (cur.controller_user_id) return cur.controller_user_id;
    guard.add(cur.id);
    cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null;
  }
  return null;
}
