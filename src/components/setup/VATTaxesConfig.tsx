import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalculatorIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  TagIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  FlagIcon,
  PercentIcon
} from '@heroicons/react/24/outline';

interface VATRate {
  id: string;
  code: string;
  name: string;
  rate: number;
  applicableTo: 'SALES' | 'PURCHASES' | 'BOTH';
  region: 'CEMAC' | 'UEMOA' | 'OTHER';
  
  // Comptes automatiques
  collectAccount: string;  // TVA collectée
  deductibleAccount: string;  // TVA déductible
  payableAccount: string;   // TVA à décaisser
  creditAccount: string;    // Crédit de TVA
  
  // Conditions d'application
  productCategories: string[];
  exemptions: string[];
  
  // Paramètres avancés
  isDefault: boolean;
  isActive: boolean;
  effectiveDate: string;
  endDate?: string;
  
  // Règles spéciales
  reverseCharge: boolean;
  autoLiquidation: boolean;
  territorialityRules: string[];
}

interface TaxRule {
  id: string;
  name: string;
  type: 'PRECOMPTE' | 'RETENUE_SOURCE' | 'TSR' | 'ACCISES' | 'DOUANE';
  rate: number;
  baseCalculation: 'HT' | 'TTC' | 'CUSTOM';
  applicableAccounts: string[];
  thirdPartyTypes: string[];
  
  // Seuils et conditions
  minAmount?: number;
  maxAmount?: number;
  conditions: string[];
  
  // Comptes de comptabilisation
  chargeAccount: string;
  liabilityAccount: string;
  
  isActive: boolean;
  region: string[];
}

const VATTaxesConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vat' | 'taxes' | 'automation' | 'reporting'>('vat');
  const [selectedRegion, setSelectedRegion] = useState<'CEMAC' | 'UEMOA' | 'OTHER'>('CEMAC');
  const [showCreateVATModal, setShowCreateVATModal] = useState(false);
  const [selectedVATRate, setSelectedVATRate] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: vatRates = [], isLoading: vatLoading } = useQuery({
    queryKey: ['vat-rates', selectedRegion],
    queryFn: async (): Promise<VATRate[]> => {
      // Configuration TVA selon région
      const cemacRates: VATRate[] = [
        {
          id: '1',
          code: 'TVA_NORMAL',
          name: 'TVA Normale CEMAC',
          rate: 19.25,
          applicableTo: 'BOTH',
          region: 'CEMAC',
          collectAccount: '4431',
          deductibleAccount: '4432',
          payableAccount: '4434',
          creditAccount: '4435',
          productCategories: ['GOODS', 'SERVICES'],
          exemptions: ['EXPORT', 'MEDICAL', 'EDUCATION'],
          isDefault: true,
          isActive: true,
          effectiveDate: '2024-01-01',
          reverseCharge: false,
          autoLiquidation: false,
          territorialityRules: ['CAMEROUN', 'GABON', 'TCHAD', 'RCA', 'CONGO', 'GUINEE_EQ']
        },
        {
          id: '2',
          code: 'TVA_REDUIT',
          name: 'TVA Réduite',
          rate: 5.5,
          applicableTo: 'BOTH',
          region: 'CEMAC',
          collectAccount: '4431',
          deductibleAccount: '4432',
          payableAccount: '4434',
          creditAccount: '4435',
          productCategories: ['FOOD_BASIC', 'MEDICINES'],
          exemptions: [],
          isDefault: false,
          isActive: true,
          effectiveDate: '2024-01-01',
          reverseCharge: false,
          autoLiquidation: false,
          territorialityRules: ['CAMEROUN']
        },
        {
          id: '3',
          code: 'TVA_ZERO',
          name: 'TVA à Taux Zéro',
          rate: 0,
          applicableTo: 'SALES',
          region: 'CEMAC',
          collectAccount: '4431',
          deductibleAccount: '4432',
          payableAccount: '4434',
          creditAccount: '4435',
          productCategories: ['EXPORT', 'INTERNATIONAL_TRANSPORT'],
          exemptions: [],
          isDefault: false,
          isActive: true,
          effectiveDate: '2024-01-01',
          reverseCharge: false,
          autoLiquidation: false,
          territorialityRules: ['EXPORT']
        }
      ];

      return selectedRegion === 'CEMAC' ? cemacRates : 
             selectedRegion === 'UEMOA' ? cemacRates.map(rate => ({
               ...rate,
               rate: rate.code === 'TVA_NORMAL' ? 18 : rate.rate,
               region: 'UEMOA'
             })) : [];
    }
  });

  const { data: taxRules = [] } = useQuery({
    queryKey: ['tax-rules', selectedRegion],
    queryFn: async (): Promise<TaxRule[]> => [
      {
        id: '1',
        name: 'Précompte sur Achats',
        type: 'PRECOMPTE',
        rate: 0.5,
        baseCalculation: 'HT',
        applicableAccounts: ['601', '602', '604', '605'],
        thirdPartyTypes: ['SUPPLIER_LOCAL'],
        minAmount: 1000000,
        conditions: ['SUPPLIER_PROFESSIONAL'],
        chargeAccount: '4452',
        liabilityAccount: '4454',
        isActive: true,
        region: ['CAMEROUN']
      },
      {
        id: '2',
        name: 'Retenue à la Source BIC',
        type: 'RETENUE_SOURCE',
        rate: 5.5,
        baseCalculation: 'HT',
        applicableAccounts: ['605', '622', '624'],
        thirdPartyTypes: ['SUPPLIER_PROFESSIONAL'],
        minAmount: 50000,
        conditions: ['PROFESSIONAL_SERVICE'],
        chargeAccount: '4451',
        liabilityAccount: '4453',
        isActive: true,
        region: ['CAMEROUN', 'GABON']
      },
      {
        id: '3',
        name: 'TSR - Taxe Spéciale sur les Revenus',
        type: 'TSR',
        rate: 25,
        baseCalculation: 'HT',
        applicableAccounts: ['641', '642', '644'],
        thirdPartyTypes: ['EMPLOYEE'],
        minAmount: 2000000,
        conditions: ['SALARY_ABOVE_THRESHOLD'],
        chargeAccount: '644',
        liabilityAccount: '447',
        isActive: true,
        region: ['CAMEROUN']
      }
    ]
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: selectedRegion === 'CEMAC' ? 'XAF' : selectedRegion === 'UEMOA' ? 'XOF' : 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRegionFlag = (region: string) => {
    switch (region) {
      case 'CEMAC': return '🇨🇲'; // Cameroun comme représentant
      case 'UEMOA': return '🇸🇳'; // Sénégal comme représentant
      default: return '🌍';
    }
  };

  const getVATColor = (rate: number) => {
    if (rate === 0) return 'text-gray-600';
    if (rate < 10) return 'text-green-600';
    if (rate < 20) return 'text-blue-600';
    return 'text-purple-600';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <PercentIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Configuration TVA et Taxes
            </h1>
            <p className="text-gray-600 mt-2">
              Paramétrage fiscal selon zones CEMAC/UEMOA et réglementations locales
            </p>
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="CEMAC">{getRegionFlag('CEMAC')} Zone CEMAC</option>
              <option value="UEMOA">{getRegionFlag('UEMOA')} Zone UEMOA</option>
              <option value="OTHER">🌍 Autre région</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'vat', label: 'Taux de TVA', icon: PercentIcon },
            { id: 'taxes', label: 'Autres Taxes', icon: CurrencyDollarIcon },
            { id: 'automation', label: 'Automatisation', icon: Cog6ToothIcon },
            { id: 'reporting', label: 'Déclarations', icon: DocumentTextIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet TVA */}
      {activeTab === 'vat' && (
        <div className="space-y-6">
          {/* Taux de TVA configurés */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Taux de TVA - Zone {selectedRegion} {getRegionFlag(selectedRegion)}
              </h2>
              <button
                onClick={() => setShowCreateVATModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Nouveau Taux</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vatRates.map((vatRate) => (
                <div key={vatRate.id} className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${
                  selectedVATRate === vatRate.id 
                    ? 'border-indigo-300 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedVATRate(vatRate.id)}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{vatRate.name}</h3>
                      <span className="text-xs text-gray-700">{vatRate.code}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-2xl font-bold ${getVATColor(vatRate.rate)}`}>
                        {vatRate.rate}%
                      </span>
                      {vatRate.isDefault && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Défaut
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Application:</span>
                      <span className="font-medium">
                        {vatRate.applicableTo === 'BOTH' ? 'Achats & Ventes' :
                         vatRate.applicableTo === 'SALES' ? 'Ventes uniquement' :
                         'Achats uniquement'}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Compte collecté:</span>
                      <span className="font-mono font-medium">{vatRate.collectAccount}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Compte déductible:</span>
                      <span className="font-mono font-medium">{vatRate.deductibleAccount}</span>
                    </div>

                    <div className="text-sm">
                      <span className="text-gray-600">Catégories:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vatRate.productCategories.slice(0, 2).map((category) => (
                          <span key={category} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {category}
                          </span>
                        ))}
                        {vatRate.productCategories.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                            +{vatRate.productCategories.length - 2}
                          </span>
                        )}
                      </div>
                    </div>

                    {vatRate.exemptions.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-600">Exonérations:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {vatRate.exemptions.slice(0, 2).map((exemption) => (
                            <span key={exemption} className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              {exemption}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        {vatRate.isActive ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                        <span className={`text-xs ${vatRate.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {vatRate.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="p-1 text-gray-700 hover:text-indigo-600" aria-label="Modifier">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-700 hover:text-red-600" aria-label="Supprimer">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Configuration spéciale CEMAC */}
            {selectedRegion === 'CEMAC' && (
              <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                  <FlagIcon className="h-5 w-5 mr-2" />
                  Spécificités CEMAC
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Composition TVA Normale (19.25%)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-blue-700">TVA de base:</span>
                        <span className="font-medium">18.00%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Centimes additionnels:</span>
                        <span className="font-medium">1.25%</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-200 pt-2">
                        <span className="text-blue-700 font-medium">Total:</span>
                        <span className="font-bold">19.25%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Territorialité</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div>• Livraisons intracommunautaires: Exonérées</div>
                      <div>• Exportations hors CEMAC: TVA 0%</div>
                      <div>• Services internationaux: Selon lieu de prestation</div>
                      <div>• Autoliquidation: Importations B2B</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Onglet Autres Taxes */}
      {activeTab === 'taxes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Autres Taxes et Prélèvements</h2>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
                <PlusIcon className="h-5 w-5" />
                <span>Nouvelle Taxe</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Taxe
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Taux
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Comptes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Conditions
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Région
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
                  {taxRules.map((tax) => (
                    <tr key={tax.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{tax.name}</div>
                        <div className="text-sm text-gray-700">
                          Base: {tax.baseCalculation}
                          {tax.minAmount && ` • Seuil: ${formatCurrency(tax.minAmount)}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tax.type === 'PRECOMPTE' ? 'bg-blue-100 text-blue-800' :
                          tax.type === 'RETENUE_SOURCE' ? 'bg-green-100 text-green-800' :
                          tax.type === 'TSR' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tax.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-lg font-bold text-gray-900">{tax.rate}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div>Charge: <span className="font-mono">{tax.chargeAccount}</span></div>
                          <div>Dette: <span className="font-mono">{tax.liabilityAccount}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {tax.conditions.slice(0, 2).map((condition) => (
                            <span key={condition} className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              {condition}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {tax.region.map((region) => (
                            <span key={region} className="text-xs">
                              {region === 'CAMEROUN' ? '🇨🇲' : 
                               region === 'GABON' ? '🇬🇦' : 
                               region === 'TCHAD' ? '🇹🇩' : '🌍'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tax.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tax.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-2 justify-center">
                          <button className="text-indigo-600 hover:text-indigo-900" aria-label="Modifier">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900" aria-label="Supprimer">
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

          {/* Configuration détaillée du taux sélectionné */}
          {selectedVATRate && (() => {
            const vatRate = vatRates.find(vat => vat.id === selectedVATRate);
            if (!vatRate) return null;

            return (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Configuration Détaillée - {vatRate.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Comptes Automatiques</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">TVA collectée:</span>
                        <span className="font-mono font-medium">{vatRate.collectAccount}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">TVA déductible:</span>
                        <span className="font-mono font-medium">{vatRate.deductibleAccount}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-red-50 rounded-lg">
                        <span className="text-gray-700">TVA à décaisser:</span>
                        <span className="font-mono font-medium">{vatRate.payableAccount}</span>
                      </div>
                      <div className="flex justify-between p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Crédit de TVA:</span>
                        <span className="font-mono font-medium">{vatRate.creditAccount}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Règles d'Application</h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 mb-2">Catégories de Produits</div>
                        <div className="flex flex-wrap gap-2">
                          {vatRate.productCategories.map((category) => (
                            <span key={category} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 mb-2">Exonérations</div>
                        <div className="flex flex-wrap gap-2">
                          {vatRate.exemptions.map((exemption) => (
                            <span key={exemption} className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              {exemption}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-900 mb-2">Territorialité</div>
                        <div className="flex flex-wrap gap-2">
                          {vatRate.territorialityRules.map((territory) => (
                            <span key={territory} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                              {territory}
                            </span>
                          ))}
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

      {/* Onglet Automatisation */}
      {activeTab === 'automation' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Cog6ToothIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Automatisation Fiscale
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Calculs Automatiques</h3>
              <div className="space-y-4">
                {[
                  {
                    title: 'Auto-calcul TVA sur factures',
                    description: 'Calcul automatique selon le compte et le tiers',
                    enabled: true
                  },
                  {
                    title: 'Génération écritures TVA',
                    description: 'Création automatique lignes de TVA',
                    enabled: true
                  },
                  {
                    title: 'Précompte automatique',
                    description: 'Application selon seuils et conditions',
                    enabled: false
                  },
                  {
                    title: 'Retenues à la source',
                    description: 'Calcul selon type de prestation',
                    enabled: false
                  }
                ].map((automation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{automation.title}</div>
                      <div className="text-sm text-gray-600">{automation.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={automation.enabled}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className={`text-sm ${automation.enabled ? 'text-green-600' : 'text-gray-700'}`}>
                        {automation.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Validations et Contrôles</h3>
              <div className="space-y-4">
                {[
                  {
                    title: 'Validation cohérence TVA',
                    description: 'Vérification équilibre TVA collectée/déductible',
                    enabled: true
                  },
                  {
                    title: 'Contrôle seuils taxes',
                    description: 'Alerte si dépassement seuils légaux',
                    enabled: true
                  },
                  {
                    title: 'Vérification territorialité',
                    description: 'Contrôle règles territoriales TVA',
                    enabled: false
                  },
                  {
                    title: 'Audit trail fiscal',
                    description: 'Traçabilité complète opérations fiscales',
                    enabled: true
                  }
                ].map((control, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{control.title}</div>
                      <div className="text-sm text-gray-600">{control.description}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={control.enabled}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className={`text-sm ${control.enabled ? 'text-green-600' : 'text-gray-700'}`}>
                        {control.enabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Déclarations */}
      {activeTab === 'reporting' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Déclarations Fiscales Automatisées
          </h2>
          
          <div className="text-center text-gray-700 py-12">
            <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-700" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Module en Développement</h3>
            <p className="text-gray-600 mb-4">
              Configuration des déclarations TVA, BIC, IS selon calendrier fiscal
            </p>
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
              <Cog6ToothIcon className="h-5 w-5" />
              <span>Disponible prochainement</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VATTaxesConfig;