import React from 'react';

export interface HeroBrandHeaderProps {
  eyebrow?: string;            // Petite indication (ex: BIENVENUE · MAI 2026)
  /** Tokens du titre — chaque token peut être stylé en obsidien ou champagne */
  titleObsidian: string;       // Mot(s) en obsidien (ex: "Atlas")
  titleChampagne: string;      // Mot(s) en script champagne (ex: "F&A")
  subtitle?: React.ReactNode;  // Phrase de contexte
  chips?: Array<{ label: string; tone?: 'neutral' | 'gold' | 'live' }>;
  actions?: React.ReactNode;   // CTA à droite
}

const Chip: React.FC<{ label: string; tone?: 'neutral' | 'gold' | 'live' }> = ({ label, tone = 'neutral' }) => {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border';
  if (tone === 'live') {
    return (
      <span className={base} style={{ background: 'rgba(15,143,95,0.08)', color: '#0F8F5F', borderColor: 'rgba(15,143,95,0.25)' }}>
        <span className="w-1.5 h-1.5 rounded-full animate-subtle-pulse" style={{ background: '#0F8F5F' }} />
        {label}
      </span>
    );
  }
  if (tone === 'gold') {
    return (
      <span className={base} style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent-deep)', borderColor: 'rgba(201,169,97,0.30)' }}>
        {label}
      </span>
    );
  }
  return (
    <span className={base} style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border-light)' }}>
      {label}
    </span>
  );
};

const HeroBrandHeader: React.FC<HeroBrandHeaderProps> = ({
  eyebrow, titleObsidian, titleChampagne, subtitle, chips, actions,
}) => {
  return (
    <header className="relative animate-rise-in">
      {/* Eyebrow + chips */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {eyebrow && (
          <div className="eyebrow-gold flex items-center gap-2">
            <span className="gold-dot" style={{ width: 5, height: 5 }} />
            {eyebrow}
          </div>
        )}
        {chips && chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((c, i) => (
              <Chip key={i} label={c.label} tone={c.tone} />
            ))}
          </div>
        )}
      </div>

      {/* Title row */}
      <div className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div
            className="flex items-baseline gap-3 flex-wrap"
            style={{ letterSpacing: '-0.035em' }}
          >
            <span
              role="heading"
              aria-level={1}
              className="font-bold num-tabular"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                lineHeight: 1,
                color: 'var(--color-text-primary)',
                letterSpacing: '-0.04em',
              }}
            >
              {titleObsidian}
            </span>
            <span
              className="text-champagne-gloss font-bold"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontFamily: "'Grand Hotel', cursive",
              }}
            >
              {titleChampagne}
            </span>
          </div>
          {subtitle && (
            <p
              className="mt-3 max-w-2xl"
              style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9375rem', lineHeight: 1.6 }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>

      {/* Decorative hairline */}
      <div className="divider-gold" style={{ marginTop: '1.75rem', marginBottom: 0, maxWidth: 320 }} />
    </header>
  );
};

export default HeroBrandHeader;
