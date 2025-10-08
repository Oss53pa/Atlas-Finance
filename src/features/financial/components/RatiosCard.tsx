import React from 'react';
import { RatiosFinanciers } from '../types/financialStatements.types';
import { formatPercent } from '@/shared/utils/formatters';
import { Shield, Droplet, TrendingUp, Activity } from 'lucide-react';

interface RatiosCardProps {
  ratios: RatiosFinanciers;
  loading?: boolean;
}

export const RatiosCard: React.FC<RatiosCardProps> = ({ ratios, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-[#F5F5F5] rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const getRatioStatus = (value: number, type: 'structure' | 'liquidite' | 'rentabilite') => {
    if (type === 'structure') {
      if (value > 50) return { color: 'text-[#6A8A82]', bg: 'bg-[#6A8A82]/10', label: 'Excellent' };
      if (value > 30) return { color: 'text-[#B87333]', bg: 'bg-[#B87333]/10', label: 'Bon' };
      return { color: 'text-[#B85450]', bg: 'bg-[#B85450]/10', label: 'Faible' };
    }
    if (type === 'liquidite') {
      if (value > 100) return { color: 'text-[#6A8A82]', bg: 'bg-[#6A8A82]/10', label: 'Excellent' };
      if (value > 50) return { color: 'text-[#B87333]', bg: 'bg-[#B87333]/10', label: 'Correct' };
      return { color: 'text-[#B85450]', bg: 'bg-[#B85450]/10', label: 'Risque' };
    }
    if (value > 15) return { color: 'text-[#6A8A82]', bg: 'bg-[#6A8A82]/10', label: 'Excellent' };
    if (value > 5) return { color: 'text-[#B87333]', bg: 'bg-[#B87333]/10', label: 'Bon' };
    return { color: 'text-[#B85450]', bg: 'bg-[#B85450]/10', label: 'Faible' };
  };

  const ratioCards = [
    {
      title: 'Autonomie Financière',
      value: ratios.autonomieFinanciere,
      icon: Shield,
      type: 'structure' as const,
      description: 'Indépendance financière',
    },
    {
      title: 'Liquidité Générale',
      value: ratios.liquiditeGenerale,
      icon: Droplet,
      type: 'liquidite' as const,
      description: 'Capacité à payer les dettes',
    },
    {
      title: 'ROE',
      value: ratios.roe,
      icon: TrendingUp,
      type: 'rentabilite' as const,
      description: 'Rentabilité des capitaux propres',
    },
    {
      title: 'ROA',
      value: ratios.roa,
      icon: Activity,
      type: 'rentabilite' as const,
      description: 'Rentabilité des actifs',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {ratioCards.map((card) => {
        const Icon = card.icon;
        const status = getRatioStatus(card.value, card.type);

        return (
          <div
            key={card.title}
            className="bg-white rounded-lg border border-[#D9D9D9] p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${status.bg} p-2 rounded-lg`}>
                <Icon className={`w-5 h-5 ${status.color}`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h4 className="text-sm text-[#767676] mb-1">{card.title}</h4>
            <p className={`text-2xl font-bold ${status.color}`}>
              {formatPercent(card.value / 100)}
            </p>
            <p className="text-xs text-[#767676] mt-2">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
};