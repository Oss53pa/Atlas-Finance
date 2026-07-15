/**
 * stockApprovalService — SoD/gouvernance sur les mouvements de stock de forte
 * valeur, via l'engine MVA générique (wf_*, Edge Functions wf-submit/wf-act
 * déjà déployées et souveraines côté serveur — voir docs/stock-module/DESIGN.md
 * §16 « SoD/MVA »). Architecture « client-apply » :
 *
 *  - Sous le seuil : le mouvement est posté DIRECTEMENT (postMovement), comme
 *    avant — aucune friction.
 *  - Au‑dessus du seuil : l'intention du mouvement est SOUMISE au moteur
 *    (wf-submit) et NON postée. Elle attend l'approbation (SoD + rôle + OTP
 *    selon le circuit résolu par wf_resolve_definition). Le moteur wf-act
 *    marque l'instance 'applied' à la dernière étape mais ne mute AUCUN objet
 *    (stub générique côté serveur, cf. mémoire MVA « Vague D non faite »).
 *    C'est le client qui déclenche alors le postMovement réel — d'où
 *    « client-apply ». Idempotent : la référence du document = l'id de
 *    l'instance wf_, donc une même approbation ne peut jamais poster deux fois.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial } from '../../lib/db';
import { money } from '../../utils/money';
import { postMovement, type MovementInput, type MovementResult } from './stockMovementService';

const THRESHOLD_SETTING_KEY = 'stock.mva_threshold_xof';
const DEFAULT_THRESHOLD = 1_000_000;

function getClient(adapter: DataAdapter): any | null { return (adapter as any).client ?? null; }
async function tenantOf(adapter: DataAdapter): Promise<string | null> {
  const c = getClient(adapter);
  if (!c) return null;
  try { const { data } = await c.rpc('get_user_company_id'); return (data as string) ?? null; } catch { return null; }
}

export async function getMvaThreshold(adapter: DataAdapter): Promise<number> {
  const row = await adapter.getById<{ value: string }>('settings', THRESHOLD_SETTING_KEY).catch(() => null);
  if (row?.value) { const n = Number(JSON.parse(row.value)); if (Number.isFinite(n) && n > 0) return n; }
  return DEFAULT_THRESHOLD;
}

/** Estime la valeur du mouvement (coût fourni en entrée, CUMP/FIFO article sinon). */
export function estimateMovementAmount(materials: DBStockMaterial[], lines: MovementInput['lines']): number {
  const byId = new Map(materials.map(m => [m.id, m]));
  let total = money(0);
  for (const l of lines) {
    const mat = byId.get(l.materialId);
    const unit = l.unitCost ?? mat?.movingAvgCost ?? 0;
    total = total.add(money(l.quantity).multiply(unit));
  }
  return total.toNumber();
}

export interface SubmitOrPostResult {
  applied: boolean;              // true = posté directement (sous le seuil)
  posted?: MovementResult;       // si applied
  instanceId?: string;           // si soumis à approbation
  amount: number;
}

/**
 * Point d'entrée unique pour saisir un mouvement : décide (seuil) entre post
 * direct et soumission MVA. Fail‑CLOSED : au‑dessus du seuil sans moteur MVA
 * disponible (mode local/desktop), le mouvement est REFUSÉ plutôt que posté
 * en contournant la gouvernance.
 */
