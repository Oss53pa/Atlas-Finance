import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';

export type PremiumSeries = {
  key: string;
  label: string;
  data: number[];                 // values aligned with `xLabels`
  tone?: 'gold' | 'obsidian' | 'success' | 'danger' | 'muted';
  variant?: 'area' | 'line' | 'dashed';
  reference?: boolean;            // render as a horizontal target line
};

const TONE: Record<NonNullable<PremiumSeries['tone']>, { stroke: string; fill: string }> = {
  gold:     { stroke: '#C9A961', fill: 'rgba(201,169,97,0.18)' },
  obsidian: { stroke: '#0E0E14', fill: 'rgba(14,14,20,0.08)' },
  success:  { stroke: '#0F8F5F', fill: 'rgba(15,143,95,0.14)' },
  danger:   { stroke: '#C0322B', fill: 'rgba(192,50,43,0.12)' },
  muted:    { stroke: '#9A968A', fill: 'rgba(154,150,138,0.10)' },
};

export interface PremiumChartProps {
  xLabels: string[];
  series: PremiumSeries[];
  height?: number;
  yFormatter?: (v: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, yFormatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0E0E14',
        color: '#F7F4ED',
        borderRadius: 10,
        padding: '0.625rem 0.75rem',
        fontSize: 12,
        boxShadow: '0 12px 24px -8px rgba(14,14,20,0.30)',
        border: '1px solid rgba(201,169,97,0.20)',
        minWidth: 140,
      }}
    >
      <div className="eyebrow-gold mb-1.5" style={{ fontSize: 9, color: '#C9A961' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3" style={{ marginTop: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 2, background: p.color, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ color: 'rgba(247,244,237,0.65)' }}>{p.name}</span>
          </span>
          <span className="num-tabular font-semibold" style={{ color: '#F7F4ED' }}>
            {yFormatter ? yFormatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const PremiumChart: React.FC<PremiumChartProps> = ({
  xLabels, series, height = 240, yFormatter, showGrid = true, showLegend = false,
}) => {
  // Merge data into an array of objects keyed by series.key
  const data = xLabels.map((label, idx) => {
    const row: Record<string, any> = { x: label };
    series.forEach((s) => { row[s.key] = s.data[idx] ?? null; });
    return row;
  });

  const hasArea = series.some((s) => s.variant === 'area' || !s.variant);
  const ChartComp: any = hasArea ? AreaChart : LineChart;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ChartComp data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            {series.map((s) => {
              const tone = TONE[s.tone ?? 'gold'];
              return (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone.stroke} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={tone.stroke} stopOpacity={0} />
                </linearGradient>
              );
            })}
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="var(--color-border)"
              vertical={false}
            />
          )}

          <XAxis
            dataKey="x"
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={yFormatter}
            width={42}
          />

          <Tooltip content={<CustomTooltip yFormatter={yFormatter} />} cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeDasharray: '3 3' }} />

          {showLegend && (
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}
            />
          )}

          {series.map((s) => {
            const tone = TONE[s.tone ?? 'gold'];
            if (s.reference) {
              const ref = s.data[s.data.length - 1] ?? 0;
              return (
                <ReferenceLine
                  key={s.key}
                  y={ref}
                  stroke={tone.stroke}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  ifOverflow="extendDomain"
                  label={{ value: s.label, position: 'right', fill: tone.stroke, fontSize: 10 }}
                />
              );
            }
            if (s.variant === 'line' || s.variant === 'dashed' || ChartComp === LineChart) {
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={tone.stroke}
                  strokeWidth={2}
                  strokeDasharray={s.variant === 'dashed' ? '5 4' : undefined}
                  dot={false}
                  activeDot={{ r: 4, fill: tone.stroke, stroke: '#FFFFFF', strokeWidth: 2 }}
                  isAnimationActive
                />
              );
            }
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={tone.stroke}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                activeDot={{ r: 4, fill: tone.stroke, stroke: '#FFFFFF', strokeWidth: 2 }}
                isAnimationActive
              />
            );
          })}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
};

export default PremiumChart;
