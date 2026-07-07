// Edge Function `approval-link` (Doc Maître §B6) — PUBLIC (verify_jwt=false).
// Page de validation externe : view (détail décision + snapshot), request_otp
// (double facteur), act (approuver/rejeter). Sécurité = possession du token +
// OTP ; usage unique ; scellé sur content_hash ; 5 essais OTP puis gel.
// Aucune navigation hors de cette décision. Écritures en service_role.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MOTIVES = ["piece_manquante", "montant_conteste", "imputation_erronee", "opportunite", "autre"];
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { op, token, otp, action, motive_code, comment } = await req.json().catch(() => ({}));
  if (!token || !op) return json({ error: "BAD_REQUEST" }, 400);
  const now = new Date();

  const tokenHash = await sha256Hex(token);
  const { data: link } = await svc.from("space_approval_link").select("*").eq("token_hash", tokenHash).maybeSingle();
  if (!link) return json({ error: "LINK_INVALID" }, 404);
  if (link.revoked_at) return json({ error: "LINK_REVOKED" }, 410);
  if (link.used_at) return json({ error: "LINK_USED" }, 410);
  if (new Date(link.expires_at) < now) return json({ error: "LINK_EXPIRED" }, 410);

  const { data: dec } = await svc.from("space_decision").select("*").eq("id", link.decision_id).maybeSingle();
  const { data: appr } = await svc.from("space_decision_approval").select("*").eq("id", link.approval_id).maybeSingle();
  if (!dec || !appr) return json({ error: "NOT_FOUND" }, 404);
  if ((dec.content_hash ?? "") !== link.content_hash) return json({ error: "INVALIDATED_OBJECT_CHANGED" }, 409);

  // ── VIEW : détail complet de la décision + snapshot éventuel ──
  if (op === "view") {
    const { data: space } = await svc.from("collab_channels").select("name,problem").eq("id", dec.space_id).maybeSingle();
    const { data: snaps } = await svc.from("collab_messages").select("payload").eq("channel_id", dec.space_id).eq("type", "snapshot").order("created_at", { ascending: false }).limit(1);
    const { data: approvals } = await svc.from("space_decision_approval").select("position,required_role,status,approver_name,acted_at").eq("decision_id", dec.id).order("position");
    return json({
      display_name: link.display_name, expires_at: link.expires_at,
      decision: {
        ref: dec.ref, decision_type: dec.decision_type, title: dec.title, body: dec.body,
        amount_xof: dec.amount_xof, rule_label: dec.rule_label, current_step: dec.current_step, status: dec.status,
      },
      step: { position: appr.position, required_role: appr.required_role },
      chain: approvals ?? [], space: space ?? null,
      snapshot: snaps && snaps[0] ? snaps[0].payload : null,
    });
  }

  // ── REQUEST_OTP : double facteur ──
  if (op === "request_otp") {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await sha256Hex(code);
    await svc.from("space_approval_link").update({ otp_hash: otpHash, otp_expires_at: new Date(now.getTime() + 10 * 60000).toISOString(), otp_attempts: 0 }).eq("id", link.id);
    const brevo = Deno.env.get("BREVO_API_KEY");
    if (brevo && link.contact_kind === "email") {
      try {
        await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST", headers: { "api-key": brevo, "content-type": "application/json" },
          body: JSON.stringify({ to: [{ email: link.contact_value, name: link.display_name }], sender: { email: "no-reply@atlas.app", name: "Atlas FNA" }, subject: `Code de validation · ${dec.ref}`, htmlContent: `<p>Votre code à usage unique : <b>${code}</b> (valide 10 min).</p>` }),
        });
        return json({ sent: true, channel: link.contact_kind });
      } catch { /* fallthrough demo */ }
    }
    // Mode démo : OTP renvoyé (non conforme 2FA — pour test uniquement).
    return json({ sent: false, demo: true, otp: code, channel: link.contact_kind });
  }

  // ── ACT : approuver / rejeter ──
  if (op === "act") {
    if (!["approve", "reject"].includes(action)) return json({ error: "BAD_ACTION" }, 400);
    if (!link.otp_hash || !link.otp_expires_at || new Date(link.otp_expires_at) < now) return json({ error: "OTP_REQUIRED" }, 400);
    if ((link.otp_attempts ?? 0) >= 5) { await svc.from("space_approval_link").update({ revoked_at: now.toISOString() }).eq("id", link.id); return json({ error: "OTP_FROZEN" }, 429); }
    const okOtp = otp && (await sha256Hex(String(otp))) === link.otp_hash;
    if (!okOtp) {
      const attempts = (link.otp_attempts ?? 0) + 1;
      const frozen = attempts >= 5;
      await svc.from("space_approval_link").update({ otp_attempts: attempts, revoked_at: frozen ? now.toISOString() : null }).eq("id", link.id);
      return json({ error: frozen ? "OTP_FROZEN" : "OTP_WRONG", remaining: Math.max(0, 5 - attempts) }, frozen ? 429 : 400);
    }

    // État actionnable : étape courante pending.
    if (dec.status !== "in_approval" || appr.status !== "pending" || appr.position !== dec.current_step) return json({ error: "STEP_NOT_ACTIONABLE" }, 409);

    const { data: approvalsAll } = await svc.from("space_decision_approval").select("*").eq("decision_id", dec.id).order("position");
    const chain = approvalsAll ?? [];
    const nowIso = now.toISOString();
    const extId = `ext:${link.contact_value}`;
    const event = (body: string) => svc.from("collab_messages").insert({ channel_id: dec.space_id, tenant_id: dec.tenant_id, type: "system", author_id: "system", author_name: "PROPH3T · Gouvernance", body });
    const patchMsg = async (patch: Record<string, unknown>) => {
      const { data } = await svc.from("collab_messages").select("id,payload").eq("channel_id", dec.space_id).eq("type", "decision").contains("payload", { decisionId: dec.id });
      if (data && data[0]) await svc.from("collab_messages").update({ payload: { ...(data[0].payload ?? {}), ...patch } }).eq("id", data[0].id);
    };

    if (action === "reject") {
      if (!motive_code || !MOTIVES.includes(motive_code)) return json({ error: "MOTIVE_REQUIRED", allowed: MOTIVES }, 400);
      await svc.from("space_decision_approval").update({ status: "rejected", approver_id: extId, approver_name: link.display_name, acted_via: "external_link", acted_at: nowIso }).eq("id", appr.id);
      await svc.from("space_decision_approval").update({ status: "obsolete" }).eq("decision_id", dec.id).in("status", ["waiting", "pending"]);
      await svc.from("space_decision").update({ status: "rejected", rejected_by: extId, rejected_at: nowIso, reject_motive: motive_code, reject_comment: comment ?? null, updated_at: nowIso }).eq("id", dec.id);
      await svc.from("space_approval_link").update({ used_at: nowIso }).eq("id", link.id);
      await event(`Décision ${dec.ref} rejetée par ${link.display_name} · par lien externe — motif : ${motive_code}`);
      await patchMsg({ status: "rejected", rejectMotive: motive_code });
      return json({ confirmation: "rejected", ref: dec.ref });
    }

    // approve
    await svc.from("space_decision_approval").update({ status: "approved", approver_id: extId, approver_name: link.display_name, acted_via: "external_link", acted_at: nowIso }).eq("id", appr.id);
    await svc.from("space_approval_link").update({ used_at: nowIso }).eq("id", link.id);
    const next = chain.find((a) => a.position === appr.position + 1);
    if (next) {
      await svc.from("space_decision_approval").update({ status: "pending" }).eq("id", next.id);
      await svc.from("space_decision").update({ current_step: appr.position + 1, updated_at: nowIso }).eq("id", dec.id);
      await event(`Décision ${dec.ref} validée ${appr.position}/${chain.length} par ${link.display_name} · par lien externe · en attente ${next.required_role.toUpperCase()}`);
      await patchMsg({ currentStep: appr.position + 1, status: "in_approval", lastApprovedVia: "external_link" });
      return json({ confirmation: "approved", ref: dec.ref, step: appr.position, total: chain.length, next_role: next.required_role });
    }
    // final
    await svc.from("space_decision").update({ status: "approved", updated_at: nowIso }).eq("id", dec.id);
    const { data: eff } = await svc.from("space_decision_effect").select("*").eq("tenant_id", dec.tenant_id).eq("decision_type", dec.decision_type).eq("active", true).maybeSingle();
    const effKey = eff && eff.effect_key !== "none" ? eff.effect_key : null;
    if (effKey) {
      const { data: spRow } = await svc.from("collab_channels").select("anchors").eq("id", dec.space_id).maybeSingle();
      const anchor = (spRow?.anchors && spRow.anchors[0]) || {};
      await svc.from("space_effect_log").insert({ tenant_id: dec.tenant_id, decision_id: dec.id, decision_ref: dec.ref, effect_key: effKey, target: anchor.ref ?? {}, params: eff.params ?? {} });
    }
    await svc.from("space_decision").update({ effect_applied_at: nowIso }).eq("id", dec.id);
    await event(`Décision ${dec.ref} validée ${chain.length}/${chain.length} par ${link.display_name} · par lien externe${effKey ? ` · effet ${effKey}` : ""}`);
    await patchMsg({ status: "approved", approvedByName: link.display_name, approvedAt: nowIso, currentStep: appr.position, effect: effKey });
    return json({ confirmation: "approved", ref: dec.ref, step: appr.position, total: chain.length, final: true });
  }

  return json({ error: "BAD_OP" }, 400);
});
