/**
 * useTenantPlan — Hook qui expose le plan d'abonnement du tenant actuel.
 *
 * Structure exposée :
 *   plan.slug             : "atlas_fa_starter" | "atlas_fa_premium"
 *   plan.features_included: string[] — liste des clés features actives
 *   plan.max_companies    : number | null
 *   plan.max_users        : number | null
 */
import { useMemo } from 'react';
import { useTenant } from './useTenant';
import { FEATURE_MATRIX } from '../../../config/plans';

export type PlanSlug = 'atlas_fa_starter' | 'atlas_fa_premium';

export interface TenantPlan {
  slug: PlanSlug;
  name: string;
  features_included: string[];
  max_companies: number | null;
  max_users: number | null;
}

/**
 * Features accessibles pour le plan Starter (PME).
 * Les autres features sont réservées Premium.
 *
 * NOTE : Le module Trésorerie (position_tresorerie) reste disponible
 * dans les DEUX plans.
 */
const STARTER_FEATURES: string[] = FEATURE_MATRIX.flatMap(cat =>
  cat.items.filter(i => i.pme).map(i => i.featureKey)
);

/**
 * Features complètes (Premium) : tout le catalogue.
 */
const PREMIUM_FEATURES: string[] = FEATURE_MATRIX.flatMap(cat =>
  cat.items.filter(i => i.premium).map(i => i.featureKey)
);

function slugFromLegacyPlan(legacy: string | undefined): PlanSlug {
  // Supporte les anciens codes ("pro", "premium", "pme", "starter", etc.)
  if (!legacy) return 'atlas_fa_starter';
  const v = legacy.toLowerCase();
  if (v.includes('premium') || v === 'pro' || v === 'enterprise') {
    return 'atlas_fa_premium';
  }
  return 'atlas_fa_starter';
}

export function useTenantPlan(): { plan: TenantPlan; isLoading: boolean; isStarter: boolean; isPremium: boolean } {
  const { tenant, isLoading } = useTenant();

  const plan = useMemo<TenantPlan>(() => {
    const slug = slugFromLegacyPlan(tenant?.plan);
    const isPremium = slug === 'atlas_fa_premium';
    return {
      slug,
      name: isPremium ? 'Premium' : 'PME / TPE',
      features_included: isPremium ? PREMIUM_FEATURES : STARTER_FEATURES,
      max_companies: isPremium ? null : 1,
      max_users: isPremium ? null : 5,
    };
  }, [tenant?.plan]);

  return {
    plan,
    isLoading,
    isStarter: plan.slug === 'atlas_fa_starter',
    isPremium: plan.slug === 'atlas_fa_premium',
  };
}

/**
 * Aliases : certaines clés du gating pointent vers des clés existantes du catalogue.
 * Exemple : `proph3t_ia` est un alias pour `proph3t_avance`.
 */
const FEATURE_ALIASES: Record<string, string> = {
  proph3t_ia: 'proph3t_avance',
  audit_trail_ohada_certifie: 'audit_trail_complet',
  api_integrations: 'api_rest',
  support_dedie: 'support_prioritaire',
};

/**
 * Helper utilitaire : vérifie si une feature est disponible dans le plan courant.
 * Prend en compte les aliases (cf. FEATURE_ALIASES).
 */
export function hasFeature(plan: TenantPlan, featureKey: string): boolean {
  if (plan.features_included.includes(featureKey)) return true;
  const alias = FEATURE_ALIASES[featureKey];
  if (alias && plan.features_included.includes(alias)) return true;
  return false;
}
