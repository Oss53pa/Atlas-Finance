import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const setTheme = (type: ThemeType) => {
    if (type in themes) {
      setThemeType(type);
      setThemeState(themes[type]);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeType, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
