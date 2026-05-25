// @ts-nocheck
/**
 * Feature Flag Service — contrôle l'accès aux modules par tenant.
 * Toutes les fonctions sont tolérantes : si la table feature_flags
 * n'existe pas, si tenant_id n'est pas un UUID valide, ou si RLS
 * bloque l'accès, on retombe sur des valeurs par défaut sans throw.
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

// Garde-fou : tenant_id doit etre un UUID valide pour ne pas declencher
// 400 sur une colonne UUID (Postgres rejette les strings non-conformes).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidTenantId = (id: string | undefined | null): id is string =>
  typeof id === 'string' && UUID_RE.test(id);

// Cache de "tables cassees" -- skip les queries qui ont deja foire dans la session
let featureFlagsTableBroken = false;

/** Récupérer tous les flags d'un tenant */
export async function getFeatureFlags(tenantId: string): Promise<FeatureFlag[]> {
  if (!isValidTenantId(tenantId) || featureFlagsTableBroken) return [];
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) { featureFlagsTableBroken = true; return []; }
    return data || [];
  } catch (_e) {
    featureFlagsTableBroken = true;
    return [];
  }
}

/** Vérifier si un module est activé pour un tenant */
export async function isModuleEnabled(tenantId: string, module: string): Promise<boolean> {
  // Si pas de tenant valide ou table cassee : activer le module par defaut
  if (!isValidTenantId(tenantId) || featureFlagsTableBroken) return true;
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('tenant_id', tenantId)
      .eq('module', module)
      .maybeSingle();
    if (error) { featureFlagsTableBroken = true; return true; }
    return data?.enabled ?? true; // par defaut active si pas de flag
  } catch (_e) {
    featureFlagsTableBroken = true;
    return true;
  }
}

/** Récupérer la liste des modules activés */
export async function getEnabledModules(tenantId: string): Promise<string[]> {
  if (!isValidTenantId(tenantId) || featureFlagsTableBroken) return [];
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('module')
      .eq('tenant_id', tenantId)
      .eq('enabled', true);
    if (error) { featureFlagsTableBroken = true; return []; }
    return (data || []).map(f => f.module);
  } catch (_e) {
    featureFlagsTableBroken = true;
    return [];
  }
}

/** Activer/désactiver un module (admin Atlas Studio uniquement) */
export async function toggleModule(tenantId: string, module: string, enabled: boolean, reason?: string): Promise<void> {
  if (!isValidTenantId(tenantId)) throw new Error('tenant_id invalide (UUID requis)');
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
  if (!isValidTenantId(tenantId)) return;
  // Récupérer les solutions souscrites — sans embed PostgREST (qui plante 400)
  let activeCodes: string[] = [];
  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('solution_id')
      .eq('organization_id', tenantId)
      .in('status', ['active', 'trialing']);
    const solutionIds = (subs || []).map((s: any) => s.solution_id).filter(Boolean);
    if (solutionIds.length > 0) {
      const { data: solutions } = await supabase
        .from('solutions')
        .select('code')
        .in('id', solutionIds);
      activeCodes = (solutions || []).map((s: any) => s.code).filter(Boolean);
    }
  } catch (_e) { return; }

  // Toutes les solutions possibles
  let allCodes: string[] = [];
  try {
    const { data: allSolutions } = await supabase.from('solutions').select('code');
    allCodes = (allSolutions || []).map((s: any) => s.code).filter(Boolean);
  } catch (_e) { return; }

  // Upsert les flags
  for (const code of allCodes) {
    try {
      await supabase
        .from('feature_flags')
        .upsert({
          tenant_id: tenantId,
          module: code,
          enabled: activeCodes.includes(code),
          created_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,module' });
    } catch (_e) { /* skip */ }
  }
}
