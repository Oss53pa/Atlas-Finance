import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Design System unifié pour Atlas Finance
// Palette de couleurs cohérente et élégante

export const designTokens = {
  colors: {
    primary: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
    },
    chart: {
      primary: '#171717',
      secondary: '#525252',
      tertiary: '#737373',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      neutral: '#a3a3a3',
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
  const variants = {
    default: 'bg-white border border-neutral-200/60 shadow-md',
    elevated: 'bg-white shadow-xl border-0',
    outlined: 'bg-transparent border-2 border-neutral-200',
    glass: 'bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg'
  };

  const sizes = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const hoverClass = hover ? 'hover:shadow-2xl hover:scale-[1.02] transition-all duration-300' : '';
  const clickClass = onClick ? 'cursor-pointer' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${hoverClass}
        ${clickClass}
        rounded-2xl
        ${className}
      `}
      onClick={onClick}
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
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  delay = 0,
  withChart = false
}) => {
  const colorVariants = {
    primary: {
      bg: 'bg-white/90',
      icon: 'bg-neutral-100 text-neutral-700',
      text: 'text-[#171717]',
      accent: 'text-neutral-700',
      border: 'border-[#d4d4d4]/40'
    },
    success: {
      bg: 'bg-white/90',
      icon: 'bg-neutral-100 text-neutral-700',
      text: 'text-[#171717]',
      accent: 'text-neutral-700',
      border: 'border-[#d4d4d4]/40'
    },
    warning: {
      bg: 'bg-white/90',
      icon: 'bg-neutral-100 text-neutral-600',
      text: 'text-[#171717]',
      accent: 'text-neutral-600',
      border: 'border-[#d4d4d4]/40'
    },
    error: {
      bg: 'bg-white/90',
      icon: 'bg-neutral-100 text-neutral-600',
      text: 'text-[#171717]',
      accent: 'text-neutral-600',
      border: 'border-[#d4d4d4]/40'
    },
    neutral: {
      bg: 'bg-white/90',
      icon: 'bg-neutral-100 text-neutral-600',
      text: 'text-neutral-800',
      accent: 'text-neutral-600',
      border: 'border-neutral-200/40'
    }
  };

  const variant = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="group"
    >
      <div className={`
        relative overflow-hidden rounded-xl 
        ${variant.bg}
        border ${variant.border} shadow-sm hover:shadow-md
        transition-all duration-300 cursor-default
        backdrop-blur-sm
      `}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xs font-medium tracking-wide text-neutral-500 uppercase mb-2">
                {title}
              </h3>
              <p className={`text-lg font-bold ${variant.text} leading-none`}>
                {value}
              </p>
            </div>

            <div className={`
              p-2.5 rounded-lg ${variant.icon}
              transition-transform duration-300
            `}>
              <Icon size={20} />
            </div>
          </div>

          <div className="space-y-2">
            {subtitle && (
              <p className="text-xs text-neutral-500">{subtitle}</p>
            )}
            {trend && (
              <div className={`
                inline-flex items-center px-2 py-1 rounded-md text-xs font-medium
                ${trend.isPositive ? 'bg-[#171717]/10 text-[#171717]' : 'bg-[#ef4444]/10 text-[#ef4444]'}
              `}>
                {trend.value}
              </div>
            )}
          </div>

          {/* Graphique minimaliste simplifié */}
          {withChart && (
            <div className="mt-3">
              <div className="flex items-end justify-between h-8 gap-0.5">
                {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: delay + 0.05 * index, duration: 0.2 }}
                    className={`
                      flex-1 rounded-t ${variant.icon.split(' ')[0]}
                      opacity-30
                    `}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 mb-6 ${className}`}>
    <div className="flex items-center space-x-3">
      {Icon && (
        <div className="p-2.5 bg-gradient-to-br from-[#171717] to-[#262626] rounded-xl shadow-md">
          <Icon className="h-5 w-5 text-white" />
        </div>
      )}
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-500 mt-1 text-sm">{subtitle}</p>
        )}
      </div>
    </div>
    {action && <div>{action}</div>}
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
  const variants = {
    primary: 'bg-gradient-to-r from-[#171717] to-[#262626] text-white shadow-lg hover:shadow-xl hover:from-[#262626] hover:to-[#262626]',
    secondary: 'bg-[#e5e5e5] text-[#171717] hover:bg-[#d4d4d4] shadow-sm',
    outline: 'border-2 border-[#d4d4d4] text-[#404040] hover:border-[#171717] hover:text-[#171717] hover:bg-[#171717]/5',
    ghost: 'text-[#737373] hover:text-[#171717] hover:bg-[#e5e5e5]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        rounded-xl font-semibold
        transition-all duration-200
        inline-flex items-center justify-center space-x-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={18} />
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`group ${className}`}
    >
      <div className="
        relative overflow-hidden rounded-xl
        bg-white/90
        border border-neutral-200/40 shadow-sm hover:shadow-md
        transition-all duration-300
        backdrop-blur-sm
      ">
        {/* Header épuré */}
        <div className="p-6 pb-4 border-b border-neutral-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-neutral-100 rounded-lg">
              <Icon className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
              {subtitle && (
                <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6">
          {children}
        </div>
      </div>
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
}

export const ColorfulBarChart: React.FC<ColorfulBarChartProps> = ({
  data,
  height = 200
}) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * 100;
          return (
            <motion.div
              key={index}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex-1 flex flex-col items-center"
            >
              <motion.div
                className={`w-full rounded-t-lg ${item.color} shadow-sm origin-bottom`}
                style={{ height: `${barHeight}%` }}
                whileHover={{ scale: 1.05 }}
              />
              <span className="text-xs text-neutral-600 mt-2 font-medium">
                {item.label}
              </span>
            </motion.div>
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
  const maxWidths = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl', 
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-none'
  };

  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-4 sm:p-6 lg:p-8'
  };

  const backgrounds = {
    default: 'bg-neutral-50',
    gradient: 'bg-gradient-to-br from-neutral-50 via-blue-50/30 to-neutral-50',
    pattern: 'bg-neutral-50 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/20 via-transparent to-transparent',
    warm: 'bg-neutral-50/50'
  };

  return (
    <div className={`min-h-screen ${backgrounds[background]}`}>
      <div className={`mx-auto ${maxWidths[maxWidth]} ${paddings[padding]}`}>
        {children}
      </div>
    </div>
  );
};