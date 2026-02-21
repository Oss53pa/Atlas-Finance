import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

/**
 * AccessDenied - 403 Forbidden page component
 *
 * Displays when a user tries to access a route they don't have permission for.
 * Similar style to FeatureErrorBoundary but specifically for access control.
 */
export const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = "Vous n'avez pas la permission d'accéder à cette page.",
  showBackButton = true,
  showHomeButton = true,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
              <ShieldAlert className="h-16 w-16 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Error code */}
          <h1 className="text-6xl font-bold text-red-600 dark:text-red-400 mb-2">
            403
          </h1>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Accès refusé
          </h2>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {message}
          </p>

          {/* Additional info */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 mb-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre
              administrateur système pour obtenir les autorisations nécessaires.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
                Retour
              </button>
            )}

            {showHomeButton && (
              <button
                onClick={handleHome}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm"
              >
                <Home className="h-5 w-5" />
                Accueil
              </button>
            )}
          </div>
        </div>

        {/* Footer help text */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Besoin d'aide? Contactez le support technique.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
