/**
 * Edge Function : api-gateway — passerelle API publique d'Atlas FnA.
 *
 * API REST authentifiée par clé (et NON par JWT). Un client externe présente sa
 * clé dans l'en-tête `Authorization: Bearer pk_live_…`. La passerelle :
 *   1. hash la clé (SHA-256) et la recherche dans `api_keys` (service role) ;
 *   2. vérifie qu'elle est active et non expirée ;
 *   3. applique le rate limiting horaire (comptage dans `api_logs`) ;
 *   4. sert des ressources comptables en lecture, scoping strict par tenant_id ;
 *   5. journalise chaque requête dans `api_logs` et met à jour last_used_at.
 *
 * Ressources (GET) : /journal-entries · /third-parties · /accounts
 * Pagination : ?limit (défaut 50, max 200) & ?offset.
 * Scopes : la clé doit porter le scope de la ressource, ou `read:all`.
 *
 * verify_jwt DOIT être désactivé : l'authentification est faite par clé API.
 * Secrets : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 *
 * Deploy: supabase functions deploy api-gateway --no-verify-jwt
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// API publique : consommée par des serveurs tiers, pas par un navigateur ⇒
// CORS large mais aucune donnée n'est servie sans clé API valide.
const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const json = (b: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(b), {
    status,
    headers: { ...cors, ...extra, 'Content-Type': 'application/json' },
  });

/** SHA-256 hex — identique au hachage côté client (apiGatewayService). */
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface ApiKeyRow {
  id: string;
  tenant_id: string | null;
  scopes: string[] | null;
  is_active: boolean | null;
  expires_at: string | null;
  rate_limit_per_hour: number | null;
}

// Ressource → scope requis + table + colonnes exposées + tri.
const RESOURCES: Record<string, { scope: string; table: string; columns: string; order: string; ascending: boolean }> = {
  'journal-entries': {
    scope: 'read:entries',
    table: 'journal_entries',
    columns: 'id, entry_number, journal, date, reference, label, status, total_debit, total_credit, created_at',
    order: 'date',
    ascending: false,
  },
  'third-parties': {
    scope: 'read:third_parties',
    table: 'third_parties',
    columns: 'id, code, name, type, email, phone, tax_id, balance, is_active, created_at',
    order: 'name',
    ascending: true,
  },
  accounts: {
    scope: 'read:accounts',
    table: 'accounts',
    columns: 'id, code, name, account_class, account_type, normal_balance, is_active',
    order: 'code',
    ascending: true,
  },
};

function hasScope(scopes: string[] | null, required: string): boolean {
  if (!scopes || scopes.length === 0) return false;
  return scopes.includes('read:all') || scopes.includes(required);
}

Deno.serve(async (req: Request) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const url = new URL(req.url);
  // /functions/v1/api-gateway/<...resource> — on isole le segment ressource.
  const parts = url.pathname.split('/').filter(Boolean);
  const gwIdx = parts.indexOf('api-gateway');
  const segments = gwIdx >= 0 ? parts.slice(gwIdx + 1) : parts;
  // Ignore un éventuel préfixe de version (/v1).
  const resource = (segments[0] === 'v1' ? segments[1] : segments[0]) || '';
  const endpoint = '/' + segments.join('/');

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Journalisation best-effort (n'échoue jamais la requête).
  const logRequest = async (apiKeyId: string | null, status: number, errorMessage?: string) => {
    try {
      await svc.from('api_logs').insert({
        api_key_id: apiKeyId,
        endpoint,
        method: req.method,
        status_code: status,
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || null,
        user_agent: req.headers.get('user-agent') || null,
        response_time_ms: Date.now() - started,
        error_message: errorMessage || null,
      });
    } catch { /* ignore */ }
  };

  if (req.method !== 'GET') {
    return json({ error: 'Méthode non autorisée. Cette API est en lecture seule (GET).' }, 405);
  }

  // 1. Authentification par clé API.
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    await logRequest(null, 401, 'missing_bearer_key');
    return json({ error: 'Clé API manquante. Header attendu : Authorization: Bearer <clé>.' }, 401);
  }

  const keyHash = await sha256Hex(token);
  const { data: key } = await svc
    .from('api_keys')
    .select('id, tenant_id, scopes, is_active, expires_at, rate_limit_per_hour')
    .eq('key_hash', keyHash)
    .maybeSingle<ApiKeyRow>();

  if (!key) {
    await logRequest(null, 401, 'invalid_key');
    return json({ error: 'Clé API invalide.' }, 401);
  }
  if (key.is_active === false) {
    await logRequest(key.id, 403, 'revoked_key');
    return json({ error: 'Clé API révoquée.' }, 403);
  }
  if (key.expires_at && new Date(key.expires_at).getTime() <= Date.now()) {
    await logRequest(key.id, 403, 'expired_key');
    return json({ error: 'Clé API expirée.' }, 403);
  }
  if (!key.tenant_id) {
    await logRequest(key.id, 403, 'key_without_tenant');
    return json({ error: 'Clé API non rattachée à une société.' }, 403);
  }

  // 2. Rate limiting horaire (fenêtre glissante 1h via api_logs).
  const limit = key.rate_limit_per_hour ?? 5000;
  const sinceIso = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentCount } = await svc
    .from('api_logs')
    .select('*', { count: 'exact', head: true })
    .eq('api_key_id', key.id)
    .gte('created_at', sinceIso);
  if ((recentCount ?? 0) >= limit) {
    await logRequest(key.id, 429, 'rate_limited');
    return json(
      { error: 'Limite de débit atteinte.', limit, window: '1h' },
      429,
      { 'Retry-After': '3600', 'X-RateLimit-Limit': String(limit) },
    );
  }

  // Mise à jour non bloquante de last_used_at.
  svc.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then(() => {});

  // 3. Racine / découverte : liste des endpoints.
  if (!resource) {
    await logRequest(key.id, 200);
    return json({
      name: 'Atlas FnA API',
      version: 'v1',
      resources: Object.keys(RESOURCES).map((r) => ({
        path: `/${r}`,
        scope: RESOURCES[r].scope,
        methods: ['GET'],
      })),
      pagination: { params: ['limit', 'offset'], default_limit: 50, max_limit: 200 },
    });
  }

  const spec = RESOURCES[resource];
  if (!spec) {
    await logRequest(key.id, 404, 'unknown_resource');
    return json({ error: `Ressource inconnue : ${resource}.`, available: Object.keys(RESOURCES) }, 404);
  }
  if (!hasScope(key.scopes, spec.scope)) {
    await logRequest(key.id, 403, 'missing_scope');
    return json({ error: `Scope requis : ${spec.scope} (ou read:all).` }, 403);
  }

  // 4. Service des données, scoping strict par tenant.
  const rawLimit = parseInt(url.searchParams.get('limit') || '50', 10);
  const pageLimit = Math.min(200, Math.max(1, isNaN(rawLimit) ? 50 : rawLimit));
  const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  const { data, count, error } = await svc
    .from(spec.table)
    .select(spec.columns, { count: 'exact' })
    .eq('tenant_id', key.tenant_id)
    .order(spec.order, { ascending: spec.ascending })
    .range(offset, offset + pageLimit - 1);

  if (error) {
    await logRequest(key.id, 500, error.message);
    return json({ error: 'Erreur interne.' }, 500);
  }

  await logRequest(key.id, 200);
  return json({
    data: data ?? [],
    pagination: { limit: pageLimit, offset, total: count ?? 0 },
  }, 200, { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': String(Math.max(0, limit - (recentCount ?? 0) - 1)) });
});
