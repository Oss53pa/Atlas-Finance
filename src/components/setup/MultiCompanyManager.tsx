import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CopyIcon,
  Cog6ToothIcon,
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Company {
  id: string;
  code: string;
  raisonSociale: string;
  formeJuridique: string;
  rccm: string;
  nif: string;
  devise: string;
  exercice: {
    debut: string;
    fin: string;
  };
  type: 'GROUPE' | 'HOLDING' | 'FILIALE' | 'ETABLISSEMENT';
  parentId?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  etablissements?: Company[];
  
  config: {
    planComptablePartage: boolean;
    journauxPropres: boolean;
    numerotationPropre: boolean;
    workflowValidation: boolean;
    consolidationAuto: boolean;
    eliminationsIntercos: boolean;
  };
  
  stats: {
    utilisateurs: number;
    ecritures: number;
    ca: number;
    dernierAcces: string;
  };
  
  droits: {
    accesTransversal: boolean;
    consultationConsolidee: boolean;
    saisieMultiEntites: boolean;
    reportingGroupe: boolean;
  };
}

interface ConsolidationRule {
  id: string;
  name: string;
  fromCompany: string;
  toCompany: string;
  type: 'CUMUL' | 'ELIMINATION' | 'RETRAITEMENT';
  accounts: string[];
  coefficient: number;
  active: boolean;
  automatic: boolean;
}

