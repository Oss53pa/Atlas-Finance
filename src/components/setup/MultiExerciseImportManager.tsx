import React, { useState, useRef } from 'react';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BanknotesIcon,
  DocumentDuplicateIcon,
  FolderOpenIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  InformationCircleIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface ImportSession {
  id: string;
  name: string;
  sourceSystem: string;
  exercises: string[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  startDate?: Date;
  endDate?: Date;
  totalRecords: number;
  importedRecords: number;
  errors: number;
}

interface ExerciseData {
  year: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed';
  hasData: boolean;
}

const MultiExerciseImportManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('new-import');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [importSessions, setImportSessions] = useState<ImportSession[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [mappingRules, setMappingRules] = useState<any>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedSystems = [
    {
      id: 'sage',
      name: 'Sage (100, X3, Saari)',
      icon: '🟢',
      formats: ['*.pnm', '*.txt', '*.csv'],
      hasTemplate: true,
      description: 'Import direct depuis Sage Comptabilité'
    },
    {
      id: 'ciel',
      name: 'Ciel Comptabilité',
      icon: '🔵',
      formats: ['*.txt', '*.csv'],
      hasTemplate: true,
      description: 'Compatible toutes versions Ciel'
    },
    {
      id: 'quadratus',
      name: 'Quadratus',
      icon: '🟣',
      formats: ['*.txt', '*.qxf'],
      hasTemplate: true,
      description: 'Import Quadratus/QuadraCompta'
    },
    {
      id: 'ebp',
      name: 'EBP Comptabilité',
      icon: '🟠',
      formats: ['*.txt', '*.csv', '*.ebp'],
      hasTemplate: true,
      description: 'Compatible EBP Open Line'
    },
    {
      id: 'excel',
      name: 'Microsoft Excel',
      icon: '🟢',
      formats: ['*.xlsx', '*.xls', '*.csv'],
      hasTemplate: true,
      description: 'Format Excel structuré'
    },
    {
      id: 'csv',
      name: 'Fichiers CSV',
      icon: '⚪',
      formats: ['*.csv', '*.txt'],
      hasTemplate: true,
      description: 'Format universel CSV'
    },
    {
      id: 'fec',
      name: 'FEC (Fichier des Écritures Comptables)',
      icon: '🔴',
      formats: ['*.txt', '*.csv'],
      hasTemplate: false,
      description: 'Format fiscal français'
    },
    {
      id: 'sap',
      name: 'SAP',
      icon: '🔷',
      formats: ['*.txt', '*.csv', '*.xml'],
      hasTemplate: true,
      description: 'Export SAP FI/CO'
    },
    {
      id: 'oracle',
      name: 'Oracle Financials',
      icon: '🔶',
      formats: ['*.csv', '*.xml'],
      hasTemplate: true,
      description: 'Oracle GL Export'
    },
    {
      id: 'custom',
      name: 'Format personnalisé',
      icon: '⚙️',
      formats: ['*.*'],
      hasTemplate: false,
      description: 'Définir un mapping personnalisé'
    }
  ];

  const importTypes = [
    {
      id: 'plan',
      name: 'Plan comptable',
      icon: TableCellsIcon,
      color: 'blue',
      required: true,
      description: 'Comptes généraux et auxiliaires'
    },
    {
      id: 'balance',
      name: 'Balance générale',
      icon: ChartBarIcon,
      color: 'green',
      required: false,
      description: 'Soldes de début d\'exercice'
    },
    {
      id: 'ecritures',
      name: 'Écritures comptables',
      icon: DocumentTextIcon,
      color: 'purple',
      required: false,
      description: 'Mouvements comptables détaillés'
    },
    {
      id: 'tiers',
      name: 'Fichier tiers',
      icon: UserGroupIcon,
      color: 'orange',
      required: false,
      description: 'Clients, fournisseurs, autres'
    },
    {
      id: 'immobilisations',
      name: 'Immobilisations',
      icon: BuildingOfficeIcon,
      color: 'indigo',
      required: false,
      description: 'Actifs et tableaux d\'amortissement'
    },
    {
      id: 'analytique',
      name: 'Sections analytiques',
      icon: BanknotesIcon,
      color: 'pink',
      required: false,
      description: 'Centres de coûts et sections'
    },
    {
      id: 'budget',
      name: 'Budgets',
      icon: CurrencyDollarIcon,
      color: 'yellow',
      required: false,
      description: 'Budgets prévisionnels'
    }
  ];

  const availableExercises: ExerciseData[] = [
    { year: '2024', startDate: '01/01/2024', endDate: '31/12/2024', status: 'open', hasData: false },
    { year: '2023', startDate: '01/01/2023', endDate: '31/12/2023', status: 'closed', hasData: false },
    { year: '2022', startDate: '01/01/2022', endDate: '31/12/2022', status: 'closed', hasData: false },
    { year: '2021', startDate: '01/01/2021', endDate: '31/12/2021', status: 'closed', hasData: false },
    { year: '2020', startDate: '01/01/2020', endDate: '31/12/2020', status: 'closed', hasData: false }
  ];

  const importSteps = [
    { id: 1, name: 'Source', description: 'Sélection du système source' },
    { id: 2, name: 'Exercices', description: 'Choix des exercices à importer' },
    { id: 3, name: 'Données', description: 'Types de données et fichiers' },
    { id: 4, name: 'Mapping', description: 'Correspondance des champs' },
    { id: 5, name: 'Validation', description: 'Vérification et contrôles' },
    { id: 6, name: 'Import', description: 'Exécution de l\'import' }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      console.log('Fichiers sélectionnés:', files);
      // Traitement des fichiers
    }
  };

  const startImport = () => {
    setIsImporting(true);
    // Simuler un import
    const newSession: ImportSession = {
      id: Date.now().toString(),
      name: `Import ${selectedSource} - ${new Date().toLocaleDateString()}`,
      sourceSystem: selectedSource,
      exercises: selectedExercises,
      status: 'processing',
      progress: 0,
      startDate: new Date(),
      totalRecords: 10000,
      importedRecords: 0,
      errors: 0
    };
    setImportSessions([newSession, ...importSessions]);
  };

  const downloadTemplate = (systemId: string) => {
    console.log(`Téléchargement du template pour ${systemId}`);
    // Télécharger le template Excel correspondant
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DocumentArrowUpIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Import Comptable Multi-Exercices
            </h1>
            <p className="text-gray-600 mt-2">
              Importez vos données comptables depuis différents logiciels sur plusieurs exercices
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center">
              <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
              Nouvel Import
            </button>
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('new-import')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'new-import'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Nouvel Import
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Historique
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mapping'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Règles de Mapping
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'new-import' && (
            <div className="space-y-6">
              {/* Barre de progression */}
              <div className="relative">
                <div className="flex items-center justify-between">
                  {importSteps.map((step, index) => (
                    <div key={step.id} className="flex-1">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          currentStep >= step.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {currentStep > step.id ? (
                            <CheckCircleIcon className="h-6 w-6" />
                          ) : (
                            step.id
                          )}
                        </div>
                        {index < importSteps.length - 1 && (
                          <div className={`flex-1 h-1 mx-2 ${
                            currentStep > step.id ? 'bg-indigo-600' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-sm font-medium text-gray-900">{step.name}</div>
                        <div className="text-xs text-gray-700">{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Étape 1: Sélection du système source */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sélectionnez votre système comptable actuel
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportedSystems.map((system) => (
                      <div
                        key={system.id}
                        onClick={() => setSelectedSource(system.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedSource === system.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="text-2xl">{system.icon}</div>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{system.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{system.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {system.formats.map((format) => (
                                <span
                                  key={format}
                                  className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {format}
                                </span>
                              ))}
                            </div>
                          </div>
                          {system.hasTemplate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadTemplate(system.id);
                              }}
                              className="text-indigo-600 hover:text-indigo-700"
                              title="Télécharger le template"
                            >
                              <ArrowDownTrayIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Étape 2: Sélection des exercices */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sélectionnez les exercices à importer
                  </h2>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <InformationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">Import multi-exercices</p>
                        <p>Vous pouvez importer plusieurs exercices simultanément. Les données seront ventilées automatiquement par période.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {availableExercises.map((exercise) => (
                      <div
                        key={exercise.year}
                        onClick={() => {
                          if (selectedExercises.includes(exercise.year)) {
                            setSelectedExercises(selectedExercises.filter(y => y !== exercise.year));
                          } else {
                            setSelectedExercises([...selectedExercises, exercise.year]);
                          }
                        }}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedExercises.includes(exercise.year)
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-4 h-4 rounded-full ${
                              selectedExercises.includes(exercise.year)
                                ? 'bg-indigo-600'
                                : 'bg-gray-300'
                            }`} />
                            <div>
                              <h3 className="font-medium text-gray-900">
                                Exercice {exercise.year}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Du {exercise.startDate} au {exercise.endDate}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {exercise.hasData && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                                Données existantes
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded ${
                              exercise.status === 'open'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {exercise.status === 'open' ? 'Ouvert' : 'Clôturé'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Étape 3: Types de données et fichiers */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Sélectionnez les types de données à importer
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {importTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`p-4 border-2 rounded-lg ${
                          type.required
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900">
                                {type.name}
                                {type.required && (
                                  <span className="ml-2 text-xs text-red-600">*</span>
                                )}
                              </h3>
                              <input
                                type="checkbox"
                                checked={type.required || false}
                                disabled={type.required}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                            <div className="mt-3">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-center space-x-2 ${
                                  type.required
                                    ? 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                }`}
                              >
                                <CloudArrowUpIcon className="h-4 w-4" />
                                <span>Choisir le fichier</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".csv,.txt,.xlsx,.xls,.xml"
                  />
                </div>
              )}

              {/* Étape 4: Mapping des champs */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Configuration du mapping des champs
                  </h2>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Champ source
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Champ SYSCOHADA
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Transformation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Aperçu
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            COMPTE
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select className="text-sm border-gray-300 rounded-md">
                              <option>Numéro de compte</option>
                              <option>Libellé compte</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select className="text-sm border-gray-300 rounded-md">
                              <option>Aucune</option>
                              <option>Ajouter préfixe</option>
                              <option>Remplacer</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            401000 → 401000
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Étape 5: Validation */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Validation avant import
                  </h2>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">Format de fichier valide</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">Mapping des champs complet</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="text-sm text-yellow-800">15 comptes seront créés automatiquement</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">Résumé de l'import</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Système source:</span>
                          <span className="ml-2 font-medium">{selectedSource}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Exercices:</span>
                          <span className="ml-2 font-medium">{selectedExercises.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Écritures à importer:</span>
                          <span className="ml-2 font-medium">12,456</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Volume total:</span>
                          <span className="ml-2 font-medium">15.3 MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 6: Import en cours */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Import en cours...
                  </h2>
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Progression globale</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
                      </div>

                      <div className="space-y-3 mt-6">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-sm">Plan comptable importé</span>
                          </div>
                          <span className="text-sm text-green-800 font-medium">250 comptes</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center">
                            <ArrowPathIcon className="h-5 w-5 text-blue-600 mr-2 animate-spin" />
                            <span className="text-sm">Import des écritures en cours...</span>
                          </div>
                          <span className="text-sm text-blue-800 font-medium">5,234 / 12,456</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <ClockIcon className="h-5 w-5 text-gray-700 mr-2" />
                            <span className="text-sm text-gray-600">Fichier tiers en attente</span>
                          </div>
                          <span className="text-sm text-gray-700">0 / 150</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-center space-x-4 mt-6">
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center">
                          <PauseIcon className="h-5 w-5 mr-2" />
                          Pause
                        </button>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center">
                          <StopIcon className="h-5 w-5 mr-2" />
                          Annuler
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons de navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    currentStep === 1
                      ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Précédent
                </button>
                <button
                  onClick={() => {
                    if (currentStep === 6) {
                      startImport();
                    } else {
                      setCurrentStep(Math.min(6, currentStep + 1));
                    }
                  }}
                  disabled={
                    (currentStep === 1 && !selectedSource) ||
                    (currentStep === 2 && selectedExercises.length === 0)
                  }
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    ((currentStep === 1 && !selectedSource) ||
                    (currentStep === 2 && selectedExercises.length === 0))
                      ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                      : currentStep === 5
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {currentStep === 5 ? 'Lancer l\'import' : currentStep === 6 ? 'Terminer' : 'Suivant'}
                </button>
              </div>
            </div>
          )}

          {/* Tab: Historique */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Exercices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Progression
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {importSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{session.name}</div>
                            <div className="text-xs text-gray-700">
                              {session.startDate?.toLocaleString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {session.sourceSystem}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {session.exercises.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            session.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'processing'
                              ? 'bg-blue-100 text-blue-800'
                              : session.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 mr-2">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full"
                                  style={{ width: `${session.progress}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600">{session.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <button className="text-indigo-600 hover:text-indigo-900">
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Templates d'import</p>
                    <p>Téléchargez les templates Excel pré-formatés pour faciliter l'import de vos données.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {importTypes.map((type) => (
                  <div key={type.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                        <div>
                          <h3 className="font-medium text-gray-900">{type.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          <div className="mt-3 flex items-center space-x-4">
                            <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center">
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                              Télécharger (.xlsx)
                            </button>
                            <button className="text-sm text-gray-600 hover:text-gray-700 flex items-center">
                              <DocumentTextIcon className="h-4 w-4 mr-1" />
                              Guide
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Règles de Mapping */}
          {activeTab === 'mapping' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Règles de mapping sauvegardées
                </h2>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  Nouvelle règle
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Nom de la règle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Système source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Type de données
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Dernière utilisation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Sage 100 Standard
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Sage
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        Plan comptable
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        15/10/2024
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                          Modifier
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiExerciseImportManager;