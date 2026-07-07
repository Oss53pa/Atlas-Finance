// Edge Function `decision-cancel` (Doc Maître Partie B, §B3).
// Annulation par l'auteur, uniquement avant toute approbation.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const { data: tenant } = await userClient.rpc("get_user_company_id");
  if (!tenant) return json({ error: "NO_TENANT" }, 403);

  const { decision_id } = await req.json().catch(() => ({}));
  if (!decision_id) return json({ error: "BAD_REQUEST" }, 400);

  const { data: dec } = await svc.from("space_decision").select("*").eq("id", decision_id).maybeSingle();
  if (!dec || dec.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
  if (String(dec.author_id) !== String(u.user.id)) return json({ error: "NOT_AUTHOR" }, 403);
  if (dec.status !== "in_approval") return json({ error: "NOT_IN_APPROVAL" }, 409);

  const { data: approvals } = await svc.from("space_decision_approval").select("status").eq("decision_id", decision_id);
  if ((approvals ?? []).some((a) => a.status === "approved" || a.status === "rejected")) return json({ error: "ALREADY_ACTED" }, 409);

  const now = new Date().toISOString();
  await svc.from("space_decision").update({ status: "cancelled", updated_at: now }).eq("id", decision_id);
  await svc.from("space_decision_approval").update({ status: "obsolete" }).eq("decision_id", decision_id);
  await svc.from("collab_messages").insert({ channel_id: dec.space_id, tenant_id: tenant, type: "system", author_id: "system", author_name: "PROPH3T · Gouvernance", body: `Décision ${dec.ref} annulée par l'auteur` });
  const { data } = await svc.from("collab_messages").select("id,payload").eq("channel_id", dec.space_id).eq("type", "decision").contains("payload", { decisionId: decision_id });
  if (data && data[0]) await svc.from("collab_messages").update({ payload: { ...(data[0].payload ?? {}), status: "cancelled" } }).eq("id", data[0].id);

  return json({ status: "cancelled" });
});
