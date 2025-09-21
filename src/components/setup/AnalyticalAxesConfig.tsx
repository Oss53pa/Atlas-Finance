import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TargetIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FolderIcon,
  FolderOpenIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  BriefcaseIcon,
  TagIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ArrowPathIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface AnalyticalAxis {
  id: string;
  code: string;
  name: string;
  description: string;
  type: 'COST_CENTER' | 'PROJECT' | 'GEOGRAPHY' | 'DEPARTMENT' | 'PRODUCT' | 'CUSTOMER' | 'CUSTOM';
  level: number;
  isActive: boolean;
  isMandatory: boolean;
  
  // Règles de ventilation
  mandatoryOnAccounts: string[];  // Comptes où l'axe est obligatoire
  forbiddenOnAccounts: string[];  // Comptes où l'axe est interdit
  defaultSection?: string;
  
  // Structure hiérarchique
  sections: AnalyticalSection[];
  
  // Configuration
  allowMultipleAllocation: boolean;
  requirePercentageBalance: boolean;
  maxAllocationLevels: number;
  
  // Statistiques
  stats: {
    totalSections: number;
    totalAllocations: number;
    totalAmount: number;
    lastUsed: string;
  };
}

interface AnalyticalSection {
  id: string;
  code: string;
  name: string;
  description: string;
  axisId: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  isHeader: boolean;
  
  // Budget et contrôles
  budgetAmount?: number;
  alertThreshold?: number;
  responsibleUser?: string;
  
  // Sous-sections
  children?: AnalyticalSection[];
  
  // Statistiques
  stats: {
    allocatedAmount: number;
    allocationsCount: number;
    budgetConsumption: number;
  };
}

