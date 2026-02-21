import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured, getUserProfile, getUserPermissions } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'comptable' | 'accountant' | 'user' | 'viewer';
  first_name?: string;
  last_name?: string;
  company?: string;
  company_id?: string;
  permissions?: string[];
  photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapRoleCode(code: string): User['role'] {
  // DB enum uses 'accountant', frontend uses 'comptable'
  if (code === 'accountant') return 'comptable';
  return (code as User['role']) || 'user';
}

function mapProfileToUser(profile: Record<string, unknown>): User {
  const firstName = profile.first_name as string | undefined;
  const lastName = profile.last_name as string | undefined;
  return {
    id: String(profile.id),
    name: firstName && lastName
      ? `${firstName} ${lastName}`
      : String(profile.username || profile.email || 'Utilisateur'),
    email: String(profile.email ?? ''),
    role: mapRoleCode(String((profile.role as Record<string, unknown>)?.code ?? '')),
    first_name: firstName,
    last_name: lastName,
    company: (profile.company as Record<string, unknown>)?.nom as string | undefined,
    company_id: profile.company_id as string | undefined,
    photo_url: profile.photo_url as string | undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user profile from Supabase
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        const permissions = await getUserPermissions();
        const userData = mapProfileToUser(profile);
        userData.permissions = permissions;
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured) {
      console.warn('[AuthContext] Supabase not configured — authentication disabled');
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        loadUserProfile().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession) {
          await loadUserProfile();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase n\'est pas configuré. Vérifiez les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error(error.message === 'Invalid login credentials'
          ? 'Identifiants incorrects. Veuillez reessayer.'
          : error.message
        );
      }

      if (data.session) {
        setSession(data.session);
        await loadUserProfile();
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    if (!isSupabaseConfigured) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      if (error) throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (isSupabaseConfigured) {
      await loadUserProfile();
    }
  }, [loadUserProfile]);

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isAuthenticated = useMemo(() => {
    if (!isSupabaseConfigured) return !!user;
    return !!session && !!user;
  }, [session, user]);

  const contextValue = useMemo(() => ({
    user,
    session,
    isAdmin,
    login,
    logout,
    signUp,
    isAuthenticated,
    loading,
    refreshUserProfile
  }), [user, session, isAdmin, login, logout, signUp, isAuthenticated, loading, refreshUserProfile]);

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
