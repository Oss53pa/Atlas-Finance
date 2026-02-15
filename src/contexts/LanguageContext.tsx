import React, { createContext, useContext, useState, useEffect } from 'react';
import frTranslations from '../locales/fr.json';

export type Language = 'fr' | 'en' | 'es';

interface Translation {
  [key: string]: string | Translation;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  translations: Translation;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Récupérer la langue sauvegardée ou utiliser le français par défaut
    const savedLanguage = localStorage.getItem('atlas-finance-language') as Language;
    return savedLanguage || 'fr';
  });

  const [translations, setTranslations] = useState<Translation>(frTranslations as Translation);

  // Charger les traductions
  useEffect(() => {
    loadTranslations(language);
  }, [language]);

  const loadTranslations = async (lang: Language) => {
    try {
      const module = await import(`../locales/${lang}.json`);
      setTranslations(module.default);
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to French if loading fails
      if (lang !== 'fr') {
        const module = await import('../locales/fr.json');
        setTranslations(module.default);
      }
    }
  };

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem('atlas-finance-language', newLanguage);
  };

  // Fonction de traduction
  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Remplacer les paramètres
    if (params) {
      let result = value;
      Object.entries(params).forEach(([param, val]) => {
        result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), val);
      });
      return result;
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};