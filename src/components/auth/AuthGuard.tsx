
/**
 * AuthGuard — vérifie simplement que l'utilisateur est authentifié.
 * Redirige vers /login sinon.
 */
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AuthGuard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return children ? <>{children}</> : <Outlet />;
};

export default AuthGuard;
