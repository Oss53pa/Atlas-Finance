/**
 * Service MVA (Moteur de Validation Atlas) — bannette unifiée + soumission/acte.
 * SaaS uniquement (souveraineté serveur via Edge Functions wf-submit/wf-act).
 * Lectures des tables wf_* via le client Supabase (RLS SELECT tenant).
 */
import type { DataAdapter } from '@atlas/data';
import { roleSatisfies } from '../collaboration/services/collaborationService';

function client(adapter: DataAdapter): any | null {
  try {
    const c = (adapter as any).client;
    return (adapter.getMode?.() === 'saas' && c) ? c : null;
  } catch { return null; }
}

export interface WfInstance {
  id: string; object_type: string; object_id: string; object_hash: string; object_preview: any;
  status: string; current_stage: number; submitted_by: string; priority: string; created_at: string;
}
export interface BannetteTask {
  id: string; instance_id: string; position: number; required_role: string; sla_hours: number;
  due_at: string | null; status: string; created_at: string; instance: WfInstance | null;
}

/** Objets à valider par l'utilisateur courant (rôle couvrant l'étape en attente). */
export async function listBannette(adapter: DataAdapter, tenantId: string, role: string | undefined): Promise<BannetteTask[]> {
  const c = client(adapter);
  if (!c) return [];
  const { data: tasks } = await c.from('wf_task').select('*').eq('tenant_id', tenantId).eq('status', 'pending');
  const list = (tasks ?? []).filter((t: any) => roleSatisfies(role, t.required_role));
  const ids = [...new Set(list.map((t: any) => t.instance_id))];
  const map: Record<string, WfInstance> = {};
  if (ids.length) {
    const { data: insts } = await c.from('wf_instance').select('*').in('id', ids);
    for (const i of insts ?? []) map[i.id] = i;
  }
  return list
    .map((t: any) => ({ ...t, instance: map[t.instance_id] ?? null }))
    .filter((t: BannetteTask) => t.instance && t.instance.status === 'in_review')
    .sort((a: BannetteTask, b: BannetteTask) => (a.due_at || '').localeCompare(b.due_at || ''));
}

/** Audit chaîné d'une instance (wf_event). */
export async function listInstanceEvents(adapter: DataAdapter, instanceId: string): Promise<any[]> {
  const c = client(adapter);
  if (!c) return [];
  const { data } = await c.from('wf_event').select('*').eq('instance_id', instanceId).order('created_at', { ascending: true });
  return data ?? [];
}

async function sha256Hex(s: string): Promise<string> {
  try {
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return String(Date.now()); }
}

