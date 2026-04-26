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
        // Atlas F&A Design System - Warm Gold Palette (synced with designTokens)
        primary: {
          DEFAULT: '#1F1F23',
          50: '#faf8f3',
          100: '#f0ece4',
          200: '#e5e0d5',
          300: '#D4B870',
          400: '#C4A65C',
          500: '#B8954A',
          600: '#9A7D3E',
          700: '#7A6332',
          800: '#1F1F23',
          900: '#16161A',
          950: '#0A0A0C',
          foreground: '#faf8f3',
        },
        secondary: {
          DEFAULT: '#f0ece4',
          50: '#faf8f3',
          100: '#f0ece4',
          200: '#e5e0d5',
          500: '#8C7A5A',
          600: '#6B6B73',
          foreground: '#1F1F23',
        },
        neutral: {
          50: '#faf8f3',
          100: '#f0ece4',
          200: '#e5e0d5',
          300: '#c8c0b0',
          400: '#A09880',
          500: '#8C7A5A',
          600: '#6B6B73',
          700: '#3A3A3F',
          800: '#1F1F23',
          900: '#16161A',
        },
        accent: {
          DEFAULT: '#f0ece4',
          foreground: '#1F1F23',
        },
        muted: {
          DEFAULT: '#f0ece4',
          foreground: '#6B6B73',
        },
        background: '#fafafa',
        foreground: '#1F1F23',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1F1F23',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1F1F23',
        },
        border: '#e5e5e5',
        input: '#e5e5e5',
        ring: '#1F1F23',

        // Status colors
        success: {
          DEFAULT: '#22c55e',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#f59e0b',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#FFFFFF',
        },
        error: {
          DEFAULT: '#ef4444',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#3b82f6',
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
        card: "16px",
        btn: "12px",
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        focus: '0 0 0 3px rgba(31,31,35,0.1)',
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
