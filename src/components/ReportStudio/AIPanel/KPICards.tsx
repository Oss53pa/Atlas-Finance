import React from 'react';
import { cn } from '@/utils/cn';
import { KPICard } from '@/types/reportStudio';

interface KPICardsProps {
  kpis: KPICard[];
  onHighlight: (id: string) => void;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis, onHighlight }) => {
  if (kpis.length === 0) {
    return (
      <p className="text-sm text-primary-500 italic">Aucun KPI extrait</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {kpis.map((kpi) => (
        <button
          key={kpi.id}
          onClick={() => onHighlight(kpi.id)}
          className="p-3 bg-primary-50 rounded-lg text-left hover:bg-primary-100 transition-colors group"
        >
          <p className="text-xs text-primary-500 truncate">{kpi.label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-semibold text-primary-900">
              {kpi.value}
              {kpi.unit && <span className="text-sm text-primary-500 ml-1">{kpi.unit}</span>}
            </p>
            {kpi.change !== undefined && (
              <span className={cn(
                'text-xs font-medium',
                kpi.changeType === 'positive' && 'text-success',
                kpi.changeType === 'negative' && 'text-error',
                kpi.changeType === 'neutral' && 'text-primary-500'
              )}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
            )}
          </div>
          {kpi.sparkline && (
            <div className="mt-1 h-6 flex items-end gap-px">
              {kpi.sparkline.map((value, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/20 rounded-t"
                  style={{ height: `${(value / Math.max(...kpi.sparkline!)) * 100}%` }}
                />
              ))}
            </div>
          )}
          <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-primary">Voir dans le document</span>
          </div>
        </button>
      ))}
    </div>
  );
};
