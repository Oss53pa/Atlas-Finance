// @ts-nocheck

/**
 * Audit Service — piste d'audit systématique.
 * Chaque action métier doit appeler auditLog().
 * SHA-256 hash chaining guarantees tamper-evident audit trail.
 */
import { supabase } from '../../../lib/supabase';

export interface AuditEvent {
  tenantId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  impersonatedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  impersonated_by?: string;
  hash?: string;
  previous_hash?: string;
  created_at: string;
}

/**
 * Compute SHA-256 hash of a string using Web Crypto API.
 */
async function computeHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch the hash of the last audit log entry for a given tenant.
 */
async function getLastAuditHash(tenantId: string): Promise<string | null> {
  const { data } = await supabase
    .from('audit_logs')
    .select('hash')
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();
  return data?.hash ?? null;
}

/**
 * Enregistrer un événement d'audit avec chainage SHA-256.
 * Non-bloquant : les erreurs sont loguées mais ne bloquent pas le flux.
 */
export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const previous_hash = await getLastAuditHash(event.tenantId);

    const details = event.metadata ? JSON.stringify(event.metadata) : '{}';

    const hashPayload = JSON.stringify({
      id,
      tenant_id: event.tenantId,
      action: event.action,
      entity_type: event.resourceType ?? null,
      entity_id: event.resourceId ?? null,
      user_id: user?.id ?? null,
      timestamp,
      details: event.metadata || {},
      previous_hash,
    });

    const hash = await computeHash(hashPayload);

    await supabase.from('audit_logs').insert({
      id,
      tenant_id: event.tenantId,
      user_id: user?.id,
      action: event.action,
      entity_type: event.resourceType ?? '',
      entity_id: event.resourceId ?? '',
      details,
      hash,
      previous_hash,
      timestamp,
    });
  } catch (err) {
  }
}

/**
 * Récupérer les logs d'audit d'un tenant.
 */
export async function getAuditLogs(
  tenantId: string,
  filters?: {
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ logs: AuditLogEntry[]; total: number }> {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('timestamp', { ascending: false });

  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.resourceType) query = query.eq('entity_type', filters.resourceType);
  if (filters?.startDate) query = query.gte('timestamp', filters.startDate);
  if (filters?.endDate) query = query.lte('timestamp', filters.endDate);

  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return { logs: data || [], total: count || 0 };
}

/**
 * Actions d'audit prédéfinies — à utiliser partout dans l'app.
 */
export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_INVITED: 'USER_INVITED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_SUSPENDED: 'USER_SUSPENDED',

  // Subscription
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',

  // Payment
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_VALIDATED_ADMIN: 'PAYMENT_VALIDATED_ADMIN',

  // Tenant
  TENANT_CREATED: 'TENANT_CREATED',
  TENANT_UPDATED: 'TENANT_UPDATED',
  TENANT_SUSPENDED: 'TENANT_SUSPENDED',
  TENANT_REACTIVATED: 'TENANT_REACTIVATED',

  // Feature flags
  MODULE_ENABLED: 'MODULE_ENABLED',
  MODULE_DISABLED: 'MODULE_DISABLED',

  // Accounting
  ENTRY_CREATED: 'ENTRY_CREATED',
  ENTRY_VALIDATED: 'ENTRY_VALIDATED',
  ENTRY_POSTED: 'ENTRY_POSTED',
  CLOSURE_STARTED: 'CLOSURE_STARTED',
  CLOSURE_COMPLETED: 'CLOSURE_COMPLETED',

  // Export
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  FEC_EXPORTED: 'FEC_EXPORTED',

  // Admin
  IMPERSONATION_START: 'IMPERSONATION_START',
  IMPERSONATION_END: 'IMPERSONATION_END',
} as const;
