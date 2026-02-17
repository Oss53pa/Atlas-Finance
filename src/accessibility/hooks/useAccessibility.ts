/**
 * Main Accessibility Hook
 * Provides comprehensive accessibility features and state management
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { AccessibilityPreferences, MotionPreferences, TextPreferences, ContrastPreferences } from '../types';

interface AccessibilityState {
  preferences: AccessibilityPreferences;
  motionPreferences: MotionPreferences;
  textPreferences: TextPreferences;
  contrastPreferences: ContrastPreferences;
  isScreenReaderActive: boolean;
  isKeyboardUser: boolean;
  announcements: string[];
}

interface AccessibilityActions {
  updatePreferences: (preferences: Partial<AccessibilityPreferences>) => void;
  updateMotionPreferences: (preferences: Partial<MotionPreferences>) => void;
  updateTextPreferences: (preferences: Partial<TextPreferences>) => void;
  updateContrastPreferences: (preferences: Partial<ContrastPreferences>) => void;
  announce: (message: string, priority?: 'low' | 'medium' | 'high') => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => void;
}

const defaultPreferences: AccessibilityPreferences = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReader: false,
  keyboardNavigation: true,
};

const defaultMotionPreferences: MotionPreferences = {
  reduceMotion: false,
  animationDuration: 300,
  transitionDuration: 200,
};

const defaultTextPreferences: TextPreferences = {
  fontSize: 16,
  lineHeight: 1.5,
  letterSpacing: 0,
  wordSpacing: 0,
};

const defaultContrastPreferences: ContrastPreferences = {
  highContrast: false,
  colorScheme: 'auto',
};

export function useAccessibility(): AccessibilityState & AccessibilityActions {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [motionPreferences, setMotionPreferences] = useState<MotionPreferences>(defaultMotionPreferences);
  const [textPreferences, setTextPreferences] = useState<TextPreferences>(defaultTextPreferences);
  const [contrastPreferences, setContrastPreferences] = useState<ContrastPreferences>(defaultContrastPreferences);
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Detect system preferences
  useEffect(() => {
    const detectSystemPreferences = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const contrastQuery = window.matchMedia('(prefers-contrast: high)');
      const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

      setMotionPreferences(prev => ({
        ...prev,
        reduceMotion: mediaQuery.matches,
        animationDuration: mediaQuery.matches ? 0 : 300,
        transitionDuration: mediaQuery.matches ? 0 : 200,
      }));

      setContrastPreferences(prev => ({
        ...prev,
        highContrast: contrastQuery.matches,
        colorScheme: colorSchemeQuery.matches ? 'dark' : 'light',
      }));

      // Listen for changes
      const onMotionChange = (e: MediaQueryListEvent) => {
        setMotionPreferences(prev => ({
          ...prev,
          reduceMotion: e.matches,
          animationDuration: e.matches ? 0 : 300,
          transitionDuration: e.matches ? 0 : 200,
        }));
      };

      const onContrastChange = (e: MediaQueryListEvent) => {
        setContrastPreferences(prev => ({
          ...prev,
          highContrast: e.matches,
        }));
      };

      const onColorSchemeChange = (e: MediaQueryListEvent) => {
        setContrastPreferences(prev => ({
          ...prev,
          colorScheme: e.matches ? 'dark' : 'light',
        }));
      };

      mediaQuery.addEventListener('change', onMotionChange);
      contrastQuery.addEventListener('change', onContrastChange);
      colorSchemeQuery.addEventListener('change', onColorSchemeChange);

      return () => {
        mediaQuery.removeEventListener('change', onMotionChange);
        contrastQuery.removeEventListener('change', onContrastChange);
        colorSchemeQuery.removeEventListener('change', onColorSchemeChange);
      };
    };

    const cleanup = detectSystemPreferences();
    return cleanup;
  }, []);

  // Detect screen reader usage
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasScreenReader = !!(
        window.navigator.userAgent.match(/NVDA|JAWS|VoiceOver|ORCA|TalkBack/i) ||
        window.speechSynthesis ||
        document.querySelector('[aria-live]')
      );

      setIsScreenReaderActive(hasScreenReader);
    };

    detectScreenReader();
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    let keyboardTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
        clearTimeout(keyboardTimer);
        keyboardTimer = setTimeout(() => setIsKeyboardUser(false), 3000);
      }
    };

    const handleMouseDown = () => {
      setIsKeyboardUser(false);
      clearTimeout(keyboardTimer);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      clearTimeout(keyboardTimer);
    };
  }, []);

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem('accessibility-preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...parsed.preferences }));
        setMotionPreferences(prev => ({ ...prev, ...parsed.motionPreferences }));
        setTextPreferences(prev => ({ ...prev, ...parsed.textPreferences }));
        setContrastPreferences(prev => ({ ...prev, ...parsed.contrastPreferences }));
      }
    } catch (error) {
      console.warn('Failed to load accessibility preferences:', error);
    }
  }, []);

  // Save preferences
  useEffect(() => {
    try {
      const data = {
        preferences,
        motionPreferences,
        textPreferences,
        contrastPreferences,
      };
      localStorage.setItem('accessibility-preferences', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save accessibility preferences:', error);
    }
  }, [preferences, motionPreferences, textPreferences, contrastPreferences]);

  // Apply CSS custom properties
  useEffect(() => {
    const root = document.documentElement;

    // Motion preferences
    root.style.setProperty('--animation-duration', `${motionPreferences.animationDuration}ms`);
    root.style.setProperty('--transition-duration', `${motionPreferences.transitionDuration}ms`);

    if (motionPreferences.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Text preferences
    root.style.setProperty('--base-font-size', `${textPreferences.fontSize}px`);
    root.style.setProperty('--base-line-height', textPreferences.lineHeight.toString());
    root.style.setProperty('--letter-spacing', `${textPreferences.letterSpacing}px`);
    root.style.setProperty('--word-spacing', `${textPreferences.wordSpacing}px`);

    // Contrast preferences
    if (contrastPreferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    root.setAttribute('data-color-scheme', contrastPreferences.colorScheme);

    // Custom colors
    if (contrastPreferences.customColors) {
      const colors = contrastPreferences.customColors;
      root.style.setProperty('--custom-background', colors.background);
      root.style.setProperty('--custom-text', colors.text);
      root.style.setProperty('--custom-link', colors.link);
      root.style.setProperty('--custom-border', colors.border);
    }
  }, [motionPreferences, textPreferences, contrastPreferences]);

  const updatePreferences = useCallback((newPreferences: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const updateMotionPreferences = useCallback((newPreferences: Partial<MotionPreferences>) => {
    setMotionPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const updateTextPreferences = useCallback((newPreferences: Partial<TextPreferences>) => {
    setTextPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const updateContrastPreferences = useCallback((newPreferences: Partial<ContrastPreferences>) => {
    setContrastPreferences(prev => ({ ...prev, ...newPreferences }));
  }, []);

  const announce = useCallback((message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    setAnnouncements(prev => [...prev, message]);

    // Create live region for announcement
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority === 'high' ? 'assertive' : 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
      setAnnouncements(prev => prev.filter(a => a !== message));
    }, 1000);
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    setMotionPreferences(defaultMotionPreferences);
    setTextPreferences(defaultTextPreferences);
    setContrastPreferences(defaultContrastPreferences);
    localStorage.removeItem('accessibility-preferences');
  }, []);

  const exportPreferences = useCallback(() => {
    const data = {
      preferences,
      motionPreferences,
      textPreferences,
      contrastPreferences,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }, [preferences, motionPreferences, textPreferences, contrastPreferences]);

  const importPreferences = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.preferences) setPreferences(prev => ({ ...prev, ...parsed.preferences }));
      if (parsed.motionPreferences) setMotionPreferences(prev => ({ ...prev, ...parsed.motionPreferences }));
      if (parsed.textPreferences) setTextPreferences(prev => ({ ...prev, ...parsed.textPreferences }));
      if (parsed.contrastPreferences) setContrastPreferences(prev => ({ ...prev, ...parsed.contrastPreferences }));
    } catch (error) {
      console.error('Failed to import accessibility preferences:', error);
    }
  }, []);

  return {
    // State
    preferences,
    motionPreferences,
    textPreferences,
    contrastPreferences,
    isScreenReaderActive,
    isKeyboardUser,
    announcements,

    // Actions
    updatePreferences,
    updateMotionPreferences,
    updateTextPreferences,
    updateContrastPreferences,
    announce,
    resetPreferences,
    exportPreferences,
    importPreferences,
  };
}