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
}): Promise<{ status: string; next_role?: string }> {
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

export const MVA_ERR: Record<string, string> = {
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
