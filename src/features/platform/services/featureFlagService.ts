// @ts-nocheck

/**
 * Feature Flag Service — contrôle l'accès aux modules par tenant.
 * Jamais hardcoder un module comme visible — toujours passer par ce service.
 */
import { supabase } from '../../../lib/supabase';

export interface FeatureFlag {
  id: string;
  tenant_id: string;
  module: string;
  enabled: boolean;
  override_by?: string;
  reason?: string;
  created_at: string;
}

/** Récupérer tous les flags d'un tenant */
export async function getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Vérifier si un module est activé pour un tenant */
export async function isModuleEnabled(tenantId: string, module: string): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('module', module)
    .single();
  return data?.enabled ?? false;
}

/** Récupérer la liste des modules activés */
export async function getEnabledModules(tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from('feature_flags')
    .select('module')
    .eq('tenant_id', tenantId)
    .eq('enabled', true);
  return (data || []).map(f => f.module);
}

/** Activer/désactiver un module (admin Atlas Studio uniquement) */
export async function toggleModule(tenantId: string, module: string, enabled: boolean, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('feature_flags')
    .upsert({
      tenant_id: tenantId,
      module,
      enabled,
      override_by: user?.id,
      reason: reason || (enabled ? 'Activation manuelle' : 'Désactivation manuelle'),
      created_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,module' });

  if (error) throw new Error(error.message);
}

/** Initialiser les feature flags depuis les subscriptions actives */
export async function syncFlagsFromSubscriptions(tenantId: string): Promise<void> {
  // Récupérer les solutions souscrites
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('solution:solutions(code)')
    .eq('organization_id', tenantId)
    .in('status', ['active', 'trialing']);

  const activeCodes = (subs || []).map((s: any) => s.solution?.code).filter(Boolean);

  // Toutes les solutions possibles
  const { data: allSolutions } = await supabase.from('solutions').select('code');
  const allCodes = (allSolutions || []).map((s: any) => s.code);

  // Upsert les flags
  for (const code of allCodes) {
    await supabase
      .from('feature_flags')
      .upsert({
        tenant_id: tenantId,
        module: code,
        enabled: activeCodes.includes(code),
        created_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,module' });
  }
}
