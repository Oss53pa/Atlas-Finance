/**
 * Accessibility Types and Interfaces
 */

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface AriaAttributes {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-hidden'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-atomic'?: boolean;
  'aria-relevant'?: string;
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  'aria-selected'?: boolean;
  'aria-checked'?: boolean | 'mixed';
  'aria-disabled'?: boolean;
  'aria-invalid'?: boolean | 'grammar' | 'spelling';
  'aria-required'?: boolean;
  'aria-readonly'?: boolean;
  'aria-multiline'?: boolean;
  'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuenow'?: number;
  'aria-valuetext'?: string;
  role?: string;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
  visible: boolean;
  disabled: boolean;
}

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  description: string;
  action: () => void;
  scope?: 'global' | 'local';
}

export interface AnnouncementOptions {
  priority: 'low' | 'medium' | 'high';
  politeness: 'polite' | 'assertive';
  atomic?: boolean;
  delay?: number;
}

export interface ColorContrastResult {
  ratio: number;
  isCompliant: boolean;
  level: 'AA' | 'AAA' | 'fail';
  suggestion?: string;
}

export interface AccessibilityAuditResult {
  element: HTMLElement;
  issues: AccessibilityIssue[];
  score: number;
  recommendations: string[];
}

export interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  rule: string;
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  fix: string;
  wcagReference?: string;
}

export interface MotionPreferences {
  reduceMotion: boolean;
  animationDuration: number;
  transitionDuration: number;
}

export interface TextPreferences {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
}

export interface ContrastPreferences {
  highContrast: boolean;
  colorScheme: 'light' | 'dark' | 'auto';
  customColors?: {
    background: string;
    text: string;
    link: string;
    border: string;
  };
}