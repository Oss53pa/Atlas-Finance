// ============================================================================
// Edge Function `integration-ingest` — porte d'entrée SOUVERAINE du Grand Livre
//
// Réf. docs/integration-suite-atlas/DESIGN.md § L3.1
//
// Reçoit un FAIT DE GESTION d'un satellite de la Suite Atlas (Trade / Procure
// / People) et le journalise dans `integration_events`. Le satellite n'envoie
// JAMAIS d'écriture : la traduction en comptes SYSCOHADA appartient à
// Atlas F&A (posting_rules).
//
// Garanties :
//  - authentification PAR APPLICATION (clé de service hachée), pas par user
//  - un satellite ne peut émettre que les événements de SON domaine
//  - idempotence : rejeu de la même Idempotency-Key → 200 + event_id existant
//  - le payload est scellé (payload_hash calculé SERVEUR, jamais fourni)
//  - aucune écriture directe dans journal_entries depuis ici
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, idempotency-key, x-atlas-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

/**
 * Sérialisation CANONIQUE (clés triées récursivement).
 * ⚠️ Doit rester STRICTEMENT identique à `canonicalize()` dans
 * src/services/integration/integrationBus.ts — sinon les empreintes divergent
 * et la chaîne de preuve L7 devient invérifiable.
 */
function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Domaine d'appartenance de chaque type d'événement (anti-usurpation). */
const EVENT_OWNER: Record<string, string> = {
  "sale.invoice.issued": "atlas_trade",
  "sale.credit_note.issued": "atlas_trade",
  "sale.payment.received": "atlas_trade",
  "purchase.order.approved": "atlas_procure",
  "purchase.goods_receipt.posted": "atlas_procure",
  "purchase.invoice.received": "atlas_procure",
  "purchase.credit_note.received": "atlas_procure",
  "purchase.payment.issued": "atlas_procure",
  "payroll.run.validated": "atlas_people",
  "payroll.payment.issued": "atlas_people",
  "payroll.contribution.declared": "atlas_people",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── 1. Authentification par application ───────────────────────────────────
  const presented = req.headers.get("x-atlas-key") ?? "";
  if (!presented) return json({ error: "MISSING_API_KEY" }, 401);

  const keyHash = await sha256Hex(presented);
  const { data: key } = await svc
    .from("integration_api_keys")
    .select("id, tenant_id, source_system, active")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .maybeSingle();

  if (!key) return json({ error: "INVALID_API_KEY" }, 401);

  // ── 2. Corps ──────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body) return json({ error: "INVALID_JSON" }, 400);

  const {
    tenant_id,
    source_system,
    event_type,
    event_version,
    source_doc_id,
    occurred_at,
    payload,
  } = body;

  const idempotencyKey = req.headers.get("idempotency-key") ?? body.idempotency_key;
  if (!idempotencyKey) return json({ error: "MISSING_IDEMPOTENCY_KEY" }, 400);
  if (!event_type || !source_doc_id || !payload) {
    return json({ error: "MISSING_FIELDS", detail: "event_type, source_doc_id, payload requis" }, 400);
  }

  // La clé porte le tenant : un satellite ne peut pas écrire chez un autre.
  if (tenant_id && tenant_id !== key.tenant_id) {
    return json({ error: "TENANT_MISMATCH" }, 403);
  }
  // …ni usurper le domaine d'un autre satellite.
  if (source_system && source_system !== key.source_system) {
    return json({ error: "SOURCE_MISMATCH" }, 403);
  }
  const owner = EVENT_OWNER[event_type];
  if (!owner) return json({ error: "UNKNOWN_EVENT_TYPE", event_type }, 400);
  if (owner !== key.source_system) {
    return json(
      { error: "OWNER_MISMATCH", detail: `« ${event_type} » appartient à ${owner}` },
      403,
    );
  }

  // ── 3. Idempotence ────────────────────────────────────────────────────────
  const { data: existing } = await svc
    .from("integration_events")
    .select("id, status")
    .eq("tenant_id", key.tenant_id)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    // Rejeu : AUCUN effet de bord, on renvoie l'événement déjà connu.
    return json({ event_id: existing.id, status: existing.status, duplicate: true }, 200);
  }

  // ── 4. Journalisation ─────────────────────────────────────────────────────
  // payload_hash calculé SERVEUR : le satellite ne peut pas sceller lui-même
  // une empreinte qui ne correspondrait pas au contenu reçu.
  const payloadHash = await sha256Hex(canonicalize(payload));

  const { data: inserted, error } = await svc
    .from("integration_events")
    .insert({
      tenant_id: key.tenant_id,
      source_system: key.source_system,
      event_type,
      event_version: event_version ?? 1,
      source_doc_id: String(source_doc_id),
      idempotency_key: idempotencyKey,
      occurred_at: occurred_at ?? new Date().toISOString(),
      payload,
      payload_hash: payloadHash,
      status: "pending",
      attempts: 0,
    })
    .select("id, status")
    .single();

  if (error) {
    // Course : deux requêtes concurrentes avec la même clé. La contrainte
    // unique a tranché — on renvoie l'événement gagnant, pas une erreur.
    if (error.code === "23505") {
      const { data: winner } = await svc
        .from("integration_events")
        .select("id, status")
        .eq("tenant_id", key.tenant_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (winner) return json({ event_id: winner.id, status: winner.status, duplicate: true }, 200);
    }
    return json({ error: "INSERT_FAILED", detail: error.message }, 500);
  }

  await svc
    .from("integration_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  // 202 : le fait est ACCEPTÉ et journalisé ; sa comptabilisation est
  // asynchrone (le satellite ne doit jamais attendre le Grand Livre).
  return json(
    { event_id: inserted.id, status: inserted.status, payload_hash: payloadHash, duplicate: false },
    202,
  );
});
