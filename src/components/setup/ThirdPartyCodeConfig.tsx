import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  UserIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  HashtagIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface CodificationRule {
  id: string;
  name: string;
  type: 'CUSTOMER' | 'SUPPLIER' | 'OTHER';
  pattern: string;
  description: string;
  
  // Règles de génération
  prefix: string;
  countryCode: boolean;
  sequentialNumber: boolean;
  sequenceLength: number;
  sequenceStart: number;
  
  // Exemples et format
  exampleCode: string;
  formatDescription: string;
  
  // Comptes collectifs associés
  collectiveAccounts: CollectiveAccount[];
  
  // Règles de validation
  validationRules: string[];
  isActive: boolean;
  isDefault: boolean;
  
  // Statistiques
  stats: {
    codesGenerated: number;
    lastGenerated: string;
    nextSequence: number;
  };
}

interface CollectiveAccount {
  id: string;
  code: string;
  name: string;
  type: 'NATIONAL' | 'EXPORT' | 'LOCAL' | 'FOREIGN' | 'EMPLOYEE' | 'STATE';
  description: string;
  isActive: boolean;
}

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  zone: 'CEMAC' | 'UEMOA' | 'OTHER';
  currency: string;
  codificationPrefix: string;
  isActive: boolean;
}

const ThirdPartyCodeConfig: React.FC = () => {
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'rules' | 'collective' | 'countries' | 'preview'>('rules');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewType, setPreviewType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');

  const { data: codificationRules = [] } = useQuery({
    queryKey: ['codification-rules'],
    queryFn: async (): Promise<CodificationRule[]> => [
      {
        id: '1',
        name: 'Codification Clients',
        type: 'CUSTOMER',
        pattern: 'C{CC}{NNNNN}',
        description: 'Codification automatique des clients par pays',
        prefix: 'C',
        countryCode: true,
        sequentialNumber: true,
        sequenceLength: 5,
        sequenceStart: 1,
        exampleCode: 'CCM00001',
        formatDescription: 'C + Code Pays (2 lettres) + Numéro séquentiel (5 chiffres)',
        
        collectiveAccounts: [
          {
            id: '1',
            code: '411100',
            name: 'Clients nationaux',
            type: 'NATIONAL',
            description: 'Clients résidents du pays',
            isActive: true
          },
          {
            id: '2',
            code: '411200',
            name: 'Clients export',
            type: 'EXPORT',
            description: 'Clients export hors zone monétaire',
            isActive: true
          }
        ],
        
        validationRules: [
          'UNIQUE_CODE',
          'COUNTRY_CODE_VALID',
          'SEQUENCE_VALID',
          'LEGAL_NAME_REQUIRED'
        ],
        
        isActive: true,
        isDefault: true,
        
        stats: {
          codesGenerated: 245,
          lastGenerated: '2024-08-29T15:30:00Z',
          nextSequence: 246
        }
      },
      {
        id: '2',
        name: 'Codification Fournisseurs',
        type: 'SUPPLIER',
        pattern: 'F{T}{NNNN}',
        description: 'Codification fournisseurs par type',
        prefix: 'F',
        countryCode: false,
        sequentialNumber: true,
        sequenceLength: 4,
        sequenceStart: 1,
        exampleCode: 'FLO0001',
        formatDescription: 'F + Type (L=Local, E=Étranger) + Numéro (4 chiffres)',
        
        collectiveAccounts: [
          {
            id: '3',
            code: '401100',
            name: 'Fournisseurs locaux',
            type: 'LOCAL',
            description: 'Fournisseurs résidents locaux',
            isActive: true
          },
          {
            id: '4',
            code: '401200',
            name: 'Fournisseurs étrangers',
            type: 'FOREIGN',
            description: 'Fournisseurs non-résidents',
            isActive: true
          }
        ],
        
        validationRules: [
          'UNIQUE_CODE',
          'TYPE_CODE_VALID',
          'SEQUENCE_VALID',
          'LEGAL_NAME_REQUIRED'
        ],
        
        isActive: true,
        isDefault: true,
        
        stats: {
          codesGenerated: 187,
          lastGenerated: '2024-08-28T11:45:00Z',
          nextSequence: 188
        }
      },
      {
        id: '3',
        name: 'Codification Autres Tiers',
        type: 'OTHER',
        pattern: 'T{C}{NNN}',
        description: 'Autres tiers (personnel, État, organismes)',
        prefix: 'T',
        countryCode: false,
        sequentialNumber: true,
        sequenceLength: 3,
        sequenceStart: 1,
        exampleCode: 'TP001',
        formatDescription: 'T + Catégorie (P=Personnel, E=État, O=Organisme) + Numéro (3 chiffres)',
        
        collectiveAccounts: [
          {
            id: '5',
            code: '421000',
            name: 'Personnel',
            type: 'EMPLOYEE',
            description: 'Comptes du personnel',
            isActive: true
          },
          {
            id: '6',
            code: '444000',
            name: 'État et collectivités',
            type: 'STATE',
            description: 'Administrations publiques',
            isActive: true
          }
        ],
        
        validationRules: [
          'UNIQUE_CODE',
          'CATEGORY_CODE_VALID',
          'SEQUENCE_VALID'
        ],
        
        isActive: true,
        isDefault: false,
        
        stats: {
          codesGenerated: 67,
          lastGenerated: '2024-08-20T14:20:00Z',
          nextSequence: 68
        }
      }
    ]
  });

  const { data: countriesConfig = [] } = useQuery({
    queryKey: ['countries-config'],
    queryFn: async (): Promise<CountryConfig[]> => [
      { code: 'CM', name: 'Cameroun', flag: '🇨🇲', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'CM', isActive: true },
      { code: 'GA', name: 'Gabon', flag: '🇬🇦', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'GA', isActive: true },
      { code: 'TD', name: 'Tchad', flag: '🇹🇩', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'TD', isActive: true },
      { code: 'CF', name: 'Centrafrique', flag: '🇨🇫', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'CF', isActive: true },
      { code: 'CG', name: 'Congo', flag: '🇨🇬', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'CG', isActive: true },
      { code: 'GQ', name: 'Guinée Équatoriale', flag: '🇬🇶', zone: 'CEMAC', currency: 'XAF', codificationPrefix: 'GQ', isActive: true },
      { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', zone: 'UEMOA', currency: 'XOF', codificationPrefix: 'CI', isActive: true },
      { code: 'SN', name: 'Sénégal', flag: '🇸🇳', zone: 'UEMOA', currency: 'XOF', codificationPrefix: 'SN', isActive: true },
      { code: 'FR', name: 'France', flag: '🇫🇷', zone: 'OTHER', currency: 'EUR', codificationPrefix: 'FR', isActive: true },
      { code: 'XX', name: 'Autres pays', flag: '🌍', zone: 'OTHER', currency: 'USD', codificationPrefix: 'XX', isActive: true }
    ]
  });

  const generatePreviewCode = (rule: CodificationRule, country?: CountryConfig) => {
    let code = rule.prefix;
    
    if (rule.countryCode && country) {
      code += country.codificationPrefix;
    } else if (rule.type === 'SUPPLIER') {
      code += 'LO'; // Local par défaut
    } else if (rule.type === 'OTHER') {
      code += 'P'; // Personnel par défaut
    }
    
    if (rule.sequentialNumber) {
      const sequence = rule.stats.nextSequence.toString().padStart(rule.sequenceLength, '0');
      code += sequence;
    }
    
    return code;
  };

  const getRuleColor = (type: string) => {
    switch (type) {
      case 'CUSTOMER': return 'green';
      case 'SUPPLIER': return 'blue';
      case 'OTHER': return 'primary';
      default: return 'gray';
    }
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'CUSTOMER': return UserIcon;
      case 'SUPPLIER': return BuildingOfficeIcon;
      case 'OTHER': return TagIcon;
      default: return TagIcon;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <HashtagIcon className="h-8 w-8 mr-3 text-primary-600" />
              Codification Automatique des Tiers
            </h1>
            <p className="text-gray-600 mt-2">
              Génération automatique des codes clients/fournisseurs selon règles paramétrables
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Nouvelle Règle</span>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'rules', label: 'Règles de Codification', icon: Cog6ToothIcon },
            { id: 'collective', label: 'Comptes Collectifs', icon: ClipboardDocumentListIcon },
            { id: 'countries', label: 'Configuration Pays', icon: GlobeAltIcon },
            { id: 'preview', label: 'Aperçu Génération', icon: SparklesIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet Règles */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {codificationRules.map((rule) => {
              const Icon = getRuleIcon(rule.type);
              const color = getRuleColor(rule.type);
              
              return (
                <div key={rule.id} className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${
                  selectedRule === rule.id 
                    ? `border-${color}-300 bg-${color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedRule(rule.id)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 bg-${color}-100 rounded-lg`}>
                        <Icon className={`h-6 w-6 text-${color}-600`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                        <span className="text-xs text-gray-700">{rule.type}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {rule.isDefault && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Défaut
                        </span>
                      )}
                      {rule.isActive ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600">Pattern:</div>
                      <div className="font-mono text-sm bg-gray-100 p-2 rounded">
                        {rule.pattern}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600">Exemple généré:</div>
                      <div className="font-mono text-lg font-bold text-gray-900">
                        {rule.exampleCode}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600">
                      {rule.formatDescription}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Générés:</span>
                        <span className="ml-2 font-medium">{rule.stats.codesGenerated}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Prochain:</span>
                        <span className="ml-2 font-medium">{rule.stats.nextSequence}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-700">
                        Comptes collectifs: {rule.collectiveAccounts.length}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.collectiveAccounts.slice(0, 2).map((account) => (
                          <span key={account.id} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {account.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration détaillée de la règle sélectionnée */}
          {selectedRule && (() => {
            const rule = codificationRules.find(r => r.id === selectedRule);
            if (!rule) return null;

            return (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Configuration Détaillée - {rule.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Paramètres de Génération</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Préfixe:</span>
                        <span className="font-mono font-medium">{rule.prefix}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Code pays:</span>
                        <span className="font-medium">{rule.countryCode ? 'Oui' : 'Non'}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-primary-50 rounded-lg">
                        <span className="text-gray-700">Longueur séquence:</span>
                        <span className="font-medium">{rule.sequenceLength} positions</span>
                      </div>
                      <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                        <span className="text-gray-700">Début séquence:</span>
                        <span className="font-medium">{rule.sequenceStart}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Règles de Validation</h4>
                    <div className="space-y-2">
                      {rule.validationRules.map((validationRule, index) => (
                        <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-700">
                            {validationRule.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Statistiques d'Usage</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Codes générés:</span>
                          <span className="font-medium">{rule.stats.codesGenerated}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dernier code:</span>
                          <span className="font-mono font-medium">
                            {generatePreviewCode(rule)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Dernière génération:</span>
                          <span className="font-medium">
                            {new Date(rule.stats.lastGenerated).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Onglet Comptes Collectifs */}
      {activeTab === 'collective' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Comptes Collectifs SYSCOHADA</h2>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Nouveau Collectif</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {codificationRules.flatMap(rule => rule.collectiveAccounts).map((account) => (
              <div key={account.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-mono text-lg font-bold text-gray-900">{account.code}</div>
                    <div className="text-gray-700">{account.name}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    account.type === 'NATIONAL' ? 'bg-green-100 text-green-800' :
                    account.type === 'EXPORT' ? 'bg-blue-100 text-blue-800' :
                    account.type === 'LOCAL' ? 'bg-primary-100 text-primary-800' :
                    account.type === 'FOREIGN' ? 'bg-orange-100 text-orange-800' :
                    account.type === 'EMPLOYEE' ? 'bg-primary-100 text-primary-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {account.type}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4">{account.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {account.isActive ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs ${account.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {account.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-1 text-gray-700 hover:text-green-600" aria-label="Modifier">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-700 hover:text-red-600" aria-label="Supprimer">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet Configuration Pays */}
      {activeTab === 'countries' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <GlobeAltIcon className="h-6 w-6 mr-2 text-primary-600" />
            Configuration par Pays
          </h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Pays
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Zone
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Devise
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Préfixe Code
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Exemple Client
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {countriesConfig.map((country) => {
                  const clientRule = codificationRules.find(r => r.type === 'CUSTOMER');
                  const exampleCode = clientRule ? generatePreviewCode(clientRule, country) : 'N/A';
                  
                  return (
                    <tr key={country.code} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{country.flag}</span>
                          <div>
                            <div className="font-medium text-gray-900">{country.name}</div>
                            <div className="text-sm text-gray-700">{country.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          country.zone === 'CEMAC' ? 'bg-blue-100 text-blue-800' :
                          country.zone === 'UEMOA' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {country.zone}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono">
                        {country.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-mono font-medium">
                        {country.codificationPrefix}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                          {exampleCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          country.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {country.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-2 justify-center">
                          <button className="text-green-600 hover:text-green-900" aria-label="Modifier">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900" aria-label="Paramètres">
                            <Cog6ToothIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet Aperçu */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <SparklesIcon className="h-6 w-6 mr-2 text-primary-600" />
              Aperçu Génération de Codes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Simulation</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de tiers</label>
                    <select
                      value={previewType}
                      onChange={(e) => setPreviewType(e.target.value as typeof previewType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="CUSTOMER">Client</option>
                      <option value="SUPPLIER">Fournisseur</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pays du tiers</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500">
                      {countriesConfig.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Raison sociale</label>
                    <input
                      type="text"
                      placeholder="ABC SARL"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <button className="w-full bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2">
                    <ArrowPathIcon className="h-5 w-5" />
                    <span>Générer Code</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Résultat de Génération</h3>
                <div className="bg-gradient-to-br from-primary-50 to-primary-50 border-2 border-primary-200 rounded-lg p-6">
                  <div className="text-center">
                    <div className="text-sm text-primary-600 mb-2">Code généré automatiquement:</div>
                    <div className="text-xl font-mono font-bold text-primary-900 mb-4">
                      {(() => {
                        const rule = codificationRules.find(r => r.type === previewType);
                        const country = countriesConfig.find(c => c.code === 'CM'); // Cameroun par défaut
                        return rule ? generatePreviewCode(rule, country) : 'N/A';
                      })()}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Compte collectif: <span className="font-mono font-medium">
                        {(() => {
                          const rule = codificationRules.find(r => r.type === previewType);
                          return rule?.collectiveAccounts[0]?.code || 'N/A';
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center space-x-2 text-green-600">
                      <CheckCircleIcon className="h-5 w-5" />
                      <span className="text-sm font-medium">Code valide et disponible</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Informations Automatiques</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• Création compte auxiliaire automatique</div>
                    <div>• Association au compte collectif</div>
                    <div>• Paramètres hérites du collectif</div>
                    <div>• Activation immédiate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyCodeConfig;