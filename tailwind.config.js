/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      // Dosis + fallback systeme — police principale UI
      'sans': [
        'Dosis',
        '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text',
        'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
      ],
      // Serif editorial italics
      'serif': ['Instrument Serif', 'Georgia', 'serif'],
      // Grand Hotel — RESERVE au wordmark / titres marque uniquement
      'script': ['Grand Hotel', 'cursive'],
      'brand': ['Grand Hotel', 'cursive'],
      // Heading = Dosis
      'heading': [
        'Dosis',
        '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
        'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
      ],
      // Display = Dosis (bold pour gros chiffres KPI)
      'display': [
        'Dosis',
        '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
        'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
      ],
      // Mono pour chiffres tabulaires + code
      'mono': ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
    },
    extend: {
      colors: {
        // === Petrol Cream ===
        // #F7F5EF (crème) · #FFFFFF (blanc) · #E8E3D6 (beige) · #235A6E (pétrole) · #E89A2E (ambre) · #261E15 (texte)
        primary: {
          DEFAULT: '#235A6E',
          50:  '#EAF1F3',
          100: '#D5E1E6',
          200: '#AEC6CE',
          300: '#7FA3AF',
          400: '#4E7E8D',
          500: '#235A6E',
          600: '#1E4F60',
          700: '#1B4856',
          800: '#163A46',
          900: '#122F38',
          950: '#0C2530',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#E8E3D6',
          50:  '#F7F5EF',
          100: '#F0EBE0',
          200: '#E8E3D6',
          500: '#E89A2E',
          600: '#C77E2C',
          foreground: '#261E15',
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
        // Ambre — accent secondaire (spark chaud), nommé "champagne" pour compat
        champagne: {
          DEFAULT: '#E89A2E',
          50:  '#FDF3E2',
          100: '#FBE6C2',
          200: '#F6CE8C',
          300: '#F2B85C',
          400: '#EFA63E',
          500: '#E89A2E',
          600: '#C77E2C',
          700: '#9E6322',
          800: '#6E4518',
          900: '#422A0F',
        },
        // Ambre — alias explicite
        amber: {
          DEFAULT: '#E89A2E',
          400: '#F2A93B',
          500: '#E89A2E',
          600: '#C77E2C',
        },
        obsidian: {
          DEFAULT: '#13323D',
          50:  '#EAF1F3',
          900: '#13323D',
          950: '#0C2530',
        },
        accent: {
          DEFAULT: '#235A6E',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F1ECE0',
          foreground: '#6E6356',
        },
        background: '#F7F5EF',
        foreground: '#261E15',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#261E15',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#261E15',
        },
        border: '#E8E3D6',
        input: '#E8E3D6',
        ring: '#235A6E',

        // Status colors — calibrés pour la palette Petrol Cream
        success: {
          DEFAULT: '#15803D',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#E89A2E',
          foreground: '#261E15',
        },
        destructive: {
          DEFAULT: '#C0322B',
          foreground: '#FFFFFF',
        },
        error: {
          DEFAULT: '#C0322B',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#235A6E',
          foreground: '#FFFFFF',
        },

        // Atlas theme-aware shortcuts (resolve to current theme CSS vars)
        'atlas-primary': 'var(--color-primary)',
        'atlas-primary-hover': 'var(--color-primary-hover)',
        'atlas-primary-light': 'var(--color-primary-light)',
        'atlas-secondary': 'var(--color-secondary)',
        'atlas-accent': 'var(--color-accent)',
        'atlas-accent-2': 'var(--color-accent-2)',
        'atlas-accent-2-deep': 'var(--color-accent-2-deep)',
        'atlas-bg': 'var(--color-background)',
        'atlas-surface': 'var(--color-surface)',
        'atlas-surface-hover': 'var(--color-surface-hover)',
        'atlas-text': 'var(--color-text-primary)',
        'atlas-text-secondary': 'var(--color-text-secondary)',
        'atlas-text-tertiary': 'var(--color-text-tertiary)',
        'atlas-border': 'var(--color-border)',
        'atlas-border-light': 'var(--color-border-light)',
        'atlas-success': 'var(--color-success)',
        'atlas-error': 'var(--color-error)',
        'atlas-warning': 'var(--color-warning)',
        'atlas-info': 'var(--color-info)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "14px",
        btn: "10px",
      },
      boxShadow: {
        // Petrol Cream — halos courts, ultra-doux (ombre chaude)
        hairline: '0 0 0 1px rgba(38, 30, 21, 0.05)',
        card: '0 1px 0 rgba(38, 30, 21, 0.02), 0 1px 2px rgba(38, 30, 21, 0.04)',
        'card-hover': '0 2px 4px rgba(38, 30, 21, 0.04), 0 12px 32px -10px rgba(38, 30, 21, 0.10)',
        soft: '0 2px 4px rgba(38, 30, 21, 0.04), 0 8px 24px -8px rgba(38, 30, 21, 0.08)',
        elevated: '0 4px 8px rgba(38, 30, 21, 0.05), 0 18px 40px -12px rgba(38, 30, 21, 0.10)',
        premium: '0 12px 24px rgba(38, 30, 21, 0.06), 0 32px 64px -20px rgba(38, 30, 21, 0.14)',
        gold: '0 0 0 1px rgba(232, 154, 46, 0.22), 0 8px 24px -8px rgba(232, 154, 46, 0.30)',
        'inner-gold': 'inset 0 0 0 1px rgba(232, 154, 46, 0.22)',
        focus: '0 0 0 3px rgba(35, 90, 110, 0.30)',
      },
      letterSpacing: {
        'tightest': '-0.04em',
        'tighter': '-0.025em',
        'tight': '-0.015em',
        'eyebrow': '0.18em',
        'caps': '0.08em',
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        "slide-in": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "rise-in": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "gold-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "subtle-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in": "slide-in 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        "rise-in": "rise-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "gold-shimmer": "gold-shimmer 6s linear infinite",
        "subtle-pulse": "subtle-pulse 2.4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
