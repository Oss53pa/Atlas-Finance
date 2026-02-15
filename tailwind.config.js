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
        // Atlas Finance Design System - Grayscale Palette
        primary: {
          DEFAULT: '#171717',
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
          foreground: '#fafafa',
        },
        secondary: {
          DEFAULT: '#f5f5f5',
          50: '#fafafa',
          100: '#f5f5f5',
          500: '#737373',
          600: '#525252',
          foreground: '#171717',
        },
        accent: {
          DEFAULT: '#f5f5f5',
          foreground: '#171717',
        },
        muted: {
          DEFAULT: '#f5f5f5',
          foreground: '#737373',
        },
        background: '#fafafa',
        foreground: '#171717',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#171717',
        },
        border: '#e5e5e5',
        input: '#e5e5e5',
        ring: '#171717',

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
        info: {
          DEFAULT: '#3b82f6',
          foreground: '#FFFFFF',
        },
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
        focus: '0 0 0 3px rgba(23,23,23,0.1)',
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
