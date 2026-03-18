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

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

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

  if (loading) {
    return null; // or a spinner
  }

  // Mode démo : laisser passer sans auth (sessionStorage flag)
  const isDemoMode = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('atlas-demo-mode') === '1';

  if (!isAuthenticated && !user && !isDemoMode) {
    return <Navigate to="/login" replace />;
  }

  // Check role (skip in demo mode)
  if (!isDemoMode && allowedRoles && allowedRoles.length > 0) {
    if (!user || !hasRole(user.role, allowedRoles)) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check permissions (skip in demo mode)
  if (!isDemoMode && requiredPermissions && requiredPermissions.length > 0) {
    const userPerms = user?.permissions ?? [];
    if (!hasPermissions(userPerms, requiredPermissions)) {
      if (fallback) return <>{fallback}</>;
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

export default RBACGuard;
