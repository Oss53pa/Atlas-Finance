// Système de thème pour Atlas F&A
// Palette Atlas Studio (anthracite + or mat) par défaut + 6 thèmes additionnels

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
  fast: '150ms cubic-bezier(0.16, 1, 0.3, 1)',
  normal: '250ms cubic-bezier(0.16, 1, 0.3, 1)',
  slow: '420ms cubic-bezier(0.16, 1, 0.3, 1)',
};

const sharedBorderRadius = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '18px',
  full: '9999px',
};

// ============================================================================
// 0. Obsidian & Champagne (DEFAULT) — Luxe institutionnel
// Référence : Mercury · Brex · Cartier
// Palette validée : #F7F4ED · #FFFFFF · #E5DFD0 · #C9A961 · #0E0E14
// ============================================================================
const atlasStudioTheme: Theme = {
  name: 'Obsidian & Champagne',
  description: 'Luxe institutionnel — Mercury · Brex · Cartier',
  colors: {
    // Obsidien profond (primaire / texte)
    primary: '#0E0E14',
    primaryHover: '#1A1A22',
    primaryLight: 'rgba(14, 14, 20, 0.06)',
    // Champagne gold (accent unique)
    secondary: '#C9A961',
    accent: '#C9A961',
    // Crème chaude (fond) + blanc pur (surface) + beige doux (subtle)
    background: '#F7F4ED',
    surface: '#FFFFFF',
    surfaceHover: '#FBF8F0',
    text: {
      primary: '#0E0E14',
      secondary: '#3A3A42',
      tertiary: '#6B6B73',
      inverse: '#F7F4ED'
    },
    // Hairlines extra-fines
    border: '#E5DFD0',
    borderLight: '#EDE7D6',
    success: '#0F8F5F',
    successLight: 'rgba(15, 143, 95, 0.10)',
    error: '#C0322B',
    errorLight: 'rgba(192, 50, 43, 0.10)',
    warning: '#C9A961',
    warningLight: 'rgba(201, 169, 97, 0.12)',
    info: '#1F1F23',
    infoLight: 'rgba(31, 31, 35, 0.08)',
    sidebar: {
      bg: '#0E0E14',
      bgHover: '#16161C',
      text: '#8F8C82',
      textHover: '#F7F4ED',
      border: 'rgba(201, 169, 97, 0.10)',
      active: '#C9A961',
      activeBg: 'rgba(201, 169, 97, 0.10)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#E5DFD0',
      shadow: 'rgba(14, 14, 20, 0.04)'
    }
  },
  shadows: {
    // Shadows ultra-douces façon orfèvrerie : empilement de halos courts
    sm: '0 1px 0 rgba(14, 14, 20, 0.02), 0 1px 2px rgba(14, 14, 20, 0.04)',
    md: '0 2px 4px rgba(14, 14, 20, 0.04), 0 8px 24px -8px rgba(14, 14, 20, 0.08)',
    lg: '0 4px 8px rgba(14, 14, 20, 0.05), 0 18px 40px -12px rgba(14, 14, 20, 0.10)',
    xl: '0 12px 24px rgba(14, 14, 20, 0.06), 0 32px 64px -20px rgba(14, 14, 20, 0.14)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 1. Atlas F&A — Grayscale Monochrome
// ============================================================================
const atlasFinanceTheme: Theme = {
  name: 'Atlas F&A',
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
  description: 'Accent primary premium et sophistiqué',
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
// 7. Sapphire & Slate — Institutionnel (Bloomberg · Stripe · Goldman Sachs)
//    #F8FAFC · #FFFFFF · #E2E8F0 · #2563EB · #0A1628
// ============================================================================
const sapphireSlateTheme: Theme = {
  name: 'Sapphire & Slate',
  description: 'Institutionnel — Bloomberg · Stripe · Goldman Sachs',
  colors: {
    primary: '#0A1628',
    primaryHover: '#15243D',
    primaryLight: 'rgba(10, 22, 40, 0.06)',
    secondary: '#2563EB',
    accent: '#2563EB',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    text: {
      primary: '#0A1628',
      secondary: '#334155',
      tertiary: '#64748B',
      inverse: '#F8FAFC'
    },
    border: '#E2E8F0',
    borderLight: '#EEF2F7',
    success: '#0F8F5F',
    successLight: 'rgba(15, 143, 95, 0.10)',
    error: '#DC2626',
    errorLight: 'rgba(220, 38, 38, 0.10)',
    warning: '#D97706',
    warningLight: 'rgba(217, 119, 6, 0.10)',
    info: '#2563EB',
    infoLight: 'rgba(37, 99, 235, 0.10)',
    sidebar: {
      bg: '#0A1628',
      bgHover: '#15243D',
      text: '#94A3B8',
      textHover: '#F8FAFC',
      border: 'rgba(37, 99, 235, 0.12)',
      active: '#2563EB',
      activeBg: 'rgba(37, 99, 235, 0.14)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#E2E8F0',
      shadow: 'rgba(10, 22, 40, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 0 rgba(10, 22, 40, 0.02), 0 1px 2px rgba(10, 22, 40, 0.04)',
    md: '0 2px 4px rgba(10, 22, 40, 0.04), 0 8px 24px -8px rgba(10, 22, 40, 0.08)',
    lg: '0 4px 8px rgba(10, 22, 40, 0.05), 0 18px 40px -12px rgba(10, 22, 40, 0.10)',
    xl: '0 12px 24px rgba(10, 22, 40, 0.06), 0 32px 64px -20px rgba(10, 22, 40, 0.14)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// 8. Steel & Carbon — Sobriété moderne (Linear · Vercel · Cockpit CR)
//    #F5F6F8 · #FFFFFF · #E4E7EC · #475569 · #18181B
// ============================================================================
const steelCarbonTheme: Theme = {
  name: 'Steel & Carbon',
  description: 'Sobriété moderne — Linear · Vercel · Cockpit CR',
  colors: {
    primary: '#18181B',
    primaryHover: '#27272A',
    primaryLight: 'rgba(24, 24, 27, 0.06)',
    secondary: '#475569',
    accent: '#475569',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceHover: '#EEF0F4',
    text: {
      primary: '#18181B',
      secondary: '#3F3F46',
      tertiary: '#71717A',
      inverse: '#F5F6F8'
    },
    border: '#E4E7EC',
    borderLight: '#EEF0F4',
    success: '#0F8F5F',
    successLight: 'rgba(15, 143, 95, 0.10)',
    error: '#DC2626',
    errorLight: 'rgba(220, 38, 38, 0.10)',
    warning: '#A16207',
    warningLight: 'rgba(161, 98, 7, 0.10)',
    info: '#475569',
    infoLight: 'rgba(71, 85, 105, 0.10)',
    sidebar: {
      bg: '#18181B',
      bgHover: '#27272A',
      text: '#A1A1AA',
      textHover: '#FFFFFF',
      border: 'rgba(161, 161, 170, 0.10)',
      active: '#FFFFFF',
      activeBg: 'rgba(255, 255, 255, 0.10)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#E4E7EC',
      shadow: 'rgba(24, 24, 27, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 0 rgba(24, 24, 27, 0.02), 0 1px 2px rgba(24, 24, 27, 0.04)',
    md: '0 2px 4px rgba(24, 24, 27, 0.04), 0 8px 24px -8px rgba(24, 24, 27, 0.08)',
    lg: '0 4px 8px rgba(24, 24, 27, 0.05), 0 18px 40px -12px rgba(24, 24, 27, 0.10)',
    xl: '0 12px 24px rgba(24, 24, 27, 0.06), 0 32px 64px -20px rgba(24, 24, 27, 0.14)'
  },
  transitions: sharedTransitions,
  borderRadius: sharedBorderRadius,
};

// ============================================================================
// Exports
// ============================================================================

export const themes = {
  atlasStudio: atlasStudioTheme,           // Obsidian & Champagne (DEFAULT)
  sapphireSlate: sapphireSlateTheme,       // Bloomberg · Stripe
  steelCarbon: steelCarbonTheme,           // Linear · Vercel · Cockpit CR
  atlasFinance: atlasFinanceTheme,
  oceanBlue: oceanBlueTheme,
  forestGreen: forestGreenTheme,
  midnightDark: midnightDarkTheme,
  sahelGold: sahelGoldTheme,
  royalIndigo: royalIndigoTheme,
};

export const defaultTheme = atlasStudioTheme;

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