/** Soumet un objet au moteur (Validatable.serialize côté appelant → hash + preview). */
export async function wfSubmit(adapter: DataAdapter, d: {
  objectType: string; objectId: string; preview: any; payload: any; priority?: 'normal' | 'urgent';
}): Promise<{ instanceId: string; definition: string; stages: any[] }> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('MVA disponible en mode SaaS.');
  const objectHash = await sha256Hex(JSON.stringify({ t: d.objectType, id: d.objectId, p: d.payload, v: d.preview }));
  const { data, error } = await c.functions.invoke('wf-submit', { body: {
    object_type: d.objectType, object_id: d.objectId, object_hash: objectHash,
    object_preview: d.preview, payload: d.payload, priority: d.priority ?? 'normal',
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return { instanceId: data.instance_id, definition: data.definition, stages: data.stages };
}

export async function wfAct(adapter: DataAdapter, d: {
  taskId: string; action: 'approve' | 'reject'; motiveCode?: string; comment?: string;
  signed?: boolean; actorName?: string; via?: string;
}): Promise<{ status: string; next_role?: string; quarantine_until?: string | null }> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('MVA disponible en mode SaaS.');
  const { data, error } = await c.functions.invoke('wf-act', { body: {
    task_id: d.taskId, action: d.action, motive_code: d.motiveCode, comment: d.comment,
    signed: d.signed, actor_name: d.actorName, acted_via: d.via ?? 'bannette',
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return data;
}

// ── Bannette unifiée : décisions d'espace (Partie B) dans le même parapheur ──
export interface DecisionInboxItem {
  approvalId: string; decisionId: string; requiredRole: string;
  ref: string; title: string; amount_xof: number | null; space_id: string;
  current_step: number; chain_len: number; mine: boolean;
}
export async function listDecisionInbox(adapter: DataAdapter, tenantId: string, role: string | undefined, userId: string): Promise<DecisionInboxItem[]> {
  const c = client(adapter);
  if (!c) return [];
  const { data: apprs } = await c.from('space_decision_approval').select('*').eq('tenant_id', tenantId).eq('status', 'pending');
  const list = (apprs ?? []).filter((a: any) => roleSatisfies(role, a.required_role));
  const ids = [...new Set(list.map((a: any) => a.decision_id))];
  if (!ids.length) return [];
  const { data: decs } = await c.from('space_decision').select('id,ref,title,amount_xof,space_id,status,current_step,chain,author_id').in('id', ids);
  const map: Record<string, any> = Object.fromEntries((decs ?? []).map((d: any) => [d.id, d]));
  return list
    .filter((a: any) => map[a.decision_id]?.status === 'in_approval')
    .map((a: any) => { const d = map[a.decision_id]; return { approvalId: a.id, decisionId: a.decision_id, requiredRole: a.required_role, ref: d.ref, title: d.title, amount_xof: d.amount_xof, space_id: d.space_id, current_step: d.current_step, chain_len: Array.isArray(d.chain) ? d.chain.length : 1, mine: String(d.author_id) === String(userId) }; });
}
export async function decisionAct(adapter: DataAdapter, d: { decisionId: string; action: 'approve' | 'reject'; motiveCode?: string; actorName?: string }): Promise<any> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('MVA disponible en mode SaaS.');
  const { data, error } = await c.functions.invoke('decision-act', { body: { decision_id: d.decisionId, action: d.action, motive_code: d.motiveCode, actor_name: d.actorName, acted_via: 'bannette' } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return data;
}

// ── Bordereaux (journal_batch, Partie D) ─────────────────────────────────────
export interface BatchLine {
  id: string; position: number; line_ref: string; account_code: string | null; label: string | null;
  amount_xof: number; included: boolean; is_exception: boolean; exception_reason: string | null;
}
export async function listBatchLines(adapter: DataAdapter, instanceId: string): Promise<BatchLine[]> {
  const c = client(adapter);
  if (!c) return [];
  const { data } = await c.from('wf_batch_line').select('*').eq('instance_id', instanceId).order('position');
  return data ?? [];
}
export async function wfBatchSubmit(adapter: DataAdapter, batch: {
  journal_code: string; period?: string; source?: string; lines: { line_ref: string; account_code: string; label: string; amount_xof: number }[];
}): Promise<any> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('MVA disponible en mode SaaS.');
  const { data, error } = await c.functions.invoke('wf-batch-submit', { body: { batch } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return data;
}
export async function wfBatchAct(adapter: DataAdapter, d: {
  taskId: string; action: 'approve' | 'approve_excluding' | 'reject'; excludeRefs?: string[];
  motiveCode?: string; actorName?: string; signed?: boolean;
}): Promise<any> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('MVA disponible en mode SaaS.');
  const { data, error } = await c.functions.invoke('wf-batch-act', { body: {
    task_id: d.taskId, action: d.action, exclude_refs: d.excludeRefs, motive_code: d.motiveCode, actor_name: d.actorName, signed: d.signed,
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return data;
}

export const MVA_ERR: Record<string, string> = {
  BATCH_TOO_LARGE: 'Bordereau trop volumineux (> 1000 lignes) — découpage requis.',
  NOT_A_BATCH: 'Cet objet n\'est pas un bordereau.',
  NO_EXCLUSION: 'Sélectionnez au moins une ligne à exclure.',
  ROLE_REQUIRED: 'Validation réservée au rôle requis de cette étape.',
  SOD_AUTHOR: 'Séparation des tâches : l\'auteur ne valide pas son objet.',
  SOD_DISTINCT: 'Séparation des tâches : validateurs distincts par étape.',
  SIGNATURE_REQUIRED: 'Signature requise pour cette étape.',
  INVALIDATED_OBJECT_CHANGED: 'L\'objet a changé depuis la soumission — dossier invalidé.',
  NOT_IN_REVIEW: 'Dossier déjà clôturé.', STEP_NOT_ACTIONABLE: 'Étape non actionnable.',
  MOTIVE_REQUIRED: 'Motif de rejet obligatoire.', NO_WORKFLOW: 'Aucun circuit défini pour ce type/montant.',
  ALREADY_IN_REVIEW: 'Un dossier de validation est déjà en cours pour cet objet.',
};
export const mvaErr = (code?: string) => (code && MVA_ERR[code]) || code || 'Échec de l\'opération';

export const OBJECT_TYPE_LABELS: Record<string, string> = {
  journal_entry: 'Écriture', entry_reversal: 'Extourne', journal_batch: 'Bordereau',
  reconciliation_session: 'Rapprochement', period_close: 'Clôture', partner_master: 'Fiche tiers', payment_batch: 'Lot de paiement',
};
