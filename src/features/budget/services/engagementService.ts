import type { DataAdapter } from '@atlas/data';

/**
 * Registre des engagements & rapprochements (refonte OPEX/CAPEX — Lot 2).
 * Table pivot `budget_engagements` (+ `engagement_rapprochements`).
 *
 * L'engagé restant (net) = montant_initial − montant_facture − montant_degage,
 * clampé à ≥ 0. La bascule engagé→réalisé (montant_facture) est tenue par le
 * trigger DB `engagement_rapp_sync` à chaque rapprochement (invariant 3).
 * SaaS-only (client Supabase authentifié porté par l'adapter).
 */

export type EngagementSource = 'external' | 'manuel';
export type EngagementStatut = 'ouvert' | 'partiellement_facture' | 'solde' | 'annule' | 'surfacture';

export interface BudgetEngagement {
  id: string;
  tenant_id: string;
  source: EngagementSource;
  external_ref: string | null;
  account_code: string;
  section_id: string | null;
  capex_section_projet_id: string | null;
  periode: string;                 // ISO date (1er du mois)
  fournisseur_libelle: string | null;
  reference_document: string | null;
  montant_initial: number;
  montant_facture: number;
  montant_degage: number;
  statut: EngagementStatut;
  motif: string | null;
  contrat_recurrent: boolean;
  created_at: string;
}

export interface EngagementRapprochement {
  id: string;
  journal_line_id: string;
  engagement_id: string;
  montant: number;
  mode: 'saisie' | 'differe' | 'lettrage';
  created_at: string;
}

/** Engagé restant net d'un engagement (jamais négatif). */
export function engagementRestant(e: Pick<BudgetEngagement, 'montant_initial' | 'montant_facture' | 'montant_degage' | 'statut'>): number {
  if (e.statut === 'annule') return 0;
  return Math.max(0, (e.montant_initial || 0) - (e.montant_facture || 0) - (e.montant_degage || 0));
}

