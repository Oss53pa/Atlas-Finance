/**
 * Report Design Types - Types for report customization and sharing
 */

// ============================================================
// Recipient Types
// ============================================================

export type RecipientType = 'executive' | 'team' | 'client' | 'investor' | 'public' | 'custom';

export interface RecipientProfile {
  id: string;
  type: RecipientType;
  name: string;
  description: string;
  icon: string;
  defaultSettings: ReportDesignSettings;
}

// ============================================================
// Design Settings
// ============================================================

export interface ReportDesignSettings {
  pageFormat: PageFormatConfig;
  coverPage: CoverPageConfig;
  tableOfContents: TableOfContentsConfig;
  backCover: BackCoverConfig;
  typography: TypographyConfig;
  colors: ColorSchemeConfig;
  branding: BrandingConfig;
}

// ============================================================
// Page Format Configuration
// ============================================================

export type PageSize = 'A4' | 'A3' | 'Letter' | 'Legal';
export type PageOrientation = 'portrait' | 'landscape';

export interface PageFormatConfig {
  size: PageSize;
  orientation: PageOrientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
};

// ============================================================
// Cover Page Configuration
// ============================================================

export type CoverPageLayout = 'centered' | 'left' | 'right' | 'minimal' | 'corporate';

export interface LogoPosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  scale: number; // scale factor (0.3 - 2)
  rotation: number; // degrees (0-360)
}

export interface ImageCropPosition {
  x: number; // percentage offset from center (-50 to 50)
  y: number; // percentage offset from center (-50 to 50)
  scale: number; // zoom level (1 = fit, higher = zoomed in)
}

export interface CoverPageConfig {
  enabled: boolean;
  templateId?: string;
  title: string;
  subtitle?: string;
  date?: string;
  version?: string;
  author?: string;
  organization?: string;
  logo?: string;
  logoPosition?: LogoPosition;
  backgroundImage?: string;
  backgroundPosition?: ImageCropPosition;
  backgroundOverlay?: string;
  layout: CoverPageLayout;
}

export const DEFAULT_LOGO_POSITION: LogoPosition = {
  x: 50,
  y: 10,
  scale: 1,
  rotation: 0,
};

export const DEFAULT_IMAGE_CROP_POSITION: ImageCropPosition = {
  x: 0,
  y: 0,
  scale: 1,
};

// ============================================================
// Table of Contents Configuration
// ============================================================

export type TableOfContentsStyle = 'classic' | 'modern' | 'minimal' | 'dotted';

export interface TableOfContentsConfig {
  enabled: boolean;
  title: string;
  depth: 1 | 2 | 3;
  showPageNumbers: boolean;
  style: TableOfContentsStyle;
}

// ============================================================
// Back Cover Configuration
// ============================================================

export type BackCoverContent = 'contact' | 'legal' | 'notes' | 'custom';

export interface BackCoverConfig {
  enabled: boolean;
  templateId?: string;
  content: BackCoverContent;
  customContent?: string;
  showLogo: boolean;
  showContact: boolean;
  contactInfo?: ContactInfo;
}

export interface ContactInfo {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
}

// ============================================================
// Typography Configuration
// ============================================================

export type FontSize = 'small' | 'medium' | 'large';
export type LineHeight = 'compact' | 'normal' | 'relaxed';

export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  fontSize: FontSize;
  lineHeight: LineHeight;
}

// ============================================================
// Color Scheme Configuration
// ============================================================

export type ColorPreset = 'corporate' | 'modern' | 'classic' | 'vibrant' | 'custom';

export interface ColorSchemeConfig {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  preset?: ColorPreset;
}

// ============================================================
// Branding Configuration
// ============================================================

export type PageNumberPosition = 'bottom-center' | 'bottom-right' | 'top-right';

export interface BrandingConfig {
  logo?: string;
  companyName?: string;
  tagline?: string;
  watermark?: string;
  headerTemplate?: string;
  footerTemplate?: string;
  showPageNumbers: boolean;
  pageNumberPosition: PageNumberPosition;
}

// ============================================================
// Cover Templates
// ============================================================

export type TemplateCategory = 'corporate' | 'creative' | 'minimal' | 'professional';

export interface CoverTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: TemplateCategory;
  isPremium: boolean;
  config: Partial<CoverPageConfig>;
  colors?: Partial<ColorSchemeConfig>;
}

// ============================================================
// Report Sharing
// ============================================================

export type ShareFormat = 'html' | 'pdf' | 'both';

