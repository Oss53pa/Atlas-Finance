/**
 * États de gouvernance MVA (Doc Maître §C10) — lecture seule. Registre des
 * circuits actifs, matrice « qui valide quoi » générée des données (le document
 * du CAC), statistiques (délais, taux/motifs de rejet). Lit les tables wf_* via
 * le client Supabase (RLS SELECT tenant).
 */
import type { DataAdapter } from '@atlas/data';
import { OBJECT_TYPE_LABELS } from './mvaService';

function client(adapter: DataAdapter): any | null {
  try { const c = (adapter as any).client; return (adapter.getMode?.() === 'saas' && c) ? c : null; } catch { return null; }
}

export interface CircuitStage { position: number; name: string | null; required_role: string; signature_level: string; sla_hours: number; escalate_to_role: string | null; }
export interface Circuit { id: string; object_type: string; name: string; version: number; is_default: boolean; stages: CircuitStage[]; }
export interface RoutingRule { object_type: string; condition: string; definition_name: string; chain: string[]; is_default: boolean; rule_id?: string; active?: boolean; }
export interface GovStats {
  byStatus: Record<string, number>;
  total: number; applied: number; rejected: number; inReview: number;
  rejectionRate: number; motives: Record<string, number>; avgResolutionDays: number | null;
}

function humanCondition(conditions: any): string {
  if (!conditions || Object.keys(conditions).length === 0) return 'par défaut';
  const parts: string[] = [];
  if (conditions.amount_xof?.gte != null) parts.push(`montant ≥ ${Number(conditions.amount_xof.gte).toLocaleString('fr-FR')}`);
  if (conditions.amount_xof?.lt != null) parts.push(`montant < ${Number(conditions.amount_xof.lt).toLocaleString('fr-FR')}`);
  if (conditions.journal_code?.in) parts.push(`journal ∈ {${conditions.journal_code.in.join(', ')}}`);
  if (conditions.account_class?.in) parts.push(`classe ∈ {${conditions.account_class.in.join(', ')}}`);
  if (conditions.flags?.contains) parts.push(`indicateur : ${conditions.flags.contains.join(', ')}`);
  return parts.join(' · ') || 'condition';
}

export interface GovernanceData {
  circuits: Circuit[];
  matrix: RoutingRule[];
  stats: GovStats;
  registry: { object_type: string; label: string; sensitivity: string; batchable: boolean }[];
}

export async function loadGovernance(adapter: DataAdapter, tenantId: string): Promise<GovernanceData | null> {
  const c = client(adapter);
  if (!c) return null;
  const [defsR, stagesR, rulesR, instR, tasksR, regR] = await Promise.all([
    c.from('wf_definition').select('*').eq('tenant_id', tenantId),
    c.from('wf_stage').select('*').eq('tenant_id', tenantId).order('position'),
    c.from('wf_rule').select('*').eq('tenant_id', tenantId).order('priority'),
    c.from('wf_instance').select('id,object_type,status,created_at,closed_at').eq('tenant_id', tenantId),
    c.from('wf_task').select('required_role,status,motive_code').eq('tenant_id', tenantId),
    c.from('wf_object_registry').select('*'),
  ]);
  const defs = defsR.data ?? [], stages = stagesR.data ?? [], rules = rulesR.data ?? [];
  const instances = instR.data ?? [], tasks = tasksR.data ?? [], registry = regR.data ?? [];

  const stagesByDef: Record<string, CircuitStage[]> = {};
  for (const s of stages) (stagesByDef[s.definition_id] ||= []).push({ position: s.position, name: s.name, required_role: s.required_role, signature_level: s.signature_level, sla_hours: s.sla_hours, escalate_to_role: s.escalate_to_role });
  const circuits: Circuit[] = defs.filter((d: any) => d.status === 'active').map((d: any) => ({
    id: d.id, object_type: d.object_type, name: d.name, version: d.version, is_default: d.is_default,
    stages: (stagesByDef[d.id] || []).sort((a, b) => a.position - b.position),
  }));
  const defById: Record<string, Circuit> = Object.fromEntries(circuits.map(c2 => [c2.id, c2]));

  // Matrice « qui valide quoi » : règles de routage + circuit par défaut par type.
  const matrix: RoutingRule[] = [];
  for (const r of rules) {
    const def = defById[r.definition_id];
    if (!def) continue;
    matrix.push({ object_type: r.object_type, condition: humanCondition(r.conditions), definition_name: def.name, chain: def.stages.map(s => s.required_role), is_default: false, rule_id: r.id, active: r.active });
  }
  for (const d of circuits.filter(c2 => c2.is_default)) {
    matrix.push({ object_type: d.object_type, condition: 'par défaut', definition_name: d.name, chain: d.stages.map(s => s.required_role), is_default: true });
  }

  // Statistiques.
  const byStatus: Record<string, number> = {};
  for (const i of instances) byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  const applied = byStatus['applied'] || 0, rejected = byStatus['rejected'] || 0, inReview = byStatus['in_review'] || 0;
  const motives: Record<string, number> = {};
  for (const t of tasks) if (t.status === 'rejected' && t.motive_code) motives[t.motive_code] = (motives[t.motive_code] || 0) + 1;
  const closed = instances.filter((i: any) => i.closed_at);
  const avgResolutionDays = closed.length ? closed.reduce((s: number, i: any) => s + (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime()), 0) / closed.length / 86400000 : null;

  return {
    circuits, matrix,
    stats: { byStatus, total: instances.length, applied, rejected, inReview, rejectionRate: (applied + rejected) ? rejected / (applied + rejected) : 0, motives, avgResolutionDays },
    registry: registry.map((r: any) => ({ object_type: r.object_type, label: r.label, sensitivity: r.sensitivity, batchable: r.batchable })),
  };
}

// ── Simulation à blanc (client, read-only) & administration (Edge Function) ──
export async function simulateCircuit(adapter: DataAdapter, tenantId: string, objectType: string, payload: any): Promise<{ definitionName: string; stages: CircuitStage[] } | null> {
  const c = client(adapter);
  if (!c) return null;
  const { data: defId } = await c.rpc('wf_resolve_definition', { p_tenant: tenantId, p_object_type: objectType, p_payload: payload ?? {} });
  if (!defId) return null;
  const [{ data: def }, { data: stages }] = await Promise.all([
    c.from('wf_definition').select('name').eq('id', defId).maybeSingle(),
    c.from('wf_stage').select('*').eq('definition_id', defId).order('position'),
  ]);
  return { definitionName: def?.name ?? '—', stages: (stages ?? []).map((s: any) => ({ position: s.position, name: s.name, required_role: s.required_role, signature_level: s.signature_level, sla_hours: s.sla_hours, escalate_to_role: s.escalate_to_role })) };
}

export async function wfAdmin(adapter: DataAdapter, body: any): Promise<any> {
  const c = client(adapter);
  if (!c?.functions) throw new Error('Administration disponible en mode SaaS.');
  const { data, error } = await c.functions.invoke('wf-admin', { body });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  return data;
}

export { OBJECT_TYPE_LABELS };
