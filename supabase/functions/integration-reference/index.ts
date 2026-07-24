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
//   GET  ?resource=closing-balance[&fiscalYearId=]  balance de clôture 8 col. (Liass'Pilot)
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

    // NB : on n'écrit que des colonnes garanties de `third_parties`.
    // `external_ref` / `source_system` n'existent pas sur cette table — les
    // ajouter ferait échouer l'insert (colonne inconnue) au lieu de créer le
    // tiers. La corrélation avec le satellite passe par le code canonique
    // renvoyé, que le satellite stocke de son côté.
    const { data: created, error } = await svc.from("third_parties").insert({
      tenant_id: tenant, code, name, type,
      tax_id: taxId ?? null, email: email ?? null, phone: phone ?? null,
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

  // ── Balance générale de clôture pour Liass'Pilot (Vague D) ─────────────────
  // Atlas F&A ne produit pas les annexes : il fournit la balance de clôture
  // 8 colonnes (après inventaire, avant affectation) que Liass'Pilot mappe vers
  // la DSF des 14 pays UEMOA/CEMAC.
  if (resource === "closing-balance") {
    // Exercice ciblé : paramètre explicite, sinon exercice ouvert le plus récent.
    let fiscalYearId = url.searchParams.get("fiscalYearId") ?? "";
    let fyRow: { id: string; name: string; start_date: string; end_date: string } | null = null;
    if (fiscalYearId) {
      const { data } = await svc.from("fiscal_years")
        .select("id, name, start_date, end_date")
        .eq("tenant_id", tenant).eq("id", fiscalYearId).maybeSingle();
      fyRow = data;
    } else {
      const { data } = await svc.from("fiscal_years")
        .select("id, name, start_date, end_date")
        .eq("tenant_id", tenant).order("start_date", { ascending: false }).limit(1).maybeSingle();
      fyRow = data;
      fiscalYearId = data?.id ?? "";
    }
    if (!fyRow) return json({ error: "NO_FISCAL_YEAR" }, 404);

    const { data: rows, error } = await svc.rpc("get_closing_trial_balance", {
      p_tenant_id: tenant,
      p_fiscal_year_id: fiscalYearId,
    });
    if (error) return json({ error: "RPC_FAILED", detail: error.message }, 500);

    const list = (rows ?? []) as Array<Record<string, number | string>>;
    const sum = (k: string) => list.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const totals = {
      openingDebit: round2(sum("opening_debit")),
      openingCredit: round2(sum("opening_credit")),
      movementDebit: round2(sum("movement_debit")),
      movementCredit: round2(sum("movement_credit")),
      closingDebit: round2(sum("closing_debit")),
      closingCredit: round2(sum("closing_credit")),
    };

    // Pays / zone / devise (résolution du champ libre societes.pays).
    const { data: soc } = await svc.from("societes").select("pays").eq("id", tenant).maybeSingle();
    const country = resolveOhadaCountry(soc?.pays);

    // Empreinte serveur : scelle la balance transmise.
    const canonical = JSON.stringify({
      fy: fiscalYearId, end: fyRow.end_date,
      rows: list.map(r => [r.account_code, Number(r.closing_debit), Number(r.closing_credit)]),
    });
    const integrityHash = await sha256Hex(canonical);

    return json({
      fiscalYear: { id: fyRow.id, label: fyRow.name, startDate: fyRow.start_date, endDate: fyRow.end_date },
      country: country ? { code: country.code, name: country.name, zone: country.zone } : null,
      currency: country?.currency ?? "XOF",
      state: "after_inventory_before_appropriation",
      rows: list.map(r => ({
        accountCode: r.account_code, accountName: r.account_name,
        openingDebit: Number(r.opening_debit), openingCredit: Number(r.opening_credit),
        movementDebit: Number(r.movement_debit), movementCredit: Number(r.movement_credit),
        closingDebit: Number(r.closing_debit), closingCredit: Number(r.closing_credit),
      })),
      totals,
      balanced: Math.abs(totals.closingDebit - totals.closingCredit) < 1,
      integrityHash,
      generatedAt: new Date().toISOString(),
    });
  }

  return json({ error: "UNKNOWN_RESOURCE", detail: "resource attendu" }, 400);
});

// ── Résolution pays OHADA (14 pays UEMOA + CEMAC) ────────────────────────────
// Miroir compact de src/services/fiscal/ohadaCountries.ts pour le runtime Deno.
type OhadaZone = "UEMOA" | "CEMAC";
const OHADA: Record<string, { name: string; zone: OhadaZone; currency: "XOF" | "XAF" }> = {
  BJ: { name: "Bénin", zone: "UEMOA", currency: "XOF" },
  BF: { name: "Burkina Faso", zone: "UEMOA", currency: "XOF" },
  CI: { name: "Côte d'Ivoire", zone: "UEMOA", currency: "XOF" },
  GW: { name: "Guinée-Bissau", zone: "UEMOA", currency: "XOF" },
  ML: { name: "Mali", zone: "UEMOA", currency: "XOF" },
  NE: { name: "Niger", zone: "UEMOA", currency: "XOF" },
  SN: { name: "Sénégal", zone: "UEMOA", currency: "XOF" },
  TG: { name: "Togo", zone: "UEMOA", currency: "XOF" },
  CM: { name: "Cameroun", zone: "CEMAC", currency: "XAF" },
  CF: { name: "Centrafrique", zone: "CEMAC", currency: "XAF" },
  CG: { name: "Congo", zone: "CEMAC", currency: "XAF" },
  GA: { name: "Gabon", zone: "CEMAC", currency: "XAF" },
  GQ: { name: "Guinée équatoriale", zone: "CEMAC", currency: "XAF" },
  TD: { name: "Tchad", zone: "CEMAC", currency: "XAF" },
};
function resolveOhadaCountry(input?: string | null) {
  if (!input) return undefined;
  const raw = input.trim().toUpperCase();
  if (OHADA[raw]) return { code: raw, ...OHADA[raw] };
  const n = input.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    "cote divoire": "CI", "cote d ivoire": "CI", "ivory coast": "CI", "rci": "CI",
    "benin": "BJ", "burkina": "BF", "burkina faso": "BF", "cameroun": "CM", "cameroon": "CM",
    "senegal": "SN", "gabon": "GA", "tchad": "TD", "chad": "TD", "mali": "ML", "niger": "NE",
    "togo": "TG", "guinee bissau": "GW", "guinee equatoriale": "GQ",
    "congo": "CG", "congo brazzaville": "CG", "centrafrique": "CF",
  };
  const code = aliases[n];
  return code ? { code, ...OHADA[code] } : undefined;
}
