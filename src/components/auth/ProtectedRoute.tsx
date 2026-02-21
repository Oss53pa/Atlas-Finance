import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';
import { AccessDenied } from './AccessDenied';
import { ROLE_HIERARCHY, getRoutePermissions } from '@/constants/permissions';
import type { UserRole } from '@/constants/permissions';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: string | string[];
  fallback?: React.ReactNode;
  useOutlet?: boolean; // If true, use <Outlet /> pattern for nested routes
}

/**
 * ProtectedRoute - RBAC route guard component
 *
 * Features:
 * - Redirects unauthenticated users to /login
 * - Checks role-based access (single role or array of allowed roles)
 * - Checks permission-based access (single permission or array)
 * - Supports both <Outlet /> pattern and children prop
 * - Auto-detects route permissions from constants if not explicitly provided
 * - Shows custom fallback or default AccessDenied component
 *
 * @example
 * // Single role
 * <Route element={<ProtectedRoute requiredRole="admin" useOutlet />}>
 *   <Route path="/admin" element={<AdminPanel />} />
 * </Route>
 *
 * @example
 * // Multiple roles
 * <Route element={<ProtectedRoute requiredRole={['admin', 'comptable']} useOutlet />}>
 *   <Route path="/accounting" element={<AccountingDashboard />} />
 * </Route>
 *
 * @example
 * // Permission-based
 * <ProtectedRoute requiredPermission="accounting.write">
 *   <AccountingForm />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  fallback,
  useOutlet = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Chargement..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!loading && (!isAuthenticated || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If no explicit role/permission requirements, check route-based permissions
  let effectiveRequiredRoles = requiredRole;
  let effectiveRequiredPermissions = requiredPermission;

  if (!requiredRole && !requiredPermission) {
    const routePermissions = getRoutePermissions(location.pathname);
    if (routePermissions) {
      effectiveRequiredRoles = routePermissions.roles;
      effectiveRequiredPermissions = routePermissions.permissions;
    }
  }

  // Check role-based access
  if (effectiveRequiredRoles && user) {
    const allowedRoles = Array.isArray(effectiveRequiredRoles)
      ? effectiveRequiredRoles
      : [effectiveRequiredRoles];

    const hasRequiredRole = allowedRoles.some((role) => {
      // Exact match
      if (user.role === role) return true;

      // Check role hierarchy (higher roles can access lower role routes)
      const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
      const requiredRoleLevel = ROLE_HIERARCHY[role] || 0;

      return userRoleLevel >= requiredRoleLevel;
    });

    if (!hasRequiredRole) {
      return (
        fallback || (
          <AccessDenied
            message="Votre rôle ne vous autorise pas à accéder à cette page. Contactez votre administrateur si vous pensez avoir besoin de cet accès."
          />
        )
      );
    }
  }

  // Check permission-based access
  if (effectiveRequiredPermissions && user) {
    const requiredPermissions = Array.isArray(effectiveRequiredPermissions)
      ? effectiveRequiredPermissions
      : [effectiveRequiredPermissions];

    const userPermissions = user.permissions || [];

    // User needs at least ONE of the required permissions
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );

    // Admin bypass: admins have all permissions
    const isAdmin = user.role === 'admin';

    if (!hasRequiredPermission && !isAdmin) {
      return (
        fallback || (
          <AccessDenied
            message="Vous ne disposez pas des permissions nécessaires pour accéder à cette page. Contactez votre administrateur pour demander les autorisations requises."
          />
        )
      );
    }
  }

  // Render content
  if (useOutlet) {
    return <Outlet />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;