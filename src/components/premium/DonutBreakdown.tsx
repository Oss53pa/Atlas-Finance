import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

/**
 * DonutBreakdown — donut « Daylight Pro » : anneau épais à segments arrondis,
 * total au centre, légende détaillée à droite (montant + % + nb + mini-barre).
 * Chrome 100 % tokens ; les couleurs de segments sont fournies par l'appelant
 * (palette de marque autorisée pour les séries de graphes).
 */
export interface DonutSegment {
  name: string;
  value: number;
  color: string;
  count?: number;
}

export interface DonutBreakdownProps {
  title?: string;
  subtitle?: string;
  segments: DonutSegment[];
  total: number;
  formatValue: (n: number) => string;
  centerPrimary?: string;   // défaut : formatValue(total)
  centerLabel?: string;     // défaut : "TOTAL"
  className?: string;
}

const DonutBreakdown: React.FC<DonutBreakdownProps> = ({
  title, subtitle, segments, total, formatValue, centerPrimary, centerLabel = 'TOTAL', className = '',
}) => {
  const data = segments.filter(s => s.value > 0);
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div
      className={className}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 18, boxShadow: 'var(--shadow-sm)', padding: 20 }}
    >
      {(title || subtitle) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h4 className="font-sans font-bold" style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>{title}</h4>}
          {subtitle && <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</span>}
        </div>
      )}

      <div className="flex items-center gap-5 flex-wrap">
        {/* Donut */}
        <div className="relative flex-none" style={{ width: 168, height: 168 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length ? data : [{ name: '—', value: 1, color: 'var(--color-border)' }]}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={56} outerRadius={80}
                paddingAngle={data.length > 1 ? 2 : 0}
                cornerRadius={6}
                stroke="none"
                startAngle={90} endAngle={-270}
                isAnimationActive={false}
              >
                {(data.length ? data : [{ color: 'var(--color-border)' }]).map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
            <span className="font-sans font-bold" style={{ fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--color-text-tertiary)' }}>{centerLabel}</span>
            <span className="num-tabular font-bold" style={{ fontSize: 17, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', lineHeight: 1.1, marginTop: 2 }}>
              {centerPrimary ?? formatValue(total)}
            </span>
          </div>
        </div>

        {/* Légende */}
        <div className="flex-1 flex flex-col gap-3" style={{ minWidth: 180 }}>
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex-none rounded-full" style={{ width: 10, height: 10, background: s.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans font-semibold truncate" style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{s.name}</span>
                  <span className="num-tabular font-bold flex-none" style={{ fontSize: 12.5, color: 'var(--color-text-primary)' }}>{formatValue(s.value)}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-surface-hover)' }}>
                    <span className="block h-full rounded-full" style={{ width: `${pct(s.value)}%`, background: s.color }} />
                  </span>
                  <span className="num-tabular flex-none text-right" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--color-text-tertiary)', width: 66 }}>
                    {pct(s.value).toFixed(1)} %{typeof s.count === 'number' ? ` · ${s.count}` : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DonutBreakdown;
