// @ts-nocheck
/**
 * Admin Service — Console interne Atlas Studio.
 * Toutes les requêtes nécessitent le claim JWT atlas_role = 'atlas_superadmin'.
 */
import { supabase } from '../../../lib/supabase';

// ============================================================================
// KPIs
// ============================================================================

export async function getAdminKPIs() {
  const [tenantsRes, subsRes, invoicesRes] = await Promise.all([
    supabase.from('tenants').select('id, status, created_at'),
    supabase.from('subscriptions').select('id, status, solution:solutions(price_monthly_xof)'),
    supabase.from('invoices').select('id, amount, status, paid_at, created_at'),
  ]);

  const tenants = tenantsRes.data || [];
  const subs = subsRes.data || [];
  const invoices = invoicesRes.data || [];

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
  const churnedTenants = tenants.filter(t => t.status === 'churned').length;

  const newThisMonth = tenants.filter(t => t.created_at?.startsWith(thisMonth)).length;
  const newLastMonth = tenants.filter(t => t.created_at?.startsWith(lastMonth)).length;

  const activeSubs = subs.filter(s => s.status === 'active' || s.status === 'trialing');
  const mrr = activeSubs.reduce((sum, s) => sum + ((s.solution as any)?.price_monthly_xof || 0), 0);

  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const totalRevenue = paidInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

  return {
    totalTenants: tenants.length,
    activeTenants, trialTenants, suspendedTenants, churnedTenants,
    newThisMonth, newLastMonth,
    mrr, totalRevenue,
    activeSubscriptions: activeSubs.length,
    pendingPayments: pendingInvoices.length,
    pendingAmount: pendingInvoices.reduce((s, i) => s + (i.amount || 0), 0),
  };
}

// ============================================================================
// TENANTS LIST (admin)
// ============================================================================

export async function getTenantsAdmin(filters?: { status?: string; search?: string; page?: number }) {
  let query = supabase
    .from('tenants')
    .select('*, user_profiles(count)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,billing_email.ilike.%${filters.search}%,rccm.ilike.%${filters.search}%`);
  }

  const page = filters?.page || 0;
  const limit = 20;
  query = query.range(page * limit, (page + 1) * limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { tenants: data || [], total: count || 0 };
}

// ============================================================================
// TENANT DETAIL (admin)
// ============================================================================

export async function getTenantDetail(tenantId: string) {
  const [tenantRes, membersRes, subsRes, invoicesRes, logsRes] = await Promise.all([
    supabase.from('tenants').select('*').eq('id', tenantId).single(),
    supabase.from('user_profiles').select('*').eq('tenant_id', tenantId),
    supabase.from('subscriptions').select('*, solution:solutions(*)').eq('organization_id', tenantId),
    supabase.from('invoices').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('audit_logs').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50),
  ]);

  return {
    tenant: tenantRes.data,
    members: membersRes.data || [],
    subscriptions: subsRes.data || [],
    invoices: invoicesRes.data || [],
    auditLogs: logsRes.data || [],
  };
}

// ============================================================================
// ADMIN ACTIONS
// ============================================================================

export async function suspendTenant(tenantId: string, reason: string) {
  await supabase.from('tenants').update({ status: 'suspended', updated_at: new Date().toISOString() }).eq('id', tenantId);
  await supabase.from('audit_logs').insert({ tenant_id: tenantId, action: 'TENANT_SUSPENDED', metadata: { reason } });
}

export async function reactivateTenant(tenantId: string) {
  await supabase.from('tenants').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', tenantId);
  await supabase.from('audit_logs').insert({ tenant_id: tenantId, action: 'TENANT_REACTIVATED' });
}

export async function changeTenantPlan(tenantId: string, plan: string) {
  await supabase.from('tenants').update({ plan, updated_at: new Date().toISOString() }).eq('id', tenantId);
}

export async function validatePayment(invoiceId: string, reference: string) {
  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single();
  if (!invoice) throw new Error('Facture non trouvée');

  await supabase.from('invoices').update({
    status: 'paid', payment_reference: reference, paid_at: new Date().toISOString(),
  }).eq('id', invoiceId);

  // Activer la subscription liée
  if (invoice.subscription_id) {
    await supabase.from('subscriptions').update({ status: 'active', activated_at: new Date().toISOString() }).eq('id', invoice.subscription_id);
  }

  await supabase.from('audit_logs').insert({
    tenant_id: invoice.tenant_id, action: 'PAYMENT_VALIDATED', resource_type: 'invoice', resource_id: invoiceId,
    metadata: { reference, amount: invoice.amount },
  });
}

// ============================================================================
// SUPPORT TICKETS (admin)
// ============================================================================

export async function getTicketsAdmin(status?: string) {
  let query = supabase.from('support_tickets').select('*, tenant:tenants(name)').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data } = await query;
  return data || [];
}

export async function updateTicketStatus(ticketId: string, status: string, internalNotes?: string) {
  await supabase.from('support_tickets').update({
    status, internal_notes: internalNotes, updated_at: new Date().toISOString(),
  }).eq('id', ticketId);
}
