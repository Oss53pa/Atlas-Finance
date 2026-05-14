import React from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export type KpiTrend = 'up' | 'down' | 'flat';
export type KpiTone = 'neutral' | 'gold' | 'success' | 'warning' | 'danger';

export interface KpiCardPremiumProps {
  eyebrow: string;                 // ALL-CAPS small label (ex: ENCOURS TOTAL)
  value: string;                   // Main value, large tabular (ex: 6,02 Md FCFA)
  unit?: string;                   // Right-aligned unit muted (ex: FCFA)
  delta?: { value: string; trend: KpiTrend }; // Top-right pill (ex: +12,4 %)
  meta?: string;                   // Subtle hint under value
  series?: number[];               // Sparkline data — 8 to 18 points ideal
  tone?: KpiTone;                  // Accent color for sparkline
  icon?: React.ReactNode;          // Optional eyebrow icon
  onClick?: () => void;
}

const TONE_COLORS: Record<KpiTone, { stroke: string; fill: string; deltaBg: string; deltaText: string }> = {
  neutral: { stroke: '#C9A961', fill: 'rgba(201,169,97,0.18)', deltaBg: 'rgba(201,169,97,0.12)', deltaText: '#A88845' },
  gold:    { stroke: '#C9A961', fill: 'rgba(201,169,97,0.22)', deltaBg: 'rgba(201,169,97,0.14)', deltaText: '#A88845' },
  success: { stroke: '#0F8F5F', fill: 'rgba(15,143,95,0.18)',  deltaBg: 'rgba(15,143,95,0.12)',  deltaText: '#0F8F5F' },
  warning: { stroke: '#D4A04A', fill: 'rgba(212,160,74,0.18)', deltaBg: 'rgba(212,160,74,0.14)', deltaText: '#7A6332' },
  danger:  { stroke: '#C0322B', fill: 'rgba(192,50,43,0.16)',  deltaBg: 'rgba(192,50,43,0.10)',  deltaText: '#C0322B' },
};

const DeltaPill: React.FC<{ delta: NonNullable<KpiCardPremiumProps['delta']>; tone: KpiTone }> = ({ delta, tone }) => {
  const c = TONE_COLORS[tone];
  const Icon = delta.trend === 'up' ? ArrowUpRight : delta.trend === 'down' ? ArrowDownRight : null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold num-tabular"
      style={{ background: c.deltaBg, color: c.deltaText }}
    >
      {Icon && <Icon className="w-3 h-3" strokeWidth={2.5} />}
      <span>{delta.value}</span>
    </span>
  );
};

const KpiCardPremium: React.FC<KpiCardPremiumProps> = ({
  eyebrow, value, unit, delta, meta, series, tone = 'neutral', icon, onClick,
}) => {
  const c = TONE_COLORS[tone];
  const data = (series || []).map((y, i) => ({ x: i, y }));
  const gradientId = React.useId();

  return (
    <button
      type="button"
      onClick={onClick}
      className="kpi-card-premium text-left w-full group relative"
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Header line: eyebrow + delta */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="icon-tile" style={{ width: 26, height: 26, borderRadius: 8 }}>
              {icon}
            </span>
          )}
          <span className="eyebrow">{eyebrow}</span>
        </div>
        {delta && <DeltaPill delta={delta} tone={tone} />}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-1.5">
        <span
          className="num-tabular font-bold"
          style={{
            fontSize: 'clamp(1.5rem, 2.2vw, 1.875rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)',
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '0.02em' }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Meta */}
      {meta && (
        <p
          className="text-xs"
          style={{ color: 'var(--color-text-tertiary)', marginBottom: data.length ? '0.625rem' : 0 }}
        >
          {meta}
        </p>
      )}

      {/* Sparkline */}
      {data.length > 1 && (
        <div className="h-12 -mx-1 -mb-1 mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.stroke} stopOpacity={0.30} />
                  <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={c.stroke}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </button>
  );
};

export default KpiCardPremium;