export async function submitOrPostMovement(
  adapter: DataAdapter, rawInput: MovementInput, userId?: string,
): Promise<SubmitOrPostResult> {
  const input: MovementInput = userId ? { ...rawInput, userId } : rawInput;
  const materials = await adapter.getAll<DBStockMaterial>('stockMaterials');
  const amount = estimateMovementAmount(materials, input.lines);
  const threshold = await getMvaThreshold(adapter);

  if (amount < threshold) {
    const posted = await postMovement(adapter, input);
    return { applied: true, posted, amount };
  }

  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (!client || !tenant) {
    throw new Error(
      `Mouvement de ${amount.toLocaleString('fr-FR')} FCFA ≥ seuil de validation (${threshold.toLocaleString('fr-FR')}) — `
      + `la gouvernance MVA n'est disponible qu'en mode SaaS. Mouvement refusé (pas de contournement).`
    );
  }

  const objectId = crypto.randomUUID();
  const movementInput: MovementInput = { ...input, reference: objectId, userId };
  const preview = {
    movementInput, amount_xof: Math.round(amount),
    movementTypeCode: input.movementTypeCode, date: input.date, lineCount: input.lines.length,
  };
  const objectHash = await sha256Hex(JSON.stringify(preview));

  const { data, error } = await client.functions.invoke('wf-submit', { body: {
    object_type: 'stock_movement', object_id: objectId, object_hash: objectHash,
    object_preview: preview, payload: { amount_xof: Math.round(amount) }, priority: 'normal',
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(`Soumission à validation échouée : ${err}`);

  return { applied: false, instanceId: data.instance_id, amount };
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface StockWfInstance {
  id: string; object_id: string; object_hash: string;
  status: 'in_review' | 'approved' | 'applied' | 'rejected' | 'invalidated_object_changed';
  current_stage: number; submitted_by: string; created_at: string;
  object_preview: {
    movementInput: MovementInput; amount_xof: number; lineCount: number;
    movementTypeCode: string; date: string;
  };
}
export interface StockPendingTask {
  taskId: string; instanceId: string; position: number; requiredRole: string;
  slaHours: number; dueAt: string | null; instance: StockWfInstance;
}

/** Instances 'stock_movement' du tenant (bannette + auto-apply). */
export async function listStockInstances(adapter: DataAdapter): Promise<StockWfInstance[]> {
  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (!client || !tenant) return [];
  const { data } = await client.from('wf_instance').select('*')
    .eq('tenant_id', tenant).eq('object_type', 'stock_movement')
    .order('created_at', { ascending: false });
  return (data ?? []) as StockWfInstance[];
}

/** Tâches en attente (bannette filtrée stock), avec l'instance jointe. */
export async function listStockPendingTasks(adapter: DataAdapter): Promise<StockPendingTask[]> {
  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (!client || !tenant) return [];
  const instances = await listStockInstances(adapter);
  const inReview = instances.filter(i => i.status === 'in_review');
  if (inReview.length === 0) return [];
  const { data: tasks } = await client.from('wf_task').select('*')
    .in('instance_id', inReview.map(i => i.id)).eq('status', 'pending');
  const byId = new Map(inReview.map(i => [i.id, i]));
  return (tasks ?? []).map((t: any) => ({
    taskId: t.id, instanceId: t.instance_id, position: t.position, requiredRole: t.required_role,
    slaHours: t.sla_hours, dueAt: t.due_at, instance: byId.get(t.instance_id)!,
  })).filter((t: StockPendingTask) => t.instance);
}

/** Approuve/rejette une tâche ; sur approbation finale, déclenche le post réel. */
export async function actOnStockTask(
  adapter: DataAdapter,
  d: { taskId: string; action: 'approve' | 'reject'; motiveCode?: string; comment?: string; signed?: boolean; actorName?: string },
): Promise<{ status: string; posted?: MovementResult }> {
  const client = getClient(adapter);
  if (!client?.functions) throw new Error('MVA disponible en mode SaaS uniquement.');
  const { data, error } = await client.functions.invoke('wf-act', { body: {
    task_id: d.taskId, action: d.action, motive_code: d.motiveCode, comment: d.comment,
    signed: d.signed, actor_name: d.actorName, acted_via: 'stock',
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);

  if (data.status === 'applied') {
    const instances = await listStockInstances(adapter);
    const inst = instances.find(i => i.status === 'applied');
    if (inst) {
      const posted = await applyApprovedInstance(adapter, inst);
      return { status: data.status, posted: posted ?? undefined };
    }
  }
  return { status: data.status };
}

/**
 * Applique (poste) une instance approuvée — idempotent : si un document porte
 * déjà cette référence (= instance.object_id), ne repost pas. Auto-guérison :
 * appelable en boucle par la page « Mouvements en attente » pour rattraper une
 * approbation dont l'apply client n'aurait pas abouti (crash navigateur…).
 */
export async function applyApprovedInstance(adapter: DataAdapter, instance: StockWfInstance): Promise<MovementResult | null> {
  if (instance.status !== 'applied') return null;
  const existing = await adapter.getAll<any>('stockDocuments');
  const already = existing.find(d => d.reference === instance.object_id);
  if (already) return null; // déjà posté (idempotence)

  const input = instance.object_preview?.movementInput;
  if (!input) throw new Error('Mouvement introuvable dans l\'instance approuvée (object_preview vide)');
  return postMovement(adapter, input);
}

/** Balaie les instances 'applied' sans document posté et les applique (self-heal). */
export async function reconcilePendingApplies(adapter: DataAdapter): Promise<number> {
  const instances = await listStockInstances(adapter);
  let count = 0;
  for (const inst of instances.filter(i => i.status === 'applied')) {
    const posted = await applyApprovedInstance(adapter, inst);
    if (posted) count++;
  }
  return count;
}
