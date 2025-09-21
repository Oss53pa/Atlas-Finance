import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

// Design System unifié pour WiseBook ERP
// Palette de couleurs cohérente et élégante

export const designTokens = {
  colors: {
    // Système de couleurs WiseBook inspiré du design moderne chaud
    primary: {
      50: '#fefdf7',   // Crème très clair
      100: '#fef7e6',  // Beige très clair
      200: '#fcedc1',  // Beige clair
      300: '#f8dc85',  // Jaune doux
      400: '#f4c842',  // Jaune principal
      500: '#f0b429',  // Jaune-orange
      600: '#e89611',  // Orange principal
      700: '#c1720a',  // Orange foncé
      800: '#9a5a0f',  // Orange très foncé
      900: '#7c4912',  // Brun-orange
    },
    neutral: {
      50: '#fefefe',   // Blanc pur
      100: '#f8f7f4',  // Crème très subtil
      200: '#f1efea',  // Beige très clair
      300: '#e6e2d8',  // Beige clair
      400: '#c5bfb0',  // Beige moyen
      500: '#9b9488',  // Beige foncé
      600: '#7a7062',  // Brun clair
      700: '#5a5147',  // Brun moyen
      800: '#3d3530',  // Brun foncé
      900: '#2a1f1a',  // Brun très foncé
    },
    success: {
      50: '#f0fdf4',   // Vert très clair
      100: '#dcfce7',  // Vert clair
      200: '#bbf7d0',  // Vert moyen clair
      300: '#86efac',  // Vert moyen
      400: '#4ade80',  // Vert vif
      500: '#22c55e',  // Vert principal
      600: '#16a34a',  // Vert foncé
      700: '#15803d',  // Vert très foncé
    },
    warning: {
      50: '#fffbf0',   // Orange très clair inspiré des captures
      100: '#fef3c7',  // Orange clair
      200: '#fde68a',  // Orange moyen clair  
      300: '#fcd34d',  // Orange moyen
      400: '#f59e0b',  // Orange vif
      500: '#f0b429',  // Orange principal (même que primary)
      600: '#e89611',  // Orange foncé
    },
    error: {
      50: '#fef2f2',   // Rouge très clair
      100: '#fee2e2',  // Rouge clair
      200: '#fecaca',  // Rouge moyen clair
      300: '#fca5a5',  // Rouge moyen
      400: '#f87171',  // Rouge vif
      500: '#ef4444',  // Rouge principal
      600: '#dc2626',  // Rouge foncé
    },
    // Nouvelle palette pour les graphiques colorés
    chart: {
      yellow: '#f4c842',
      orange: '#e89611', 
      blue: '#3b82f6',
      green: '#22c55e',
      purple: '#8b5cf6',
      pink: '#ec4899',
      cyan: '#06b6d4',
      indigo: '#6366f1',
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
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-neutral-800',
      accent: 'text-blue-600',
      border: 'border-neutral-200/40'
    },
    success: {
      bg: 'bg-white/90',
      icon: 'bg-green-100 text-green-600',
      text: 'text-neutral-800',
      accent: 'text-green-600',
      border: 'border-neutral-200/40'
    },
    warning: {
      bg: 'bg-white/90',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-neutral-800',
      accent: 'text-amber-600',
      border: 'border-neutral-200/40'
    },
    error: {
      bg: 'bg-white/90',
      icon: 'bg-red-100 text-red-600',
      text: 'text-neutral-800',
      accent: 'text-red-600',
      border: 'border-neutral-200/40'
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
              <p className={`text-2xl font-bold ${variant.text} leading-none`}>
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
                ${trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}
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
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-8 ${className}`}>
    <div className="flex items-center space-x-4">
      {Icon && (
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
          <Icon className="h-8 w-8 text-white" />
        </div>
      )}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-neutral-600 mt-2 text-lg">{subtitle}</p>
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
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800',
    secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 shadow-sm',
    outline: 'border-2 border-neutral-200 text-neutral-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/50',
    ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
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
              <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
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