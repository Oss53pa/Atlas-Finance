/**
 * Report Design Store - Zustand store for report design state management
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  RecipientType,
  ReportDesignSettings,
  PageFormatConfig,
  CoverPageConfig,
  TableOfContentsConfig,
  BackCoverConfig,
  TypographyConfig,
  ColorSchemeConfig,
  BrandingConfig,
  CoverTemplate,
  DEFAULT_DESIGN_SETTINGS,
} from '@/types/reportDesign';
import { coverTemplates, recipientProfiles, getTemplateById, getRecipientProfile } from '@/data/reportDesignDefaults';

interface ReportDesignState {
  // Current design settings
  settings: ReportDesignSettings;
  // Selected recipient type
  recipientType: RecipientType;
  // Available templates
  coverTemplates: CoverTemplate[];
  // UI state
  isLoading: boolean;
  previewMode: boolean;
  activeSection: 'cover' | 'toc' | 'back' | 'typography' | 'colors' | 'branding';
  hasUnsavedChanges: boolean;

  // Actions
  setRecipientType: (type: RecipientType) => void;
  updatePageFormat: (config: Partial<PageFormatConfig>) => void;
  updateCoverPage: (config: Partial<CoverPageConfig>) => void;
  updateTableOfContents: (config: Partial<TableOfContentsConfig>) => void;
  updateBackCover: (config: Partial<BackCoverConfig>) => void;
  updateTypography: (config: Partial<TypographyConfig>) => void;
  updateColors: (config: Partial<ColorSchemeConfig>) => void;
  updateBranding: (config: Partial<BrandingConfig>) => void;
  applyTemplate: (templateId: string) => void;
  applyRecipientDefaults: (type: RecipientType) => void;
  setActiveSection: (section: ReportDesignState['activeSection']) => void;
  setPreviewMode: (enabled: boolean) => void;
  resetToDefaults: () => void;
  loadSettings: (settings: ReportDesignSettings) => void;
  markAsSaved: () => void;
}

const defaultSettings: ReportDesignSettings = {
  pageFormat: {
    size: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
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
};

export const useReportDesignStore = create<ReportDesignState>()(
  immer((set, get) => ({
    settings: defaultSettings,
    recipientType: 'custom',
    coverTemplates: coverTemplates,
    isLoading: false,
    previewMode: false,
    activeSection: 'cover',
    hasUnsavedChanges: false,

    setRecipientType: (type) => {
      set((state) => {
        state.recipientType = type;
        state.hasUnsavedChanges = true;
      });
    },

    updatePageFormat: (config) => {
      set((state) => {
        state.settings.pageFormat = { ...state.settings.pageFormat, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateCoverPage: (config) => {
      set((state) => {
        state.settings.coverPage = { ...state.settings.coverPage, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateTableOfContents: (config) => {
      set((state) => {
        state.settings.tableOfContents = { ...state.settings.tableOfContents, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateBackCover: (config) => {
      set((state) => {
        state.settings.backCover = { ...state.settings.backCover, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateTypography: (config) => {
      set((state) => {
        state.settings.typography = { ...state.settings.typography, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateColors: (config) => {
      set((state) => {
        state.settings.colors = { ...state.settings.colors, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    updateBranding: (config) => {
      set((state) => {
        state.settings.branding = { ...state.settings.branding, ...config };
        state.hasUnsavedChanges = true;
      });
    },

    applyTemplate: (templateId) => {
      const template = getTemplateById(templateId);
      if (!template) return;

      set((state) => {
        // Apply template config to cover page
        if (template.config) {
          state.settings.coverPage = {
            ...state.settings.coverPage,
            ...template.config,
            templateId,
            enabled: true,
          };
        }
        // Apply template colors if available
        if (template.colors) {
          state.settings.colors = {
            ...state.settings.colors,
            ...template.colors,
            preset: 'custom',
          };
        }
        state.hasUnsavedChanges = true;
      });
    },

    applyRecipientDefaults: (type) => {
      const profile = getRecipientProfile(type);
      if (!profile) return;

      set((state) => {
        state.recipientType = type;
        state.settings = { ...profile.defaultSettings };
        state.hasUnsavedChanges = true;
      });
    },

    setActiveSection: (section) => {
      set({ activeSection: section });
    },

    setPreviewMode: (enabled) => {
      set({ previewMode: enabled });
    },

    resetToDefaults: () => {
      set((state) => {
        state.settings = defaultSettings;
        state.recipientType = 'custom';
        state.hasUnsavedChanges = true;
      });
    },

    loadSettings: (settings) => {
      set((state) => {
        state.settings = settings;
        state.hasUnsavedChanges = false;
      });
    },

    markAsSaved: () => {
      set({ hasUnsavedChanges: false });
    },
  }))
);

export default useReportDesignStore;
