/**
 * capexCarService — Contrôle de Gestion · Lot L3 (CDC §8).
 *
 * Gouvernance CAPEX : matrice d'approbation par seuils, décisions immuables
 * (hash d'audit, SoD), Post-Implementation Review. S'appuie sur capex_requests
 * (CAR) + tables fna_capex_*. Tenancy = societes (RLS).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
/**
 * Tenancy des tables fna_capex_* / fna_car : societe (get_user_company_id), cf.
 * migrations 20240101000082-83. Elles étaient scopées org_id (fna_auth_org_ids)
 * alors qu'aucun utilisateur n'a de ligne fna_user_orgs → matrice d'approbation,
 * décisions, PIR, notes et CAR étaient inaccessibles depuis l'application.
 */
async function tenantOf(client: any): Promise<string> {
  const { data } = await client.rpc('get_user_company_id');
  if (!data) throw new Error('Société courante introuvable.');
  return data as string;
}
function auditHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface ApprovalBracket {
  id: string;
  seuil_min: number;
  seuil_max: number | null;
  niveau: number;
  role_requis: string;
}

export interface CapexApproval {
  id: string;
  request_id: string;
  niveau: number;
  role: string | null;
  statut: 'pending' | 'approved' | 'rejected' | 'returned';
  decided_by: string | null;
  decided_at: string | null;
  commentaire: string | null;
  hash_audit: string | null;
}

// Modèle par défaut (CDC §4) — FCFA.
const DEFAULT_MATRIX = [
  { seuil_min: 0, seuil_max: 5_000_000, niveau: 1, role_requis: 'Responsable de centre' },
  { seuil_min: 5_000_000, seuil_max: 25_000_000, niveau: 2, role_requis: 'DAF' },
  { seuil_min: 25_000_000, seuil_max: 100_000_000, niveau: 3, role_requis: 'DG' },
  { seuil_min: 100_000_000, seuil_max: null, niveau: 4, role_requis: 'Conseil / Board' },
];

export async function listApprovalMatrix(adapter: DataAdapter): Promise<ApprovalBracket[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_capex_approval_matrix').select('*').order('seuil_min');
  return (data ?? []).map((r: any) => ({ ...r, seuil_min: Number(r.seuil_min) || 0, seuil_max: r.seuil_max != null ? Number(r.seuil_max) : null }));
}

/** Crée la matrice par défaut si aucune n'existe encore. */
export async function ensureDefaultMatrix(adapter: DataAdapter): Promise<ApprovalBracket[]> {
  const existing = await listApprovalMatrix(adapter);
  if (existing.length > 0) return existing;
  const client = getClient(adapter);
  if (!client) return [];
  const tenant = await tenantOf(client);
  const { error } = await client.from('fna_capex_approval_matrix').insert(DEFAULT_MATRIX.map(b => ({ tenant_id: tenant, ...b })));
  if (error) throw new Error(error.message);
  return listApprovalMatrix(adapter);
}

export async function upsertBracket(adapter: DataAdapter, b: { id?: string; seuil_min: number; seuil_max: number | null; niveau: number; role_requis: string }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const row = { tenant_id: await tenantOf(client), seuil_min: b.seuil_min, seuil_max: b.seuil_max, niveau: b.niveau, role_requis: b.role_requis };
  const { error } = b.id
    ? await client.from('fna_capex_approval_matrix').update(row).eq('id', b.id)
    : await client.from('fna_capex_approval_matrix').insert(row);
  if (error) throw new Error(error.message);
}

