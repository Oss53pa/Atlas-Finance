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

  console.log('🛡️🛡️🛡️ [ProtectedLayout] Vérification simple:', {
    path: location.pathname,
    hasToken,
    timestamp: new Date().toISOString()
  });

  // SI TOKEN existe = Afficher le layout
  if (hasToken) {
    console.log('✅ [ProtectedLayout] Token détecté - Affichage du layout');
    return <ModernDoubleSidebarLayout />;
  }

  // PAS DE TOKEN = Redirection vers login
  console.log('❌ [ProtectedLayout] Pas de token - Redirection vers /login');
  return <Navigate to="/login" state={{ from: location }} replace />;
};

export default ProtectedLayout;
