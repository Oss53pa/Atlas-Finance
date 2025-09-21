// Système de thème moderne pour WiseBook
// 3 palettes de couleurs professionnelles pour application SaaS

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

// Palette 1 – Élégance sobre (finance traditionnelle moderne)
const elegantTheme: Theme = {
  name: 'Élégance Sobre',
  description: 'Finance traditionnelle moderne - sérieux, luxe discret, rassurant',
  colors: {
    primary: '#2E7D69',      // Vert émeraude
    primaryHover: '#246456',
    primaryLight: 'rgba(46, 125, 105, 0.1)',
    secondary: '#D4AF37',     // Or pâle
    accent: '#D4AF37',
    background: '#F5F5F7',    // Gris clair neutre
    surface: '#FFFFFF',
    surfaceHover: '#FAFAFA',
    text: {
      primary: '#1E1E2F',     // Charbon profond
      secondary: '#4A4A5C',
      tertiary: '#C2C7CE',    // Gris moyen
      inverse: '#FFFFFF'
    },
    border: '#E5E5E7',
    borderLight: '#F0F0F2',
    success: '#2E7D69',
    successLight: 'rgba(46, 125, 105, 0.1)',
    error: '#DC3545',
    errorLight: 'rgba(220, 53, 69, 0.1)',
    warning: '#D4AF37',
    warningLight: 'rgba(212, 175, 55, 0.1)',
    info: '#5B9BD5',
    infoLight: 'rgba(91, 155, 213, 0.1)',
    sidebar: {
      bg: '#1E1E2F',
      bgHover: '#252538',
      text: '#C2C7CE',
      textHover: '#FFFFFF',
      border: 'rgba(194, 199, 206, 0.1)',
      active: '#2E7D69',
      activeBg: 'rgba(46, 125, 105, 0.1)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#E5E5E7',
      shadow: 'rgba(30, 30, 47, 0.05)'
    }
  },
  shadows: {
    sm: '0 1px 3px rgba(30, 30, 47, 0.05)',
    md: '0 4px 6px rgba(30, 30, 47, 0.07)',
    lg: '0 10px 15px rgba(30, 30, 47, 0.1)',
    xl: '0 20px 25px rgba(30, 30, 47, 0.12)'
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  }
};

// Palette 2 – Modern Fintech
const fintechTheme: Theme = {
  name: 'Modern Fintech',
  description: 'Moderne, clair, orienté tableau de bord financier',
  colors: {
    primary: '#27AE60',      // Vert doux
    primaryHover: '#219A52',
    primaryLight: 'rgba(39, 174, 96, 0.1)',
    secondary: '#2C3E50',     // Bleu nuit désaturé
    accent: '#3498DB',
    background: '#FAFAFA',    // Blanc cassé
    surface: '#FFFFFF',
    surfaceHover: '#F8F9FA',
    text: {
      primary: '#2C3E50',
      secondary: '#7F8C8D',    // Gris ardoise
      tertiary: '#95A5A6',
      inverse: '#FFFFFF'
    },
    border: '#E0E6ED',
    borderLight: '#F1F4F7',
    success: '#27AE60',
    successLight: 'rgba(39, 174, 96, 0.1)',
    error: '#C0392B',        // Rouge bourgogne
    errorLight: 'rgba(192, 57, 43, 0.1)',
    warning: '#F39C12',
    warningLight: 'rgba(243, 156, 18, 0.1)',
    info: '#3498DB',
    infoLight: 'rgba(52, 152, 219, 0.1)',
    sidebar: {
      bg: '#2C3E50',
      bgHover: '#34495E',
      text: '#95A5A6',
      textHover: '#FFFFFF',
      border: 'rgba(149, 165, 166, 0.1)',
      active: '#27AE60',
      activeBg: 'rgba(39, 174, 96, 0.1)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#E0E6ED',
      shadow: 'rgba(44, 62, 80, 0.04)'
    }
  },
  shadows: {
    sm: '0 1px 3px rgba(44, 62, 80, 0.04)',
    md: '0 4px 6px rgba(44, 62, 80, 0.06)',
    lg: '0 10px 15px rgba(44, 62, 80, 0.08)',
    xl: '0 20px 25px rgba(44, 62, 80, 0.1)'
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  }
};

