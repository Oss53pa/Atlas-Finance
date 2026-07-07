// Edge Function `decision-submit` (Doc Maître Partie B, §B3/§B4).
// Souveraineté serveur : identité dérivée du JWT ; chaîne résolue UNE FOIS ;
// content_hash figé ; étapes créées (1 pending, suivantes waiting). Le client
// n'écrit jamais un état de validation.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const { data: tenant } = await userClient.rpc("get_user_company_id");
  if (!tenant) return json({ error: "NO_TENANT" }, 403);

  const b = await req.json().catch(() => ({}));
  const { space_id, decision_type, title, body, amount_xof, piece_ids, author_name, via } = b ?? {};
  if (!space_id || !decision_type || !title) return json({ error: "MISSING_FIELDS" }, 400);
  const amount = amount_xof == null || amount_xof === "" ? null : Math.round(Number(amount_xof));

  // Espace du tenant (membre actif implicite via scoping tenant).
  const { data: space } = await svc.from("collab_channels").select("id,tenant_id").eq("id", space_id).maybeSingle();
  if (!space || space.tenant_id !== tenant) return json({ error: "SPACE_NOT_FOUND" }, 404);

  // Résolution de la chaîne (serveur, une seule fois).
  const { data: chainRes, error: eChain } = await svc.rpc("resolve_approval_chain", { p_tenant: tenant, p_type: decision_type, p_amount: amount ?? 0 });
  if (eChain) return json({ error: eChain.message }, 400);
  if (!chainRes) return json({ error: "NO_GOVERNANCE_RULE" }, 400);
  const roles: string[] = chainRes.roles;
  const ruleLabel: string = chainRes.label;
  const ruleId: string = chainRes.rule_id;

  // Intangibilité par hash du payload canonique.
  const canonical = JSON.stringify({ amount_xof: amount, body: body ?? null, decision_type, piece_ids: piece_ids ?? [], title });
  const contentHash = await sha256Hex(canonical);

  // Référence DEC-AAAA-NNN (séquence par tenant/année).
  const year = new Date().getFullYear();
  const { count } = await svc.from("space_decision").select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant).gte("created_at", `${year}-01-01`);
  const ref = `DEC-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const { data: dec, error: e1 } = await svc.from("space_decision").insert({
    tenant_id: tenant, space_id, ref, decision_type, title, body: body ?? null, amount_xof: amount,
    piece_ids: piece_ids ?? [], status: "in_approval", content_hash: contentHash, current_step: 1,
    rule_id: ruleId, rule_label: ruleLabel, chain: roles, author_id: u.user.id,
  }).select().single();
  if (e1) return json({ error: e1.message }, 400);

  const rows = roles.map((r, i) => ({ tenant_id: tenant, decision_id: dec.id, position: i + 1, required_role: r, status: i === 0 ? "pending" : "waiting" }));
  const { error: e2 } = await svc.from("space_decision_approval").insert(rows);
  if (e2) return json({ error: e2.message }, 400);

  // Reflet typé dans le fil (collab_messages type=decision) pour l'UI existante.
  await svc.from("collab_messages").insert({
    channel_id: space_id, tenant_id: tenant, type: "decision", author_id: u.user.id, author_name: author_name ?? null,
    body: title, via: via ?? "Atlas FNA · Espace",
    payload: { decisionId: dec.id, ref, title, detail: body ?? null, amount, governanceRule: ruleLabel, requiredRole: roles[0], chain: roles, status: "in_approval", currentStep: 1 },
  });

  return json({ decision_id: dec.id, ref, rule_label: ruleLabel, chain: roles });
});
