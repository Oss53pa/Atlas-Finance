import React, { useContext, createContext } from 'react';

// Center Context for financial year and center management
interface CenterData {
  id: number;
  name?: string;
}

interface CenterContextType {
  center: CenterData | null;
  financialYear: number;
}

const CenterContext = createContext<CenterContextType>({
  center: { id: 1 },
  financialYear: 2025
});

export const useCenter = () => {
  const context = useContext(CenterContext);
  if (!context) {
    // Return default values if context is not available
    return {
      center: { id: 1 },
      financialYear: 2025
    };
  }
  return context;
};

export const CenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const contextValue: CenterContextType = {
    center: { id: 1, name: "Centre Principal" },
    financialYear: 2025
  };

  return (
    <CenterContext.Provider value={contextValue}>
      {children}
    </CenterContext.Provider>
  );
};

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-white p-3 mt-auto">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-6">
            <p className="mb-0">&copy; 2025 WiseBook ERP - Praedium Tech</p>
          </div>
          <div className="col-md-6 text-md-end">
            <p className="mb-0">Version 3.0.0</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;