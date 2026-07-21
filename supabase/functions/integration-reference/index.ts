// ============================================================================
// Edge Function `integration-reference` — référentiels partagés de la Suite
//
// Réf. docs/integration-suite-atlas/DESIGN.md § L4.3 / L6.1
//
// Lecture SEULE, sauf la demande de création de tiers.
//
// Principe MDM : Atlas F&A est MAÎTRE du référentiel comptable (plan de
// comptes, journaux, exercices, périodes, devises) et du référentiel TIERS
// (code tiers canonique). Un satellite ne génère JAMAIS un code tiers — il en
// DEMANDE un. Trois bases tiers = trois codes pour le même client = lettrage
// impossible et balance âgée fausse.
//
// Routes :
//   GET  ?resource=periods&date=YYYY-MM-DD   statut de période (contrôle AVANT saisie)
//   GET  ?resource=third-parties[&type=]     référentiel tiers
//   GET  ?resource=accounts                  plan de comptes
//   GET  ?resource=analytic-sections         sections analytiques
//   GET  ?resource=currencies                devises et cours
//   POST {resource:'third-parties/request'}  demande de code tiers canonique
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-atlas-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "Content-Type": "application/json" },
  });

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const presented = req.headers.get("x-atlas-key") ?? "";
  if (!presented) return json({ error: "MISSING_API_KEY" }, 401);
  const { data: key } = await svc
    .from("integration_api_keys")
    .select("tenant_id, source_system, active")
    .eq("key_hash", await sha256Hex(presented))
    .eq("active", true)
    .maybeSingle();
  if (!key) return json({ error: "INVALID_API_KEY" }, 401);

  const url = new URL(req.url);
  const tenant = key.tenant_id;

  // ── POST : demande de code tiers canonique ────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body || body.resource !== "third-parties/request") {
      return json({ error: "UNSUPPORTED_RESOURCE" }, 400);
    }
    const { name, type, taxId, email, phone, externalRef } = body;
    if (!name || !type) return json({ error: "MISSING_FIELDS", detail: "name et type requis" }, 400);

    // Déduplication : même n° fiscal ou même nom → on renvoie le code existant.
    // C'est ce qui empêche la prolifération de doublons entre satellites.
    let existing = null;
    if (taxId) {
      const { data } = await svc.from("third_parties")
        .select("id, code, name").eq("tenant_id", tenant).eq("tax_id", taxId).maybeSingle();
      existing = data;
    }
    if (!existing) {
      const { data } = await svc.from("third_parties")
        .select("id, code, name").eq("tenant_id", tenant).ilike("name", name).maybeSingle();
      existing = data;
    }
    if (existing) return json({ code: existing.code, id: existing.id, created: false }, 200);

    // Attribution du code canonique : préfixe par type + rang.
    const prefix = type === "client" ? "C" : type === "fournisseur" ? "F" : "T";
    const { count } = await svc.from("third_parties")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant).eq("type", type);
    const code = `${prefix}${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: created, error } = await svc.from("third_parties").insert({
      tenant_id: tenant, code, name, type,
      tax_id: taxId ?? null, email: email ?? null, phone: phone ?? null,
      external_ref: externalRef ?? null,
      source_system: key.source_system,
    }).select("id, code").single();

    if (error) return json({ error: "CREATE_FAILED", detail: error.message }, 500);
    return json({ code: created.code, id: created.id, created: true }, 201);
  }

  // ── GET : référentiels ────────────────────────────────────────────────────
  const resource = url.searchParams.get("resource");

  if (resource === "periods") {
    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await svc.rpc("integration_period_status", {
      p_tenant_id: tenant,
      p_date: date,
    });
    if (error) return json({ error: "RPC_FAILED", detail: error.message }, 500);
    return json({ date, ...(data as Record<string, unknown>) });
  }

  if (resource === "third-parties") {
    let q = svc.from("third_parties").select("id, code, name, type, tax_id").eq("tenant_id", tenant);
    const type = url.searchParams.get("type");
    if (type) q = q.eq("type", type);
    const { data, error } = await q.order("code");
    if (error) return json({ error: "QUERY_FAILED", detail: error.message }, 500);
    return json({ items: data ?? [] });
  }

  if (resource === "accounts") {
    const { data, error } = await svc.from("accounts")
      .select("code, name, account_class").eq("tenant_id", tenant).order("code");
    if (error) return json({ error: "QUERY_FAILED", detail: error.message }, 500);
    return json({ items: data ?? [] });
  }

  if (resource === "analytic-sections") {
    const { data, error } = await svc.from("sections_analytiques")
      .select("id, code, libelle").eq("tenant_id", tenant).order("code");
    if (error) return json({ items: [] });
    return json({ items: data ?? [] });
  }

  if (resource === "currencies") {
    const { data } = await svc.from("exchange_rates")
      .select("currency, rate, date").eq("tenant_id", tenant).order("date", { ascending: false });
    return json({ items: data ?? [] });
  }

  return json({ error: "UNKNOWN_RESOURCE", detail: "resource attendu" }, 400);
});
