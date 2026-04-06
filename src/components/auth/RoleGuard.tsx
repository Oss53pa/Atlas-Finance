
/**
 * RoleGuard — vérifie le rôle utilisateur dans user_profiles.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../../features/platform/hooks/useTenant';
import { Shield } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children, redirectTo }) => {
  const { userRole, isLoading } = useTenant();

  if (isLoading) return null;

  if (!allowedRoles.includes(userRole)) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#171717] mb-2">Accès restreint</h2>
          <p className="text-sm text-gray-500">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