export interface ReportShareLink {
  id: string;
  reportId: string;
  token: string;
  url: string;
  format: ShareFormat;
  expiresAt?: string;
  maxViews?: number;
  viewCount: number;
  password?: string;
  recipientType?: RecipientType;
  designSettings?: ReportDesignSettings;
  canDownload: boolean;
  canComment: boolean;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CreateShareLinkData {
  reportId: string;
  format: ShareFormat;
  expiresAt?: string;
  maxViews?: number;
  password?: string;
  recipientType?: RecipientType;
  designSettings?: ReportDesignSettings;
  canDownload?: boolean;
  canComment?: boolean;
}

export interface UpdateShareLinkData {
  expiresAt?: string;
  maxViews?: number;
  password?: string;
  isActive?: boolean;
  canDownload?: boolean;
  canComment?: boolean;
}

export interface ShareLinkValidation {
  isValid: boolean;
  isExpired: boolean;
  requiresPassword: boolean;
  format: ShareFormat;
  reportTitle?: string;
}

export interface SharedReportData {
  report: {
    id: string;
    title: string;
    content: string;
    designSettings?: ReportDesignSettings;
  };
  canDownload: boolean;
  canComment: boolean;
  format: ShareFormat;
}

// ============================================================
// Email Sharing
// ============================================================

export interface EmailShareData {
  reportId: string;
  recipients: string[];
  subject: string;
  message: string;
  format: ShareFormat;
  includeLink: boolean;
  attachPdf: boolean;
  designSettings?: ReportDesignSettings;
}

// ============================================================
// Default Values
// ============================================================

export const DEFAULT_TYPOGRAPHY: TypographyConfig = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  fontSize: 'medium',
  lineHeight: 'normal',
};

export const DEFAULT_COLORS: ColorSchemeConfig = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#06b6d4',
  background: '#ffffff',
  text: '#1f2937',
  preset: 'modern',
};

export const DEFAULT_BRANDING: BrandingConfig = {
  showPageNumbers: true,
  pageNumberPosition: 'bottom-center',
};

export const DEFAULT_PAGE_FORMAT: PageFormatConfig = {
  size: 'A4',
  orientation: 'portrait',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

export const DEFAULT_COVER_PAGE: CoverPageConfig = {
  enabled: false,
  title: '',
  layout: 'centered',
};

export const DEFAULT_TABLE_OF_CONTENTS: TableOfContentsConfig = {
  enabled: false,
  title: 'Sommaire',
  depth: 2,
  showPageNumbers: true,
  style: 'modern',
};

export const DEFAULT_BACK_COVER: BackCoverConfig = {
  enabled: false,
  content: 'contact',
  showLogo: true,
  showContact: true,
};

export const DEFAULT_DESIGN_SETTINGS: ReportDesignSettings = {
  pageFormat: DEFAULT_PAGE_FORMAT,
  coverPage: DEFAULT_COVER_PAGE,
  tableOfContents: DEFAULT_TABLE_OF_CONTENTS,
  backCover: DEFAULT_BACK_COVER,
  typography: DEFAULT_TYPOGRAPHY,
  colors: DEFAULT_COLORS,
  branding: DEFAULT_BRANDING,
};

// ============================================================
// Available Fonts
// ============================================================

export const AVAILABLE_FONTS = [
  { id: 'inter', name: 'Inter', value: 'Inter' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto' },
  { id: 'open-sans', name: 'Open Sans', value: 'Open Sans' },
  { id: 'lato', name: 'Lato', value: 'Lato' },
  { id: 'montserrat', name: 'Montserrat', value: 'Montserrat' },
  { id: 'poppins', name: 'Poppins', value: 'Poppins' },
  { id: 'source-sans', name: 'Source Sans Pro', value: 'Source Sans Pro' },
  { id: 'nunito', name: 'Nunito', value: 'Nunito' },
  { id: 'playfair', name: 'Playfair Display', value: 'Playfair Display' },
  { id: 'merriweather', name: 'Merriweather', value: 'Merriweather' },
] as const;

// ============================================================
// Color Presets
// ============================================================

export const COLOR_PRESETS: Record<ColorPreset, ColorSchemeConfig> = {
  corporate: {
    primary: '#1e40af',
    secondary: '#3b82f6',
    accent: '#0ea5e9',
    background: '#ffffff',
    text: '#1e293b',
    preset: 'corporate',
  },
  modern: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    background: '#ffffff',
    text: '#1f2937',
    preset: 'modern',
  },
  classic: {
    primary: '#1f2937',
    secondary: '#4b5563',
    accent: '#dc2626',
    background: '#fafafa',
    text: '#111827',
    preset: 'classic',
  },
  vibrant: {
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#f59e0b',
    background: '#ffffff',
    text: '#18181b',
    preset: 'vibrant',
  },
  custom: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    accent: '#06b6d4',
    background: '#ffffff',
    text: '#1f2937',
    preset: 'custom',
  },
};
