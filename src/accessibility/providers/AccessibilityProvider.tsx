/**
 * Accessibility Context Provider
 * Provides accessibility preferences and actions via React context
 */

import React, { createContext, useContext } from 'react';
import { AccessibilityPreferences } from '../types';

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  updatePreferences: (prefs: Partial<AccessibilityPreferences>) => void;
}

const defaultPreferences: AccessibilityPreferences = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReader: false,
  keyboardNavigation: true,
};

const AccessibilityContext = createContext<AccessibilityContextValue>({
  preferences: defaultPreferences,
  updatePreferences: () => {},
});

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = React.useState<AccessibilityPreferences>(defaultPreferences);

  const updatePreferences = React.useCallback((newPrefs: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  }, []);

  return (
    <AccessibilityContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export function useAccessibilityContext(): AccessibilityContextValue {
  return useContext(AccessibilityContext);
}
