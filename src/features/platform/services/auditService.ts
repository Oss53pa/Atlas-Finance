// @ts-nocheck
/**
 * Audit Service — piste d'audit systématique.
 * Chaque action métier doit appeler auditLog().
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
  created_at: string;
}

/**
 * Enregistrer un événement d'audit.
 * Non-bloquant : les erreurs sont loguées mais ne bloquent pas le flux.
 */
export async function auditLog(event: AuditEvent): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert({
      tenant_id: event.tenantId,
      user_id: user?.id,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      metadata: event.metadata || {},
      impersonated_by: event.impersonatedBy,
    });
  } catch (err) {
    console.error('[AuditService] Failed to log:', err);
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
    .order('created_at', { ascending: false });

  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.resourceType) query = query.eq('resource_type', filters.resourceType);
  if (filters?.startDate) query = query.gte('created_at', filters.startDate);
  if (filters?.endDate) query = query.lte('created_at', filters.endDate);

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
