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
      'sans': ['Exo 2', 'sans-serif'],
      'heading': ['Grand Hotel', 'cursive'],
      'display': ['Grand Hotel', 'cursive'],
      'mono': ['JetBrains Mono', 'monospace'],
    },
    extend: {
      colors: {
        // === Obsidian & Champagne ===
        // #F7F4ED (crème) · #FFFFFF (blanc) · #E5DFD0 (beige) · #C9A961 (gold) · #0E0E14 (obsidian)
        primary: {
          DEFAULT: '#0E0E14',
          50:  '#F7F4ED',
          100: '#EDE7D6',
          200: '#E5DFD0',
          300: '#D9C99C',
          400: '#D4B574',
          500: '#C9A961',
          600: '#A88845',
          700: '#7A6332',
          800: '#1A1A22',
          900: '#0E0E14',
          950: '#06060A',
          foreground: '#F7F4ED',
        },
        secondary: {
          DEFAULT: '#E5DFD0',
          50:  '#F7F4ED',
          100: '#EDE7D6',
          200: '#E5DFD0',
          500: '#C9A961',
          600: '#A88845',
          foreground: '#0E0E14',
        },
        neutral: {
          50: '#F7F4ED',
          100: '#EDE7D6',
          200: '#E5DFD0',
          300: '#CFC8B8',
          400: '#9A968A',
          500: '#6B6B73',
          600: '#4A4A52',
          700: '#3A3A42',
          800: '#1A1A22',
          900: '#0E0E14',
        },
        // Champagne — accent unique
        champagne: {
          DEFAULT: '#C9A961',
          50:  '#FBF6E8',
          100: '#F4EAC8',
          200: '#E8D6A3',
          300: '#D9C99C',
          400: '#D4B574',
          500: '#C9A961',
          600: '#A88845',
          700: '#7A6332',
          800: '#4F411F',
          900: '#2E2613',
        },
        obsidian: {
          DEFAULT: '#0E0E14',
          50:  '#F4F4F5',
          900: '#0E0E14',
          950: '#06060A',
        },
        accent: {
          DEFAULT: '#C9A961',
          foreground: '#0E0E14',
        },
        muted: {
          DEFAULT: '#EDE7D6',
          foreground: '#6B6B73',
        },
        background: '#F7F4ED',
        foreground: '#0E0E14',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0E0E14',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0E0E14',
        },
        border: '#E5DFD0',
        input: '#E5DFD0',
        ring: '#C9A961',

        // Status colors — calibrés pour la palette warm
        success: {
          DEFAULT: '#0F8F5F',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#C9A961',
          foreground: '#0E0E14',
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
          DEFAULT: '#1F1F23',
          foreground: '#FFFFFF',
        },

        // Atlas theme-aware shortcuts (resolve to current theme CSS vars)
        'atlas-primary': 'var(--color-primary)',
        'atlas-primary-hover': 'var(--color-primary-hover)',
        'atlas-primary-light': 'var(--color-primary-light)',
        'atlas-secondary': 'var(--color-secondary)',
        'atlas-accent': 'var(--color-accent)',
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
        // Obsidian & Champagne — halos courts, ultra-doux
        hairline: '0 0 0 1px rgba(14, 14, 20, 0.05)',
        card: '0 1px 0 rgba(14, 14, 20, 0.02), 0 1px 2px rgba(14, 14, 20, 0.04)',
        'card-hover': '0 2px 4px rgba(14, 14, 20, 0.04), 0 12px 32px -10px rgba(14, 14, 20, 0.10)',
        soft: '0 2px 4px rgba(14, 14, 20, 0.04), 0 8px 24px -8px rgba(14, 14, 20, 0.08)',
        elevated: '0 4px 8px rgba(14, 14, 20, 0.05), 0 18px 40px -12px rgba(14, 14, 20, 0.10)',
        premium: '0 12px 24px rgba(14, 14, 20, 0.06), 0 32px 64px -20px rgba(14, 14, 20, 0.14)',
        gold: '0 0 0 1px rgba(201, 169, 97, 0.20), 0 8px 24px -8px rgba(201, 169, 97, 0.30)',
        'inner-gold': 'inset 0 0 0 1px rgba(201, 169, 97, 0.20)',
        focus: '0 0 0 3px rgba(201, 169, 97, 0.28)',
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