export async function deleteBracket(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_capex_approval_matrix').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Niveau/rôle d'approbation requis pour un montant.
 * Bornes : min INCLUSIF, max EXCLUSIF → partition propre [min, max[ sans
 * chevauchement. Un montant pile sur un seuil (ex. 5 000 000) bascule vers la
 * tranche SUPÉRIEURE (DAF), pas l'inférieure. La dernière tranche (seuil_max null)
 * reste ouverte à l'infini.
 */
export function requiredApprover(matrix: ApprovalBracket[], montant: number): ApprovalBracket | null {
  const m = Math.abs(montant);
  return matrix.find(b => m >= b.seuil_min && (b.seuil_max == null || m < b.seuil_max)) || null;
}

export async function listApprovals(adapter: DataAdapter, requestId: string): Promise<CapexApproval[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_capex_approval').select('*').eq('request_id', requestId).order('created_at');
  return (data ?? []) as CapexApproval[];
}

/**
 * Enregistre une décision d'approbation immuable (hash d'audit). SoD :
 * `decidedBy` doit différer du demandeur (contrôle côté UI/RLS applicatif).
 */
export async function recordApproval(adapter: DataAdapter, params: {
  requestId: string; niveau: number; role: string; statut: 'approved' | 'rejected' | 'returned';
  decidedBy?: string | null; commentaire?: string | null;
}): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const decidedAt = new Date().toISOString();
  const hash = auditHash([params.requestId, params.niveau, params.role, params.statut, params.decidedBy || '', decidedAt].join('|'));
  const { error } = await client.from('fna_capex_approval').insert({
    tenant_id: await tenantOf(client),
    request_id: params.requestId,
    niveau: params.niveau,
    role: params.role,
    statut: params.statut,
    decided_by: params.decidedBy || null,
    decided_at: decidedAt,
    commentaire: params.commentaire || null,
    hash_audit: hash,
  });
  if (error) throw new Error(error.message);
}

// ── Post-Implementation Review ───────────────────────────────────────────────
export interface CapexPir {
  id: string;
  request_id: string;
  cout_final: number | null;
  ecart_budget: number | null;
  van_ex_post: number | null;
  lecons: string | null;
  reviewed_at: string | null;
}

export async function getPir(adapter: DataAdapter, requestId: string): Promise<CapexPir | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client.from('fna_capex_pir').select('*').eq('request_id', requestId).maybeSingle();
  return data ? { ...data, cout_final: data.cout_final != null ? Number(data.cout_final) : null, ecart_budget: data.ecart_budget != null ? Number(data.ecart_budget) : null, van_ex_post: data.van_ex_post != null ? Number(data.van_ex_post) : null } : null;
}

export async function savePir(adapter: DataAdapter, requestId: string, pir: { cout_final: number; ecart_budget: number; van_ex_post: number; lecons: string; reviewedBy?: string | null }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const existing = await getPir(adapter, requestId);
  const row = {
    tenant_id: await tenantOf(client), request_id: requestId,
    cout_final: pir.cout_final, ecart_budget: pir.ecart_budget, van_ex_post: pir.van_ex_post,
    lecons: pir.lecons || null, reviewed_by: pir.reviewedBy || null, reviewed_at: new Date().toISOString(),
  };
  const { error } = existing
    ? await client.from('fna_capex_pir').update(row).eq('id', existing.id)
    : await client.from('fna_capex_pir').insert(row);
  if (error) throw new Error(error.message);
}

// ── CAR (objet distinct) — appropriation de fonds POST-validation/budget ──────
export type CarStatut = 'emise' | 'approuvee' | 'decaissee' | 'cloturee';

export interface Car {
  id: string;
  request_id: string;
  reference: string | null;
  montant_approprie: number;
  date_appropriation: string | null;
  justification: string | null;
  statut: CarStatut;
  created_at: string;
}

export async function listCars(adapter: DataAdapter, requestId: string): Promise<Car[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_car').select('*').eq('request_id', requestId).order('created_at');
  return (data ?? []).map((c: any) => ({ ...c, montant_approprie: Number(c.montant_approprie) || 0 })) as Car[];
}

/** Toutes les CAR du tenant (registre), avec le libellé du business case. */
export async function listAllCars(adapter: DataAdapter): Promise<Array<Car & { business_case?: string }>> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_car').select('*, capex_requests(libelle)').order('created_at', { ascending: false });
  return (data ?? []).map((c: any) => ({ ...c, montant_approprie: Number(c.montant_approprie) || 0, business_case: c.capex_requests?.libelle }));
}

