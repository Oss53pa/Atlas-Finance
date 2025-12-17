import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
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

// ✅ Fonction pour charger l'utilisateur depuis localStorage de manière SYNCHRONE
const getUserFromStorage = (): User | null => {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ INITIALISATION SYNCHRONE : user chargé IMMÉDIATEMENT depuis localStorage
  const [user, setUser] = useState<User | null>(getUserFromStorage());
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(true);

  /**
   * Charger le profil utilisateur depuis le backend
   */
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
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      // Si erreur, supprimer le token et déconnecter
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, []);

  useEffect(() => {
    // ✅ VÉRIFICATION INITIALE : Toujours vérifier localStorage au démarrage
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');

    console.log('🔄 [AuthContext] Vérification initiale:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      currentUser: !!user
    });

    // Si on a un token mais pas de user dans le state, le charger depuis localStorage
    if (token && storedUser && !user) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        console.log('✅ [AuthContext] User rechargé depuis localStorage:', userData.email);
      } catch (error) {
        console.error('❌ [AuthContext] Erreur parsing user:', error);
        localStorage.removeItem('user');
      }
    }
    // Si on a un token mais pas de user stocké, recharger le profil
    else if (token && !storedUser) {
      loadUserProfile();
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 [AuthContext] Tentative de connexion au backend pour:', email);

      // ✅ TOUJOURS essayer le backend en premier
      const response = await authBackendService.login({ email, password });

      console.log('✅ [AuthContext] Réponse backend:', response);

      // Stocker les tokens
      if (response.access) {
        localStorage.setItem('authToken', response.access);
        console.log('✅ [AuthContext] Token JWT stocké');
      }
      if (response.refresh) {
        localStorage.setItem('refreshToken', response.refresh);
      }

      // Créer l'objet user depuis la réponse
      if (response.user) {
        const userData: User = {
          id: response.user.id,
          name: response.user.first_name && response.user.last_name
            ? `${response.user.first_name} ${response.user.last_name}`
            : response.user.username || 'Utilisateur',
          email: response.user.email,
          role: (response.user.role as User['role']) || 'user',
          first_name: response.user.first_name,
          last_name: response.user.last_name,
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('✅ [AuthContext] Utilisateur connecté:', userData.email);
      } else {
        // Si pas de user dans la réponse, charger le profil
        await loadUserProfile();
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ [AuthContext] Erreur lors de la connexion:', error);
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
      // Supprimer les données locales
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    await loadUserProfile();
  }, [loadUserProfile]);

  // ✅ Mémoriser les valeurs calculées pour éviter les recalculs
  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isAuthenticated = useMemo(() => {
    const hasUser = !!user;
    const hasToken = !!localStorage.getItem('authToken');
    const authenticated = hasUser && hasToken;

    console.log('🔍 [AuthContext] isAuthenticated check:', {
      hasUser,
      hasToken,
      authenticated,
      user: user?.email
    });

    return authenticated;
  }, [user]);

  // ✅ Mémoriser la valeur du context pour éviter les re-renders inutiles
  const contextValue = useMemo(() => ({
    user,
    isAdmin,
    login,
    logout,
    isAuthenticated,
    loading,
    refreshUserProfile
  }), [user, isAdmin, login, logout, isAuthenticated, loading, refreshUserProfile]);

  return (
    <AuthContext.Provider value={contextValue}>
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
