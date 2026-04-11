/**
 * FeatureGate — Gating conditionnel basé sur le plan du tenant.
 *
 * Usage :
 *   <FeatureGate feature="budget_analytique" fallback={<UpgradeBanner feature="budget_analytique" />}>
 *     <BudgetAnalytiqueModule />
 *   </FeatureGate>
 *
 * Lit useTenantPlan().features_included et render :
 *   - les enfants si la feature est incluse
 *   - le fallback (ou null) sinon
 *
 * IMPORTANT : le gating ne s'applique QUE si plan.slug === "atlas_fa_starter".
 * Les tenants Premium voient tout sans restriction.
 */
import React from 'react';
import { useTenantPlan, hasFeature } from '../../features/platform/hooks/useTenantPlan';

export interface FeatureGateProps {
  /** Clé de la feature à vérifier */
  feature: string;
  /** Contenu à rendre si la feature est accessible */
  children: React.ReactNode;
  /** Contenu alternatif si la feature est verrouillée (défaut : null) */
  fallback?: React.ReactNode;
  /** Si true, ne rend rien pendant le chargement du plan (défaut : true) */
  hideWhileLoading?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = null,
  hideWhileLoading = true,
}) => {
  const { plan, isLoading, isPremium } = useTenantPlan();

  if (isLoading && hideWhileLoading) return null;

  // Les tenants Premium voient tout sans restriction
  if (isPremium) return <>{children}</>;

  // Sinon, on vérifie la feature dans le plan Starter
  if (hasFeature(plan, feature)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Hook utilitaire pour vérifier une feature dans un composant
 * sans utiliser le composant FeatureGate.
 */
export function useFeatureAccess(feature: string): { allowed: boolean; isLoading: boolean } {
  const { plan, isLoading, isPremium } = useTenantPlan();
  if (isLoading) return { allowed: false, isLoading: true };
  if (isPremium) return { allowed: true, isLoading: false };
  return { allowed: hasFeature(plan, feature), isLoading: false };
}

export default FeatureGate;
