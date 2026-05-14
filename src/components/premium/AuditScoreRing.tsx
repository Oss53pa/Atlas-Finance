import React from 'react';
import { ShieldCheck } from 'lucide-react';

export interface AuditAxis {
  label: string;
  score: number;        // 0-100
  tone?: 'success' | 'warning' | 'danger' | 'gold';
}

export interface AuditScoreRingProps {
  title?: string;
  subtitle?: string;
  score: number;          // 0-100
  outOf?: number;         // default 100
  axes?: AuditAxis[];
  size?: number;          // ring diameter (px), default 112
}

const TONE: Record<NonNullable<AuditAxis['tone']>, string> = {
  success: '#0F8F5F',
  warning: '#C9A961',
  danger:  '#C0322B',
  gold:    '#C9A961',
};

function scoreTone(score: number): NonNullable<AuditAxis['tone']> {
  if (score >= 90) return 'success';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'warning';
  return 'danger';
}

const AuditScoreRing: React.FC<AuditScoreRingProps> = ({
  title = "Score d'audit",
  subtitle,
  score,
  outOf = 100,
  axes = [],
  size = 112,
}) => {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / outOf));
  const offset = circumference * (1 - pct);
  const tone = scoreTone(score);
  const ringColor = TONE[tone];

  return (
    <article
      className="animate-rise-in"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-card)',
        padding: '1.125rem 1.25rem',
      }}
    >
      <header className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-accent)' }} strokeWidth={2.2} />
        <h3 className="font-semibold" style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {title}
        </h3>
        {subtitle && (
          <span className="eyebrow ml-auto" style={{ color: 'var(--color-text-tertiary)' }}>
            {subtitle}
          </span>
        )}
      </header>

      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score} sur ${outOf}`}>
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={stroke}
            />
            {/* Progress */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num-tabular font-bold" style={{ fontSize: '1.75rem', lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--color-text-primary)' }}>
              {score}
            </span>
            <span className="eyebrow mt-1" style={{ color: 'var(--color-text-tertiary)', fontSize: '0.625rem', letterSpacing: '0.12em' }}>
              /{outOf}
            </span>
          </div>
        </div>

        {/* Axes */}
        {axes.length > 0 && (
          <ul className="flex-1 min-w-0 space-y-2.5">
            {axes.map((axis, i) => {
              const axisTone = axis.tone ?? scoreTone(axis.score);
              const color = TONE[axisTone];
              const pct = Math.max(0, Math.min(100, axis.score));
              return (
                <li key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{axis.label}</span>
                    <span className="num-tabular text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{pct}</span>
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-border-light)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: color,
                        transition: 'width 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
};

export default AuditScoreRing;
