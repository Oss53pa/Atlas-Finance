/**
 * apiGatewayService — gestion des clés API & webhooks de la passerelle publique.
 *
 * Persiste réellement dans Supabase (tables `api_keys` / `webhooks`, scoping
 * tenant via RLS get_user_company_id). La clé en clair n'est JAMAIS stockée : on
 * n'enregistre que son empreinte SHA-256 (identique au hachage vérifié par
 * l'Edge Function `api-gateway`) et un préfixe d'affichage. La valeur en clair
 * n'est donc montrée qu'une seule fois, à la création.
 *
 * Disponible en mode SaaS (Supabase) uniquement.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Les tables api_keys / webhooks ne sont pas dans les types générés.
const db = supabase as unknown as SupabaseClient;

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  environment: 'Production' | 'Test';
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  rateLimitPerHour: number;
  expiresAt: string | null;
}

export interface WebhookRecord {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
  failureCount: number;
}

/** SHA-256 hex — identique au hachage de l'Edge Function api-gateway. */
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getTenantId(): Promise<string> {
  const { data, error } = await db.rpc('get_user_company_id');
  if (error || !data) throw new Error('Société introuvable pour cet utilisateur.');
  return data as unknown as string;
}

/** Génère une clé en clair robuste (192 bits d'aléa). */
function generateKey(environment: 'Production' | 'Test'): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const prefix = environment === 'Production' ? 'pk_live' : 'pk_test';
  return `${prefix}_${rand}`;
}

/** UI (['read','write','delete']) → scopes de la passerelle. */
export function permissionsToScopes(permissions: string[]): string[] {
  const perms = permissions.length ? permissions : ['read'];
  return perms.map((p) => (p === 'read' ? 'read:all' : `${p}:all`));
}

function mapKey(row: Record<string, any>): ApiKeyRecord {
  const prefix: string = row.key_prefix || '';
  return {
    id: row.id,
    name: row.name,
    keyPrefix: prefix,
    environment: prefix.startsWith('pk_live') ? 'Production' : 'Test',
    scopes: (row.scopes as string[]) || [],
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at ?? null,
    rateLimitPerHour: row.rate_limit_per_hour ?? 5000,
    expiresAt: row.expires_at ?? null,
  };
}

function mapWebhook(row: Record<string, any>): WebhookRecord {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    events: (row.events as string[]) || [],
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    lastTriggeredAt: row.last_triggered_at ?? null,
    failureCount: row.failure_count ?? 0,
  };
}

// ── Clés API ────────────────────────────────────────────────────────────────

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const { data, error } = await db
    .from('api_keys')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapKey);
}

/**
 * Crée une clé API. Retourne la valeur EN CLAIR (à afficher une seule fois) et
 * l'enregistrement persisté (sans le secret).
 */
export async function createApiKey(params: {
  name: string;
  environment: 'Production' | 'Test';
  permissions: string[];
  rateLimit: number;
  expiresAt?: string | null;
}): Promise<{ plaintext: string; record: ApiKeyRecord }> {
  const tenantId = await getTenantId();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('Utilisateur non authentifié.');

  const plaintext = generateKey(params.environment);
  const keyHash = await sha256Hex(plaintext);
  const keyPrefix = plaintext.slice(0, 16); // pk_live_xxxxxxxx / pk_test_xxxxxxxx

  const { data, error } = await db
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      name: params.name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: permissionsToScopes(params.permissions),
      is_active: true,
      rate_limit_per_hour: params.rateLimit || 5000,
      expires_at: params.expiresAt ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { plaintext, record: mapKey(data) };
}

/** Active/désactive une clé (révocation = active:false) sans la supprimer. */
export async function setApiKeyActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await db
    .from('api_keys')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Révoque (désactive) une clé sans la supprimer. */
export async function revokeApiKey(id: string): Promise<void> {
  return setApiKeyActive(id, false);
}

export async function deleteApiKey(id: string): Promise<void> {
  const { error } = await db.from('api_keys').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export async function listWebhooks(): Promise<WebhookRecord[]> {
  const { data, error } = await db
    .from('webhooks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(mapWebhook);
}

export async function createWebhook(params: {
  url: string;
  events: string[];
  name?: string;
}): Promise<WebhookRecord> {
  const tenantId = await getTenantId();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id ?? null;

  let host = params.url;
  try { host = new URL(params.url).host; } catch { /* garde l'URL brute */ }

  const secretBytes = new Uint8Array(24);
  crypto.getRandomValues(secretBytes);
  const secret = 'whsec_' + Array.from(secretBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  const { data, error } = await db
    .from('webhooks')
    .insert({
      tenant_id: tenantId,
      name: params.name?.trim() || host,
      url: params.url.trim(),
      events: params.events,
      secret,
      is_active: true,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapWebhook(data);
}

export async function toggleWebhook(id: string, isActive: boolean): Promise<void> {
  const { error } = await db
    .from('webhooks')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await db.from('webhooks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
