// Edge Function `decision-act` (Doc Maître Partie B, §B3/§B4).
// Approbation / rejet d'une étape. Vérifications serveur bloquantes : décision
// in_approval + hash inchangé, étape = étape courante, rôle porté en table tenant,
// SoD (auteur exclu + validateurs distincts). Effet transactionnel à la dernière
// approbation. Append d'événements ; jamais d'écriture d'état côté client.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MOTIVES = ["piece_manquante", "montant_conteste", "imputation_erronee", "opportunite", "autre"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const { data: tenant } = await userClient.rpc("get_user_company_id");
  if (!tenant) return json({ error: "NO_TENANT" }, 403);
  const { data: role } = await userClient.rpc("my_role_in_tenant", { p_tenant_id: tenant });

  const { decision_id, action, motive_code, comment, acted_via, actor_name } = await req.json().catch(() => ({}));
  if (!decision_id || !["approve", "reject"].includes(action)) return json({ error: "BAD_REQUEST" }, 400);
  const uid = u.user.id, name = actor_name ?? null, via = acted_via ?? "dock", now = new Date().toISOString();

  const { data: dec } = await svc.from("space_decision").select("*").eq("id", decision_id).maybeSingle();
  if (!dec || dec.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
  if (dec.status !== "in_approval") return json({ error: "NOT_IN_APPROVAL" }, 409);

  const { data: approvals } = await svc.from("space_decision_approval").select("*").eq("decision_id", decision_id).order("position");
  const chain = approvals ?? [];
  const step = dec.current_step ?? 1;
  const cur = chain.find((a) => a.position === step && a.status === "pending");
  if (!cur) return json({ error: "NO_PENDING_STEP" }, 409);

  // (c) rôle requis porté en table des rôles tenant.
  if (!role || role !== cur.required_role) return json({ error: "ROLE_REQUIRED", required: cur.required_role }, 403);
  // (d) SoD : ni l'auteur, ni un validateur d'une étape antérieure.
  if (String(dec.author_id) === String(uid)) return json({ error: "SOD_AUTHOR" }, 403);
  if (chain.some((a) => a.status === "approved" && String(a.approver_id) === String(uid))) return json({ error: "SOD_DISTINCT" }, 403);

  const patchMsg = async (patch: Record<string, unknown>) => {
    const { data } = await svc.from("collab_messages").select("id,payload").eq("channel_id", dec.space_id).eq("type", "decision").contains("payload", { decisionId: decision_id });
    if (data && data[0]) await svc.from("collab_messages").update({ payload: { ...(data[0].payload ?? {}), ...patch } }).eq("id", data[0].id);
  };
  const event = (body: string) => svc.from("collab_messages").insert({ channel_id: dec.space_id, tenant_id: tenant, type: "system", author_id: "system", author_name: "PROPH3T · Gouvernance", body });

  if (action === "reject") {
    if (!motive_code || !MOTIVES.includes(motive_code)) return json({ error: "MOTIVE_REQUIRED", allowed: MOTIVES }, 400);
    await svc.from("space_decision_approval").update({ status: "rejected", approver_id: uid, approver_name: name, acted_via: via, acted_at: now }).eq("id", cur.id);
    await svc.from("space_decision_approval").update({ status: "obsolete" }).eq("decision_id", decision_id).in("status", ["waiting", "pending"]);
    await svc.from("space_decision").update({ status: "rejected", rejected_by: uid, rejected_at: now, reject_motive: motive_code, reject_comment: comment ?? null, updated_at: now }).eq("id", decision_id);
    await event(`Décision ${dec.ref} rejetée par ${name ?? role} — motif : ${motive_code}`);
    await patchMsg({ status: "rejected", rejectMotive: motive_code });
    return json({ status: "rejected" });
  }

  // approve
  await svc.from("space_decision_approval").update({ status: "approved", approver_id: uid, approver_name: name, acted_via: via, acted_at: now }).eq("id", cur.id);
  const next = chain.find((a) => a.position === step + 1);
  if (next) {
    await svc.from("space_decision_approval").update({ status: "pending" }).eq("id", next.id);
    await svc.from("space_decision").update({ current_step: step + 1, updated_at: now }).eq("id", decision_id);
    await event(`Décision ${dec.ref} validée ${step}/${chain.length} par ${name ?? role} · en attente ${next.required_role.toUpperCase()}`);
    await patchMsg({ currentStep: step + 1, status: "in_approval", lastApprovedVia: via });
    return json({ status: "in_approval", current_step: step + 1, next_role: next.required_role });
  }

  // Dernière approbation → effet FNA (registre), dans la foulée.
  await svc.from("space_decision").update({ status: "approved", updated_at: now }).eq("id", decision_id);
  const { data: eff } = await svc.from("space_decision_effect").select("*").eq("tenant_id", tenant).eq("decision_type", dec.decision_type).eq("active", true).maybeSingle();
  const effKey = eff && eff.effect_key !== "none" ? eff.effect_key : null;
  await svc.from("space_decision").update({ effect_applied_at: now }).eq("id", decision_id);
  await event(`Décision ${dec.ref} validée ${chain.length}/${chain.length} par ${name ?? role}${effKey ? ` · effet ${effKey}` : ""}${via === "external_link" ? " · par lien externe" : ""}`);
  await patchMsg({ status: "approved", approvedByName: name, approvedAt: now, currentStep: step, effect: effKey });
  return json({ status: "approved", current_step: step, effect: effKey });
});
