import React from 'react';

export interface RadialGaugeProps {
  /** Valeur 0-100 */
  value: number;
  label?: string;
  sublabel?: string;
  /** Diamètre en px */
  size?: number;
  /** Épaisseur de l'anneau */
  thickness?: number;
  /** Couleur de marque (pétrole par défaut) */
  color?: string;
  /** Format du centre : pourcentage (défaut) ou valeur libre */
  centerText?: string;
}

/**
 * Jauge radiale premium (Petrol Cream).
 * Anneau à dégradé + extrémité arrondie + valeur centrale.
 * Réutilisable pour tout KPI en % (marge, conformité, taux, etc.).
 */
const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  label,
  sublabel,
  size = 120,
  thickness = 11,
  color = '#235A6E',
  centerText,
}) => {
  const rid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          <defs>
            <linearGradient id={`rg-${rid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.62} />
            </linearGradient>
          </defs>
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke="var(--color-border-light)"
            strokeWidth={thickness}
          />
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={`url(#rg-${rid})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform={`rotate(-90 ${cx} ${cx})`}
            style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <span
            style={{
              fontFamily: 'Dosis, Inter, sans-serif',
              fontWeight: 700,
              fontSize: size * 0.24,
              lineHeight: 1,
              color: 'var(--color-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {centerText ?? `${Math.round(pct)}%`}
          </span>
        </div>
      </div>
      {label && (
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</span>
      )}
      {sublabel && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{sublabel}</span>
      )}
    </div>
  );
};

export default RadialGauge;