const AnalyticalAxesConfig: React.FC = () => {
  const [selectedAxis, setSelectedAxis] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'axes' | 'sections' | 'rules'>('overview');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: analyticalAxes = [], isLoading } = useQuery({
    queryKey: ['analytical-axes'],
    queryFn: async (): Promise<AnalyticalAxis[]> => {
      // Mock data avec structure complète
      return [
        {
          id: 'axis-1',
          code: 'CC',
          name: 'CENTRES DE COÛTS',
          description: 'Répartition par centres de responsabilité',
          type: 'COST_CENTER',
          level: 1,
          isActive: true,
          isMandatory: true,
          mandatoryOnAccounts: ['6*'],  // Toutes les charges
          forbiddenOnAccounts: ['1*', '2*'],  // Capitaux et immobilisations
          allowMultipleAllocation: true,
          requirePercentageBalance: true,
          maxAllocationLevels: 3,
          
          sections: [
            {
              id: 'cc-prod',
              code: 'PROD',
              name: 'PRODUCTION',
              description: 'Centre de coût production',
              axisId: 'axis-1',
              level: 1,
              isActive: true,
              isHeader: true,
              budgetAmount: 15000000,
              alertThreshold: 80,
              responsibleUser: 'chef-production',
              
              children: [
                {
                  id: 'cc-prod-at1',
                  code: 'AT1',
                  name: 'Atelier 1',
                  description: 'Atelier de fabrication principal',
                  axisId: 'axis-1',
                  parentId: 'cc-prod',
                  level: 2,
                  isActive: true,
                  isHeader: false,
                  budgetAmount: 8000000,
                  alertThreshold: 85,
                  stats: {
                    allocatedAmount: 6500000,
                    allocationsCount: 245,
                    budgetConsumption: 81.25
                  }
                },
                {
                  id: 'cc-prod-at2',
                  code: 'AT2',
                  name: 'Atelier 2',
                  description: 'Atelier de finition',
                  axisId: 'axis-1',
                  parentId: 'cc-prod',
                  level: 2,
                  isActive: true,
                  isHeader: false,
                  budgetAmount: 5000000,
                  stats: {
                    allocatedAmount: 3200000,
                    allocationsCount: 156,
                    budgetConsumption: 64
                  }
                },
                {
                  id: 'cc-prod-maint',
                  code: 'MAINT',
                  name: 'Maintenance',
                  description: 'Service maintenance équipements',
                  axisId: 'axis-1',
                  parentId: 'cc-prod',
                  level: 2,
                  isActive: true,
                  isHeader: false,
                  budgetAmount: 2000000,
                  stats: {
                    allocatedAmount: 1800000,
                    allocationsCount: 89,
                    budgetConsumption: 90
                  }
                }
              ],
              
              stats: {
                allocatedAmount: 11500000,
                allocationsCount: 490,
                budgetConsumption: 76.67
              }
            },
            {
              id: 'cc-admin',
              code: 'ADMIN',
              name: 'ADMINISTRATION',
              description: 'Services administratifs',
              axisId: 'axis-1',
              level: 1,
              isActive: true,
              isHeader: true,
              budgetAmount: 8000000,
              
              children: [
                {
                  id: 'cc-admin-dir',
                  code: 'DIR',
                  name: 'Direction',
                  description: 'Direction générale',
                  axisId: 'axis-1',
                  parentId: 'cc-admin',
                  level: 2,
                  isActive: true,
                  isHeader: false,
                  budgetAmount: 3000000,
                  stats: {
                    allocatedAmount: 2850000,
                    allocationsCount: 125,
                    budgetConsumption: 95
                  }
                },
                {
                  id: 'cc-admin-compta',
                  code: 'COMPTA',
                  name: 'Comptabilité',
                  description: 'Service comptable et financier',
                  axisId: 'axis-1',
                  parentId: 'cc-admin',
                  level: 2,
                  isActive: true,
                  isHeader: false,
                  budgetAmount: 2500000,
                  stats: {
                    allocatedAmount: 1980000,
                    allocationsCount: 167,
                    budgetConsumption: 79.2
                  }
                }
              ],
              
              stats: {
                allocatedAmount: 4830000,
                allocationsCount: 292,
                budgetConsumption: 60.38
              }
            }
          ],
          
          stats: {
            totalSections: 6,
            totalAllocations: 782,
            totalAmount: 16330000,
            lastUsed: '2024-08-30'
          }
        },
        {
          id: 'axis-2',
          code: 'PRJ',
          name: 'PROJETS',
          description: 'Suivi par projet ou affaire',
          type: 'PROJECT',
          level: 2,
          isActive: true,
          isMandatory: false,
          mandatoryOnAccounts: ['602*', '61*', '62*'],
          forbiddenOnAccounts: ['1*'],
          allowMultipleAllocation: false,
          requirePercentageBalance: false,
          maxAllocationLevels: 2,
          
          sections: [
            {
              id: 'prj-a',
              code: 'PROJ_A',
              name: 'Projet Alpha',
              description: 'Développement nouveau produit',
              axisId: 'axis-2',
              level: 1,
              isActive: true,
              isHeader: false,
              budgetAmount: 5000000,
              alertThreshold: 90,
              responsibleUser: 'chef-projet-a',
              stats: {
                allocatedAmount: 3850000,
                allocationsCount: 89,
                budgetConsumption: 77
              }
            },
            {
              id: 'prj-b',
              code: 'PROJ_B',
              name: 'Projet Beta',
              description: 'Extension marché régional',
              axisId: 'axis-2',
              level: 1,
              isActive: true,
              isHeader: false,
              budgetAmount: 8000000,
              stats: {
                allocatedAmount: 6200000,
                allocationsCount: 156,
                budgetConsumption: 77.5
              }
            }
          ],
          
          stats: {
            totalSections: 2,
            totalAllocations: 245,
            totalAmount: 10050000,
            lastUsed: '2024-08-29'
          }
        }
      ];
    }
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const renderSectionTree = (section: AnalyticalSection, level: number = 0) => {
    const hasChildren = section.children && section.children.length > 0;
    const isExpanded = expandedSections.includes(section.id);

    return (
      <div key={section.id} className="space-y-1">
        <div
          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
            selectedSection === section.id
              ? 'border-indigo-300 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => setSelectedSection(section.id)}
        >
          {/* Expansion */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(section.id);
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
            section.isHeader ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            {section.isHeader ? (
              <FolderIcon className="h-4 w-4 text-blue-600" />
            ) : (
              <TargetIcon className="h-4 w-4 text-gray-600" />
            )}
          </div>

          {/* Informations */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-medium text-gray-900">{section.code}</span>
              <span className="text-sm text-gray-900 truncate">{section.name}</span>
              {section.isHeader && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  En-tête
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {section.stats.allocationsCount} affectations • 
              Budget: {section.budgetAmount?.toLocaleString() || 'N/A'} XAF •
              Consommation: {section.stats.budgetConsumption?.toFixed(1) || '0'}%
            </div>
          </div>

          {/* Budget indicator */}
          <div className="text-right">
            <div className={`text-sm font-medium ${
              (section.stats.budgetConsumption || 0) > 90 ? 'text-red-600' :
              (section.stats.budgetConsumption || 0) > 80 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {section.stats.budgetConsumption?.toFixed(0) || '0'}%
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className={`h-1.5 rounded-full ${
                  (section.stats.budgetConsumption || 0) > 90 ? 'bg-red-500' :
                  (section.stats.budgetConsumption || 0) > 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, section.stats.budgetConsumption || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Sous-sections */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {section.children!.map(child => renderSectionTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getAxisIcon = (type: string) => {
    switch (type) {
      case 'COST_CENTER': return BuildingOfficeIcon;
      case 'PROJECT': return BriefcaseIcon;
      case 'GEOGRAPHY': return MapPinIcon;
      case 'DEPARTMENT': return FolderIcon;
      case 'PRODUCT': return TagIcon;
      default: return TargetIcon;
    }
  };

  const getAxisColor = (type: string) => {
    switch (type) {
      case 'COST_CENTER': return 'blue';
      case 'PROJECT': return 'green';
      case 'GEOGRAPHY': return 'purple';
      case 'DEPARTMENT': return 'orange';
      case 'PRODUCT': return 'pink';
      default: return 'gray';
    }
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
              <TargetIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Axes Analytiques Multi-Dimensions
            </h1>
            <p className="text-gray-600 mt-2">
              Configuration des axes de ventilation analytique • {analyticalAxes.length} axes configurés
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="overview">Vue d'ensemble</option>
              <option value="axes">Gestion des axes</option>
              <option value="sections">Sections analytiques</option>
              <option value="rules">Règles de ventilation</option>
            </select>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Nouvel Axe</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vue d'ensemble */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Statistiques globales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                title: 'Axes Configurés',
                value: analyticalAxes.length,
                subtitle: `${analyticalAxes.filter(a => a.isActive).length} actifs`,
                icon: TargetIcon,
                color: 'blue'
              },
              {
                title: 'Sections Totales',
                value: analyticalAxes.reduce((sum, axis) => sum + axis.stats.totalSections, 0),
                subtitle: 'Toutes hiérarchies',
                icon: FolderIcon,
                color: 'green'
              },
              {
                title: 'Affectations',
                value: analyticalAxes.reduce((sum, axis) => sum + axis.stats.totalAllocations, 0).toLocaleString(),
                subtitle: 'Ce mois',
                icon: ArrowPathIcon,
                color: 'purple'
              },
              {
                title: 'Montant Ventilé',
                value: `${(analyticalAxes.reduce((sum, axis) => sum + axis.stats.totalAmount, 0) / 1000000).toFixed(1)}M`,
                subtitle: 'XAF total',
                icon: CurrencyDollarIcon,
                color: 'orange'
              }
            ].map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.subtitle}</p>
                  </div>
                  <div className={`h-12 w-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vue d'ensemble des axes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Configuration des Axes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analyticalAxes.map((axis) => {
                const Icon = getAxisIcon(axis.type);
                const color = getAxisColor(axis.type);
                
                return (
                  <div key={axis.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 bg-${color}-100 rounded-lg`}>
                          <Icon className={`h-6 w-6 text-${color}-600`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{axis.name}</h3>
                          <span className="text-xs text-gray-500">{axis.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {axis.isMandatory && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                            Obligatoire
                          </span>
                        )}
                        {axis.isActive ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{axis.description}</p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Sections:</span>
                          <span className="ml-2 font-medium">{axis.stats.totalSections}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Niveau max:</span>
                          <span className="ml-2 font-medium">{axis.maxAllocationLevels}</span>
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="text-gray-500">Montant ventilé:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {formatCurrency(axis.stats.totalAmount)}
                        </span>
                      </div>

                      <div className="text-sm">
                        <span className="text-gray-500">Obligatoire sur:</span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {axis.mandatoryOnAccounts.slice(0, 3).map((account) => (
                            <span key={account} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              {account}
                            </span>
                          ))}
                          {axis.mandatoryOnAccounts.length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                              +{axis.mandatoryOnAccounts.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <span className="text-xs text-gray-500">
                          Dernière utilisation: {new Date(axis.stats.lastUsed).toLocaleDateString('fr-FR')}
                        </span>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedAxis(axis.id)}
                            className="p-1 text-gray-400 hover:text-indigo-600"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-green-600">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Vue sections analytiques */}
      {viewMode === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des sections */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Sections Analytiques</h2>
              
              <div className="space-y-4">
                {analyticalAxes.map((axis) => (
                  <div key={axis.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-${getAxisColor(axis.type)}-100 rounded-lg`}>
                          {React.createElement(getAxisIcon(axis.type), {
                            className: `h-5 w-5 text-${getAxisColor(axis.type)}-600`
                          })}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{axis.name}</h3>
                          <span className="text-sm text-gray-500">{axis.stats.totalSections} sections</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSection(axis.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        {expandedSections.includes(axis.id) ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                        )}
                      </button>
                    </div>

                    {expandedSections.includes(axis.id) && (
                      <div className="space-y-2 ml-4">
                        {axis.sections.map(section => renderSectionTree(section))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Détails de la section sélectionnée */}
          <div className="space-y-6">
            {selectedSection && (() => {
              const section = analyticalAxes
                .flatMap(axis => [
                  ...axis.sections,
                  ...axis.sections.flatMap(s => s.children || [])
                ])
                .find(s => s.id === selectedSection);
              
              if (!section) return null;

              return (
                <>
                  {/* Informations de la section */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Détails de la Section</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="font-mono text-lg font-bold text-gray-900">{section.code}</div>
                        <div className="text-gray-700">{section.name}</div>
                        <div className="text-sm text-gray-500">{section.description}</div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Niveau:</span>
                          <span className="ml-2 font-medium">{section.level}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Type:</span>
                          <span className="ml-2 font-medium">
                            {section.isHeader ? 'En-tête' : 'Section'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Budget:</span>
                          <span className="ml-2 font-medium">
                            {section.budgetAmount ? formatCurrency(section.budgetAmount) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Responsable:</span>
                          <span className="ml-2 font-medium">{section.responsibleUser || 'Non défini'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistiques de consommation */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Consommation Budget</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Consommation actuelle</span>
                          <span className="text-lg font-bold text-gray-900">
                            {section.stats.budgetConsumption?.toFixed(1) || '0'}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              (section.stats.budgetConsumption || 0) > 90 ? 'bg-red-500' :
                              (section.stats.budgetConsumption || 0) > 80 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, section.stats.budgetConsumption || 0)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-gray-700">Budget alloué:</span>
                          <span className="font-medium">
                            {section.budgetAmount ? formatCurrency(section.budgetAmount) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                          <span className="text-gray-700">Montant consommé:</span>
                          <span className="font-medium">{formatCurrency(section.stats.allocatedAmount)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                          <span className="text-gray-700">Disponible:</span>
                          <span className="font-medium">
                            {section.budgetAmount ? 
                              formatCurrency(section.budgetAmount - section.stats.allocatedAmount) : 
                              'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                          <span className="text-gray-700">Affectations:</span>
                          <span className="font-medium">{section.stats.allocationsCount}</span>
                        </div>
                      </div>

                      {section.alertThreshold && 
                       (section.stats.budgetConsumption || 0) > section.alertThreshold && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium text-red-800">
                              Seuil d'alerte dépassé ({section.alertThreshold}%)
                            </span>
                          </div>
                          <p className="text-xs text-red-700 mt-1">
                            Budget consommé à {section.stats.budgetConsumption?.toFixed(1)}% 
                            • Contrôler les affectations futures
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Vue règles de ventilation */}
      {viewMode === 'rules' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <CogIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Règles de Ventilation
          </h2>
          
          <div className="space-y-6">
            {analyticalAxes.map((axis) => (
              <div key={axis.id} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  {React.createElement(getAxisIcon(axis.type), {
                    className: `h-5 w-5 mr-2 text-${getAxisColor(axis.type)}-600`
                  })}
                  {axis.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-900 mb-3">Comptes Obligatoires</h4>
                    <div className="space-y-2">
                      {axis.mandatoryOnAccounts.map((account) => (
                        <div key={account} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="font-mono text-sm">{account}</span>
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-red-900 mb-3">Comptes Interdits</h4>
                    <div className="space-y-2">
                      {axis.forbiddenOnAccounts.map((account) => (
                        <div key={account} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="font-mono text-sm">{account}</span>
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Affectation multiple:</span>
                      <span className="ml-2 font-medium">
                        {axis.allowMultipleAllocation ? 'Autorisée' : 'Interdite'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700">Équilibrage %:</span>
                      <span className="ml-2 font-medium">
                        {axis.requirePercentageBalance ? 'Obligatoire' : 'Optionnel'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticalAxesConfig;