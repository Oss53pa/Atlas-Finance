// Edge Function `approval-link-admin` (Doc Maître §B6) — émission/révocation d'un
// lien de validation externe. Authentifié (owner/DAF). Un seul lien actif par
// étape (nouveau lien = révocation du précédent). Token 256 bits, stockage du
// sha256 seul (token clair jamais stocké). 72 h.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const REQ_RANK: Record<string, number> = { comptable: 1, daf: 2, dg: 3 };
const APP_RANK: Record<string, number> = { comptable: 1, accountant: 1, user: 1, employe: 1, manager: 2, daf: 2, controleur: 2, controleur_gestion: 2, dg: 3, directeur: 3, direction: 3, admin: 4, owner: 4, super_admin: 4, proprietaire: 4 };
const roleSatisfies = (r: string | null, need: string) => (APP_RANK[(r ?? "").toLowerCase()] ?? 0) >= (REQ_RANK[(need ?? "").toLowerCase()] ?? 1);
async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const hex = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a).map((b) => b.toString(16).padStart(2, "0")).join(""); };

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

  const { op, approval_id, contact_kind, contact_value, display_name, link_id } = await req.json().catch(() => ({}));

  if (op === "revoke") {
    if (!link_id) return json({ error: "BAD_REQUEST" }, 400);
    const { data: link } = await svc.from("space_approval_link").select("id,tenant_id").eq("id", link_id).maybeSingle();
    if (!link || link.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
    await svc.from("space_approval_link").update({ revoked_at: new Date().toISOString() }).eq("id", link_id);
    return json({ revoked: true });
  }

  if (op !== "create") return json({ error: "BAD_OP" }, 400);
  if (!approval_id || !contact_kind || !contact_value || !display_name) return json({ error: "MISSING_FIELDS" }, 400);
  if (!["email", "whatsapp", "sms"].includes(contact_kind)) return json({ error: "BAD_CONTACT_KIND" }, 400);

  const { data: appr } = await svc.from("space_decision_approval").select("*").eq("id", approval_id).maybeSingle();
  if (!appr || appr.tenant_id !== tenant) return json({ error: "NOT_FOUND" }, 404);
  const { data: dec } = await svc.from("space_decision").select("*").eq("id", appr.decision_id).maybeSingle();
  if (!dec) return json({ error: "NOT_FOUND" }, 404);
  if (dec.status !== "in_approval" || appr.status !== "pending" || appr.position !== dec.current_step) return json({ error: "STEP_NOT_ACTIONABLE" }, 409);
  // Émission réservée owner/DAF (roleSatisfies daf) ou auteur de la décision.
  if (!roleSatisfies(role, "daf") && String(dec.author_id) !== String(u.user.id)) return json({ error: "NOT_ALLOWED" }, 403);

  // Un seul lien actif par étape.
  await svc.from("space_approval_link").update({ revoked_at: new Date().toISOString() })
    .eq("approval_id", approval_id).is("used_at", null).is("revoked_at", null);

  const token = hex(32);
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + 72 * 3600 * 1000).toISOString();
  const { data: link, error } = await svc.from("space_approval_link").insert({
    tenant_id: tenant, approval_id, decision_id: dec.id, token_hash: tokenHash,
    contact_kind, contact_value, display_name, content_hash: dec.content_hash ?? "",
    expires_at: expires, created_by: u.user.id,
  }).select("id").single();
  if (error) return json({ error: error.message }, 400);

  // Livraison pluggable : Brevo si configuré, sinon mode démo (token renvoyé à l'émetteur).
  const brevo = Deno.env.get("BREVO_API_KEY");
  let delivery = "demo";
  if (brevo && contact_kind === "email") {
    try {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST", headers: { "api-key": brevo, "content-type": "application/json" },
        body: JSON.stringify({
          to: [{ email: contact_value, name: display_name }],
          sender: { email: "no-reply@atlas.app", name: "Atlas FNA" },
          subject: `Validation demandée · ${dec.ref}`,
          htmlContent: `<p>Bonjour ${display_name},</p><p>Une validation vous est demandée : ${dec.ref}.</p><p>Lien : <b>${url}/validate/${token}</b> (expire dans 72 h). Un code à usage unique vous sera demandé.</p>`,
        }),
      });
      delivery = "sent";
    } catch { delivery = "demo"; }
  }

  await svc.from("collab_messages").insert({ channel_id: dec.space_id, tenant_id: tenant, type: "system", author_id: "system", author_name: "PROPH3T · Gouvernance", body: `Lien de validation externe émis pour ${display_name} (${dec.ref})` });

  // token clair renvoyé UNIQUEMENT à l'émetteur (pour partage) — jamais restocké.
  return json({ link_id: link.id, token, delivery, expires_at: expires });
});
