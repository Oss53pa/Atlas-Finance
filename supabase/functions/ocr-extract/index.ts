/**
 * Edge Function: ocr-extract
 * Moteur OCR serveur pour l'extraction de factures (module OCR Factures).
 *
 * Le client envoie { base64, mediaType, system, user } ; la fonction résout le
 * moteur disponible CÔTÉ SERVEUR (la clé ne quitte jamais le serveur) :
 *   1. Claude (ANTHROPIC_API_KEY global, ou clé BYOK via proph3t_get_anthropic_key)
 *      → vision native images + PDF.
 *   2. Groq (GROQ_API_KEY — déjà utilisé par Proph3t) → Llama 4 vision, images
 *      uniquement (les PDF renvoient une erreur explicite).
 *
 * Réponse : { content, engine } où `content` est le texte brut du modèle
 * (le client en extrait le JSON normalisé).
 *
 * Deploy : supabase functions deploy ocr-extract
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const appEncryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');

// CORS : reflète uniquement les origines connues de l'app (jamais '*' avec credentials).
const allowedOrigins = [
  'https://atlas-fna.atlas-studio.org',
  'https://atlas-finance.vercel.app',
  'https://app.atlas-finance.com',
  ...(Deno.env.get('ALLOWED_ORIGIN') ? [Deno.env.get('ALLOWED_ORIGIN') as string] : []),
];
function cors(origin: string): Record<string, string> {
  const matched = allowedOrigins.includes(origin) ? origin : (Deno.env.get('ALLOWED_ORIGIN') || allowedOrigins[0]);
  return {
    'Access-Control-Allow-Origin': matched,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function callClaude(
  key: string,
  base64: string,
  mediaType: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ ok: boolean; content?: string; error?: string; status?: number }> {
  const mediaBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('OCR_ANTHROPIC_MODEL') || 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: [mediaBlock, { type: 'text', text: user }] }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: `Claude ${res.status}: ${text.slice(0, 300)}` };
  }
  const json = await res.json();
  let content = '';
  for (const block of json?.content ?? []) if (block.type === 'text') content += block.text;
  return { ok: true, content };
}

async function callGroq(
  key: string,
  base64: string,
  mediaType: string,
  system: string,
  user: string,
  maxTokens: number,
): Promise<{ ok: boolean; content?: string; error?: string; status?: number }> {
  if (!IMAGE_TYPES.has(mediaType)) {
    return {
      ok: false,
      status: 415,
      error:
        'Le moteur vision actuel (Groq/Llama 4) ne lit que les images (JPG, PNG, WebP). ' +
        'Déposez la facture en image, ou configurez une clé Anthropic côté serveur pour la prise en charge des PDF.',
    };
  }
  const model = Deno.env.get('OCR_GROQ_MODEL') || 'meta-llama/llama-4-scout-17b-16e-instruct';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0,
      // Llama 4 vision : le system prompt et l'image passent par le format OpenAI.
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
            { type: 'text', text: user },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: `Groq ${res.status}: ${text.slice(0, 300)}` };
  }
  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '';
  return { ok: true, content };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const headers = { ...cors(origin), 'Content-Type': 'application/json' };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Auth obligatoire (JWT Supabase) ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing authorization header' }, 401);
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return json({ error: 'Unauthorized' }, 401);

    // ── Payload ─────────────────────────────────────────────────────────────
    const { base64, mediaType, system, user, maxTokens } = await req.json();
    if (!base64 || typeof base64 !== 'string') return json({ error: 'base64 requis' }, 400);
    if (!mediaType || typeof mediaType !== 'string') return json({ error: 'mediaType requis' }, 400);
    if (!IMAGE_TYPES.has(mediaType) && mediaType !== 'application/pdf') {
      return json({ error: `Type de fichier non supporté : ${mediaType}. Formats acceptés : JPG, PNG, WebP, PDF.` }, 415);
    }
    // Garde-fou taille (~20 Mo binaire ≈ 27 Mo base64)
    if (base64.length > 28_000_000) return json({ error: 'Fichier trop volumineux (max ~20 Mo).' }, 413);
    const sys = typeof system === 'string' && system ? system : 'Tu extrais les données de factures et réponds en JSON strict.';
    const usr = typeof user === 'string' && user ? user : 'Extrais les données de cette facture en JSON.';
    const max = Math.min(Math.max(Number(maxTokens) || 2048, 256), 8192);

    // ── Résolution du moteur (la clé reste serveur) ─────────────────────────
    // 1) Claude : secret global, sinon clé BYOK de l'utilisateur (Atlas Studio).
    let anthropicKey: string | null = Deno.env.get('ANTHROPIC_API_KEY') || null;
    if (!anthropicKey && serviceRoleKey && appEncryptionKey) {
      try {
        const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
        const { data, error } = await admin.rpc('proph3t_get_anthropic_key', {
          p_user_id: authUser.id,
          p_master_key: appEncryptionKey,
        });
        if (!error && data) anthropicKey = data as string;
      } catch (_e) { /* BYOK indisponible → on tente Groq */ }
    }

    if (anthropicKey) {
      const r = await callClaude(anthropicKey, base64, mediaType, sys, usr, max);
      if (r.ok) return json({ content: r.content, engine: 'anthropic' });
      // Clé Claude présente mais appel en échec → on tente Groq en secours (images).
      const groqKey = Deno.env.get('GROQ_API_KEY');
      if (groqKey && IMAGE_TYPES.has(mediaType)) {
        const g = await callGroq(groqKey, base64, mediaType, sys, usr, max);
        if (g.ok) return json({ content: g.content, engine: 'groq' });
      }
      return json({ error: r.error }, r.status === 429 ? 429 : 502);
    }

    // 2) Groq (clé déjà en place pour Proph3t).
    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (groqKey) {
      const g = await callGroq(groqKey, base64, mediaType, sys, usr, max);
      if (g.ok) return json({ content: g.content, engine: 'groq' });
      return json({ error: g.error }, g.status === 415 ? 415 : g.status === 429 ? 429 : 502);
    }

    return json({
      error:
        'Aucun moteur OCR disponible côté serveur. Définissez le secret ANTHROPIC_API_KEY ' +
        '(recommandé, images + PDF) ou GROQ_API_KEY (images) sur le projet Supabase.',
    }, 400);
  } catch (err) {
    console.error('ocr-extract error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
