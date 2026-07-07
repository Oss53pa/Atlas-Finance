// Edge Function `wf-submit` (Doc Maître Partie C) — soumet un objet au moteur
// de validation générique. Résout le circuit (wf_resolve_definition), fige
// object_hash, crée l'instance + les tâches (1 pending, suivantes waiting),
// événement append-only à hash chaîné. Souverain serveur.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function sha256Hex(s: string): Promise<string> { const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function wfEvent(svc: any, tenant: string, instanceId: string, type: string, actorId: string | null, actorKind: string, payload: any) {
  const { data: last } = await svc.from("wf_event").select("event_hash").eq("instance_id", instanceId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const prev = last?.event_hash ?? "";
  const event_hash = await sha256Hex(prev + type + JSON.stringify(payload));
  await svc.from("wf_event").insert({ tenant_id: tenant, instance_id: instanceId, event_type: type, actor_id: actorId, actor_kind: actorKind, payload, prev_hash: prev || null, event_hash });
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

  const { object_type, object_id, object_hash, object_preview, payload, priority } = await req.json().catch(() => ({}));
  if (!object_type || !object_id || !object_hash) return json({ error: "MISSING_FIELDS" }, 400);

  const { data: openInst } = await svc.from("wf_instance").select("id,version,status").eq("tenant_id", tenant).eq("object_type", object_type).eq("object_id", String(object_id)).order("version", { ascending: false }).limit(1).maybeSingle();
  let version = 1;
  if (openInst) {
    if (["submitted", "in_review"].includes(openInst.status)) return json({ error: "ALREADY_IN_REVIEW", instance_id: openInst.id }, 409);
    version = openInst.version + 1;
  }

  const { data: defId } = await svc.rpc("wf_resolve_definition", { p_tenant: tenant, p_object_type: object_type, p_payload: payload ?? {} });
  if (!defId) return json({ error: "NO_WORKFLOW" }, 400);
  const { data: def } = await svc.from("wf_definition").select("*").eq("id", defId).single();
  const { data: stages } = await svc.from("wf_stage").select("*").eq("definition_id", defId).order("position");
  if (!stages?.length) return json({ error: "NO_STAGES" }, 400);

  const { data: inst, error } = await svc.from("wf_instance").insert({
    tenant_id: tenant, object_type, object_id: String(object_id), object_hash, object_preview: object_preview ?? {},
    definition_id: defId, definition_version: def.version, status: "in_review", current_stage: 1,
    submitted_by: uid, priority: priority === "urgent" ? "urgent" : "normal", version,
  }).select().single();
  if (error) return json({ error: error.message }, 400);

  const rows = stages.map((s: any, i: number) => ({
    tenant_id: tenant, instance_id: inst.id, stage_id: s.id, position: s.position, required_role: s.required_role,
    sla_hours: s.sla_hours, due_at: new Date(Date.now() + (s.sla_hours || 24) * 3600000).toISOString(),
    status: i === 0 ? "pending" : "waiting",
  }));
  await svc.from("wf_task").insert(rows);
  await wfEvent(svc, tenant, inst.id, "submitted", uid, "user", { definition: def.name, stages: stages.length, object_hash });

  return json({ instance_id: inst.id, definition: def.name, version, stages: stages.map((s: any) => ({ position: s.position, role: s.required_role, signature: s.signature_level })) });
});
