// ============================================================================
// Edge Function `consolidation-balances` — balances réelles du périmètre
//
// Fournit au moteur de consolidation les balances des entités du périmètre,
// agrégées CÔTÉ SERVEUR (l'app est mono-tenant sous RLS).
//
// Sécurité : l'utilisateur est identifié par son JWT ; on ne renvoie les
// balances que si l'utilisateur est membre de CHAQUE société demandée
// (user_companies). Une seule société non autorisée → 403 (pas de fuite
// partielle). service_role uniquement pour l'agrégation, jamais pour élargir.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const uid = u.user.id;

  const body = await req.json().catch(() => null);
  const requested: string[] = Array.isArray(body?.companyIds) ? body.companyIds : [];
  if (requested.length === 0) return json({ error: "NO_COMPANIES" }, 400);

  // Autorisation : l'utilisateur doit être membre de TOUTES les sociétés demandées.
  const { data: memberships } = await svc
    .from("user_companies").select("company_id").eq("user_id", uid).in("company_id", requested);
  const authorized = new Set((memberships ?? []).map((m: any) => m.company_id));
  const unauthorized = requested.filter((id) => !authorized.has(id));
  if (unauthorized.length > 0) {
    return json({ error: "FORBIDDEN", detail: "Société(s) hors de votre périmètre", unauthorized }, 403);
  }

  // Agrégation des balances (une requête, groupée par société + compte).
  const { data: rows, error } = await svc.rpc("consolidation_entity_balances", { p_company_ids: requested });
  if (error) return json({ error: "RPC_FAILED", detail: error.message }, 500);

  // Assemblage par entité : soldes {compte: signé} + résultat (produits − charges).
  const byTenant = new Map<string, { soldes: Record<string, number>; produits: number; charges: number }>();
  for (const r of (rows ?? []) as Array<{ tenant_id: string; account_code: string; solde: number }>) {
    let e = byTenant.get(r.tenant_id);
    if (!e) { e = { soldes: {}, produits: 0, charges: 0 }; byTenant.set(r.tenant_id, e); }
    const solde = Number(r.solde);
    e.soldes[r.account_code] = solde;
    if (r.account_code.startsWith("7")) e.produits += -solde;   // produit = crédit net
    else if (r.account_code.startsWith("6")) e.charges += solde; // charge = débit net
  }

  const entities = requested.map((id) => {
    const e = byTenant.get(id) ?? { soldes: {}, produits: 0, charges: 0 };
    return { societeId: id, soldes: e.soldes, resultat: Math.round(e.produits - e.charges) };
  });

  return json({ entities, generatedAt: new Date().toISOString() });
});
