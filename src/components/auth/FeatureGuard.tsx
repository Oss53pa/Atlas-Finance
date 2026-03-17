// @ts-nocheck
/**
 * FeatureGuard — vérifie qu'un module est activé pour le tenant.
 * Redirige vers /client si le module n'est pas activé.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { isModuleEnabled } from '../../features/platform/services/featureFlagService';
import { useTenant } from '../../features/platform/hooks/useTenant';
import { Lock } from 'lucide-react';

interface FeatureGuardProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGuard: React.FC<FeatureGuardProps> = ({ module, children, fallback }) => {
  const { tenant, isLoading: tenantLoading } = useTenant();

  const { data: enabled, isLoading } = useQuery({
    queryKey: ['feature-flag', tenant?.id, module],
    queryFn: () => isModuleEnabled(tenant!.id, module),
    enabled: !!tenant?.id,
    staleTime: 60_000,
  });

  if (tenantLoading || isLoading) return null;

  if (!enabled) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm">
          <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#171717] mb-2">Module non activé</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ce module n'est pas inclus dans votre abonnement actuel.
          </p>
          <a href="/solutions" className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold inline-block">
            Voir les solutions
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FeatureGuard;
