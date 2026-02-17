import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ModernDoubleSidebarLayout from './ModernDoubleSidebarLayout';

/**
 * Layout protégé qui vérifie l'authentification avant d'afficher le layout principal
 */
const ProtectedLayout: React.FC = () => {
  const location = useLocation();

  // Vérification SIMPLE et DIRECTE - si token existe = authentifié
  const hasToken = !!localStorage.getItem('authToken');

  // SI TOKEN existe = Afficher le layout
  if (hasToken) {
    return <ModernDoubleSidebarLayout />;
  }

  // PAS DE TOKEN = Redirection vers login
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedLayout;
