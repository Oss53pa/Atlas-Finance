import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>404 - Page non trouvée | Atlas Finance</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
        <div className="max-w-lg w-full text-center">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-500 mb-4">
              404
            </h1>
            <div className="w-24 h-1 bg-blue-600 dark:bg-blue-500 mx-auto mb-8"></div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Page non trouvée
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-700 mb-8">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 font-medium"
            >
              Retour
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Accueil
            </button>
          </div>

          <div className="mt-12 text-sm text-gray-700 dark:text-gray-700">
            <p>Code d'erreur: 404</p>
            <p className="mt-2">
              Besoin d'aide ? <a href="/support" className="text-blue-600 dark:text-blue-500 hover:underline">Contactez le support</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}