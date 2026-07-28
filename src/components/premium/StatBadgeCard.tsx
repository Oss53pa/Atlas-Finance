import React from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * StatBadgeCard — carte KPI « Daylight Pro ».
 * Signature : badge rond plein (pétrole/ambre/erreur/succès) + chiffre JetBrains Mono,
 * delta optionnel et sparkline optionnelle. 100 % tokens Petrol Cream (aucun hex hors palette),
 * donc compatible avec les 9 thèmes.
 */
export type BadgeTone = 'petrol' | 'amber' | 'error' | 'success';
export type StatTrend = 'up' | 'down' | 'flat';

export interface StatBadgeCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  badge?: BadgeTone;
  delta?: { value: string; trend: StatTrend; tone?: 'good' | 'bad' };
  meta?: React.ReactNode;
  valueTone?: 'default' | 'error' | 'success';
  series?: number[];
  valueSize?: number;   // px, defaults to 25 — reduce for dense/many-column rows
  onClick?: () => void;
  className?: string;
}

const BADGE_BG: Record<BadgeTone, string> = {
  petrol: 'linear-gradient(150deg, var(--color-primary), var(--color-primary-hover))',
  amber: 'linear-gradient(150deg, var(--color-accent-2), var(--color-accent-2-deep))',
  error: 'var(--color-error)',
  success: 'var(--color-success)',
};

const SPARK_STROKE: Record<BadgeTone, string> = {
  petrol: '#235A6E',
  amber: '#E89A2E',
  error: '#C0322B',
  success: '#15803D',
};

const DeltaPill: React.FC<{ delta: NonNullable<StatBadgeCardProps['delta']> }> = ({ delta }) => {
  const good = delta.tone ? delta.tone === 'good' : delta.trend === 'up';
  const Icon = delta.trend === 'up' ? ArrowUpRight : delta.trend === 'down' ? ArrowDownRight : null;
  return (
    <span
      className="num-tabular inline-flex items-center gap-1 rounded-full text-[11px] font-bold"
      style={{
        padding: '2px 8px',
        background: good ? 'var(--color-success-light)' : 'var(--color-error-light)',
        color: good ? 'var(--color-success)' : 'var(--color-error)',
      }}
    >
      {Icon && <Icon className="w-3 h-3" strokeWidth={2.6} />}
      {delta.value}
    </span>
  );
};

const StatBadgeCard: React.FC<StatBadgeCardProps> = ({
  label, value, unit, icon, badge = 'petrol', delta, meta, valueTone = 'default', series, valueSize = 25, onClick, className = '',
}) => {
  const data = (series || []).map((y, i) => ({ x: i, y }));
  const gid = React.useId();
  const valueColor =
    valueTone === 'error' ? 'var(--color-error)' :
    valueTone === 'success' ? 'var(--color-success)' :
    'var(--color-text-primary)';

  return (
    <div
      onClick={onClick}
      className={`flex flex-col transition-all duration-150 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 18,
        boxShadow: 'var(--shadow-sm)',
        padding: 18,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
        {icon && (
          <span
            className="grid place-items-center text-white flex-none [&_svg]:w-5 [&_svg]:h-5"
            style={{ width: 42, height: 42, borderRadius: 13, background: BADGE_BG[badge], boxShadow: '0 6px 14px -6px rgba(38,30,21,0.35)' }}
          >
            {icon}
          </span>
        )}
      </div>

      <div className="num-tabular font-bold" style={{ fontSize: valueSize, marginTop: 16, marginBottom: 8, lineHeight: 1, letterSpacing: '-0.02em', color: valueColor }}>
        {value}
        {unit && <span className="font-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-tertiary)', marginLeft: 5, letterSpacing: 0 }}>{unit}</span>}
      </div>

      {(delta || meta) && (
        <div className="flex items-center gap-2 flex-wrap">
          {delta && <DeltaPill delta={delta} />}
          {meta && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{meta}</span>}
        </div>
      )}

      {data.length > 1 && (
        <div className="h-8 -mx-1 mt-auto pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SPARK_STROKE[badge]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SPARK_STROKE[badge]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="y" stroke={SPARK_STROKE[badge]} strokeWidth={2} fill={`url(#${gid})`} isAnimationActive={false} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default StatBadgeCard;
