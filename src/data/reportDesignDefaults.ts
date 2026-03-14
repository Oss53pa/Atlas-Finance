/**
 * Report Design Defaults - Default templates and recipient profiles
 */

import type {
  CoverTemplate,
  RecipientProfile,
  ReportDesignSettings,
  DEFAULT_DESIGN_SETTINGS,
} from '@/types/reportDesign';

// ============================================================
// Cover Templates
// ============================================================

export const coverTemplates: CoverTemplate[] = [
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Design professionnel avec accent bleu corporate',
    thumbnail: '/templates/corporate-blue.svg',
    category: 'corporate',
    isPremium: false,
    config: {
      layout: 'centered',
      backgroundOverlay: 'rgba(30, 64, 175, 0.9)',
    },
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#60a5fa',
    },
  },
  {
    id: 'minimal-white',
    name: 'Minimal White',
    description: 'Design epure et minimaliste',
    thumbnail: '/templates/minimal-white.svg',
    category: 'minimal',
    isPremium: false,
    config: {
      layout: 'minimal',
      backgroundOverlay: 'rgba(255, 255, 255, 0.95)',
    },
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#111827',
    },
  },
  {
    id: 'modern-gradient',
    name: 'Modern Gradient',
    description: 'Design moderne avec degrade violet',
    thumbnail: '/templates/modern-gradient.svg',
    category: 'creative',
    isPremium: false,
    config: {
      layout: 'centered',
      backgroundOverlay: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
    },
    colors: {
      primary: '#6366f1',
      secondary: '#8b5cf6',
      accent: '#a855f7',
    },
  },
  {
    id: 'executive-dark',
    name: 'Executive Dark',
    description: 'Design sombre et elegant pour direction',
    thumbnail: '/templates/executive-dark.svg',
    category: 'professional',
    isPremium: false,
    config: {
      layout: 'corporate',
      backgroundOverlay: 'rgba(17, 24, 39, 0.95)',
    },
    colors: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      accent: '#fbbf24',
    },
  },
  {
    id: 'nature-green',
    name: 'Nature Green',
    description: 'Design frais avec tons verts',
    thumbnail: '/templates/nature-green.svg',
    category: 'creative',
    isPremium: false,
    config: {
      layout: 'left',
      backgroundOverlay: 'linear-gradient(180deg, #059669 0%, #10b981 100%)',
    },
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      accent: '#34d399',
    },
  },
  {
    id: 'finance-gold',
    name: 'Finance Gold',
    description: 'Design premium avec accents dores',
    thumbnail: '/templates/finance-gold.svg',
    category: 'professional',
    isPremium: true,
    config: {
      layout: 'right',
      backgroundOverlay: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)',
    },
    colors: {
      primary: '#fbbf24',
      secondary: '#f59e0b',
      accent: '#d97706',
    },
  },
  {
    id: 'tech-cyan',
    name: 'Tech Cyan',
    description: 'Design technologique moderne',
    thumbnail: '/templates/tech-cyan.svg',
    category: 'creative',
    isPremium: false,
    config: {
      layout: 'centered',
      backgroundOverlay: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0ea5e9 100%)',
    },
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      accent: '#22d3ee',
    },
  },
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    description: 'Design classique bleu marine',
    thumbnail: '/templates/classic-navy.svg',
    category: 'corporate',
    isPremium: false,
    config: {
      layout: 'corporate',
      backgroundOverlay: 'rgba(30, 58, 138, 0.95)',
    },
    colors: {
      primary: '#1e3a8a',
      secondary: '#3b82f6',
      accent: '#dc2626',
    },
  },
  {
    id: 'startup-vibrant',
    name: 'Startup Vibrant',
    description: 'Design colore et dynamique',
    thumbnail: '/templates/startup-vibrant.svg',
    category: 'creative',
    isPremium: true,
    config: {
      layout: 'left',
      backgroundOverlay: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)',
    },
    colors: {
      primary: '#ec4899',
      secondary: '#8b5cf6',
      accent: '#06b6d4',
    },
  },
  {
    id: 'elegant-burgundy',
    name: 'Elegant Burgundy',
    description: 'Design raffine bordeaux',
    thumbnail: '/templates/elegant-burgundy.svg',
    category: 'professional',
    isPremium: true,
    config: {
      layout: 'right',
      backgroundOverlay: 'linear-gradient(180deg, #7f1d1d 0%, #991b1b 100%)',
    },
    colors: {
      primary: '#fef2f2',
      secondary: '#fecaca',
      accent: '#fbbf24',
    },
  },
];

// ============================================================
// Recipient Profiles
// ============================================================

