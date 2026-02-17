import React, { createContext, useContext } from 'react';
import { useFundCall, type FundCall, type UseFundCallReturn } from '../hooks/useFundCall';

interface FinanceContextType extends UseFundCallReturn {
  // Ajoutez d'autres propriétés financières ici si nécessaire
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const fundCallMethods = useFundCall();

  const contextValue: FinanceContextType = {
    ...fundCallMethods,
  };

  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinanceContext = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinanceContext must be used within a FinanceProvider');
  }
  return context;
};

// Export pour compatibilité avec le code existant
export const ContextFinance = FinanceContext;