import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui';

type UserRole = 'admin' | 'manager' | 'comptable' | 'user' | 'viewer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback
}) => {
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();


  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  // IMPORTANT: Ne rediriger que si loading est terminé ET user n'existe pas
  if (!loading && (!isAuthenticated || !user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }


  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    // Check if user has sufficient privileges (ADMIN can access everything)
    const roleHierarchy: Record<UserRole, number> = {
      'viewer': 1,
      'user': 2,
      'comptable': 3,
      'manager': 4,
      'admin': 5,
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return fallback || (
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-lg font-bold text-red-600">Accès Refusé</h2>
            <p className="mt-2 text-gray-600">
              Vous n'avez pas la permission d'accéder à cette page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};