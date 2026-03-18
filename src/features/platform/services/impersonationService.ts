// @ts-nocheck
/**
 * Impersonation Service — permet à un atlas_superadmin de se connecter
 * en tant que super admin d'un tenant (30 min max).
 */
import { supabase } from '../../../lib/supabase';

const STORAGE_KEY = 'atlas-impersonation';

interface ImpersonationState {
  adminEmail: string;
  adminUserId: string;
  tenantId: string;
  tenantName: string;
  startedAt: string;
  expiresAt: string;
}

export function startImpersonation(tenantId: string, tenantName: string, adminUserId: string, adminEmail: string): void {
  const state: ImpersonationState = {
    adminEmail,
    adminUserId,
    tenantId,
    tenantName,
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  // Audit log (non-blocking)
  supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: adminUserId,
    action: 'IMPERSONATION_START',
    metadata: { adminEmail, tenantName },
    impersonated_by: adminUserId,
  }).then(() => {});
}

export function stopImpersonation(): void {
  const state = getImpersonationInfo();
  if (state) {
    supabase.from('audit_logs').insert({
      tenant_id: state.tenantId,
      user_id: state.adminUserId,
      action: 'IMPERSONATION_END',
      metadata: { adminEmail: state.adminEmail, tenantName: state.tenantName },
      impersonated_by: state.adminUserId,
    }).then(() => {});
  }
  sessionStorage.removeItem(STORAGE_KEY);
}

export function isImpersonating(): boolean {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const state: ImpersonationState = JSON.parse(raw);
    if (new Date(state.expiresAt) < new Date()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch { return false; }
}

export function getImpersonationInfo(): ImpersonationState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const state: ImpersonationState = JSON.parse(raw);
    if (new Date(state.expiresAt) < new Date()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return state;
  } catch { return null; }
}
