import React from 'react';

/**
 * RadialGauge — demi-jauge « Daylight Pro » : arc épais arrondi, repères 0–100 %,
 * point de position, valeur au centre en JetBrains Mono. 100 % tokens.
 */
export interface RadialGaugeProps {
  /** Pourcentage 0–100. */
  percent: number;
  label?: string;
  sublabel?: string;
  /** Couleur de l'arc (défaut : dégradé pétrole). */
  from?: string;
  to?: string;
  className?: string;
}

const ARC_LEN = Math.PI * 82; // rayon 82

const RadialGauge: React.FC<RadialGaugeProps> = ({
  percent, label, sublabel, from = '#13323D', to = '#235A6E', className = '',
}) => {
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * ARC_LEN;
  const gid = React.useId();
  // Point de position sur l'arc (180° → 0°)
  const angle = Math.PI - (p / 100) * Math.PI;
  const mx = 100 + 82 * Math.cos(angle);
  const my = 100 - 82 * Math.sin(angle);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg width={168} height={104} viewBox="0 0 200 120" role="img" aria-label={`${label ?? 'Jauge'} ${p.toFixed(1)} %`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <path d="M18 100 A82 82 0 0 1 182 100" fill="none" stroke="var(--color-border-light)" strokeWidth={16} strokeLinecap="round" />
        <path d="M18 100 A82 82 0 0 1 182 100" fill="none" stroke={`url(#${gid})`} strokeWidth={16} strokeLinecap="round" strokeDasharray={`${dash} ${ARC_LEN}`} />
        <circle cx={mx} cy={my} r={5} fill="var(--color-surface)" stroke={to} strokeWidth={3} />
        <text x={100} y={84} textAnchor="middle" className="num-tabular" style={{ fontWeight: 700, fontSize: 29, letterSpacing: '-0.03em', fill: 'var(--color-text-primary)' }}>
          {p.toFixed(1)}%
        </text>
        <text x={16} y={116} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-tertiary)' }}>0%</text>
        <text x={184} y={116} textAnchor="middle" style={{ fontSize: 10, fontWeight: 600, fill: 'var(--color-text-tertiary)' }}>100%</text>
      </svg>
      {label && <div className="font-sans font-semibold text-center" style={{ fontSize: 11, letterSpacing: '0.04em', color: 'var(--color-text-tertiary)', marginTop: 2 }}>{label}</div>}
      {sublabel && <div className="text-center" style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-tertiary)' }}>{sublabel}</div>}
    </div>
  );
};

export default RadialGauge;
