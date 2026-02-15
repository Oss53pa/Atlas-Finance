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
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development when Supabase is not configured
const DEV_MOCK_USER: User = {
  id: 'dev-admin-001',
  name: 'Admin Dev',
  email: 'admin@atlasfinance.cm',
  role: 'admin',
  first_name: 'Admin',
  last_name: 'Dev',
  company: 'Atlas Finance',
  company_id: 'a0000000-0000-0000-0000-000000000001',
  permissions: [
    'accounting.view', 'accounting.create', 'accounting.edit', 'accounting.delete', 'accounting.validate',
    'treasury.view', 'treasury.create', 'treasury.edit',
    'customers.view', 'customers.create', 'customers.edit',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'dashboard.view', 'reports.view', 'reports.export',
    'admin.users', 'admin.settings', 'admin.roles',
  ],
};

function mapRoleCode(code: string): User['role'] {
  // DB enum uses 'accountant', frontend uses 'comptable'
  if (code === 'accountant') return 'comptable';
  return (code as User['role']) || 'user';
}

function mapProfileToUser(profile: any): User {
  return {
    id: profile.id,
    name: profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.username || profile.email || 'Utilisateur',
    email: profile.email,
    role: mapRoleCode(profile.role?.code),
    first_name: profile.first_name,
    last_name: profile.last_name,
    company: profile.company?.nom,
    company_id: profile.company_id,
    photo_url: profile.photo_url,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load user profile from Supabase and sync to localStorage
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        const permissions = await getUserPermissions();
        const userData = mapProfileToUser(profile);
        userData.permissions = permissions;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setUser(null);
      localStorage.removeItem('user');
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    // DEV MODE: no Supabase configured -> use mock user
    if (!isSupabaseConfigured) {
      console.warn('[AuthContext] Supabase not configured — using dev mock user');
      setUser(DEV_MOCK_USER);
      localStorage.setItem('user', JSON.stringify(DEV_MOCK_USER));
      setLoading(false);
      return;
    }

    // PRODUCTION: real Supabase auth
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
      // Dev mode: accept any login
      setUser(DEV_MOCK_USER);
      localStorage.setItem('user', JSON.stringify(DEV_MOCK_USER));
      return;
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

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
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
    localStorage.removeItem('user');
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
