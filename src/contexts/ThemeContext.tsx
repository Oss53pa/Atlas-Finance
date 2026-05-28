import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { themes, defaultTheme, getThemeCSSVariables, Theme, ThemeType, ThemeContextValue } from '../styles/theme';
import { safeStorage } from '../utils/safeStorage';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Récupérer le thème sauvegardé ou utiliser le thème par défaut
  const [themeType, setThemeType] = useState<ThemeType>(() => {
    // Migration unique vers la refonte "Petrol Cream" : on réinitialise toute
    // sélection de thème antérieure (ou valeur écrite par les systèmes de thème
    // dashboard/custom qui partagent la même clé) pour que chaque navigateur
    // bascule une fois sur le nouveau défaut. Le sélecteur de thème reste
    // fonctionnel ensuite.
    const REBRAND_FLAG = 'atlas-petrol-rebrand-v1';
    try {
      if (!safeStorage.get(REBRAND_FLAG)) {
        safeStorage.set('atlas-fna-theme', 'atlasStudio');
        safeStorage.set(REBRAND_FLAG, '1');
        return 'atlasStudio';
      }
    } catch { /* storage indisponible — on retombe sur le défaut */ }

    const saved = safeStorage.get('atlas-fna-theme') as ThemeType | null;
    return saved && saved in themes ? saved : 'atlasStudio';
  });

  const [theme, setThemeState] = useState<Theme>(themes[themeType] || defaultTheme);

  // Appliquer les variables CSS du thème
  useEffect(() => {
    const root = document.documentElement;
    const cssVars = getThemeCSSVariables(theme);

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Appliquer les styles globaux
    root.style.backgroundColor = theme.colors.background;
    root.style.color = theme.colors.text.primary;

    // Sauvegarder le choix
    safeStorage.set('atlas-fna-theme', themeType);
  }, [theme, themeType]);

  const setTheme = useCallback((type: ThemeType) => {
    if (type in themes) {
      setThemeType(type);
      setThemeState(themes[type]);
    }
  }, []);

  const value = useMemo(() => ({ theme, themeType, setTheme }), [theme, themeType, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
