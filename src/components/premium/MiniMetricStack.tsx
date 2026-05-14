import React from 'react';

export interface MiniMetric {
  eyebrow: string;        // ALL-CAPS small label
  value: string;          // main value
  unit?: string;          // unit muted
  hint?: string;          // small contextual hint
  icon?: React.ReactNode; // icon (16-18px) shown top-left
  tone?: 'gold' | 'obsidian' | 'neutral' | 'success' | 'danger';
  onClick?: () => void;
}

const TONE_ICON: Record<NonNullable<MiniMetric['tone']>, { bg: string; color: string }> = {
  gold:     { bg: 'rgba(201,169,97,0.14)',  color: '#A88845' },
  obsidian: { bg: 'rgba(14,14,20,0.08)',    color: '#0E0E14' },
  neutral:  { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' },
  success:  { bg: 'rgba(15,143,95,0.12)',   color: '#0F8F5F' },
  danger:   { bg: 'rgba(192,50,43,0.10)',   color: '#C0322B' },
};

const MiniMetricStack: React.FC<{ items: MiniMetric[]; columns?: 2 | 3 }> = ({ items, columns = 3 }) => {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((m, i) => {
        const tone = m.tone ?? 'neutral';
        const t = TONE_ICON[tone];
        return (
          <button
            key={i}
            type="button"
            onClick={m.onClick}
            className="text-left transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem 0.875rem 1rem',
              cursor: m.onClick ? 'pointer' : 'default',
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDuration: '220ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              {m.icon && (
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: t.bg, color: t.color,
                  }}
                >
                  {m.icon}
                </span>
              )}
              <span className="eyebrow" style={{ fontSize: '0.625rem', letterSpacing: '0.14em' }}>
                {m.eyebrow}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className="num-tabular font-bold"
                style={{
                  fontSize: '1.375rem',
                  lineHeight: 1.05,
                  letterSpacing: '-0.025em',
                  color: 'var(--color-text-primary)',
                }}
              >
                {m.value}
              </span>
              {m.unit && (
                <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {m.unit}
                </span>
              )}
            </div>
            {m.hint && (
              <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                {m.hint}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MiniMetricStack;
