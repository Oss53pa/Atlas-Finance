import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { DollarSign, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { ClientFinancier } from '../types/client.types';
import { formatNumber } from '@/shared/utils/formatters';

interface ClientFinancialStatsProps {
  financier: ClientFinancier;
  loading?: boolean;
}

export const ClientFinancialStats: React.FC<ClientFinancialStatsProps> = ({
  financier,
  loading
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="CA Annuel"
        value={`${formatNumber(financier.chiffreAffairesAnnuel)} €`}
        subtitle={`${financier.evolution > 0 ? '+' : ''}${financier.evolution.toFixed(1)}% vs N-1`}
        icon={DollarSign}
        color="primary"
        loading={loading}
        trend={financier.evolution > 0 ? 'up' : 'down'}
      />

      <StatCard
        title="Encours Client"
        value={`${formatNumber(financier.encours)} €`}
        subtitle={`Limite: ${formatNumber(financier.limiteCredit)} €`}
        icon={TrendingUp}
        color={financier.encours > financier.limiteCredit * 0.8 ? 'warning' : 'success'}
        loading={loading}
      />

      <StatCard
        title="Impayés"
        value={`${formatNumber(financier.impayesEnCours)} €`}
        subtitle={`Taux retard: ${financier.tauxRetard}%`}
        icon={AlertTriangle}
        color={financier.impayesEnCours > 0 ? 'danger' : 'success'}
        loading={loading}
      />

      <StatCard
        title="Délai Moyen"
        value={`${financier.delaistMoyenPaiement} jours`}
        subtitle={`Score: ${financier.scoreSolvabilite}/100`}
        icon={Clock}
        color="info"
        loading={loading}
      />
    </div>
  );
};