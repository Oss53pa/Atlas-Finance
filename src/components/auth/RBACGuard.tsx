/**
 * RBAC Route Guard — protège les routes par rôle et/ou permission.
 *
 * Usage :
 *   <RBACGuard allowedRoles={['admin', 'manager']}>
 *     <ProtectedPage />
 *   </RBACGuard>
 *
 *   <RBACGuard requiredPermissions={['write:entries']}>
 *     <WriteOnlyPage />
 *   </RBACGuard>
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

type UserRole = 'admin' | 'manager' | 'comptable' | 'accountant' | 'user' | 'viewer' | 'super_admin';

interface RBACGuardProps {
  children: React.ReactNode;
  /** Roles allowed to access this route. If empty/undefined, any authenticated user is allowed. */
  allowedRoles?: UserRole[];
  /** Permissions required (all must match). */
  requiredPermissions?: string[];
  /** Where to redirect unauthorized users. Defaults to /unauthorized. */
  redirectTo?: string;
  /** Component to render instead of redirecting. */
  fallback?: React.ReactNode;
}

/**
 * Role hierarchy: admin > manager > comptable > user > viewer
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 120,
  admin: 100,
  manager: 80,
  comptable: 60,
  accountant: 60,
  user: 40,
  viewer: 20,
};

function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

function hasPermissions(userPermissions: string[], required: string[]): boolean {
  return required.every(p => userPermissions.includes(p));
}

export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimumRole] ?? 0);
}

const RBACGuard: React.FC<RBACGuardProps> = ({
  children,
  allowedRoles,
  requiredPermissions,
  redirectTo = '/unauthorized',
  fallback,
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const [supabaseSession, setSupabaseSession] = useState<boolean | null>(null);

  // Demo mode : laisser passer sans auth (sessionStorage flag)
  const isDemoMode = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('atlas-demo-mode') === '1';

  // Dev local : laisser passer (pas de Supabase auth)
  const isDevMode = import.meta.env.DEV;

  // Détecter un user dev persisté (localStorage ou sessionStorage)
  const hasPersistedDevUser = typeof window !== 'undefined' &&
    ((() => { try { return localStorage.getItem('atlas-dev-user') !== null; } catch (_e) { return false; } })() ||
     (() => { try { return sessionStorage.getItem('atlas-dev-user') !== null; } catch (_e) { return false; } })());

  // Si on a une session Supabase persistée (auth-fna-auth dans localStorage),
  // on ne redirige PAS vers /login avant que le AuthContext ait fini de
  // rehydrater. Cette vérification est synchrone, indépendante de AuthContext.
  const hasPersistedSupabaseSession = typeof window !== 'undefined' &&
    (() => { try { return localStorage.getItem('atlas-fna-auth') !== null; } catch (_e) { return false; } })();

  // En production avec Supabase : vérifier la session direct chez Supabase
  // pour éviter de redirect alors que l'auth est en cours d'init.
  useEffect(() => {
    if (!isSupabaseConfigured || !hasPersistedSupabaseSession) {
      setSupabaseSession(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSupabaseSession(!!data.session);
    }).catch(() => { if (!cancelled) setSupabaseSession(false); });
    return () => { cancelled = true; };
  }, [hasPersistedSupabaseSession]);

  // Fast-path : auth en cours de chargement → on évite tout redirect (spinner)
  if (loading) {
    return null;
  }

  // Si on attend la vérif Supabase et qu'on a une session persistée, attendre
  if (hasPersistedSupabaseSession && supabaseSession === null) {
    return null;
  }

  if (!isAuthenticated && !user && !isDemoMode && !isDevMode && !hasPersistedDevUser && !supabaseSession) {
    return <Navigate to="/login" replace />;
  }

  // Check role (skip in demo / dev mode / when auth still hydrating)
  if (!isDemoMode && !isDevMode && allowedRoles && allowedRoles.length > 0 && user) {
    if (!hasRole(user.role, allowedRoles)) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check permissions (skip in demo / dev mode)
  if (!isDemoMode && !isDevMode && requiredPermissions && requiredPermissions.length > 0 && user) {
    const userPerms = user?.permissions ?? [];
    if (!hasPermissions(userPerms, requiredPermissions)) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default RBACGuard;
