/**
 * WiseBook Design System - Theme Configuration
 * Unified design tokens for consistent UI across the application
 */

export const theme = {
  // Brand Colors
  colors: {
    primary: {
      50: '#F0F9F4',
      100: '#E0F2E9',
      200: '#C1E5D3',
      300: '#A2D9BD',
      400: '#83CCA7',
      500: '#6A8A82', // Main brand color
      600: '#5A7A72',
      700: '#4A6962',
      800: '#3A5952',
      900: '#2A4842',
    },
    secondary: {
      50: '#FFF8F3',
      100: '#FFF1E7',
      200: '#FFE3CF',
      300: '#FFD5B7',
      400: '#FFC79F',
      500: '#B87333', // Secondary brand color
      600: '#A86323',
      700: '#985313',
      800: '#884303',
      900: '#783300',
    },
    tertiary: {
      50: '#F4F7F9',
      100: '#E9EFF3',
      200: '#D3DFE7',
      300: '#BDCFDB',
      400: '#A7BFCF',
      500: '#7A99AC', // Tertiary color
      600: '#6A899C',
      700: '#5A798C',
      800: '#4A697C',
      900: '#3A596C',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#ECECEC', // Background color
      300: '#E8E8E8', // Border color
      400: '#D1D1D1',
      500: '#A1A1A1',
      600: '#767676', // Secondary text
      700: '#444444', // Primary text
      800: '#191919', // Headlines
      900: '#0A0A0A',
    },
    status: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    semantic: {
      background: '#ECECEC',
      surface: '#FFFFFF',
      border: '#E8E8E8',
      text: {
        primary: '#191919',
        secondary: '#444444',
        tertiary: '#767676',
        disabled: '#A1A1A1',
        inverse: '#FFFFFF',
      },
    },
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "'Sometype Mono', 'Courier New', monospace",
      secondary: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
    sm: '0.125rem',  // 2px
    base: '0.25rem', // 4px
    md: '0.375rem',  // 6px
    lg: '0.5rem',    // 8px
    xl: '0.75rem',   // 12px
    '2xl': '1rem',   // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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