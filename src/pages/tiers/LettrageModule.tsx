import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Lettrage from '../../components/accounting/Lettrage';

/**
 * LettrageModule - Module de lettrage pour la Gestion des Tiers
 *
 * Ce module réutilise le composant Lettrage existant de la comptabilité.
 * Il fournit un contexte spécifique pour la gestion des comptes tiers (clients/fournisseurs).
 *
 * Le composant Lettrage inclut :
 * - Lettrage Manuel : Sélection et rapprochement manuel des écritures
 * - Lettrage Automatique : Algorithmes de rapprochement automatique
 * - Analyse & Statistiques : Tableaux de bord et indicateurs
 * - Historique : Suivi des opérations de lettrage/délettrage
 * - Configuration : Paramètres et droits d'accès
 */
const LettrageModule: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col">
      {/* Header contextuel pour la navigation Tiers */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center space-x-4">
        <button
          onClick={() => navigate('/tiers')}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#404040]" />
          <span className="text-sm font-medium text-[#404040]">Retour Gestion Tiers</span>
        </button>
        <div className="text-sm text-gray-500">
          Module de lettrage intégré - Rapprochement des comptes clients et fournisseurs
        </div>
      </div>

      {/* Composant Lettrage réutilisable */}
      <div className="flex-1 overflow-hidden">
        <Lettrage />
      </div>
    </div>
  );
};

export default LettrageModule;