const MultiCompanyManager: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<string[]>(['root']);
  const [viewMode, setViewMode] = useState<'tree' | 'list' | 'consolidation'>('tree');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-hierarchy'],
    queryFn: async (): Promise<Company[]> => {
      // Mock data structure GROUPE/HOLDING/FILIALES
      return [
        {
          id: 'groupe-1',
          code: 'GROUPE',
          raisonSociale: 'WISEBOOK GROUPE SA',
          formeJuridique: 'SA',
          rccm: 'RC/YAE/2020/A/001',
          nif: 'M051234567890',
          devise: 'XAF',
          exercice: { debut: '2024-01-01', fin: '2024-12-31' },
          type: 'GROUPE',
          status: 'ACTIVE',
          
          config: {
            planComptablePartage: true,
            journauxPropres: false,
            numerotationPropre: false,
            workflowValidation: true,
            consolidationAuto: true,
            eliminationsIntercos: true
          },
          
          stats: {
            utilisateurs: 25,
            ecritures: 15420,
            ca: 2500000000,
            dernierAcces: '2024-08-30T08:30:00Z'
          },
          
          droits: {
            accesTransversal: true,
            consultationConsolidee: true,
            saisieMultiEntites: true,
            reportingGroupe: true
          },
          
          etablissements: [
            {
              id: 'holding-1',
              code: 'HOLD',
              raisonSociale: 'WISEBOOK HOLDING SA',
              formeJuridique: 'SA',
              rccm: 'RC/YAE/2020/A/002',
              nif: 'M051234567891',
              devise: 'XAF',
              exercice: { debut: '2024-01-01', fin: '2024-12-31' },
              type: 'HOLDING',
              parentId: 'groupe-1',
              status: 'ACTIVE',
              
              config: {
                planComptablePartage: true,
                journauxPropres: true,
                numerotationPropre: false,
                workflowValidation: true,
                consolidationAuto: true,
                eliminationsIntercos: true
              },
              
              stats: {
                utilisateurs: 8,
                ecritures: 2450,
                ca: 150000000,
                dernierAcces: '2024-08-30T07:15:00Z'
              },
              
              droits: {
                accesTransversal: true,
                consultationConsolidee: true,
                saisieMultiEntites: false,
                reportingGroupe: true
              }
            },
            {
              id: 'filiale-1',
              code: 'FIL1',
              raisonSociale: 'WISEBOOK CAMEROUN SARL',
              formeJuridique: 'SARL',
              rccm: 'RC/YAE/2021/B/003',
              nif: 'M051234567892',
              devise: 'XAF',
              exercice: { debut: '2024-01-01', fin: '2024-12-31' },
              type: 'FILIALE',
              parentId: 'groupe-1',
              status: 'ACTIVE',
              
              config: {
                planComptablePartage: false,
                journauxPropres: true,
                numerotationPropre: true,
                workflowValidation: false,
                consolidationAuto: true,
                eliminationsIntercos: false
              },
              
              stats: {
                utilisateurs: 12,
                ecritures: 8950,
                ca: 1200000000,
                dernierAcces: '2024-08-30T09:00:00Z'
              },
              
              droits: {
                accesTransversal: false,
                consultationConsolidee: false,
                saisieMultiEntites: false,
                reportingGroupe: false
              },
              
              etablissements: [
                {
                  id: 'etabl-1',
                  code: 'YAO',
                  raisonSociale: 'Établissement Yaoundé',
                  formeJuridique: 'ETABLISSEMENT',
                  rccm: '',
                  nif: '',
                  devise: 'XAF',
                  exercice: { debut: '2024-01-01', fin: '2024-12-31' },
                  type: 'ETABLISSEMENT',
                  parentId: 'filiale-1',
                  status: 'ACTIVE',
                  
                  config: {
                    planComptablePartage: true,
                    journauxPropres: true,
                    numerotationPropre: false,
                    workflowValidation: false,
                    consolidationAuto: true,
                    eliminationsIntercos: false
                  },
                  
                  stats: {
                    utilisateurs: 5,
                    ecritures: 4250,
                    ca: 600000000,
                    dernierAcces: '2024-08-30T08:45:00Z'
                  },
                  
                  droits: {
                    accesTransversal: false,
                    consultationConsolidee: false,
                    saisieMultiEntites: false,
                    reportingGroupe: false
                  }
                }
              ]
            }
          ]
        }
      ];
    }
  });

  const { data: consolidationRules = [] } = useQuery({
    queryKey: ['consolidation-rules'],
    queryFn: async (): Promise<ConsolidationRule[]> => [
      {
        id: '1',
        name: 'Élimination Ventes Intragroupe',
        fromCompany: 'filiale-1',
        toCompany: 'groupe-1',
        type: 'ELIMINATION',
        accounts: ['701000', '601000'],
        coefficient: 1,
        active: true,
        automatic: true
      },
      {
        id: '2',
        name: 'Cumul Résultats Filiales',
        fromCompany: 'filiale-1',
        toCompany: 'groupe-1',
        type: 'CUMUL',
        accounts: ['120000'],
        coefficient: 1,
        active: true,
        automatic: true
      }
    ]
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: Partial<Company>) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return companyData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-hierarchy'] });
      setShowCreateModal(false);
    }
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => 
      prev.includes(nodeId) 
        ? prev.filter(id => id !== nodeId)
        : [...prev, nodeId]
    );
  };

  const renderCompanyTree = (company: Company, level: number = 0) => {
    const hasChildren = company.etablissements && company.etablissements.length > 0;
    const isExpanded = expandedNodes.includes(company.id);

    return (
      <div key={company.id} className="space-y-2">
        <div 
          className={`flex items-center space-x-3 p-4 rounded-lg border transition-all cursor-pointer ${
            selectedCompany === company.id 
              ? 'border-indigo-300 bg-indigo-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => setSelectedCompany(company.id)}
        >
          {/* Icône d'expansion */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(company.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-6"></div>
          )}

          {/* Icône type */}
          <div className={`p-2 rounded-lg ${
            company.type === 'GROUPE' ? 'bg-blue-100' :
            company.type === 'HOLDING' ? 'bg-green-100' :
            company.type === 'FILIALE' ? 'bg-purple-100' : 'bg-gray-100'
          }`}>
            <BuildingOfficeIcon className={`h-5 w-5 ${
              company.type === 'GROUPE' ? 'text-blue-600' :
              company.type === 'HOLDING' ? 'text-green-600' :
              company.type === 'FILIALE' ? 'text-purple-600' : 'text-gray-600'
            }`} />
          </div>

          {/* Informations */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 truncate">{company.raisonSociale}</h3>
              <span className={`px-2 py-1 text-xs rounded-full ${
                company.type === 'GROUPE' ? 'bg-blue-100 text-blue-800' :
                company.type === 'HOLDING' ? 'bg-green-100 text-green-800' :
                company.type === 'FILIALE' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {company.type}
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                company.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                company.status === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {company.status}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span>👥 {company.stats.utilisateurs} utilisateurs</span>
              <span>📝 {company.stats.ecritures.toLocaleString()} écritures</span>
              <span>💰 {(company.stats.ca / 1000000).toFixed(0)}M XAF</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
              <EyeIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-green-600 transition-colors">
              <PencilIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <CopyIcon className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Établissements enfants */}
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {company.etablissements!.map(child => renderCompanyTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Gestion Multi-Sociétés
            </h1>
            <p className="text-gray-600 mt-2">Configuration GROUPE → HOLDING → FILIALES → ÉTABLISSEMENTS</p>
          </div>
          <div className="flex space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="tree">Vue Arbre</option>
              <option value="list">Vue Liste</option>
              <option value="consolidation">Consolidation</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nouvelle Entité</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistiques consolidées */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Entités Totales',
            value: companies.reduce((sum, c) => sum + 1 + (c.etablissements?.length || 0), 0),
            icon: BuildingOfficeIcon,
            color: 'blue'
          },
          {
            title: 'Utilisateurs Actifs',
            value: companies.reduce((sum, c) => sum + c.stats.utilisateurs + (c.etablissements?.reduce((s, e) => s + e.stats.utilisateurs, 0) || 0), 0),
            icon: UsersIcon,
            color: 'green'
          },
          {
            title: 'CA Consolidé',
            value: `${(companies.reduce((sum, c) => sum + c.stats.ca + (c.etablissements?.reduce((s, e) => s + e.stats.ca, 0) || 0), 0) / 1000000000).toFixed(1)}B`,
            icon: ChartBarIcon,
            color: 'purple'
          },
          {
            title: 'Écritures Totales',
            value: companies.reduce((sum, c) => sum + c.stats.ecritures + (c.etablissements?.reduce((s, e) => s + e.stats.ecritures, 0) || 0), 0).toLocaleString(),
            icon: DocumentTextIcon,
            color: 'orange'
          }
        ].map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`h-12 w-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vue Arbre */}
      {viewMode === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Arbre des entités */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Structure Organisationnelle</h2>
              <div className="space-y-2">
                {companies.map(company => renderCompanyTree(company))}
              </div>
            </div>
          </div>

          {/* Détails de l'entité sélectionnée */}
          <div className="space-y-6">
            {selectedCompany && (() => {
              const company = findCompanyById(companies, selectedCompany);
              if (!company) return null;

              return (
                <>
                  {/* Informations générales */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Code:</span>
                        <span className="font-medium">{company.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Forme juridique:</span>
                        <span className="font-medium">{company.formeJuridique}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">RCCM:</span>
                        <span className="font-medium">{company.rccm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">NIF:</span>
                        <span className="font-medium">{company.nif}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Devise:</span>
                        <span className="font-medium">{company.devise}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Exercice:</span>
                        <span className="font-medium">
                          {new Date(company.exercice.debut).getFullYear()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'planComptablePartage', label: 'Plan comptable partagé' },
                        { key: 'journauxPropres', label: 'Journaux propres' },
                        { key: 'numerotationPropre', label: 'Numérotation propre' },
                        { key: 'workflowValidation', label: 'Workflow validation' },
                        { key: 'consolidationAuto', label: 'Consolidation automatique' },
                        { key: 'eliminationsIntercos', label: 'Éliminations intercos' }
                      ].map((configItem) => (
                        <div key={configItem.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{configItem.label}</span>
                          <div className="flex items-center space-x-2">
                            {(company.config as any)[configItem.key] ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 border border-gray-300 rounded-full"></div>
                            )}
                            <span className={`text-xs ${
                              (company.config as any)[configItem.key] ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {(company.config as any)[configItem.key] ? 'Activé' : 'Désactivé'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Droits inter-sociétés */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                      Droits Inter-Sociétés
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: 'accesTransversal', label: 'Accès transversal contrôlé' },
                        { key: 'consultationConsolidee', label: 'Consultation consolidée' },
                        { key: 'saisieMultiEntites', label: 'Saisie multi-entités' },
                        { key: 'reportingGroupe', label: 'Reporting groupe' }
                      ].map((rightItem) => (
                        <div key={rightItem.key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{rightItem.label}</span>
                          <div className="flex items-center space-x-2">
                            {(company.droits as any)[rightItem.key] ? (
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                            )}
                            <span className={`text-xs ${
                              (company.droits as any)[rightItem.key] ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {(company.droits as any)[rightItem.key] ? 'Autorisé' : 'Restreint'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Vue Consolidation */}
      {viewMode === 'consolidation' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <ArrowPathIcon className="h-6 w-6 mr-2 text-blue-600" />
              Règles de Consolidation
            </h2>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Nouvelle Règle</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Règle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source → Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comptes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {consolidationRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{rule.name}</div>
                      <div className="text-sm text-gray-500">
                        Coefficient: {rule.coefficient} • {rule.automatic ? 'Auto' : 'Manuel'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span>{getCompanyName(companies, rule.fromCompany)}</span>
                        <ArrowPathIcon className="h-4 w-4 text-gray-400" />
                        <span>{getCompanyName(companies, rule.toCompany)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.type === 'ELIMINATION' ? 'bg-red-100 text-red-800' :
                        rule.type === 'CUMUL' ? 'bg-green-100 text-green-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rule.accounts.slice(0, 2).join(', ')}
                      {rule.accounts.length > 2 && (
                        <span className="text-gray-500"> +{rule.accounts.length - 2}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-2 justify-center">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Fonctions utilitaires
const findCompanyById = (companies: Company[], id: string): Company | undefined => {
  for (const company of companies) {
    if (company.id === id) return company;
    if (company.etablissements) {
      const found = findCompanyById(company.etablissements, id);
      if (found) return found;
    }
  }
  return undefined;
};

const getCompanyName = (companies: Company[], id: string): string => {
  const company = findCompanyById(companies, id);
  return company ? company.raisonSociale : 'Inconnue';
};

export default MultiCompanyManager;