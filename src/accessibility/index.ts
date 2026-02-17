/**
 * Atlas Finance Accessibility System
 * WCAG 2.1 AA Compliance Implementation
 */

export * from './hooks/useAccessibility';
export * from './hooks/useFocusManagement';
export * from './hooks/useKeyboardNavigation';
export * from './hooks/useAnnouncements';
export * from './components/ScreenReaderOnly';
export * from './components/SkipToContent';
export * from './components/FocusTrap';
export * from './utils/accessibilityHelpers';
export * from './utils/colorContrast';
export * from './providers/AccessibilityProvider';
export * from './types';

// Quick setup for global accessibility
export { setupGlobalAccessibility } from './setup';