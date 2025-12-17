import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'comptable' | 'user' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ VERSION ULTRA-MINIMALISTE - PAS DE STATE, PAS D'EFFET, RIEN
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Valeurs par défaut statiques - AUCUN state
  const value: AuthContextType = {
    user: null,
    isAdmin: false,
    login: async () => { throw new Error('Not implemented'); },
    logout: async () => { throw new Error('Not implemented'); },
    isAuthenticated: false,
    loading: false,
    refreshUserProfile: async () => { throw new Error('Not implemented'); },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
