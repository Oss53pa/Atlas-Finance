import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Design System unifié pour Atlas FnA
// Palette de couleurs cohérente et élégante

export const designTokens = {
  colors: {
    primary: {
      50: '#faf8f3',
      100: '#F0EBE0',
      200: '#E8E3D6',
      300: '#7FA3AF',
      400: '#4E7E8D',
      500: '#235A6E',
      600: '#1E4F60',
      700: '#1B4856',
      800: '#163A46',
      900: '#13323D',
    },
    neutral: {
      50: '#F7F5EF',
      100: '#F0EBE0',
      200: '#E8E3D6',
      300: '#D8CFBE',
      400: '#B0A893',
      500: '#8A8170',
      600: '#5C5347',
      700: '#3E382E',
      800: '#2A251D',
      900: '#261E15',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#15803D',
      600: '#15803D',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#E89A2E',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#C0322B',
      600: '#dc2626',
      700: '#b91c1c',
    },
    chart: {
      primary: '#B8954A',
      secondary: '#C4A65C',
      tertiary: '#D4B870',
      success: '#15803D',
      warning: '#E89A2E',
      error: '#C0322B',
      info: '#235A6E',
      neutral: '#A09880',
    }
  },
  spacing: {
    xs: '0.5rem',   // 8px
    sm: '0.75rem',  // 12px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem',  // 48px
    '3xl': '4rem',  // 64px
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  }
};

// Composant Card unifié et élégant
interface UnifiedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  onClick?: () => void;
}

export const UnifiedCard: React.FC<UnifiedCardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  hover = false,
  className = '',
  onClick
}) => {
  const sizes = {
    sm: '0.875rem 1rem',
    md: '1.125rem 1.25rem',
    lg: '1.5rem 1.625rem'
  };

  const baseStyle: React.CSSProperties = {
    background: variant === 'outlined' ? 'transparent' : 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: variant === 'elevated' ? 'var(--shadow-md)' : 'var(--shadow-sm)',
    padding: sizes[size],
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow var(--motion-normal), border-color var(--motion-normal), transform var(--motion-normal)',
  };
  if (variant === 'glass') {
    baseStyle.background = 'rgba(255, 255, 255, 0.72)';
    (baseStyle as any).backdropFilter = 'saturate(140%) blur(14px)';
    (baseStyle as any).WebkitBackdropFilter = 'saturate(140%) blur(14px)';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className={`${hover ? 'lift' : ''} ${className}`}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!hover) return;
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
      }}
      onMouseLeave={(e) => {
        if (!hover) return;
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
      }}
    >
      {children}
    </motion.div>
  );
};

// Composant KPI Card modernisé avec style chaud
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  delay?: number;
  withChart?: boolean;
  /** Override la taille de police de la valeur (ex. '1.125rem') pour les
   *  montants longs qui déborderaient à la taille par défaut. */
  valueFontSize?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  delay = 0,
  withChart = false,
  valueFontSize
}) => {
  const TONE: Record<NonNullable<KPICardProps['color']>, { stroke: string; tileBg: string; tileColor: string; trendBg: string; trendColor: string }> = {
    primary: { stroke: '#235A6E', tileBg: 'var(--color-accent-light)',  tileColor: 'var(--color-accent-deep)', trendBg: 'rgba(21,128,61,0.10)', trendColor: '#15803D' },
    success: { stroke: '#15803D', tileBg: 'rgba(21,128,61,0.10)',       tileColor: '#15803D',                  trendBg: 'rgba(21,128,61,0.10)', trendColor: '#15803D' },
    warning: { stroke: '#E89A2E', tileBg: 'rgba(232,154,46,0.14)',      tileColor: '#C77E2C',                  trendBg: 'rgba(232,154,46,0.14)', trendColor: '#C77E2C' },
    error:   { stroke: '#C0322B', tileBg: 'rgba(192,50,43,0.10)',       tileColor: '#C0322B',                  trendBg: 'rgba(192,50,43,0.10)', trendColor: '#C0322B' },
    neutral: { stroke: '#8A8170', tileBg: 'var(--color-surface-hover)', tileColor: 'var(--color-text-secondary)', trendBg: 'var(--color-surface-hover)', trendColor: 'var(--color-text-secondary)' },
  };
  const t = TONE[color];
  // id de gradient SVG unique & valide (le titre contient des espaces -> id invalide -> fill noir)
  const gradId = 'kpi-grad-' + React.useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="surface-card lift"
      style={{ padding: '1.125rem 1.25rem 1rem', position: 'relative', overflow: 'hidden' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h6
            className="eyebrow"
            style={{ fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.12em', marginBottom: '0.5rem' }}
          >
            {title}
          </h6>
          <p
            className="display-md num-display"
            style={{ color: 'var(--color-text-primary)', marginBottom: 0, ...(valueFontSize ? { fontSize: valueFontSize } : {}) }}
          >
            {value}
          </p>
        </div>
        <span
          className="shrink-0 inline-flex items-center justify-center"
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: t.tileBg, color: t.tileColor,
          }}
        >
          <Icon size={16} strokeWidth={1.5} />
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <span
              className="inline-flex items-center num-tabular"
              style={{
                padding: '0.125rem 0.5rem',
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 600,
                background: trend.isPositive ? 'rgba(15,143,95,0.10)' : 'rgba(192,50,43,0.10)',
                color: trend.isPositive ? '#15803D' : '#C0322B',
              }}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</span>
          )}
        </div>
      )}

      {withChart && (
        <div className="mt-3 -mx-1">
          <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none">
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.stroke} stopOpacity={0.32} />
                <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d="M 0 24 C 30 22, 50 18, 70 14 S 110 8, 140 10 S 180 6, 200 4 L 200 32 L 0 32 Z" fill={`url(#${gradId})`} />
            <path d="M 0 24 C 30 22, 50 18, 70 14 S 110 8, 140 10 S 180 6, 200 4" fill="none" stroke={t.stroke} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </motion.article>
  );
};

