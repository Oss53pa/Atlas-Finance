import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  DocumentChartBarIcon,
  CalculatorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

interface FinancialStatement {
  id: string;
  type: 'balance' | 'income' | 'cashflow';
  title: string;
  statementDate: string;
  fiscalYear: string;
  status: 'draft' | 'validated' | 'approved';
  isBalanced?: boolean;
  totalAssets?: number;
  totalLiabilities?: number;
  netResult?: number;
  lastModified: string;
}

const FinancialStatementsView: React.FC = () => {
  const { t } = useLanguage();
  const [statements, setStatements] = useState<FinancialStatement[]>([]);
  const [selectedStatement, setSelectedStatement] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'analysis'>('list');

  // Données d'exemple - à remplacer par des appels API
  useEffect(() => {
    setStatements([
      {
        id: '1',
        type: 'balance',
        title: 'Bilan SYSCOHADA',
        statementDate: '2024-12-31',
        fiscalYear: '2024',
        status: 'validated',
        isBalanced: true,
        totalAssets: 2500000,
        totalLiabilities: 2500000,
        lastModified: '2024-01-15'
      },
      {
        id: '2',
        type: 'income',
        title: 'Compte de Résultat',
        statementDate: '2024-12-31',
        fiscalYear: '2024',
        status: 'draft',
        netResult: 150000,
        lastModified: '2024-01-10'
      },
      {
        id: '3',
        type: 'cashflow',
        title: 'TAFIRE (Flux de Trésorerie)',
        statementDate: '2024-12-31',
        fiscalYear: '2024',
        status: 'draft',
        lastModified: '2024-01-08'
      }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return (
          <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            <span>{t('accounting.validated')}</span>
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Approuvé</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            <ExclamationTriangleIcon className="h-3 w-3" />
            <span>{t('accounting.draft')}</span>
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'balance':
        return <DocumentChartBarIcon className="h-5 w-5 text-blue-500" />;
      case 'income':
        return <CalculatorIcon className="h-5 w-5 text-green-500" />;
      case 'cashflow':
        return <DocumentChartBarIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <DocumentChartBarIcon className="h-5 w-5 text-gray-700" />;
    }
  };

  const formatAmount = (amount: number | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderStatementsList = () => (
    <div className="space-y-4">
      {statements.map((statement) => (
        <div
          key={statement.id}
          className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getTypeIcon(statement.type)}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {statement.title}
                </h3>
                <p className="text-sm text-gray-700">
                  Exercice {statement.fiscalYear} - Arrêté au {new Date(statement.statementDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            {getStatusBadge(statement.status)}
          </div>

          {/* Informations financières */}
          {statement.type === 'balance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-600">Total Actif</p>
                <p className="font-semibold text-blue-900">{formatAmount(statement.totalAssets)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-green-600">Total Passif</p>
                <p className="font-semibold text-green-900">{formatAmount(statement.totalLiabilities)}</p>
              </div>
              <div className={`p-3 rounded ${statement.isBalanced ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className={`text-sm ${statement.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                  Équilibre
                </p>
                <p className={`font-semibold ${statement.isBalanced ? 'text-green-900' : 'text-red-900'}`}>
                  {statement.isBalanced ? 'Équilibré' : 'Déséquilibré'}
                </p>
              </div>
            </div>
          )}

          {statement.type === 'income' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-sm text-green-600">Résultat Net</p>
                <p className="font-semibold text-green-900">{formatAmount(statement.netResult)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm text-blue-600">Marge Nette</p>
                <p className="font-semibold text-blue-900">8.5%</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-700">
              Modifié le {new Date(statement.lastModified).toLocaleDateString('fr-FR')}
            </p>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                <EyeIcon className="h-4 w-4" />
                <span>Voir</span>
              </button>
              {statement.status === 'draft' && (
                <button className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded" aria-label="Modifier">
                  <PencilIcon className="h-4 w-4" />
                  <span>{t('common.edit')}</span>
                </button>
              )}
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded" aria-label="Imprimer">
                <PrinterIcon className="h-4 w-4" />
                <span>{t('common.print')}</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCreateForm = () => (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Créer un Nouvel État Financier
      </h3>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type d'État Financier
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="balance">Bilan SYSCOHADA</option>
              <option value="income">Compte de Résultat</option>
              <option value="cashflow">TAFIRE (Flux de Trésorerie)</option>
              <option value="complete">Jeu Complet d'États</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exercice Fiscal
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date d'Arrêté
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="2024-12-31"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Méthode de Création
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="auto">Automatique (depuis balance générale)</option>
              <option value="manual">Saisie manuelle</option>
              <option value="import">Import depuis fichier</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Options de Calcul</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Calculer automatiquement les SIG</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Générer le bilan fonctionnel</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Calculer les ratios financiers</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Créer l'État Financier
          </button>
        </div>
      </form>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      {/* Tableau de bord financier */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Analyse Financière Consolidée
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Total Actif</p>
                <p className="text-2xl font-bold text-blue-900">2.5M €</p>
              </div>
              <DocumentChartBarIcon className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-blue-700 mt-2">+12% vs N-1</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Résultat Net</p>
                <p className="text-2xl font-bold text-green-900">150K €</p>
              </div>
              <CalculatorIcon className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-sm text-green-700 mt-2">+18% vs N-1</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">ROE</p>
                <p className="text-2xl font-bold text-purple-900">15.2%</p>
              </div>
              <DocumentChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-sm text-purple-700 mt-2">Excellent</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Liquidité</p>
                <p className="text-2xl font-bold text-yellow-900">1.8</p>
              </div>
              <DocumentChartBarIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-yellow-700 mt-2">Satisfaisant</p>
          </div>
        </div>

        {/* Recommandations */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">✅ Points Forts</h4>
          <ul className="space-y-1 text-sm text-green-800">
            <li>• Rentabilité financière excellente (ROE: 15.2%)</li>
            <li>• Croissance du résultat net (+18%)</li>
            <li>• Structure financière équilibrée</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Points d'Attention</h4>
          <ul className="space-y-1 text-sm text-yellow-800">
            <li>• BFR en augmentation - surveiller les délais de paiement</li>
            <li>• Ratio d'endettement proche de la limite sectorielle</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">États Financiers SYSCOHADA</h1>
          <p className="mt-1 text-gray-600">
            Bilan, Compte de Résultat et TAFIRE conformes aux normes OHADA
          </p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <DocumentChartBarIcon className="h-5 w-5" />
          <span>Nouvel État</span>
        </button>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            États Financiers
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analyse Consolidée
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'list' && renderStatementsList()}
      {activeTab === 'create' && renderCreateForm()}
      {activeTab === 'analysis' && renderAnalysis()}
    </div>
  );
};

export default FinancialStatementsView;