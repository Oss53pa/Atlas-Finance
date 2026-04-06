// SECURITY: Tokens are now stored in-memory (via auth-backend.service.ts)
// instead of localStorage to mitigate XSS token-theft. User data is kept in
// React state only. Trade-off: sessions do not survive page refresh -- the
// user must re-authenticate. When the Django backend supports httpOnly
// cookie-based auth, migrate to that for persistence without XSS risk.
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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
    } catch (_err) {
      // Profile load failed -- clear auth state
      await authBackendService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      await authBackendService.login({ email, password });
      await loadUserProfile();
    } catch (_err) {
      setLoading(false);
      throw new Error('Identifiants incorrects. Veuillez réessayer.');
    }
  }, [loadUserProfile]);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authBackendService.logout();
    } catch (_err) {
      // Logout API call failed -- clear state regardless
    } finally {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  const value: AuthContextType = {
    user,
    isAdmin: user?.role === 'admin',
    login,
    logout,
    isAuthenticated: !!user && authBackendService.isAuthenticated(),
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
