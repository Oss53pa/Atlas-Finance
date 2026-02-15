import React, { useState } from 'react';
import {
  CogIcon,
  BuildingOfficeIcon,
  CalculatorIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const SimpleParametersManager: React.FC = () => {
  const [activeSection, setActiveSection] = useState('company');

  const sections = [
    {
      id: 'company',
      title: 'Configuration Entreprise',
      description: 'Données légales et informations générales',
      icon: BuildingOfficeIcon,
      color: 'blue',
      status: 'completed'
    },
    {
      id: 'accounting',
      title: 'Configuration Comptable',
      description: 'Plan SYSCOHADA et paramètres comptables',
      icon: CalculatorIcon,
      color: 'green',
      status: 'completed'
    },
    {
      id: 'users',
      title: 'Utilisateurs et Sécurité',
      description: 'Profils et droits d\'accès',
      icon: UserGroupIcon,
      color: 'purple',
      status: 'in_progress'
    },
    {
      id: 'imports',
      title: 'Import/Export',
      description: 'Gestion des échanges de données',
      icon: DocumentArrowUpIcon,
      color: 'orange',
      status: 'pending'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <CogIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Configuré';
      case 'in_progress': return 'En cours';
      default: return 'À configurer';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <CogIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Centre de Configuration Atlas Finance
            </h1>
            <p className="text-gray-600 mt-2">
              Configuration complète selon cahier des charges SYSCOHADA
            </p>
          </div>
        </div>
      </div>

      {/* Sections de configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 bg-${section.color}-100 rounded-lg`}>
                  <section.icon className={`h-8 w-8 text-${section.color}-600`} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
                  <p className="text-gray-600 text-sm">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(section.status)}
                <span className={`text-sm font-medium ${
                  section.status === 'completed' ? 'text-green-600' :
                  section.status === 'in_progress' ? 'text-blue-600' :
                  'text-yellow-600'
                }`}>
                  {getStatusText(section.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {section.id === 'company' && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">✅ Assistant de démarrage 4 étapes</div>
                  <div className="text-sm text-gray-700">✅ Données légales (RCCM, NIF)</div>
                  <div className="text-sm text-gray-700">✅ Multi-établissements</div>
                  <div className="text-sm text-gray-700">✅ Configuration par pays</div>
                </div>
              )}

              {section.id === 'accounting' && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">✅ Plan SYSCOHADA 9 classes</div>
                  <div className="text-sm text-gray-700">✅ TVA CEMAC/UEMOA</div>
                  <div className="text-sm text-gray-700">✅ Axes analytiques multi-dimensions</div>
                  <div className="text-sm text-gray-700">✅ Codification automatique tiers</div>
                </div>
              )}

              {section.id === 'users' && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">✅ 5 profils prédéfinis</div>
                  <div className="text-sm text-gray-700">✅ Matrice CRUD complète</div>
                  <div className="text-sm text-gray-700">⏳ Authentification MFA</div>
                  <div className="text-sm text-gray-700">⏳ Audit trail avancé</div>
                </div>
              )}

              {section.id === 'imports' && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-700">✅ Templates SYSCOHADA</div>
                  <div className="text-sm text-gray-700">✅ 5 formats supportés</div>
                  <div className="text-sm text-gray-700">✅ FEC automatique</div>
                  <div className="text-sm text-gray-700">✅ Mapping intelligent</div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button 
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  section.status === 'completed' 
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : `bg-${section.color}-600 text-white hover:bg-${section.color}-700`
                }`}
                onClick={() => {
                  // Navigation vers la section appropriée
                  const routes = {
                    company: '/setup-wizard',
                    accounting: '/config/accounts',
                    users: '/config/security-profiles',
                    imports: '/config/import-export'
                  };
                  window.location.href = routes[section.id as keyof typeof routes];
                }}
              >
                {section.status === 'completed' ? 'Reconfigurer' : 'Configurer'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Accès rapide */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Accès Rapide Configuration</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Assistant Démarrage', path: '/setup-wizard', color: 'blue' },
            { label: 'Multi-Sociétés', path: '/multi-company-advanced', color: 'green' },
            { label: 'Plan SYSCOHADA', path: '/config/accounts', color: 'purple' },
            { label: 'TVA et Taxes', path: '/config/vat-taxes', color: 'orange' },
            { label: 'Codes Tiers', path: '/config/third-party-codes', color: 'pink' },
            { label: 'Axes Analytiques', path: '/config/analytical-axes', color: 'indigo' },
            { label: 'Import/Export', path: '/config/import-export', color: 'red' },
            { label: 'Sécurité', path: '/config/security-profiles', color: 'yellow' }
          ].map((link, index) => (
            <button
              key={index}
              onClick={() => window.location.href = link.path}
              className={`p-3 text-center rounded-lg border-2 border-${link.color}-200 hover:border-${link.color}-300 hover:bg-${link.color}-50 transition-all`}
            >
              <div className={`text-sm font-medium text-${link.color}-800`}>
                {link.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* États financiers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">États Financiers SYSCOHADA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Bilan SYSCOHADA', path: '/financial-statements/balance', description: 'Situation patrimoniale' },
            { label: 'Compte de Résultat', path: '/financial-statements/income', description: 'Performance économique' },
            { label: 'Tableau de Flux (TAFIRE)', path: '/financial-statements/cashflow', description: 'Flux de trésorerie' }
          ].map((statement, index) => (
            <button
              key={index}
              onClick={() => window.location.href = statement.path}
              className="p-4 text-left rounded-lg border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              <div className="font-medium text-indigo-900">{statement.label}</div>
              <div className="text-sm text-indigo-700 mt-1">{statement.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Saisie avancée */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Saisie Comptable Avancée</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => window.location.href = '/accounting/entries-advanced'}
            className="p-4 text-left rounded-lg border-2 border-green-200 hover:border-green-300 hover:bg-green-50 transition-all"
          >
            <div className="font-medium text-green-900">Formulaire Multi-Types</div>
            <div className="text-sm text-green-700 mt-1">Saisie intelligente avec ventilation</div>
          </button>
          <button
            onClick={() => window.location.href = '/accounting/entries'}
            className="p-4 text-left rounded-lg border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="font-medium text-blue-900">Saisie Standard</div>
            <div className="text-sm text-blue-700 mt-1">Formulaire classique</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleParametersManager;