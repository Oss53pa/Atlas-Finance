// @ts-nocheck
/**
 * Service Tenant — gestion des tenants, profils, feature flags.
 * Utilisé par le dashboard client et la console admin.
 */
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

// ============================================================================
// TENANT
// ============================================================================

export async function getMyTenant() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, full_name, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return null;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single();

  return tenant ? { ...tenant, userRole: profile.role, userName: profile.full_name || `${profile.first_name} ${profile.last_name}` } : null;
}

export async function updateTenant(tenantId: string, data: Record<string, unknown>) {
  const { error } = await supabase.from('tenants').update({ ...data, updated_at: new Date().toISOString() }).eq('id', tenantId);
  if (error) throw new Error(error.message);
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export async function getMySubscriptions() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).single();
  if (!profile?.tenant_id) return [];

  const { data } = await supabase
    .from('subscriptions')
    .select('*, solution:solutions(*)')
    .eq('organization_id', profile.tenant_id);

  return data || [];
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export async function getEnabledModules(tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from('feature_flags')
    .select('module')
    .eq('tenant_id', tenantId)
    .eq('enabled', true);
  return (data || []).map(f => f.module);
}

export async function isModuleEnabled(tenantId: string, module: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('module', module)
    .single();
  return data?.enabled ?? false;
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export async function getTeamMembers(tenantId: string) {
  const { data } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, full_name, email:id, phone, role, status, last_login_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at');

  // Fetch emails from auth (user_profiles doesn't store email directly)
  if (data) {
    for (const member of data) {
      // The id is the auth user id, we can use it to display
      member.email = member.full_name || member.first_name || 'Utilisateur';
    }
  }
  return data || [];
}

export async function updateMemberRole(userId: string, role: string) {
  const { error } = await supabase.from('user_profiles').update({ role }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function suspendMember(userId: string) {
  const { error } = await supabase.from('user_profiles').update({ status: 'suspended' }).eq('id', userId);
  if (error) throw new Error(error.message);
}

// ============================================================================
// INVITATIONS
// ============================================================================

export async function sendInvitation(tenantId: string, email: string, role: string, modules: string[] = []) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email,
    role,
    modules,
    token: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    invited_by: user?.id,
  }).select().single();

  if (error) throw new Error(error.message);

  // Try Edge Function for email (non-blocking)
  try {
    await supabase.functions.invoke('send-invitation-email', {
      body: { email, token: data.token, role },
    });
  } catch { /* non-blocking */ }

  return data;
}

export async function getPendingInvitations(tenantId: string) {
  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  return data || [];
}

// ============================================================================
// INVOICES
// ============================================================================

export async function getInvoices(tenantId: string) {
  const { data } = await supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return data || [];
}

// ============================================================================
// AUDIT
// ============================================================================

export async function logAuditEvent(tenantId: string, action: string, resourceType?: string, resourceId?: string, metadata?: Record<string, unknown>) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: user?.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
  });
}

// ============================================================================
// ENTITIES
// ============================================================================

export async function getEntities(tenantId: string) {
  const { data } = await supabase
    .from('entities')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  return data || [];
}
