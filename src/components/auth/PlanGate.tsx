/**
 * PlanGate — Wraps content that requires a specific plan feature.
 * Shows an upgrade prompt if the feature is not available.
 */
import React from 'react';
import { usePlanGuard } from '../../hooks/usePlanGuard';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PlanGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function PlanGate({ feature, children, fallback }: PlanGateProps) {
  const { allowed } = usePlanGuard(feature);

  if (allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return <PremiumUpgradePrompt feature={feature} />;
}

function PremiumUpgradePrompt({ feature }: { feature: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Fonctionnalité Premium
      </h3>
      <p className="text-sm text-gray-500 max-w-md mb-6">
        Cette fonctionnalité est disponible avec le plan Premium.
        Passez au Premium pour accéder aux fonctionnalités avancées.
      </p>
      <button
        onClick={() => navigate('/solutions')}
        className="px-6 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors"
      >
        Voir les plans
      </button>
    </div>
  );
}

/**
 * Small badge to indicate a Premium-only feature in menus/lists.
 */
export function PremiumBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 ml-1">
      Premium
    </span>
  );
}
