/**
 * Hook to check feature availability based on the current plan tier.
 * Returns { allowed, planTier, upgrade } for UI gating.
 */
import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { isFeatureAvailable, type PlanTier } from '../config/plans';

interface PlanGuardResult {
  planTier: PlanTier;
  allowed: boolean;
  isPremium: boolean;
}

/**
 * Get the current plan tier from adapter settings.
 * Falls back to 'pme' if not set (default plan).
 */
export function usePlanTier(): PlanTier {
  // In local mode, default to premium (all features)
  // In SaaS mode, read from subscription
  const { mode } = useData();
  if (mode === 'local') return 'premium';

  // TODO: Read from subscription context when SaaS auth is wired
  // For now, check localStorage as a simple fallback
  const stored = typeof window !== 'undefined'
    ? localStorage.getItem('atlas_fna_plan_tier')
    : null;

  return (stored === 'premium' ? 'premium' : 'pme') as PlanTier;
}

/**
 * Check if a specific feature is available on the current plan.
 */
export function usePlanGuard(featureKey: string): PlanGuardResult {
  const planTier = usePlanTier();

  return useMemo(() => ({
    planTier,
    allowed: isFeatureAvailable(featureKey, planTier),
    isPremium: planTier === 'premium',
  }), [featureKey, planTier]);
}

/**
 * Check multiple features at once.
 */
export function usePlanGuardMulti(featureKeys: string[]): Record<string, boolean> {
  const planTier = usePlanTier();

  return useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const key of featureKeys) {
      result[key] = isFeatureAvailable(key, planTier);
    }
    return result;
  }, [featureKeys, planTier]);
}
