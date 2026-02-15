// Système de thème pour Atlas Finance
// Palette grayscale monochrome professionnelle + 5 thèmes additionnels

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: string;
  borderLight: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
  sidebar: {
    bg: string;
    bgHover: string;
    text: string;
    textHover: string;
    border: string;
    active: string;
    activeBg: string;
  };
  card: {
    bg: string;
    border: string;
    shadow: string;
  };
}

export interface Theme {
  name: string;
  description: string;
  colors: ThemeColors;
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
}

const sharedTransitions = {
  fast: '150ms ease',
  normal: '250ms ease',
  slow: '350ms ease',
};

const sharedBorderRadius = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// ============================================================================
// 1. Atlas Finance — Grayscale Monochrome (default)
// ============================================================================
const atlasFinanceTheme: Theme = {
  name: 'Atlas Finance',
  description: 'Palette grayscale monochrome professionnelle',
  colors: {
    primary: '#171717',
    primaryHover: '#262626',
    primaryLight: 'rgba(23, 23, 23, 0.1)',
    secondary: '#737373',
    accent: '#404040',
    background: '#fafafa',
    surface: '#FFFFFF',
    surfaceHover: '#f5f5f5',
    text: {
      primary: '#0a0a0a',
      secondary: '#404040',
      tertiary: '#737373',
      inverse: '#FFFFFF'
    },
    border: '#e5e5e5',
    borderLight: '#f5f5f5',
    success: '#22c55e',
    successLight: 'rgba(34, 197, 94, 0.1)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    info: '#3b82f6',
    infoLight: 'rgba(59, 130, 246, 0.1)',
    sidebar: {
      bg: '#0a0a0a',
      bgHover: '#171717',
      text: '#a3a3a3',
      textHover: '#FFFFFF',
      border: 'rgba(163, 163, 163, 0.1)',
      active: '#FFFFFF',
      activeBg: 'rgba(255, 255, 255, 0.1)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#e5e5e5',
      shadow: 'rgba(0, 0, 0, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.12)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 2. Ocean Blue — Corporate blue (classic finance)
// ============================================================================
const oceanBlueTheme: Theme = {
  name: 'Ocean Blue',
  description: 'Bleu corporate classique pour la finance',
  colors: {
    primary: '#1e40af',
    primaryHover: '#1d4ed8',
    primaryLight: 'rgba(30, 64, 175, 0.1)',
    secondary: '#64748b',
    accent: '#0ea5e9',
    background: '#f8fafc',
    surface: '#FFFFFF',
    surfaceHover: '#f1f5f9',
    text: {
      primary: '#0f172a',
      secondary: '#334155',
      tertiary: '#64748b',
      inverse: '#FFFFFF'
    },
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    success: '#16a34a',
    successLight: 'rgba(22, 163, 74, 0.1)',
    error: '#dc2626',
    errorLight: 'rgba(220, 38, 38, 0.1)',
    warning: '#d97706',
    warningLight: 'rgba(217, 119, 6, 0.1)',
    info: '#2563eb',
    infoLight: 'rgba(37, 99, 235, 0.1)',
    sidebar: {
      bg: '#0f172a',
      bgHover: '#1e293b',
      text: '#94a3b8',
      textHover: '#FFFFFF',
      border: 'rgba(148, 163, 184, 0.1)',
      active: '#FFFFFF',
      activeBg: 'rgba(30, 64, 175, 0.3)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#e2e8f0',
      shadow: 'rgba(15, 23, 42, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.08)',
    lg: '0 10px 15px rgba(15, 23, 42, 0.1)',
    xl: '0 20px 25px rgba(15, 23, 42, 0.12)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 3. Forest Green — Nature-inspired, eco-friendly
// ============================================================================
const forestGreenTheme: Theme = {
  name: 'Forest Green',
  description: 'Palette verte naturelle et apaisante',
  colors: {
    primary: '#15803d',
    primaryHover: '#16a34a',
    primaryLight: 'rgba(21, 128, 61, 0.1)',
    secondary: '#6b7280',
    accent: '#059669',
    background: '#f9fafb',
    surface: '#FFFFFF',
    surfaceHover: '#f3f4f6',
    text: {
      primary: '#111827',
      secondary: '#374151',
      tertiary: '#6b7280',
      inverse: '#FFFFFF'
    },
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    success: '#16a34a',
    successLight: 'rgba(22, 163, 74, 0.1)',
    error: '#dc2626',
    errorLight: 'rgba(220, 38, 38, 0.1)',
    warning: '#ca8a04',
    warningLight: 'rgba(202, 138, 4, 0.1)',
    info: '#0284c7',
    infoLight: 'rgba(2, 132, 199, 0.1)',
    sidebar: {
      bg: '#14532d',
      bgHover: '#166534',
      text: '#a7f3d0',
      textHover: '#FFFFFF',
      border: 'rgba(167, 243, 208, 0.1)',
      active: '#FFFFFF',
      activeBg: 'rgba(255, 255, 255, 0.15)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#e5e7eb',
      shadow: 'rgba(17, 24, 39, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(17, 24, 39, 0.04)',
    md: '0 4px 12px rgba(17, 24, 39, 0.08)',
    lg: '0 10px 15px rgba(17, 24, 39, 0.1)',
    xl: '0 20px 25px rgba(17, 24, 39, 0.12)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 4. Midnight Dark — Full dark mode
// ============================================================================
const midnightDarkTheme: Theme = {
  name: 'Midnight',
  description: 'Mode sombre complet pour le travail nocturne',
  colors: {
    primary: '#60a5fa',
    primaryHover: '#93c5fd',
    primaryLight: 'rgba(96, 165, 250, 0.15)',
    secondary: '#9ca3af',
    accent: '#818cf8',
    background: '#0f0f0f',
    surface: '#1a1a1a',
    surfaceHover: '#262626',
    text: {
      primary: '#f5f5f5',
      secondary: '#d4d4d4',
      tertiary: '#a3a3a3',
      inverse: '#0a0a0a'
    },
    border: '#2e2e2e',
    borderLight: '#1f1f1f',
    success: '#4ade80',
    successLight: 'rgba(74, 222, 128, 0.15)',
    error: '#f87171',
    errorLight: 'rgba(248, 113, 113, 0.15)',
    warning: '#fbbf24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    info: '#60a5fa',
    infoLight: 'rgba(96, 165, 250, 0.15)',
    sidebar: {
      bg: '#0a0a0a',
      bgHover: '#171717',
      text: '#a3a3a3',
      textHover: '#f5f5f5',
      border: 'rgba(163, 163, 163, 0.08)',
      active: '#60a5fa',
      activeBg: 'rgba(96, 165, 250, 0.15)'
    },
    card: {
      bg: '#1a1a1a',
      border: '#2e2e2e',
      shadow: 'rgba(0, 0, 0, 0.3)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 5. Sahel Gold — African-inspired warm tones (OHADA zone)
// ============================================================================
const sahelGoldTheme: Theme = {
  name: 'Sahel Gold',
  description: 'Tons chauds africains — Zone OHADA',
  colors: {
    primary: '#b45309',
    primaryHover: '#d97706',
    primaryLight: 'rgba(180, 83, 9, 0.1)',
    secondary: '#78716c',
    accent: '#a16207',
    background: '#fefce8',
    surface: '#FFFFFF',
    surfaceHover: '#fef9c3',
    text: {
      primary: '#1c1917',
      secondary: '#44403c',
      tertiary: '#78716c',
      inverse: '#FFFFFF'
    },
    border: '#e7e5e4',
    borderLight: '#f5f5f4',
    success: '#15803d',
    successLight: 'rgba(21, 128, 61, 0.1)',
    error: '#b91c1c',
    errorLight: 'rgba(185, 28, 28, 0.1)',
    warning: '#d97706',
    warningLight: 'rgba(217, 119, 6, 0.1)',
    info: '#0369a1',
    infoLight: 'rgba(3, 105, 161, 0.1)',
    sidebar: {
      bg: '#1c1917',
      bgHover: '#292524',
      text: '#d6d3d1',
      textHover: '#FFFFFF',
      border: 'rgba(214, 211, 209, 0.1)',
      active: '#fbbf24',
      activeBg: 'rgba(251, 191, 36, 0.15)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#e7e5e4',
      shadow: 'rgba(28, 25, 23, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(28, 25, 23, 0.04)',
    md: '0 4px 12px rgba(28, 25, 23, 0.08)',
    lg: '0 10px 15px rgba(28, 25, 23, 0.1)',
    xl: '0 20px 25px rgba(28, 25, 23, 0.12)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 6. Royal Indigo — Rich, premium accent
// ============================================================================
const royalIndigoTheme: Theme = {
  name: 'Royal Indigo',
  description: 'Accent indigo premium et sophistiqué',
  colors: {
    primary: '#4f46e5',
    primaryHover: '#6366f1',
    primaryLight: 'rgba(79, 70, 229, 0.1)',
    secondary: '#6b7280',
    accent: '#7c3aed',
    background: '#f9fafb',
    surface: '#FFFFFF',
    surfaceHover: '#f3f4f6',
    text: {
      primary: '#111827',
      secondary: '#374151',
      tertiary: '#6b7280',
      inverse: '#FFFFFF'
    },
    border: '#e5e7eb',
    borderLight: '#f3f4f6',
    success: '#059669',
    successLight: 'rgba(5, 150, 105, 0.1)',
    error: '#dc2626',
    errorLight: 'rgba(220, 38, 38, 0.1)',
    warning: '#d97706',
    warningLight: 'rgba(217, 119, 6, 0.1)',
    info: '#2563eb',
    infoLight: 'rgba(37, 99, 235, 0.1)',
    sidebar: {
      bg: '#1e1b4b',
      bgHover: '#312e81',
      text: '#c7d2fe',
      textHover: '#FFFFFF',
      border: 'rgba(199, 210, 254, 0.1)',
      active: '#FFFFFF',
      activeBg: 'rgba(99, 102, 241, 0.3)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#e5e7eb',
      shadow: 'rgba(17, 24, 39, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 2px rgba(17, 24, 39, 0.04)',
    md: '0 4px 12px rgba(17, 24, 39, 0.08)',
    lg: '0 10px 15px rgba(17, 24, 39, 0.1)',
    xl: '0 20px 25px rgba(17, 24, 39, 0.12)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// Exports
// ============================================================================

export const themes = {
  atlasFinance: atlasFinanceTheme,
  oceanBlue: oceanBlueTheme,
  forestGreen: forestGreenTheme,
  midnightDark: midnightDarkTheme,
  sahelGold: sahelGoldTheme,
  royalIndigo: royalIndigoTheme,
};

export const defaultTheme = atlasFinanceTheme;

export const getThemeCSSVariables = (theme: Theme) => {
  return {
    '--color-primary': theme.colors.primary,
    '--color-primary-hover': theme.colors.primaryHover,
    '--color-primary-light': theme.colors.primaryLight,
    '--color-secondary': theme.colors.secondary,
    '--color-accent': theme.colors.accent,
    '--color-background': theme.colors.background,
    '--color-surface': theme.colors.surface,
    '--color-surface-hover': theme.colors.surfaceHover,
    '--color-text-primary': theme.colors.text.primary,
    '--color-text-secondary': theme.colors.text.secondary,
    '--color-text-tertiary': theme.colors.text.tertiary,
    '--color-text-inverse': theme.colors.text.inverse,
    '--color-border': theme.colors.border,
    '--color-border-light': theme.colors.borderLight,
    '--color-success': theme.colors.success,
    '--color-success-light': theme.colors.successLight,
    '--color-error': theme.colors.error,
    '--color-error-light': theme.colors.errorLight,
    '--color-warning': theme.colors.warning,
    '--color-warning-light': theme.colors.warningLight,
    '--color-info': theme.colors.info,
    '--color-info-light': theme.colors.infoLight,
    '--color-sidebar-bg': theme.colors.sidebar.bg,
    '--color-sidebar-bg-hover': theme.colors.sidebar.bgHover,
    '--color-sidebar-hover': theme.colors.sidebar.bgHover,
    '--color-sidebar-text': theme.colors.sidebar.text,
    '--color-sidebar-text-secondary': theme.colors.sidebar.text,
    '--color-sidebar-text-hover': theme.colors.sidebar.textHover,
    '--color-sidebar-border': theme.colors.sidebar.border,
    '--color-sidebar-active': theme.colors.sidebar.active,
    '--color-sidebar-active-bg': theme.colors.sidebar.activeBg,
    '--color-sidebar-avatar-bg': theme.colors.sidebar.bgHover,
    '--color-card-bg': theme.colors.card.bg,
    '--color-card-border': theme.colors.card.border,
    '--color-card-shadow': theme.colors.card.shadow,
    '--shadow-sm': theme.shadows.sm,
    '--shadow-md': theme.shadows.md,
    '--shadow-lg': theme.shadows.lg,
    '--shadow-xl': theme.shadows.xl,
    '--transition-fast': theme.transitions.fast,
    '--transition-normal': theme.transitions.normal,
    '--transition-slow': theme.transitions.slow,
    '--radius-sm': theme.borderRadius.sm,
    '--radius-md': theme.borderRadius.md,
    '--radius-lg': theme.borderRadius.lg,
    '--radius-xl': theme.borderRadius.xl,
    '--radius-full': theme.borderRadius.full
  };
};

export type ThemeType = keyof typeof themes;

export interface ThemeContextValue {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
}