export const recipientProfiles: RecipientProfile[] = [
  {
    id: 'executive',
    type: 'executive',
    name: 'Direction',
    description: 'Format synthetique avec KPIs cles et resume executif',
    icon: 'Briefcase',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: true,
        title: '',
        layout: 'corporate',
      },
      tableOfContents: {
        enabled: true,
        title: 'Sommaire',
        depth: 1,
        showPageNumbers: true,
        style: 'modern',
      },
      backCover: {
        enabled: true,
        content: 'contact',
        showLogo: true,
        showContact: true,
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSize: 'large',
        lineHeight: 'relaxed',
      },
      colors: {
        primary: '#1e40af',
        secondary: '#3b82f6',
        accent: '#0ea5e9',
        background: '#ffffff',
        text: '#1e293b',
        preset: 'corporate',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-right',
      },
    },
  },
  {
    id: 'team',
    type: 'team',
    name: 'Equipe',
    description: 'Format detaille avec donnees completes et annexes',
    icon: 'Users',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: false,
        title: '',
        layout: 'minimal',
      },
      tableOfContents: {
        enabled: true,
        title: 'Table des matieres',
        depth: 3,
        showPageNumbers: true,
        style: 'classic',
      },
      backCover: {
        enabled: false,
        content: 'notes',
        showLogo: false,
        showContact: false,
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSize: 'medium',
        lineHeight: 'normal',
      },
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#ffffff',
        text: '#1f2937',
        preset: 'modern',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-center',
      },
    },
  },
  {
    id: 'client',
    type: 'client',
    name: 'Client',
    description: 'Format professionnel avec branding entreprise',
    icon: 'Building2',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: true,
        title: '',
        layout: 'centered',
      },
      tableOfContents: {
        enabled: true,
        title: 'Sommaire',
        depth: 2,
        showPageNumbers: true,
        style: 'modern',
      },
      backCover: {
        enabled: true,
        content: 'contact',
        showLogo: true,
        showContact: true,
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSize: 'medium',
        lineHeight: 'normal',
      },
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#ffffff',
        text: '#1f2937',
        preset: 'modern',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-center',
      },
    },
  },
  {
    id: 'investor',
    type: 'investor',
    name: 'Investisseur',
    description: 'Format premium avec metriques financieres',
    icon: 'TrendingUp',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: true,
        title: '',
        layout: 'corporate',
      },
      tableOfContents: {
        enabled: true,
        title: 'Table of Contents',
        depth: 2,
        showPageNumbers: true,
        style: 'minimal',
      },
      backCover: {
        enabled: true,
        content: 'legal',
        showLogo: true,
        showContact: true,
      },
      typography: {
        headingFont: 'Playfair Display',
        bodyFont: 'Inter',
        fontSize: 'medium',
        lineHeight: 'relaxed',
      },
      colors: {
        primary: '#1e3a8a',
        secondary: '#1e40af',
        accent: '#fbbf24',
        background: '#ffffff',
        text: '#111827',
        preset: 'corporate',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-right',
      },
    },
  },
  {
    id: 'public',
    type: 'public',
    name: 'Public',
    description: 'Format accessible pour diffusion large',
    icon: 'Globe',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: true,
        title: '',
        layout: 'centered',
      },
      tableOfContents: {
        enabled: true,
        title: 'Sommaire',
        depth: 2,
        showPageNumbers: true,
        style: 'modern',
      },
      backCover: {
        enabled: false,
        content: 'custom',
        showLogo: true,
        showContact: false,
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Open Sans',
        fontSize: 'large',
        lineHeight: 'relaxed',
      },
      colors: {
        primary: '#059669',
        secondary: '#10b981',
        accent: '#0ea5e9',
        background: '#ffffff',
        text: '#1f2937',
        preset: 'modern',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-center',
      },
    },
  },
  {
    id: 'custom',
    type: 'custom',
    name: 'Personnalise',
    description: 'Configuration entierement personnalisable',
    icon: 'Settings',
    defaultSettings: {
      pageFormat: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      },
      coverPage: {
        enabled: false,
        title: '',
        layout: 'centered',
      },
      tableOfContents: {
        enabled: false,
        title: 'Sommaire',
        depth: 2,
        showPageNumbers: true,
        style: 'modern',
      },
      backCover: {
        enabled: false,
        content: 'custom',
        showLogo: false,
        showContact: false,
      },
      typography: {
        headingFont: 'Inter',
        bodyFont: 'Inter',
        fontSize: 'medium',
        lineHeight: 'normal',
      },
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#06b6d4',
        background: '#ffffff',
        text: '#1f2937',
        preset: 'custom',
      },
      branding: {
        showPageNumbers: true,
        pageNumberPosition: 'bottom-center',
      },
    },
  },
];

// ============================================================
// Helper Functions
// ============================================================

export const getTemplateById = (id: string): CoverTemplate | undefined => {
  return coverTemplates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: CoverTemplate['category']): CoverTemplate[] => {
  return coverTemplates.filter((t) => t.category === category);
};

export const getRecipientProfile = (type: RecipientProfile['type']): RecipientProfile | undefined => {
  return recipientProfiles.find((p) => p.type === type);
};

export const getFreeTemplates = (): CoverTemplate[] => {
  return coverTemplates.filter((t) => !t.isPremium);
};

export const getPremiumTemplates = (): CoverTemplate[] => {
  return coverTemplates.filter((t) => t.isPremium);
};
