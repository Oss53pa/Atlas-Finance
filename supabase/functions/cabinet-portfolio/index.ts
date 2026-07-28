// ============================================================================
// Edge Function `cabinet-portfolio` — portefeuille multi-dossiers du cabinet
//
// Un cabinet gère plusieurs sociétés clientes. L'app est mono-tenant sous RLS :
// une requête client ne voit qu'un dossier à la fois. Cette fonction agrège les
// KPI de TOUS les dossiers de l'utilisateur, côté serveur.
//
// Sécurité : l'utilisateur est identifié par son JWT (auth.getUser). On ne
// renvoie QUE les sociétés dont il est membre (user_companies WHERE user_id =
// son uid). Le service_role sert uniquement à l'agrégation cross-tenant, jamais
// à élargir le périmètre : le périmètre reste borné aux appartenances de l'user.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ── 1. Identité de l'utilisateur (JWT) ────────────────────────────────────
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return json({ error: "UNAUTHENTICATED" }, 401);
  const uid = u.user.id;

  // ── 2. Périmètre = sociétés dont l'utilisateur est MEMBRE ──────────────────
  const { data: memberships } = await svc
    .from("user_companies")
    .select("company_id, role")
    .eq("user_id", uid);
  const companyIds = (memberships ?? []).map((m: any) => m.company_id);
  if (companyIds.length === 0) return json({ dossiers: [] });
  const roleById = new Map<string, string>((memberships ?? []).map((m: any) => [m.company_id, m.role]));

  // ── 3. Métadonnées des dossiers ───────────────────────────────────────────
  const { data: societes } = await svc
    .from("societes")
    .select("id, code, nom, raison_sociale, pays")
    .in("id", companyIds);

  // Exercice courant (actif sinon le plus récent) par société.
  const { data: fys } = await svc
    .from("fiscal_years")
    .select("tenant_id, name, start_date, end_date, is_closed, is_active")
    .in("tenant_id", companyIds)
    .order("start_date", { ascending: false });
  const fyByTenant = new Map<string, any>();
  for (const fy of fys ?? []) {
    const cur = fyByTenant.get(fy.tenant_id);
    // Priorité à l'exercice actif, sinon le premier (le plus récent).
    if (!cur || (fy.is_active && !cur.is_active)) fyByTenant.set(fy.tenant_id, fy);
  }

  // ── 4. KPI comptables agrégés (une requête, groupée par tenant) ────────────
  const { data: kpis, error: kpiErr } = await svc.rpc("cabinet_portfolio_kpis", {
    p_company_ids: companyIds,
  });
  if (kpiErr) return json({ error: "KPI_FAILED", detail: kpiErr.message }, 500);
  const kpiByTenant = new Map<string, any>((kpis ?? []).map((k: any) => [k.tenant_id, k]));

  // ── 5. Assemblage ─────────────────────────────────────────────────────────
  const dossiers = (societes ?? []).map((s: any) => {
    const fy = fyByTenant.get(s.id);
    const k = kpiByTenant.get(s.id) ?? {};
    const produits = Number(k.produits ?? 0);
    const charges = Number(k.charges ?? 0);
    return {
      id: s.id,
      code: s.code,
      nom: s.raison_sociale || s.nom || s.code || s.id,
      pays: s.pays,
      role: roleById.get(s.id) ?? "Lecteur",
      exercice: fy ? { name: fy.name, startDate: fy.start_date, endDate: fy.end_date, isClosed: !!fy.is_closed } : null,
      entries: Number(k.entries ?? 0),
      lastActivity: k.last_date ?? null,
      produits,
      charges,
      resultat: Math.round(produits - charges),
    };
  }).sort((a, b) => a.nom.localeCompare(b.nom));

  return json({ dossiers, generatedAt: new Date().toISOString() });
});
