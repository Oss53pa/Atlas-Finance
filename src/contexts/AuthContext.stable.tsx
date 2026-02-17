import React, { createContext, useContext, useState, useCallback } from 'react';
import { authBackendService } from '@/services/auth-backend.service';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'comptable' | 'user' | 'viewer';
  first_name?: string;
  last_name?: string;
  company?: string;
  permissions?: string[];
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

// ✅ Charger l'utilisateur AVANT même que le composant existe
const getUserFromStorage = (): User | null => {
  try {
    const storedUser = localStorage.getItem('atlas_finance_user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

// ✅ VALEUR INITIALE pré-calculée
const INITIAL_USER = getUserFromStorage();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ Utiliser directement la valeur pré-calculée
  const [user, setUser] = useState<User | null>(INITIAL_USER);
  const [loading, setLoading] = useState<boolean>(false);

  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await authBackendService.getProfile();
      const userData: User = {
        id: profile.id?.toString() || '',
        name: profile.first_name && profile.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile.username || 'Utilisateur',
        email: profile.email || '',
        role: (profile.role as User['role']) || 'user',
        first_name: profile.first_name,
        last_name: profile.last_name,
        company: profile.company,
        permissions: profile.permissions
      };
      setUser(userData);
      localStorage.setItem('atlas_finance_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      localStorage.removeItem('atlas_finance_access_token');
      localStorage.removeItem('atlas_finance_refresh_token');
      localStorage.removeItem('atlas_finance_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authBackendService.login({ email, password });
      if (response.access) {
        localStorage.setItem('atlas_finance_access_token', response.access);
      }
      if (response.refresh) {
        localStorage.setItem('atlas_finance_refresh_token', response.refresh);
      }
      await loadUserProfile();
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      setLoading(false);
      throw new Error('Identifiants incorrects. Veuillez réessayer.');
    }
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authBackendService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      localStorage.removeItem('atlas_finance_access_token');
      localStorage.removeItem('atlas_finance_refresh_token');
      localStorage.removeItem('atlas_finance_user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  // ✅ Valeurs directes sans useMemo pour éviter tout overhead
  const value: AuthContextType = {
    user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    isAuthenticated: !!user && !!localStorage.getItem('atlas_finance_access_token'),
    loading,
    refreshUserProfile
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
