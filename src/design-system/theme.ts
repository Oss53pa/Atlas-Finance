/**
 * Atlas Finance Design System - Theme Configuration
 * Unified design tokens for consistent UI across the application
 */

export const theme = {
  // Brand Colors - Grayscale Monochrome
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
      950: '#0a0a0a',
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
    status: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    semantic: {
      background: '#fafafa',
      surface: '#FFFFFF',
      border: '#e5e5e5',
      text: {
        primary: '#0a0a0a',
        secondary: '#404040',
        tertiary: '#737373',
        disabled: '#a3a3a3',
        inverse: '#FFFFFF',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "'Exo 2', sans-serif",
      secondary: "'Grand Hotel', cursive",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    7: '1.75rem',  // 28px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
    20: '5rem',    // 80px
    24: '6rem',    // 96px
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    card: '1rem',    // 16px
    btn: '0.75rem',  // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(0, 0, 0, 0.04)',
    card: '0 1px 2px rgba(0, 0, 0, 0.04)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 12px rgba(0, 0, 0, 0.08)',
    'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    focus: '0 0 0 3px rgba(23, 23, 23, 0.1)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },

  // Breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Z-index layers
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    fixed: 30,
    modalBackdrop: 40,
    modal: 50,
    popover: 60,
    tooltip: 70,
    notification: 80,
    loader: 90,
  },
};

// Type-safe theme access
export type Theme = typeof theme;
export type ColorScheme = keyof typeof theme.colors;
export type ColorValue = keyof typeof theme.colors.primary;

// Helper functions
export const getColor = (scheme: ColorScheme, value: ColorValue = 500): string => {
  return theme.colors[scheme]?.[value] || theme.colors.neutral[500];
};

export const getSpacing = (value: keyof typeof theme.spacing): string => {
  return theme.spacing[value] || '0';
};

export const getBorderRadius = (value: keyof typeof theme.borderRadius): string => {
  return theme.borderRadius[value] || '0';
};

export const getShadow = (value: keyof typeof theme.shadows): string => {
  return theme.shadows[value] || 'none';
};

// CSS Variables Generator
export const generateCSSVariables = (): string => {
  let css = ':root {\n';

  // Colors
  Object.entries(theme.colors).forEach(([colorName, colorValues]) => {
    if (typeof colorValues === 'object') {
      Object.entries(colorValues).forEach(([shade, value]) => {
        if (typeof value === 'string') {
          css += `  --color-${colorName}-${shade}: ${value};\n`;
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subShade, subValue]) => {
            css += `  --color-${colorName}-${shade}-${subShade}: ${subValue};\n`;
          });
        }
      });
    }
  });

  // Typography
  Object.entries(theme.typography.fontSize).forEach(([size, value]) => {
    css += `  --font-size-${size}: ${value};\n`;
  });

  // Spacing
  Object.entries(theme.spacing).forEach(([size, value]) => {
    css += `  --spacing-${size}: ${value};\n`;
  });

  // Border Radius
  Object.entries(theme.borderRadius).forEach(([size, value]) => {
    css += `  --border-radius-${size}: ${value};\n`;
  });

  // Shadows
  Object.entries(theme.shadows).forEach(([size, value]) => {
    css += `  --shadow-${size}: ${value};\n`;
  });

  css += '}\n';
  return css;
};

export default theme;
