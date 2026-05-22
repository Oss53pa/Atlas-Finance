/**
 * Edge Function: ai-proxy
 * Proxy Anthropic Claude pour le client Proph3t (chemin secondaire ; le chemin
 * principal en prod est proph3t-ask / Groq).
 *
 * Résolution de la clé Anthropic, dans l'ordre :
 *  1. secret global ANTHROPIC_API_KEY (si défini) ;
 *  2. sinon, clé BYOK de l'utilisateur stockée dans Atlas Studio
 *     (RPC proph3t_get_anthropic_key, déchiffrée via APP_ENCRYPTION_KEY).
 *
 * Requires Supabase auth (JWT in Authorization header).
 * Deploy: supabase functions deploy ai-proxy
 * Secrets utilisés : APP_ENCRYPTION_KEY (BYOK) et/ou ANTHROPIC_API_KEY (global).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const appEncryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = getCorsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // Verify Supabase auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // Résolution de la clé : 1) secret global, 2) clé BYOK de l'utilisateur.
    let anthropicKey: string | null = Deno.env.get('ANTHROPIC_API_KEY') || null;
    if (!anthropicKey && serviceRoleKey && appEncryptionKey) {
      try {
        const admin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data, error } = await admin.rpc('proph3t_get_anthropic_key', {
          p_user_id: user.id,
          p_master_key: appEncryptionKey,
        });
        if (!error && data) anthropicKey = data as string;
      } catch (_e) { /* ignore -> message clair ci-dessous */ }
    }
    if (!anthropicKey) {
      return json({
        error: "Aucune clé Anthropic disponible. Enregistrez votre clé dans Atlas Studio (Proph3t → fournisseur Anthropic), ou définissez le secret serveur ANTHROPIC_API_KEY.",
      }, 400);
    }

    // Parse request body
    const { messages, system, model, max_tokens, temperature, tools } = await req.json();
    if (!messages || !Array.isArray(messages)) return json({ error: 'messages array is required' }, 400);

    // Build Anthropic API request
    const anthropicBody: Record<string, unknown> = {
      model: model || 'claude-sonnet-4-6',
      max_tokens: max_tokens || 1024,
      messages,
    };
    if (system) anthropicBody.system = system;
    if (temperature !== undefined) anthropicBody.temperature = temperature;
    if (tools && Array.isArray(tools) && tools.length > 0) anthropicBody.tools = tools;

    // Forward to Anthropic
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });

    const data = await anthropicResponse.json();
    return json(data, anthropicResponse.status);
  } catch (err) {
    console.error('ai-proxy error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
