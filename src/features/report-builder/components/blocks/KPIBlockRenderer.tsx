/**
 * KPI Block Renderer — Connected to live Atlas Finance data via useKPIData
 */
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { useKPIData } from '../../hooks/useBlockData';
import type { KPIBlock } from '../../types';

function formatValue(value: number | null, format: string, unit?: string): string {
  if (value === null) return '—';
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value) + (unit ? ` ${unit}` : ' FCFA');
    case 'percent':
      return value.toFixed(1) + '%';
    case 'days':
      return Math.round(value) + ' jours';
    case 'number':
    default:
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
  }
}

function getTrend(current: number | null, previous: number | null): { pct: number; direction: 'up' | 'down' | 'flat' } {
  if (current === null || previous === null || previous === 0) return { pct: 0, direction: 'flat' };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' };
}

const sizeClasses = { small: 'p-3', medium: 'p-4', large: 'p-5' };
const valueSizeClasses = { small: 'text-lg', medium: 'text-2xl', large: 'text-3xl' };

const KPIBlockRenderer: React.FC<{ block: KPIBlock }> = ({ block }) => {
  const { data: liveData, loading } = useKPIData(block.source, block.periodOverride);

  const value = liveData?.value ?? block.value;
  const previousValue = liveData?.previousValue ?? block.previousValue ?? null;
  const trend = block.showTrend ? getTrend(value, previousValue) : null;

  return (
    <div className={`bg-white border border-neutral-200 rounded-lg ${sizeClasses[block.size]}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">{block.label}</div>
        {loading && <Loader2 className="w-3 h-3 text-neutral-400 animate-spin" />}
      </div>
      <div className={`font-bold text-neutral-900 font-['JetBrains_Mono',monospace] ${valueSizeClasses[block.size]}`}>
        {formatValue(value, block.format, block.unit)}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${
          trend.direction === 'up' ? 'text-primary-600' : trend.direction === 'down' ? 'text-red-600' : 'text-neutral-500'
        }`}>
          {trend.direction === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
          {trend.direction === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
          {trend.direction === 'flat' && <Minus className="w-3.5 h-3.5" />}
          <span>{trend.pct > 0 ? '+' : ''}{trend.pct.toFixed(1)}%</span>
          <span className="text-neutral-400 ml-1">vs N-1</span>
        </div>
      )}
      {block.source && !loading && value === null && (
        <div className="text-[9px] text-neutral-400 mt-1">Aucune donnée pour cette période</div>
      )}
    </div>
  );
};

export default KPIBlockRenderer;
