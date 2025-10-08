import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('wisebook_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Mode développement : créer automatiquement un utilisateur admin
      const defaultUser: User = {
        id: '1',
        name: 'Admin User',
        email: 'admin@wisebook.com',
        role: 'admin'
      };
      setUser(defaultUser);
      localStorage.setItem('wisebook_user', JSON.stringify(defaultUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    // TODO: Remplacer par un vrai appel API
    const mockUser: User = {
      id: '1',
      name: 'Admin User',
      email: email,
      role: 'admin' // Par défaut admin pour le développement
    };

    setUser(mockUser);
    localStorage.setItem('wisebook_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('wisebook_user');
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout, isAuthenticated }}>
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