// Composant Section Header standardisé
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  action,
  className = ''
}) => (
  <div
    className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6 mb-6 ${className}`}
  >
    <div className="flex items-start gap-3 min-w-0">
      {Icon && (
        <span
          className="shrink-0 inline-flex items-center justify-center mt-1"
          style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--color-accent-light)',
            color: 'var(--color-accent-deep)',
            border: '1px solid rgba(35,90,110,0.20)',
          }}
        >
          <Icon size={16} strokeWidth={1.5} />
        </span>
      )}
      <div className="min-w-0">
        <h1
          className="display-md"
          style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.025em', lineHeight: 1.15, fontWeight: 600, fontSize: '1.5rem' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--color-text-tertiary)', letterSpacing: '-0.005em', lineHeight: 1.5 }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div className="flex items-center gap-2 flex-wrap">{action}</div>}
  </div>
);

// Composant Button standardisé élégant
interface ElegantButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ElegantButton: React.FC<ElegantButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled = false,
  onClick,
  className = ''
}) => {
  const VARIANT_STYLE: Record<NonNullable<ElegantButtonProps['variant']>, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--color-text-inverse)',
      boxShadow: 'var(--shadow-obsidian)',
      border: '1px solid var(--color-primary)',
    },
    secondary: {
      background: 'var(--color-accent)',
      color: 'var(--color-text-primary)',
      boxShadow: '0 1px 2px rgba(35,90,110,0.18)',
      border: '1px solid var(--color-accent)',
    },
    outline: {
      background: 'var(--color-surface)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-secondary)',
      border: '1px solid transparent',
    },
  };
  const SIZE_STYLE = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.75rem',  borderRadius: 8,  gap: '0.375rem' },
    md: { padding: '0.5rem 0.875rem',  fontSize: '0.875rem', borderRadius: 10, gap: '0.5rem'   },
    lg: { padding: '0.75rem 1.125rem', fontSize: '0.9375rem',borderRadius: 12, gap: '0.625rem' },
  };

  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      className={`press inline-flex items-center justify-center font-semibold ${className}`}
      style={{
        ...VARIANT_STYLE[variant],
        ...SIZE_STYLE[size],
        letterSpacing: '-0.005em',
        opacity: disabled || loading ? 0.55 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background var(--motion-fast), border-color var(--motion-fast), box-shadow var(--motion-fast)',
      }}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (disabled || loading) return;
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)';
        if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--color-accent-hover)';
        if (variant === 'outline') (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
        if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-hover)';
      }}
      onMouseLeave={(e) => {
        const base = VARIANT_STYLE[variant];
        (e.currentTarget as HTMLElement).style.background = (base.background as string) || 'transparent';
        if (variant === 'outline') (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)';
      }}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'lg' ? 16 : 14} strokeWidth={1.6} />
      ) : null}
      <span>{children}</span>
    </motion.button>
  );
};

// Composant Modern Chart Card inspiré des captures
interface ModernChartCardProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
  gradient?: 'warm' | 'cool' | 'neutral';
}

export const ModernChartCard: React.FC<ModernChartCardProps> = ({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
  gradient = 'warm'
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className={`surface-card ${className}`}
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      {/* Filet gold supérieur subtil */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)',
          opacity: 0.40,
        }}
      />
      {/* Header */}
      <div
        className="flex items-center justify-between gap-4"
        style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border-light)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="shrink-0 inline-flex items-center justify-center"
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--color-accent-light)',
              color: 'var(--color-accent-deep)',
            }}
          >
            <Icon size={15} strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <h2
              className="font-semibold truncate"
              style={{ fontSize: '0.9375rem', letterSpacing: '-0.012em', color: 'var(--color-text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      {/* Contenu */}
      <div style={{ padding: '1.25rem' }}>{children}</div>
    </motion.div>
  );
};

// Composant Graphique en barres colorées
interface ColorfulBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  height?: number;
  /** Afficher la valeur au-dessus de chaque barre (défaut: true). */
  showValues?: boolean;
  /** Formateur de la valeur affichée (défaut: séparateur de milliers fr-FR). */
  formatValue?: (value: number) => string;
}

const BAR_SERIES = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF', '#9E6322', '#2C6E86'];

export const ColorfulBarChart: React.FC<ColorfulBarChartProps> = ({
  data,
  height = 200,
  showValues = true,
  formatValue = (v: number) => v.toLocaleString('fr-FR'),
}) => {
  // Échelle sur les valeurs ABSOLUES : les soldes peuvent être négatifs
  // (passif/produits) — sans ça, maxValue serait faussé et certaines barres
  // invisibles. La valeur affichée reste signée.
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (Math.abs(item.value) / maxValue) * 100;
          const c = BAR_SERIES[index % BAR_SERIES.length];
          return (
            <div
              key={index}
              className="flex-1 h-full flex flex-col items-center justify-end min-w-0"
            >
              {/* zone de barre à hauteur fixe : le % de la barre se calcule sur CETTE
                  zone (sinon un % sur un parent auto-hauteur = 0 → barres invisibles). */}
              <div className="w-full flex-1 flex flex-col items-center justify-end min-h-0">
                {showValues && (
                  <span
                    className="text-[11px] font-semibold text-neutral-700 mb-1 whitespace-nowrap leading-none"
                    title={String(item.value)}
                  >
                    {formatValue(item.value)}
                  </span>
                )}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.5 }}
                  className="w-full max-w-[64px] rounded-t-lg origin-bottom"
                  style={{
                    height: `${Math.max(barHeight, item.value !== 0 ? 2 : 0)}%`,
                    background: `linear-gradient(180deg, ${c} 0%, ${c}D9 60%, ${c}A6 100%)`,
                    boxShadow: `0 6px 14px -6px ${c}66`,
                  }}
                  whileHover={{ scale: 1.04 }}
                />
              </div>
              <span className="text-xs text-neutral-600 mt-2 font-medium text-center truncate w-full" title={item.label}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Layout Container modernisé
interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'sm' | 'md' | 'lg';
  background?: 'default' | 'gradient' | 'pattern' | 'warm';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'full',
  padding = 'lg',
  background = 'warm'
}) => {
  const maxW: Record<NonNullable<PageContainerProps['maxWidth']>, string> = {
    sm: '640px', md: '880px', lg: '1120px', xl: '1480px', full: 'none',
  };
  const pad: Record<NonNullable<PageContainerProps['padding']>, string> = {
    sm: '1rem',
    md: '1.5rem',
    lg: 'clamp(1.5rem, 3vw, 2.5rem)',
  };
  return (
    <div className="page-shell anim-fade">
      <div
        style={{
          width: '100%',
          maxWidth: maxW[maxWidth],
          marginLeft: 'auto',
          marginRight: 'auto',
          paddingLeft: pad[padding],
          paddingRight: pad[padding],
          paddingTop: '2rem',
          paddingBottom: '4rem',
        }}
      >
        {children}
      </div>
    </div>
  );
};