/** Normalise une date/ISO au 1er du mois (maille budgétaire mensuelle). */
export function firstOfMonth(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`;
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}
async function uidOf(client: any): Promise<string | null> {
  const { data } = await client.auth.getUser();
  return data?.user?.id ?? null;
}

function coerce(r: any): BudgetEngagement {
  return {
    ...r,
    montant_initial: Number(r.montant_initial) || 0,
    montant_facture: Number(r.montant_facture) || 0,
    montant_degage: Number(r.montant_degage) || 0,
  };
}

export interface EngagementFilters {
  statut?: EngagementStatut | EngagementStatut[];
  sectionId?: string;
  capexProjetId?: string;
  annee?: string;
}

export async function listEngagements(adapter: DataAdapter, filters: EngagementFilters = {}): Promise<BudgetEngagement[]> {
  const client = getClient(adapter);
  if (!client) return [];
  let q = client.from('budget_engagements').select('*').order('periode', { ascending: true });
  if (filters.statut) q = Array.isArray(filters.statut) ? q.in('statut', filters.statut) : q.eq('statut', filters.statut);
  if (filters.sectionId) q = q.eq('section_id', filters.sectionId);
  if (filters.capexProjetId) q = q.eq('capex_section_projet_id', filters.capexProjetId);
  if (filters.annee) q = q.gte('periode', `${filters.annee}-01-01`).lte('periode', `${filters.annee}-12-31`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(coerce);
}

export interface ManualEngagementInput {
  accountCode: string;
  sectionId?: string | null;
  capexProjetId?: string | null;
  periode: string | Date;
  montant: number;
  fournisseur?: string | null;
  reference?: string | null;
  motif: string;                    // obligatoire (saisie manuelle tracée)
  contratRecurrent?: boolean;
}

/** Saisie manuelle d'un engagement (contrats, marchés) — rôles contrôleur/DAF. */
export async function createManualEngagement(adapter: DataAdapter, input: ManualEngagementInput): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  if (!input.motif?.trim()) throw new Error('Le motif est obligatoire pour un engagement manuel.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const uid = await uidOf(client);
  const { data, error } = await client.from('budget_engagements').insert({
    tenant_id: tenant, source: 'manuel', external_ref: null,
    account_code: input.accountCode.trim(),
    section_id: input.sectionId ?? null,
    capex_section_projet_id: input.capexProjetId ?? null,
    periode: firstOfMonth(input.periode),
    fournisseur_libelle: input.fournisseur ?? null,
    reference_document: input.reference ?? null,
    montant_initial: Math.round((input.montant || 0) * 100) / 100,
    statut: 'ouvert', motif: input.motif.trim(),
    contrat_recurrent: !!input.contratRecurrent, created_by: uid,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

/**
 * Engagement récurrent de type contrat : génère N mensualités consécutives
 * (défaut 12) à partir de la période de départ, en une saisie. Renvoie les ids.
 */
export async function createRecurringEngagement(
  adapter: DataAdapter, input: ManualEngagementInput, months = 12,
): Promise<string[]> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  if (!input.motif?.trim()) throw new Error('Le motif est obligatoire.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const uid = await uidOf(client);
  const start = new Date(firstOfMonth(input.periode));
  const rows = Array.from({ length: Math.max(1, months) }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return {
      tenant_id: tenant, source: 'manuel', external_ref: null,
      account_code: input.accountCode.trim(),
      section_id: input.sectionId ?? null,
      capex_section_projet_id: input.capexProjetId ?? null,
      periode: firstOfMonth(d),
      fournisseur_libelle: input.fournisseur ?? null,
      reference_document: input.reference ?? null,
      montant_initial: Math.round((input.montant || 0) * 100) / 100,
      statut: 'ouvert', motif: input.motif.trim(),
      contrat_recurrent: true, created_by: uid,
    };
  });
  const { data, error } = await client.from('budget_engagements').insert(rows).select('id');
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => r.id);
}

/** Clôture manuelle : le reliquat non facturé part en dégagement, le disponible est libéré. */
export async function degageEngagement(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  const { data: e, error: e0 } = await client
    .from('budget_engagements').select('montant_initial,montant_facture,montant_degage,statut').eq('id', id).single();
  if (e0) throw new Error(e0.message);
  if (e.statut === 'annule') throw new Error('Engagement déjà annulé.');
  const reliquat = Math.max(0, Number(e.montant_initial) - Number(e.montant_facture) - Number(e.montant_degage));
  const totalDeg = Number(e.montant_degage) + reliquat;
  const { error } = await client.from('budget_engagements')
    .update({ montant_degage: totalDeg, statut: 'solde' }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Annulation sèche : l'engagement ne pèse plus sur le disponible. */
export async function annulerEngagement(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  const { error } = await client.from('budget_engagements').update({ statut: 'annule' }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Rapproche une écriture GL d'un engagement (liaison N↔N). Le trigger DB met à
 * jour montant_facture/statut de l'engagement (bascule engagé→réalisé atomique).
 */
export async function createRapprochement(
  adapter: DataAdapter,
  input: { journalLineId: string; engagementId: string; montant: number; mode?: 'saisie' | 'differe' | 'lettrage' },
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const { error } = await client.from('engagement_rapprochements').insert({
    tenant_id: tenant, journal_line_id: input.journalLineId, engagement_id: input.engagementId,
    montant: Math.round((input.montant || 0) * 100) / 100, mode: input.mode ?? 'saisie',
  });
  if (error) throw new Error(error.message);
}

export async function listRapprochements(adapter: DataAdapter, engagementId: string): Promise<EngagementRapprochement[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client
    .from('engagement_rapprochements').select('*').eq('engagement_id', engagementId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r: any) => ({ ...r, montant: Number(r.montant) || 0 }));
}

export async function deleteRapprochement(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Engagements disponibles en mode SaaS uniquement.');
  const { error } = await client.from('engagement_rapprochements').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
