import type { DataAdapter } from '@atlas/data';

/**
 * Émission du CAR (Capital Appropriation Request) — refonte OPEX/CAPEX (Lot 5, §18).
 *
 * À partir d'un Business Case APPROUVÉ, s'approprie les fonds : crée le projet
 * (capex_projets) et sa section analytique de l'axe Projet (ancrage du réalisé GL
 * classe 2/23), puis passe le BC en 'car_emis'. Transaction séquencée côté service
 * (tenant_id). NB : fna_car n'est pas utilisé (RLS org_id non migrée) — le projet
 * tenant_id porte l'appropriation.
 */

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}

/** Axe analytique de type 'projet' (créé si absent). Renvoie son id. */
async function ensureProjetAxe(client: any, tenant: string): Promise<string> {
  const { data: found } = await client.from('axes_analytiques').select('id').eq('type_axe', 'projet').limit(1);
  if (found?.[0]) return found[0].id;
  const { data, error } = await client.from('axes_analytiques')
    .insert({ tenant_id: tenant, code: 'PROJET', libelle: 'Projets CAPEX', type_axe: 'projet', actif: true })
    .select('id').single();
  if (error) throw new Error(error.message);
  return data.id;
}

export interface CarEmissionResult { projectId: string; code: string; sectionId: string; }

/** Émet le CAR d'un BC approuvé : projet + section projet + statut car_emis. */
export async function emitCar(adapter: DataAdapter, requestId: string): Promise<CarEmissionResult> {
  const client = getClient(adapter);
  if (!client) throw new Error('Émission CAR disponible en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');

  const { data: bc, error: e0 } = await client
    .from('capex_requests').select('id,libelle,account_code,section_id,statut,date_prevue,montant').eq('id', requestId).single();
  if (e0) throw new Error(e0.message);
  if (!['approuve', 'approuve_avec_conditions'].includes(bc.statut)) {
    throw new Error(`Le BC doit être approuvé pour émettre le CAR (statut actuel : ${bc.statut}).`);
  }

  // idempotence : projet déjà émis pour ce BC ?
  const { data: existing } = await client.from('capex_projets').select('id,code,section_analytique_projet_id').eq('request_id', requestId).limit(1);
  if (existing?.[0]) return { projectId: existing[0].id, code: existing[0].code, sectionId: existing[0].section_analytique_projet_id };

  const axeId = await ensureProjetAxe(client, tenant);
  const { count } = await client.from('capex_projets').select('id', { count: 'exact', head: true });
  const code = `CPX-${String((count ?? 0) + 1).padStart(4, '0')}`;

  // section analytique du projet (ancrage du réalisé)
  const { data: sec, error: e1 } = await client.from('sections_analytiques')
    .insert({ tenant_id: tenant, axe_id: axeId, code, libelle: bc.libelle, actif: true })
    .select('id').single();
  if (e1) throw new Error(e1.message);

  const { data: proj, error: e2 } = await client.from('capex_projets').insert({
    tenant_id: tenant, request_id: requestId, code, libelle: bc.libelle,
    section_id: bc.section_id ?? null, section_analytique_projet_id: sec.id,
    statut: 'en_execution', date_mise_en_service_cible: bc.date_prevue ?? null,
  }).select('id').single();
  if (e2) throw new Error(e2.message);

  const { error: e3 } = await client.from('capex_requests').update({ statut: 'car_emis' }).eq('id', requestId);
  if (e3) throw new Error(e3.message);

  return { projectId: proj.id, code, sectionId: sec.id };
}

export interface CapexProjet {
  id: string; request_id: string; code: string; libelle: string;
  section_id: string | null; section_analytique_projet_id: string | null;
  statut: string; date_debut: string | null; date_mise_en_service_cible: string | null; date_mise_en_service_reelle: string | null;
}

export async function listProjets(adapter: DataAdapter): Promise<CapexProjet[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('capex_projets').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getProjet(adapter: DataAdapter, id: string): Promise<CapexProjet | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client.from('capex_projets').select('*').eq('id', id).limit(1);
  return data?.[0] ?? null;
}
