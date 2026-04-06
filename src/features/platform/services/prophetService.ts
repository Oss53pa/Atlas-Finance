/**
 * Proph3t AI Service — Appel API Anthropic Claude avec contexte tenant.
 * Multi-tenant : chaque requête injecte le contexte du tenant actif.
 *
 * Anthropic calls are proxied through the Supabase Edge Function ai-proxy
 * so the API key stays server-side.
 */

import { supabase } from '../../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANTHROPIC_ENABLED = import.meta.env.VITE_ANTHROPIC_ENABLED === 'true';
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || '';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'mistral';

export interface ProphetQuery {
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  module: string;
  country: string;
  currency: string;
  userMessage: string;
  context?: Record<string, unknown>;
}

export interface ProphetResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  latencyMs: number;
}

const SYSTEM_PROMPT = (q: ProphetQuery) => `Tu es Proph3t, l'assistant IA intégré à Atlas Studio.
Tu es spécialisé en comptabilité SYSCOHADA, fiscalité UEMOA/CEMAC, et gestion d'entreprise en Afrique subsaharienne.

CONTEXTE ACTUEL
───────────────
Tenant      : ${q.tenantName} (${q.tenantId.slice(0, 8)})
Module      : ${q.module}
Pays        : ${q.country}
Devise      : ${q.currency}
Utilisateur : ${q.userName}

RÈGLES
──────
1. Réponds toujours en français
2. Sois précis et professionnel
3. Cite les articles SYSCOHADA quand pertinent
4. Adapte les règles fiscales au pays ${q.country}
5. Ne jamais inventer de taux ou d'article de loi
6. Propose des écritures comptables au format : compte / libellé / débit / crédit
${q.context ? `\nDONNÉES CONTEXTUELLES\n${JSON.stringify(q.context, null, 2)}` : ''}`;

/**
 * Appel LLM avec retry automatique (Anthropic ou Ollama).
 */
export async function queryProphet(query: ProphetQuery): Promise<ProphetResponse> {
  const start = Date.now();

  // Strategy 1: Anthropic Claude (via Supabase ai-proxy)
  if (ANTHROPIC_ENABLED && SUPABASE_URL) {
    return callAnthropic(query, start);
  }

  // Strategy 2: Ollama local
  if (OLLAMA_BASE_URL) {
    return callOllama(query, start);
  }

  // No provider
  return {
    content: "PROPH3T n'est pas configuré. Ajoutez VITE_ANTHROPIC_ENABLED=true ou VITE_OLLAMA_BASE_URL dans votre .env.",
    provider: 'none',
    model: 'none',
    tokensUsed: 0,
    latencyMs: Date.now() - start,
  };
}

async function callAnthropic(query: ProphetQuery, start: number, retries = 3): Promise<ProphetResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('[Proph3t] No active Supabase session — user must be logged in.');
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          temperature: 0.1,
          system: SYSTEM_PROMPT(query),
          messages: [{ role: 'user', content: query.userMessage }],
        }),
      });

      const data = await res.json() as {
        error?: { type?: string; message?: string };
        content?: Array<{ text: string }>;
        model?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      // Retry on overload
      if (data?.error?.type === 'overloaded_error') {
        const wait = 1000 * Math.pow(2, i);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (data?.error) {
        throw new Error(data.error.message || 'Anthropic API error');
      }

      const content = data.content?.map((b: { text: string }) => b.text).join('') || '';
      return {
        content,
        provider: 'anthropic',
        model: data.model || 'claude-sonnet',
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }

  throw new Error('Anthropic API unavailable after retries');
}

async function callOllama(query: ProphetQuery, start: number): Promise<ProphetResponse> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      options: { temperature: 0.1 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(query) },
        { role: 'user', content: query.userMessage },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const data = await res.json() as {
    message?: { content?: string };
    eval_count?: number;
  };
  return {
    content: data.message?.content || '',
    provider: 'ollama',
    model: OLLAMA_MODEL,
    tokensUsed: data.eval_count || 0,
    latencyMs: Date.now() - start,
  };
}
