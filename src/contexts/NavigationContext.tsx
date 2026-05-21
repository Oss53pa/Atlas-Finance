import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface NavigationContextType {
  isMobile: boolean;
  mainSidebarOpen: boolean;
  subSidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  setMainSidebarOpen: (open: boolean) => void;
  setSubSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mainSidebarOpen, setMainSidebarOpen] = useState(true);
  const [subSidebarOpen, setSubSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setMainSidebarOpen(false);
        setSubSidebarOpen(false);
        setMobileSidebarOpen(false);
      } else {
        setMainSidebarOpen(true);
        setSubSidebarOpen(true); // Réactiver la sidebar secondaire en mode desktop
        setMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => {
      if (!prev) setMainSidebarOpen(true);
      return !prev;
    });
  }, []);

  const value = useMemo<NavigationContextType>(() => ({
    isMobile,
    mainSidebarOpen,
    subSidebarOpen,
    mobileSidebarOpen,
    setMainSidebarOpen,
    setSubSidebarOpen,
    setMobileSidebarOpen,
    toggleMobileSidebar,
  }), [isMobile, mainSidebarOpen, subSidebarOpen, mobileSidebarOpen, toggleMobileSidebar]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};