import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const FixedPage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{t('assets.title')}</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Nouvelle immobilisation
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Gestion des immobilisations</h2>
        <p className="text-gray-600">
          Cette page affichera la gestion des immobilisations fixes. Fonctionnalité en cours de développement.
        </p>
      </div>
    </div>
  );
};

export default FixedPage;