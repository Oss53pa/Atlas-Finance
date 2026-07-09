// Edge Function `wf-admin` (Doc Maître §C10) — administration des circuits.
// Réservé admin/DAF (profiles.role). Écritures souveraines sur wf_rule /
// wf_definition. Toute modification est tracée dans wf_admin_log. Note v1 : la
// « publication de circuit elle-même validatable » (wf_definition_publish) est
// approximée par une trace + gate de rôle ; le circuit de validation méta est
// une évolution ultérieure.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const APP_RANK: Record<string, number> = { comptable: 1, accountant: 1, user: 1, manager: 2, daf: 2, dg: 3, directeur: 3, admin: 4, owner: 4, super_admin: 4, proprietaire: 4 };
const canAdmin = (role: string | null) => (APP_RANK[(role ?? "").toLowerCase()] ?? 0) >= 2; // DAF+

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const { data: tenant } = await userClient.rpc("get_user_company_id");
  if (!tenant) return json({ error: "NO_TENANT" }, 403);
  const { data: prof } = await svc.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  const role = prof?.role ?? null;
  if (!canAdmin(role)) return json({ error: "ADMIN_REQUIRED" }, 403);
  const uid = u.user.id;

  const body = await req.json().catch(() => ({}));
  const op = body.op;
  const trace = (action: string, payload: any) => svc.from("wf_admin_log").insert({ tenant_id: tenant, actor_id: uid, action, payload });

  if (op === "toggle_rule") {
    if (!body.rule_id) return json({ error: "BAD_REQUEST" }, 400);
    const { data: r } = await svc.from("wf_rule").select("id,tenant_id").eq("id", body.rule_id).maybeSingle();
    if (!r || r.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
    await svc.from("wf_rule").update({ active: !!body.active }).eq("id", body.rule_id);
    await trace("toggle_rule", { rule_id: body.rule_id, active: !!body.active });
    return json({ ok: true });
  }

  if (op === "create_rule") {
    const { object_type, conditions, definition_id, priority } = body;
    if (!object_type || !definition_id) return json({ error: "MISSING_FIELDS" }, 400);
    const { data: def } = await svc.from("wf_definition").select("id,tenant_id,object_type").eq("id", definition_id).maybeSingle();
    if (!def || def.tenant_id !== tenant || def.object_type !== object_type) return json({ error: "BAD_DEFINITION" }, 400);
    const { data: ins, error } = await svc.from("wf_rule").insert({ tenant_id: tenant, object_type, conditions: conditions ?? {}, definition_id, priority: Number(priority) || 100, active: true }).select("id").single();
    if (error) return json({ error: error.message }, 400);
    await trace("create_rule", { rule_id: ins.id, object_type, definition_id, conditions });
    return json({ ok: true, rule_id: ins.id });
  }

  if (op === "toggle_definition") {
    if (!body.definition_id || !["active", "archived", "draft"].includes(body.status)) return json({ error: "BAD_REQUEST" }, 400);
    const { data: def } = await svc.from("wf_definition").select("id,tenant_id").eq("id", body.definition_id).maybeSingle();
    if (!def || def.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
    await svc.from("wf_definition").update({ status: body.status }).eq("id", body.definition_id);
    await trace("toggle_definition", { definition_id: body.definition_id, status: body.status });
    return json({ ok: true });
  }

  return json({ error: "BAD_OP" }, 400);
});