export async function appropriatedTotal(adapter: DataAdapter, requestId: string): Promise<number> {
  const cars = await listCars(adapter, requestId);
  return cars.reduce((s, c) => s + c.montant_approprie, 0);
}

export async function createCar(adapter: DataAdapter, car: {
  requestId: string; reference?: string | null; montant_approprie: number;
  date_appropriation?: string | null; justification?: string | null; createdBy?: string | null;
}): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  // Tenancy = societe (get_user_company_id), comme le reste du module CAPEX.
  // Avant : org_id via fna_auth_org_ids('editor') — mais aucun utilisateur n'ayant
  // de ligne fna_user_orgs, la création échouait toujours et la RLS org bloquait
  // même la lecture → le CAR était inaccessible. Cf. migration 20240101000082.
  const { data: tenant } = await client.rpc('get_user_company_id');
  if (!tenant) throw new Error('Société courante introuvable.');
  const { data, error } = await client.from('fna_car').insert({
    tenant_id: tenant,
    request_id: car.requestId,
    reference: car.reference || null,
    montant_approprie: Math.round(car.montant_approprie),
    date_appropriation: car.date_appropriation || null,
    justification: car.justification || null,
    statut: 'emise',
    created_by: car.createdBy || null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

export async function setCarStatut(adapter: DataAdapter, id: string, statut: CarStatut): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_car').update({ statut }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCar(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_car').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Notes & attachements (bucket privé « documents ») ────────────────────────
export interface CapexNote {
  id: string;
  request_id: string;
  type: 'note' | 'attachment';
  contenu: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
}

export async function listNotes(adapter: DataAdapter, requestId: string): Promise<CapexNote[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_capex_note').select('*').eq('request_id', requestId).order('created_at', { ascending: false });
  return (data ?? []) as CapexNote[];
}

export async function addNote(adapter: DataAdapter, requestId: string, contenu: string, createdBy?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_capex_note').insert({
    tenant_id: await tenantOf(client), request_id: requestId, type: 'note', contenu, created_by: createdBy || null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Upload d'une pièce jointe dans le bucket privé `documents`, puis enregistrement.
 * Le chemin DOIT être `{organization_id}/{user_id}/…` pour satisfaire la RLS
 * storage (insert/select sur folder[1]=org, delete sur folder[2]=uid).
 */
export async function addAttachment(adapter: DataAdapter, requestId: string, file: File, userId?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  if (!userId) throw new Error('Session requise pour joindre un fichier.');
  // organization_id du profil (≠ societe) — exigé par la RLS du bucket documents.
  const { data: prof, error: profErr } = await client.from('profiles').select('organization_id').eq('id', userId).single();
  if (profErr || !prof?.organization_id) throw new Error('Organisation introuvable pour l’upload.');
  const orgId = String(prof.organization_id);
  const safeName = file.name.replace(/[^\w.\-]/g, '_');
  const path = `${orgId}/${userId}/capex/${requestId}/${Date.now()}_${safeName}`;
  const { error: upErr } = await client.storage.from('documents').upload(path, file, { upsert: false });
  if (upErr) throw new Error(upErr.message);
  const { error } = await client.from('fna_capex_note').insert({
    tenant_id: await tenantOf(client), request_id: requestId, type: 'attachment', file_name: file.name, file_path: path, created_by: userId,
  });
  if (error) throw new Error(error.message);
}

/** URL signée temporaire pour télécharger une pièce jointe. */
export async function getAttachmentUrl(adapter: DataAdapter, filePath: string): Promise<string | null> {
  const client = getClient(adapter);
  if (!client) return null;
  const { data } = await client.storage.from('documents').createSignedUrl(filePath, 3600);
  return data?.signedUrl || null;
}

export async function deleteNote(adapter: DataAdapter, note: CapexNote): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  if (note.type === 'attachment' && note.file_path) {
    await client.storage.from('documents').remove([note.file_path]).catch(() => {});
  }
  const { error } = await client.from('fna_capex_note').delete().eq('id', note.id);
  if (error) throw new Error(error.message);
}
