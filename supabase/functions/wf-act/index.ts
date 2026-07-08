// Edge Function `wf-act` (Doc Maître Partie C) — approuve/rejette une tâche du
// moteur. Vérifs serveur bloquantes : instance in_review, tâche = étape courante,
// hash inchangé, rôle porté (profiles.role), SoD (auteur exclu + validateurs
// distincts), signature si l'étape l'exige. Approbation finale → apply. Événements
// append-only à hash chaîné.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MOTIVES = ["piece_manquante", "montant_conteste", "imputation_erronee", "opportunite", "autre"];
const REQ_RANK: Record<string, number> = { comptable: 1, daf: 2, dg: 3 };
const APP_RANK: Record<string, number> = { comptable: 1, accountant: 1, user: 1, employe: 1, manager: 2, daf: 2, controleur: 2, controleur_gestion: 2, dg: 3, directeur: 3, direction: 3, admin: 4, owner: 4, super_admin: 4, proprietaire: 4 };
const roleSatisfies = (r: string | null, need: string) => (APP_RANK[(r ?? "").toLowerCase()] ?? 0) >= (REQ_RANK[(need ?? "").toLowerCase()] ?? 1);
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
  const { data: prof } = await svc.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  const role = prof?.role ?? null;
  const uid = u.user.id;

  const { task_id, action, motive_code, comment, acted_via, actor_name, current_hash, signed } = await req.json().catch(() => ({}));
  if (!task_id || !["approve", "reject"].includes(action)) return json({ error: "BAD_REQUEST" }, 400);

  const { data: task } = await svc.from("wf_task").select("*").eq("id", task_id).maybeSingle();
  if (!task || task.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
  const { data: inst } = await svc.from("wf_instance").select("*").eq("id", task.instance_id).single();
  if (inst.status !== "in_review") return json({ error: "NOT_IN_REVIEW" }, 409);
  if (task.status !== "pending" || task.position !== inst.current_stage) return json({ error: "STEP_NOT_ACTIONABLE" }, 409);

  // Intangibilité : modification de l'objet pendant le circuit = invalidation.
  if (current_hash && current_hash !== inst.object_hash) {
    await svc.from("wf_instance").update({ status: "invalidated_object_changed" }).eq("id", inst.id);
    await wfEvent(svc, tenant, inst.id, "invalidated_object_changed", uid, "user", {});
    return json({ error: "INVALIDATED_OBJECT_CHANGED" }, 409);
  }
  // Autorisation : rôle porté, sinon délégation active bornée (type/plafond/dates).
  const nowD = new Date();
  const today = nowD.toISOString().slice(0, 10);
  let onBehalfOf: string | null = null;
  if (!roleSatisfies(role, task.required_role)) {
    const amt = Number(inst.object_preview?.amount_xof || 0);
    const { data: dels } = await svc.from("wf_delegation").select("*").eq("tenant_id", tenant).eq("delegate_id", uid).eq("active", true);
    const del = (dels ?? []).find((d: any) =>
      (!d.object_types?.length || d.object_types.includes(inst.object_type)) &&
      (d.max_amount_xof == null || amt <= Number(d.max_amount_xof)) &&
      (!d.from_date || d.from_date <= today) && (!d.to_date || d.to_date >= today) &&
      roleSatisfies(d.delegator_role, task.required_role));
    if (!del) return json({ error: "ROLE_REQUIRED", required: task.required_role }, 403);
    onBehalfOf = del.delegator_id;
  }
  // SoD évaluée sur le délégataire RÉEL (l'acteur) + le délégant.
  if (String(inst.submitted_by) === String(uid) || (onBehalfOf && String(inst.submitted_by) === String(onBehalfOf))) return json({ error: "SOD_AUTHOR" }, 403);
  const { data: prior } = await svc.from("wf_task").select("id").eq("instance_id", inst.id).eq("status", "approved").eq("assignee_id", uid);
  if (prior && prior.length) return json({ error: "SOD_DISTINCT" }, 403);

  const now = new Date().toISOString();
  const { data: allTasks } = await svc.from("wf_task").select("*").eq("instance_id", inst.id).order("position");
  const tasks = allTasks ?? [];

  if (action === "reject") {
    if (!motive_code || !MOTIVES.includes(motive_code)) return json({ error: "MOTIVE_REQUIRED", allowed: MOTIVES }, 400);
    await svc.from("wf_task").update({ status: "rejected", assignee_id: uid, assignee_name: actor_name ?? null, acted_via: acted_via ?? "bannette", motive_code, comment: comment ?? null, acted_at: now }).eq("id", task.id);
    await svc.from("wf_task").update({ status: "obsolete" }).eq("instance_id", inst.id).in("status", ["waiting", "pending"]);
    await svc.from("wf_instance").update({ status: "rejected", closed_at: now }).eq("id", inst.id);
    await wfEvent(svc, tenant, inst.id, "rejected", uid, "user", { position: task.position, motive_code });
    return json({ status: "rejected" });
  }

  // Signature si l'étape l'exige.
  const { data: stage } = await svc.from("wf_stage").select("signature_level").eq("id", task.stage_id).single();
  let signatureId: string | null = null;
  if ((stage?.signature_level ?? "none") !== "none") {
    if (!signed) return json({ error: "SIGNATURE_REQUIRED", level: stage.signature_level }, 400);
    const signed_hash = await sha256Hex(inst.id + inst.object_hash + "approve");
    const { data: sig } = await svc.from("wf_signature").insert({ tenant_id: tenant, instance_id: inst.id, task_id: task.id, level: stage.signature_level, signer_id: uid, signed_hash }).select("id").single();
    signatureId = sig?.id ?? null;
  }

  await svc.from("wf_task").update({ status: "approved", assignee_id: uid, assignee_name: actor_name ?? null, on_behalf_of: onBehalfOf, resolved_from: onBehalfOf ? "delegation" : `role:${task.required_role}`, acted_via: acted_via ?? "bannette", acted_at: now, signature_id: signatureId }).eq("id", task.id);
  await wfEvent(svc, tenant, inst.id, "approved", uid, "user", { position: task.position, signature: stage?.signature_level ?? "none", on_behalf_of: onBehalfOf });

  const next = tasks.find((t: any) => t.position === task.position + 1);
  if (next) {
    await svc.from("wf_task").update({ status: "pending" }).eq("id", next.id);
    await svc.from("wf_instance").update({ current_stage: task.position + 1 }).eq("id", inst.id);
    return json({ status: "in_review", current_stage: task.position + 1, next_role: next.required_role });
  }

  // Dernière étape → approuvé puis apply (v1 : marque appliqué + événement ;
  // la mutation spécifique de l'objet est fournie par l'adaptateur Validatable).
  await svc.from("wf_instance").update({ status: "approved" }).eq("id", inst.id);
  await wfEvent(svc, tenant, inst.id, "approved_final", uid, "user", { total: tasks.length });
  await svc.from("wf_instance").update({ status: "applied", closed_at: now }).eq("id", inst.id);
  // Apply spécifique (Validatable.apply) : activation RIB avec QUARANTAINE.
  let quarantineUntil: string | null = null;
  const flags: string[] = inst.object_preview?.flags || [];
  if (inst.object_type === "partner_master" && flags.includes("rib_change")) {
    quarantineUntil = new Date(Date.now() + 5 * 86400000).toISOString();
    await svc.from("partner_rib_quarantine").insert({ tenant_id: tenant, partner_id: inst.object_preview?.partner_id ?? inst.object_id, new_rib: inst.object_preview?.new_rib ?? null, instance_id: inst.id, decision_ref: inst.object_preview?.ref ?? null, quarantine_until: quarantineUntil });
    await wfEvent(svc, tenant, inst.id, "rib_quarantine", "system", "system", { days: 5, partner_id: inst.object_preview?.partner_id ?? inst.object_id });
  }
  await wfEvent(svc, tenant, inst.id, "applied", "system", "system", { object_type: inst.object_type, object_id: inst.object_id });
  return json({ status: "applied", total: tasks.length, quarantine_until: quarantineUntil });
});
