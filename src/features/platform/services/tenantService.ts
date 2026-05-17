// @ts-nocheck

/**
 * Service Tenant — gestion des tenants, profils, feature flags.
 * Utilisé par le dashboard client et la console admin.
 */
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';

const isDev = typeof import.meta !== 'undefined' && (import.meta.env?.VITE_APP_ENV === 'development' || import.meta.env?.VITE_DATA_MODE === 'local');

// ════════════════════════════════════════════════════════
// DONNÉES FICTIVES DÉMO
// ════════════════════════════════════════════════════════
const DEMO_TEAM = [
  { id: 'u1', first_name: 'Amadou', last_name: 'Sanga', full_name: 'Amadou Sanga', phone: '+225 07 08 09 10', role: 'admin', status: 'active', last_login_at: '2026-03-18T14:30:00Z', created_at: '2025-06-15' },
  { id: 'u2', first_name: 'Fatou', last_name: 'Koné', full_name: 'Fatou Koné', phone: '+225 05 12 34 56', role: 'comptable', status: 'active', last_login_at: '2026-03-18T09:00:00Z', created_at: '2025-07-01' },
  { id: 'u3', first_name: 'Ibrahim', last_name: 'Touré', full_name: 'Ibrahim Touré', phone: '+225 01 22 33 44', role: 'controle_gestion', status: 'active', last_login_at: '2026-03-17T16:45:00Z', created_at: '2025-08-10' },
  { id: 'u4', first_name: 'Marie', last_name: 'Bamba', full_name: 'Marie Bamba', phone: '+225 07 55 66 77', role: 'readonly', status: 'invited', last_login_at: null, created_at: '2026-03-15' },
];

const DEMO_INVOICES = [
  { id: 'inv-001', invoice_number: 'AS-2026-001', tenant_id: 'demo', amount: 25000, currency: 'XOF', status: 'paid', payment_method: 'mobile_money', payment_reference: 'OM-2026031501234', period_start: '2026-02-01', period_end: '2026-02-28', paid_at: '2026-02-03T10:00:00Z', created_at: '2026-02-01' },
  { id: 'inv-002', invoice_number: 'AS-2026-002', tenant_id: 'demo', amount: 25000, currency: 'XOF', status: 'paid', payment_method: 'mobile_money', payment_reference: 'OM-2026030101567', period_start: '2026-03-01', period_end: '2026-03-31', paid_at: '2026-03-02T08:30:00Z', created_at: '2026-03-01' },
  { id: 'inv-003', invoice_number: 'AS-2026-003', tenant_id: 'demo', amount: 15000, currency: 'XOF', status: 'pending', payment_method: 'virement', period_start: '2026-03-10', period_end: '2026-04-09', created_at: '2026-03-10' },
];

const DEMO_INVITATIONS = [
  { id: 'inv-p1', organization_id: 'demo', email: 'jean.kouassi@sangafils.ci', role_code: 'comptable', token: 'abc123', invited_by: 'u1', accepted_at: null, expires_at: '2026-03-21T00:00:00Z', created_at: '2026-03-18T10:00:00Z' },
];

// ============================================================================
// TENANT
// ============================================================================

export async function getMyTenant(): Promise<Record<string, any> | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = (user.user_metadata as Record<string, any> | undefined) || {};

  // Tolerant : pas de single() pour éviter 406 si la ligne n'existe pas encore.
  let profile: Record<string, any> | null = null;
  try {
    const { data } = await supabase
      .from('user_profiles')
      .select('tenant_id, role, full_name, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();
    profile = data as Record<string, any> | null;
  } catch (_e) { /* table absente, RLS, ... */ }

  // Fallback tenant minimal (compatible avec le typage tenants existant)
  const fallbackTenant: Record<string, any> = {
    id: (profile?.tenant_id as string) || (meta.tenant_id as string) || 'default',
    name: (meta.company_name as string) || 'Mon entreprise',
    plan: (meta.plan as string) || 'starter',
    status: 'active',
    created_at: new Date().toISOString(),
    userRole: (profile?.role as string) || (meta.role as string) || 'user',
    userName:
      (profile?.full_name as string) ||
      [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() ||
      (meta.full_name as string) ||
      user.email ||
      'Utilisateur',
  };

  if (!profile?.tenant_id) return fallbackTenant;

  let tenant: Record<string, any> | null = null;
  try {
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', profile.tenant_id as string)
      .maybeSingle();
    tenant = data as Record<string, any> | null;
  } catch (_e) { /* ignore */ }

  if (!tenant) return fallbackTenant;

  return {
    ...tenant,
    userRole: profile.role,
    userName:
      (profile.full_name as string) ||
      [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
      user.email,
  };
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

  let profile: { tenant_id?: string } | null = null;
  try {
    const { data } = await supabase.from('user_profiles').select('tenant_id').eq('id', user.id).maybeSingle();
    profile = data as { tenant_id?: string } | null;
  } catch (_e) { /* ignore */ }
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

// Garde-fou : tenant_id doit etre un UUID valide pour ne pas declencher
// 400 sur des colonnes UUID (Supabase rejette 'default' / strings vides).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidTenantId = (id: string | undefined | null): id is string =>
  typeof id === 'string' && UUID_RE.test(id);

export async function getEnabledModules(tenantId: string): Promise<string[]> {
  if (!isValidTenantId(tenantId)) return [];
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('module')
      .eq('tenant_id', tenantId)
      .eq('enabled', true);
    if (error || !data) return [];
    return data.map(f => f.module);
  } catch (_e) {
    return [];
  }
}

export async function isModuleEnabled(tenantId: string, module: string): Promise<boolean> {
  if (!isValidTenantId(tenantId)) return true; // permissif si pas de tenant valide
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('tenant_id', tenantId)
      .eq('module', module)
      .maybeSingle();
    if (error || !data) return true; // module activé par défaut si pas de flag
    return data.enabled ?? true;
  } catch (_e) {
    return true;
  }
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export async function getTeamMembers(tenantId: string) {
  if (isDev) return DEMO_TEAM;
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
  } catch (err) { /* silent */ /* non-blocking */ }

  return data;
}

export async function getPendingInvitations(tenantId: string) {
  if (isDev) return DEMO_INVITATIONS;
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
  if (isDev) return DEMO_INVOICES;
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
