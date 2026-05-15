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
  phone?: string;
  department?: string;
  twoFactorEnabled?: boolean;
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
    phone: profile.phone as string | undefined,
    department: profile.department as string | undefined,
    twoFactorEnabled: Boolean(profile.two_factor_enabled),
  };
}

// === Persistence helper (dev/non-Supabase mode) ===
// Restaure depuis localStorage ou sessionStorage de façon synchrone, pour
// éviter le flash "user=null" sur RBACGuard quand on navigue, recharge ou
// ouvre un nouvel onglet.
function readPersistedDevUser(): User | null {
  try {
    const fromLocal = typeof localStorage !== 'undefined' ? localStorage.getItem('atlas-dev-user') : null;
    if (fromLocal) return JSON.parse(fromLocal) as User;
    const fromSession = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('atlas-dev-user') : null;
    if (fromSession) return JSON.parse(fromSession) as User;
  } catch (_e) { /* ignore */ }
  return null;
}

function persistDevUser(user: User | null): void {
  try {
    if (user) {
      const serialized = JSON.stringify(user);
      // localStorage = persiste entre onglets et redémarrages navigateur
      localStorage.setItem('atlas-dev-user', serialized);
      // sessionStorage gardé pour rétrocompatibilité (RBACGuard, etc.)
      sessionStorage.setItem('atlas-dev-user', serialized);
    } else {
      localStorage.removeItem('atlas-dev-user');
      sessionStorage.removeItem('atlas-dev-user');
    }
  } catch (_e) { /* ignore — mode privé */ }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydration synchrone : si un dev-user existe déjà, on le restaure AVANT
  // le premier render — RBACGuard verra l'utilisateur dès le mount.
  const initialDevUser = readPersistedDevUser();
  const [user, setUser] = useState<User | null>(initialDevUser);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialDevUser);

  // Load user profile from Supabase
  // Tolérant : ne setUser(null) QUE si l'utilisateur Supabase n'existe pas
  // OU si le compte est désactivé. Toute autre erreur (profile manquant,
  // RLS, 406) -> on construit un user minimal depuis auth.users pour ne
  // pas bloquer le rendu de l'app.
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      if (profile) {
        // Vérifier que le compte est désactivé (explicitement)
        if ((profile as unknown as { is_active?: boolean }).is_active === false) {
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          try { localStorage.removeItem('atlas-tenant-id'); } catch (_e) { /* ignore */ }
          return;
        }
        const permissions = await getUserPermissions();
        const userData = mapProfileToUser(profile);
        userData.permissions = permissions;
        setUser(userData);

        // Synchroniser le tenant_id pour le SupabaseAdapter
        try {
          if (userData.company_id) {
            localStorage.setItem('atlas-tenant-id', userData.company_id);
          }
        } catch (_e) { /* localStorage indisponible */ }
        return;
      }

      // Profile = null : tenter un fallback minimal depuis auth.users
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const meta = (authUser.user_metadata as Record<string, unknown> | undefined) || {};
        setUser({
          id: authUser.id,
          name: (meta.full_name as string) || (meta.name as string) || authUser.email || 'Utilisateur',
          email: authUser.email || '',
          role: ((meta.role as string) || 'user') as User['role'],
          first_name: (meta.first_name as string) || undefined,
          last_name: (meta.last_name as string) || undefined,
          company: (meta.company_name as string) || undefined,
          permissions: [],
        });
      } else {
        setUser(null);
      }
    } catch (_err) {
      // Erreur réseau ou bug local : on ne déconnecte PAS l'utilisateur.
      // Si on a déjà un user en state, on le garde. Sinon on tente le fallback auth.
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const meta = (authUser.user_metadata as Record<string, unknown> | undefined) || {};
          setUser((prev) => prev ?? ({
            id: authUser.id,
            name: (meta.full_name as string) || authUser.email || 'Utilisateur',
            email: authUser.email || '',
            role: ((meta.role as string) || 'user') as User['role'],
            permissions: [],
          }));
        }
      } catch (_e2) { /* silent */ }
    }
  }, []);

  const isDev = import.meta.env.VITE_APP_ENV === 'development';

  // Initialize auth state
  useEffect(() => {
    if (!isSupabaseConfigured || isDev) {
      // Dev/no-Supabase mode : le user a déjà été restauré synchroniquement
      // dans useState initializer (readPersistedDevUser). Il suffit de couper
      // le loading flag pour débloquer le rendu.
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
    if (!isSupabaseConfigured || isDev) {
      // Dev mode : simuler le login avec le bon rôle selon l'email
      const devAccounts: Record<string, { name: string; role: User['role']; permissions: string[] }> = {
        'admin@atlasfna.cm':       { name: 'Admin Atlas',      role: 'admin',     permissions: ['read:all', 'write:all', 'delete:all', 'admin:all'] },
        'manager@atlasfna.com':    { name: 'Manager Atlas',    role: 'manager',   permissions: ['read:all', 'write:all'] },
        'comptable@atlasfna.com':  { name: 'Comptable Atlas',  role: 'comptable', permissions: ['read:all', 'write:all'] },
      };
      const account = devAccounts[email.toLowerCase()];
      if (!account) {
        throw new Error('Compte de démonstration non reconnu. Utilisez un des comptes listés.');
      }
      const devUser: User = {
        id: `dev-${account.role}`,
        name: account.name,
        email: email.toLowerCase(),
        role: account.role,
        permissions: account.permissions,
        company: 'Atlas F&A',
      };
      setUser(devUser);
      persistDevUser(devUser);
      return;
    }

    // Vérification liste blanche — bloquer les emails non autorisés
    const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
      throw new Error('Accès refusé. Votre email n\'est pas autorisé à accéder à cette application. Contactez l\'administrateur.');
    }

    setLoading(true);
    try {
      // Wrap signInWithPassword dans un timeout de 15s pour éviter qu'un
      // bug réseau (CORS, DNS, supabase down) bloque le bouton indéfiniment.
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('La connexion prend trop de temps. Vérifiez votre réseau et réessayez.')), 15000)
      );
      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const result = await Promise.race([signInPromise, timeoutPromise]);

      const { data, error } = result as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

      if (error) {
        throw new Error(error.message === 'Invalid login credentials'
          ? 'Identifiants incorrects. Veuillez réessayer.'
          : error.message
        );
      }

      if (data.session) {
        setSession(data.session);
        // loadUserProfile est tolérante : ne throw jamais, fallback metadata.
        // On la wrap aussi dans un timeout pour ne pas bloquer le bouton.
        const profilePromise = loadUserProfile();
        const profileTimeout = new Promise<void>((resolve) => setTimeout(resolve, 5000));
        await Promise.race([profilePromise, profileTimeout]);
      }
    } finally {
      setLoading(false);
    }
  }, [loadUserProfile]);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    if (!isSupabaseConfigured || isDev) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      if (error) throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && !isDev) {
      await supabase.auth.signOut();
    }
    persistDevUser(null);
    setUser(null);
    setSession(null);
  }, []);

  const refreshUserProfile = useCallback(async () => {
    if (isSupabaseConfigured && !isDev) {
      await loadUserProfile();
    }
  }, [loadUserProfile, isDev]);

  const isAdmin = useMemo(() => user?.role === 'admin', [user]);
  const isAuthenticated = useMemo(() => {
    if (!isSupabaseConfigured || isDev) return !!user;
    return !!session && !!user;
  }, [session, user, isDev]);

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