// Palette 3 – Minimaliste premium (Par défaut)
const minimalistTheme: Theme = {
  name: 'Minimaliste Premium',
  description: 'Élégance minimaliste avec touche premium',
  colors: {
    primary: '#6A8A82',      // Vert sauge
    primaryHover: '#5A7A72',
    primaryLight: 'rgba(106, 138, 130, 0.1)',
    secondary: '#B87333',     // Cuivre rosé
    accent: '#B87333',
    background: '#ECECEC',    // Gris clair perle
    surface: '#FFFFFF',
    surfaceHover: '#FAFAFA',
    text: {
      primary: '#191919',     // Noir fumé
      secondary: '#444444',   // Anthracite doux
      tertiary: '#767676',
      inverse: '#FFFFFF'
    },
    border: '#D9D9D9',
    borderLight: '#E8E8E8',
    success: '#6A8A82',
    successLight: 'rgba(106, 138, 130, 0.1)',
    error: '#B85450',
    errorLight: 'rgba(184, 84, 80, 0.1)',
    warning: '#B87333',
    warningLight: 'rgba(184, 115, 51, 0.1)',
    info: '#7A99AC',
    infoLight: 'rgba(122, 153, 172, 0.1)',
    sidebar: {
      bg: '#191919',
      bgHover: '#242424',
      text: '#999999',
      textHover: '#FFFFFF',
      border: 'rgba(153, 153, 153, 0.1)',
      active: '#B87333',
      activeBg: 'rgba(184, 115, 51, 0.1)'
    },
    card: {
      bg: '#FFFFFF',
      border: '#D9D9D9',
      shadow: 'rgba(25, 25, 25, 0.03)'
    }
  },
  shadows: {
    sm: '0 1px 3px rgba(25, 25, 25, 0.03)',
    md: '0 4px 6px rgba(25, 25, 25, 0.05)',
    lg: '0 10px 15px rgba(25, 25, 25, 0.07)',
    xl: '0 20px 25px rgba(25, 25, 25, 0.09)'
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  }
};

// Palette 4 – Neutral Odyssey (Immobilier haut de gamme)
const neutralOdysseyTheme: Theme = {
  name: 'Neutral Odyssey',
  description: 'Palette haut de gamme pour immobilier - élégance neutre et moderne',
  colors: {
    primary: '#373B4D',        // Gris profond, élégant - Actions fortes
    primaryHover: '#2C2F3D',   // Version plus sombre pour hover
    primaryLight: 'rgba(55, 59, 77, 0.1)',
    secondary: '#BDBFB7',      // Accents - éléments surlignés, cartes de projet
    accent: '#BDBFB7',
    background: '#ECEDEF',     // Fond clair principal
    surface: '#ECECEF',        // Surface des cartes et panneaux
    surfaceHover: '#E6E6E9',
    text: {
      primary: '#373B4D',      // Texte principal sur fond clair
      secondary: '#949597',     // Texte secondaire / icônes
      tertiary: '#BDBFB7',     // Texte tertiaire
      inverse: '#ECECEF'       // Texte sur fond sombre
    },
    border: '#BDBFB7',         // Bordures principales
    borderLight: '#E0E0E3',    // Bordures légères
    success: '#6A8A82',        // Réutilisation du vert sauge pour succès
    successLight: 'rgba(106, 138, 130, 0.1)',
    error: '#B85450',
    errorLight: 'rgba(184, 84, 80, 0.1)',
    warning: '#D4AF37',        // Or pour les avertissements
    warningLight: 'rgba(212, 175, 55, 0.1)',
    info: '#7A99AC',
    infoLight: 'rgba(122, 153, 172, 0.1)',
    sidebar: {
      bg: 'linear-gradient(180deg, #ECECEF 0%, #ECEDEF 100%)',  // Dégradé vertical
      bgHover: '#E6E6E9',
      text: '#373B4D',         // Icônes et texte en gris profond
      textHover: '#2C2F3D',    // Plus sombre au hover
      border: 'rgba(189, 191, 183, 0.2)',
      active: '#373B4D',       // État actif en couleur principale
      activeBg: 'rgba(55, 59, 77, 0.1)'
    },
    card: {
      bg: '#ECEDEF',           // Cartes sur fond légèrement différent
      border: '#BDBFB7',       // Encadrement des cartes
      shadow: 'rgba(55, 59, 77, 0.08)'
    }
  },
  shadows: {
    sm: '0 1px 3px rgba(55, 59, 77, 0.08)',
    md: '0 4px 6px rgba(55, 59, 77, 0.10)',
    lg: '0 10px 15px rgba(55, 59, 77, 0.12)',
    xl: '0 20px 25px rgba(55, 59, 77, 0.15)'
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px'
  }
};

// Thèmes disponibles
export const themes = {
  elegant: elegantTheme,
  fintech: fintechTheme,
  minimalist: minimalistTheme,
  neutralOdyssey: neutralOdysseyTheme
};

// Thème par défaut
export const defaultTheme = minimalistTheme;

// Helper pour obtenir les variables CSS d'un thème
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

// Types pour le contexte du thème
export type ThemeType = 'elegant' | 'fintech' | 'minimalist' | 'neutralOdyssey';

export interface ThemeContextValue {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
}