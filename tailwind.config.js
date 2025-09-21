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
      'sans': ['Sometype Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      'heading': ['Sometype Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
      'mono': ['Sometype Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', 'monospace'],
    },
    extend: {
      colors: {
        // WiseBook Clarity Design System Colors
        // La Trinité Chromatique
        'swirl': {
          DEFAULT: '#D5D0CD',
          50: '#F5F4F3',
          100: '#EBEAE8',
          200: '#D5D0CD',
          300: '#C4BDB9',
          400: '#B3AAA4',
          500: '#A2978F',
          600: '#91847A',
          700: '#807165',
          800: '#6F5E50',
          900: '#5E4B3B',
        },
        'rolling-stone': {
          DEFAULT: '#7A8B8E',
          50: '#F1F3F4',
          100: '#E3E7E8',
          200: '#C7CFD1',
          300: '#ABB7BA',
          400: '#8F9FA3',
          500: '#7A8B8E',
          600: '#647577',
          700: '#4E5F60',
          800: '#384949',
          900: '#223332',
        },
        'tuatara': {
          DEFAULT: '#353A3B',
          50: '#F7F8F8',
          100: '#EFF1F1',
          200: '#DFE3E3',
          300: '#CFD5D5',
          400: '#BFC7C7',
          500: '#AFB9B9',
          600: '#9FABAB',
          700: '#8F9D9D',
          800: '#7F8F8F',
          900: '#353A3B',
        },
        
        // Semantic colors with WiseBook palette
        primary: {
          DEFAULT: '#7A8B8E', // Rolling Stone
          50: '#F1F3F4',
          100: '#E3E7E8',
          500: '#7A8B8E',
          600: '#647577',
          700: '#4E5F60',
          900: '#223332',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#D5D0CD', // Swirl
          50: '#F5F4F3',
          100: '#EBEAE8',
          500: '#D5D0CD',
          600: '#C4BDB9',
          foreground: '#353A3B',
        },
        accent: {
          DEFAULT: '#7A8B8E',
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#F5F4F3',
          foreground: '#6F5E50',
        },
        background: '#FFFFFF',
        foreground: '#353A3B', // Tuatara
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#353A3B',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#353A3B',
        },
        border: '#EBEAE8',
        input: '#F5F4F3',
        ring: '#7A8B8E',
        
        // Status colors
        success: {
          DEFAULT: '#059669',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#D97706',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        info: {
          DEFAULT: '#2563EB',
          foreground: '#FFFFFF',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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