import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function ServerErrorPage() {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <>
      <Helmet>
        <title>500 - Erreur serveur | WiseBook</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
              <svg
                className="w-12 h-12 text-red-600 dark:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-6xl font-bold text-red-600 dark:text-red-500 mb-4">
              500
            </h1>
            <div className="w-24 h-1 bg-red-600 dark:bg-red-500 mx-auto mb-8"></div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Erreur serveur
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-700 mb-8">
            Une erreur est survenue sur nos serveurs. Nos équipes techniques ont été notifiées et travaillent à résoudre le problème.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRefresh}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
            >
              Réessayer
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Retour à l'accueil
            </button>
          </div>

          <div className="mt-12 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Que faire en attendant ?
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-700 text-left space-y-2">
              <li className="flex items-start">
                <span className="text-red-600 dark:text-red-500 mr-2">•</span>
                <span>Attendez quelques minutes et réessayez</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 dark:text-red-500 mr-2">•</span>
                <span>Vérifiez votre connexion internet</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-600 dark:text-red-500 mr-2">•</span>
                <span>Contactez le support si le problème persiste</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 text-sm text-gray-700 dark:text-gray-700">
            <p>Code d'erreur: 500</p>
            <p className="mt-2">
              <a href="/support" className="text-red-600 dark:text-red-500 hover:underline">Contacter le support technique</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}