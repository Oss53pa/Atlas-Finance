// Edge Function `wf-batch-submit` (Doc Maître Partie D) — soumet un BORDEREAU.
// Homogène par construction (un journal, une période, une source). Extrait les
// EXCEPTIONS (montant ≥ seuil ou compte sensible) en dossiers individuels avant
// soumission. root_hash (Merkle simplifié) sur les lignes incluses. Souverain.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const LINE_CAP = 1000;
async function sha256Hex(s: string): Promise<string> { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function wfEvent(svc: any, tenant: string, instanceId: string, type: string, actorId: string | null, actorKind: string, payload: any) {
  const { data: last } = await svc.from("wf_event").select("event_hash").eq("instance_id", instanceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const prev = last?.event_hash ?? "";
  const event_hash = await sha256Hex(prev + type + JSON.stringify(payload));
  await svc.from("wf_event").insert({ tenant_id: tenant, instance_id: instanceId, event_type: type, actor_id: actorId, actor_kind: actorKind, payload, prev_hash: prev || null, event_hash });
}
// Crée une instance + ses tâches pour un objet donné (utilisé pour les exceptions).
async function createInstance(svc: any, tenant: string, uid: string, objectType: string, objectId: string, objectHash: string, preview: any, payload: any) {
  const { data: defId } = await svc.rpc("wf_resolve_definition", { p_tenant: tenant, p_object_type: objectType, p_payload: payload });
  if (!defId) return null;
  const { data: def } = await svc.from("wf_definition").select("*").eq("id", defId).single();
  const { data: stages } = await svc.from("wf_stage").select("*").eq("definition_id", defId).order("position");
  if (!stages?.length) return null;
  const { data: inst } = await svc.from("wf_instance").insert({ tenant_id: tenant, object_type: objectType, object_id: objectId, object_hash: objectHash, object_preview: preview, definition_id: defId, definition_version: def.version, status: "in_review", current_stage: 1, submitted_by: uid, priority: "normal", version: 1 }).select().single();
  const rows = stages.map((s: any, i: number) => ({ tenant_id: tenant, instance_id: inst.id, stage_id: s.id, position: s.position, required_role: s.required_role, sla_hours: s.sla_hours, due_at: new Date(Date.now() + (s.sla_hours || 24) * 3600000).toISOString(), status: i === 0 ? "pending" : "waiting" }));
  await svc.from("wf_task").insert(rows);
  await wfEvent(svc, tenant, inst.id, "submitted", uid, "user", { definition: def.name, object_type: objectType });
  return inst.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const { data: tenant } = await userClient.rpc("get_user_company_id");
  if (!tenant) return json({ error: "NO_TENANT" }, 403);
  const uid = u.user.id;

  const { batch, priority } = await req.json().catch(() => ({}));
  if (!batch || !batch.journal_code || !Array.isArray(batch.lines) || batch.lines.length === 0) return json({ error: "MISSING_BATCH" }, 400);
  if (batch.lines.length > LINE_CAP) return json({ error: "BATCH_TOO_LARGE", cap: LINE_CAP, count: batch.lines.length }, 400);

  // Règles d'exception du tenant.
  const { data: rules } = await svc.from("wf_exception_rule").select("*").eq("tenant_id", tenant).eq("object_type", "journal_batch").eq("active", true);
  const isException = (l: any): boolean => {
    for (const r of rules ?? []) {
      if (r.amount_gte != null && Math.abs(Number(l.amount_xof || 0)) >= Number(r.amount_gte)) return true;
      for (const p of r.account_prefixes ?? []) if (String(l.account_code || "").startsWith(p)) return true;
    }
    return false;
  };

  const batchId = batch.batch_id || `batch-${batch.journal_code}-${batch.period || ""}-${Date.now()}`;
  // Marque exceptions + calcule les hashs de lignes.
  const lines = await Promise.all(batch.lines.map(async (l: any, i: number) => {
    const line_hash = await sha256Hex([l.line_ref, l.account_code, String(l.amount_xof)].join("|"));
    return { ...l, position: i + 1, line_hash, is_exception: isException(l) };
  }));
  const included = lines.filter((l) => !l.is_exception);
  const exceptions = lines.filter((l) => l.is_exception);
  const totalIncluded = included.reduce((s: number, l: any) => s + Number(l.amount_xof || 0), 0);
  const rootHash = await sha256Hex(included.map((l) => l.line_hash).sort().join(""));

  // Instance du bordereau.
  const preview = { journal_code: batch.journal_code, period: batch.period ?? null, source: batch.source ?? null, total_xof: totalIncluded, line_count: lines.length, included_count: included.length, excluded_count: exceptions.length, root_hash: rootHash, title: `Bordereau ${batch.journal_code}${batch.period ? " · " + batch.period : ""}`, ref: batchId.slice(-10).toUpperCase(), amount_xof: totalIncluded };
  const { data: defId } = await svc.rpc("wf_resolve_definition", { p_tenant: tenant, p_object_type: "journal_batch", p_payload: { amount_xof: totalIncluded } });
  if (!defId) return json({ error: "NO_WORKFLOW" }, 400);
  const { data: def } = await svc.from("wf_definition").select("*").eq("id", defId).single();
  const { data: stages } = await svc.from("wf_stage").select("*").eq("definition_id", defId).order("position");
  const { data: inst, error } = await svc.from("wf_instance").insert({ tenant_id: tenant, object_type: "journal_batch", object_id: batchId, object_hash: rootHash, object_preview: preview, definition_id: defId, definition_version: def.version, status: "in_review", current_stage: 1, submitted_by: uid, priority: priority === "urgent" ? "urgent" : "normal", version: 1 }).select().single();
  if (error) return json({ error: error.message }, 400);
  const taskRows = (stages ?? []).map((s: any, i: number) => ({ tenant_id: tenant, instance_id: inst.id, stage_id: s.id, position: s.position, required_role: s.required_role, sla_hours: s.sla_hours, due_at: new Date(Date.now() + (s.sla_hours || 24) * 3600000).toISOString(), status: i === 0 ? "pending" : "waiting" }));
  await svc.from("wf_task").insert(taskRows);

  // Exceptions extraites → dossiers individuels (journal_entry, circuit selon montant).
  const lineRows: any[] = [];
  for (const l of lines) {
    let extractedId: string | null = null;
    if (l.is_exception) {
      extractedId = await createInstance(svc, tenant, uid, "journal_entry", `${batchId}-L${l.position}`, l.line_hash,
        { title: l.label || `Ligne ${l.line_ref}`, amount_xof: Number(l.amount_xof || 0), ref: l.line_ref, detail: `Exception extraite du bordereau ${batchId}` },
        { amount_xof: Number(l.amount_xof || 0), journal_code: batch.journal_code, account_class: String(l.account_code || "").slice(0, 1) });
    }
    lineRows.push({ tenant_id: tenant, instance_id: inst.id, position: l.position, line_ref: l.line_ref, journal_code: batch.journal_code, account_code: l.account_code ?? null, label: l.label ?? null, amount_xof: Number(l.amount_xof || 0), line_hash: l.line_hash, included: !l.is_exception, is_exception: l.is_exception, exception_reason: l.is_exception ? "extraite en validation individuelle" : null, extracted_instance_id: extractedId });
  }
  await svc.from("wf_batch_line").insert(lineRows);
  await wfEvent(svc, tenant, inst.id, "submitted", uid, "user", { definition: def.name, lines: lines.length, included: included.length, exceptions: exceptions.length, root_hash: rootHash });

  return json({ instance_id: inst.id, total_xof: totalIncluded, line_count: lines.length, included_count: included.length, exception_count: exceptions.length, root_hash: rootHash });
});
