import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface CashFlowStatementData {
  id: string;
  company: {
    name: string;
    address: string;
  };
  fiscalYear: string;
  statementDate: string;
  calculationMethod: 'DIRECT' | 'INDIRECT';
  
  // Flux d'exploitation (méthode indirecte)
  netResultForCashFlow: number;
  depreciationAndProvisions: number;
  provisionsReversals: number;
  valueAdjustments: number;
  selfFinancingCapacity: number;
  workingCapitalVariation: number;
  operatingCashFlow: number;
  
  // Flux d'investissement
  fixedAssetsAcquisitions: number;
  fixedAssetsDisposals: number;
  financialAssetsAcquisitions: number;
  financialAssetsDisposals: number;
  investmentCashFlow: number;
  
  // Flux de financement
  capitalIncrease: number;
  investmentSubsidiesReceived: number;
  newBorrowings: number;
  loanRepayments: number;
  dividendsPaid: number;
  financingCashFlow: number;
  
  // Variation de trésorerie
  cashFlowVariation: number;
  openingCashBalance: number;
  closingCashBalance: number;
  cashVariationControl: number;
  isCashFlowBalanced: boolean;
  
  // Validation
  isValidated: boolean;
  validatedBy?: string;
  validationDate?: string;
}

const CashFlowStatementSYSCOHADA: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showMethodDetails, setShowMethodDetails] = useState(true);
  const [viewMode, setViewMode] = useState<'standard' | 'analysis'>('standard');

  const { data: cashFlowData, isLoading } = useQuery({
    queryKey: ['cash-flow-statement-syscohada', selectedPeriod],
    queryFn: async (): Promise<CashFlowStatementData> => {
      // Mock data conforme SYSCOHADA
      return {
        id: '1',
        company: {
          name: 'WISEBOOK SARL',
          address: 'Yaoundé, Cameroun'
        },
        fiscalYear: '2024',
        statementDate: '2024-08-31',
        calculationMethod: 'INDIRECT',
        
        // Flux d'exploitation
        netResultForCashFlow: 1450000,
        depreciationAndProvisions: 850000,
        provisionsReversals: 120000,
        valueAdjustments: 25000,
        selfFinancingCapacity: 2205000,
        workingCapitalVariation: 380000,
        operatingCashFlow: 1825000,
        
        // Flux d'investissement
        fixedAssetsAcquisitions: 950000,
        fixedAssetsDisposals: 180000,
        financialAssetsAcquisitions: 200000,
        financialAssetsDisposals: 50000,
        investmentCashFlow: -920000,
        
        // Flux de financement
        capitalIncrease: 0,
        investmentSubsidiesReceived: 100000,
        newBorrowings: 800000,
        loanRepayments: 650000,
        dividendsPaid: 250000,
        financingCashFlow: 0,
        
        // Variation de trésorerie
        cashFlowVariation: 905000,
        openingCashBalance: 565000,
        closingCashBalance: 1470000,
        cashVariationControl: 905000,
        isCashFlowBalanced: true,
        
        isValidated: true,
        validatedBy: 'Marie Dubois',
        validationDate: '2024-08-31T17:00:00Z'
      };
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFlowIcon = (value: number) => {
    if (value > 0) return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  const getFlowColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!cashFlowData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Aucune donnée de tableau de flux disponible</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-2 text-indigo-600" />
              TABLEAU DES FLUX DE TRÉSORERIE (TAFIRE)
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-lg font-semibold text-gray-800">{cashFlowData.company.name}</p>
              <p className="text-sm text-gray-600">{cashFlowData.company.address}</p>
              <p className="text-sm text-gray-600">
                Exercice {cashFlowData.fiscalYear} - Méthode {cashFlowData.calculationMethod === 'INDIRECT' ? 'indirecte' : 'directe'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {cashFlowData.isCashFlowBalanced ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                cashFlowData.isCashFlowBalanced ? 'text-green-600' : 'text-red-600'
              }`}>
                {cashFlowData.isCashFlowBalanced ? 'Flux équilibrés' : 'Flux déséquilibrés'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <EyeIcon className="h-4 w-4" />
                <span>Méthode directe</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                <DocumentTextIcon className="h-4 w-4" />
                <span>Imprimer PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs des flux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flux d'Exploitation</p>
              <p className={`text-2xl font-bold ${getFlowColor(cashFlowData.operatingCashFlow)}`}>
                {formatCurrency(cashFlowData.operatingCashFlow)}
              </p>
              <p className="text-sm text-green-600">CAF: {formatCurrency(cashFlowData.selfFinancingCapacity)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              {getFlowIcon(cashFlowData.operatingCashFlow)}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flux d'Investissement</p>
              <p className={`text-2xl font-bold ${getFlowColor(cashFlowData.investmentCashFlow)}`}>
                {formatCurrency(cashFlowData.investmentCashFlow)}
              </p>
              <p className="text-sm text-blue-600">Acquisitions nettes</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              {getFlowIcon(cashFlowData.investmentCashFlow)}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flux de Financement</p>
              <p className={`text-2xl font-bold ${getFlowColor(cashFlowData.financingCashFlow)}`}>
                {formatCurrency(cashFlowData.financingCashFlow)}
              </p>
              <p className="text-sm text-purple-600">Emprunts nets</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              {getFlowIcon(cashFlowData.financingCashFlow)}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Variation Trésorerie</p>
              <p className={`text-2xl font-bold ${getFlowColor(cashFlowData.cashFlowVariation)}`}>
                {formatCurrency(cashFlowData.cashFlowVariation)}
              </p>
              <p className="text-sm text-orange-600">Total période</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              {getFlowIcon(cashFlowData.cashFlowVariation)}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des flux de trésorerie */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-indigo-50">
              <tr>
                <th colSpan={2} className="px-6 py-4 text-center text-lg font-bold text-indigo-900 border-b-2 border-indigo-200">
                  TABLEAU DES FLUX DE TRÉSORERIE - Exercice {cashFlowData.fiscalYear}
                </th>
                <th className="px-6 py-4 text-center text-lg font-bold text-indigo-900 border-b-2 border-indigo-200">
                  Montant (XAF)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* FLUX D'EXPLOITATION */}
              <tr className="bg-green-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-green-900 text-lg">
                  FLUX DE TRÉSORERIE LIÉS À L'ACTIVITÉ
                </td>
                <td className="px-6 py-3"></td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Résultat net de l'exercice</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(cashFlowData.netResultForCashFlow)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Dotations aux amortissements et provisions</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-green-600">+{formatCurrency(cashFlowData.depreciationAndProvisions)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Reprises de provisions</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(cashFlowData.provisionsReversals)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">± Plus et moins-values de cession</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(cashFlowData.valueAdjustments)}</td>
              </tr>
              
              <tr className="bg-green-100">
                <td className="px-6 py-3 pl-8 text-sm font-semibold text-green-900">= Capacité d'autofinancement (CAF)</td>
                <td className="px-6 py-3 text-sm text-gray-500"></td>
                <td className="px-6 py-3 text-right text-sm font-bold text-green-900">
                  {formatCurrency(cashFlowData.selfFinancingCapacity)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Variation du besoin en fonds de roulement</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(Math.abs(cashFlowData.workingCapitalVariation))}</td>
              </tr>
              
              <tr className="bg-green-200 font-bold">
                <td className="px-6 py-4 font-bold text-green-900">
                  = FLUX NET DE TRÉSORERIE GÉNÉRÉ PAR L'ACTIVITÉ
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right font-bold text-green-900 text-lg">
                  {formatCurrency(cashFlowData.operatingCashFlow)}
                </td>
              </tr>
              
              {/* FLUX D'INVESTISSEMENT */}
              <tr className="bg-blue-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-blue-900 text-lg">
                  FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS D'INVESTISSEMENT
                </td>
                <td className="px-6 py-3"></td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Acquisitions d'immobilisations corporelles et incorporelles</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(cashFlowData.fixedAssetsAcquisitions)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Cessions d'immobilisations corporelles et incorporelles</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-green-600">+{formatCurrency(cashFlowData.fixedAssetsDisposals)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Acquisitions d'immobilisations financières</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(cashFlowData.financialAssetsAcquisitions)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Cessions d'immobilisations financières</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-green-600">+{formatCurrency(cashFlowData.financialAssetsDisposals)}</td>
              </tr>
              
              <tr className="bg-blue-200 font-bold">
                <td className="px-6 py-4 font-bold text-blue-900">
                  = FLUX NET DE TRÉSORERIE LIÉ AUX OPÉRATIONS D'INVESTISSEMENT
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right font-bold text-blue-900 text-lg">
                  {formatCurrency(cashFlowData.investmentCashFlow)}
                </td>
              </tr>
              
              {/* FLUX DE FINANCEMENT */}
              <tr className="bg-purple-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-purple-900 text-lg">
                  FLUX DE TRÉSORERIE LIÉS AUX OPÉRATIONS DE FINANCEMENT
                </td>
                <td className="px-6 py-3"></td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Augmentation de capital en numéraire</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(cashFlowData.capitalIncrease)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Subventions d'investissement reçues</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-green-600">+{formatCurrency(cashFlowData.investmentSubsidiesReceived)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">+ Nouveaux emprunts</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-green-600">+{formatCurrency(cashFlowData.newBorrowings)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Remboursements d'emprunts</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(cashFlowData.loanRepayments)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">- Dividendes versés</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm text-red-600">-{formatCurrency(cashFlowData.dividendsPaid)}</td>
              </tr>
              
              <tr className="bg-purple-200 font-bold">
                <td className="px-6 py-4 font-bold text-purple-900">
                  = FLUX NET DE TRÉSORERIE LIÉ AUX OPÉRATIONS DE FINANCEMENT
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right font-bold text-purple-900 text-lg">
                  {formatCurrency(cashFlowData.financingCashFlow)}
                </td>
              </tr>
              
              {/* VARIATION DE TRÉSORERIE */}
              <tr className="bg-orange-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-orange-900 text-lg">
                  VARIATION DE TRÉSORERIE
                </td>
                <td className="px-6 py-3"></td>
              </tr>
              
              <tr className="bg-orange-100">
                <td className="px-6 py-3 font-bold text-orange-900">
                  = VARIATION DE TRÉSORERIE (Flux nets)
                </td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-bold text-orange-900 text-lg">
                  {formatCurrency(cashFlowData.cashFlowVariation)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 text-sm text-gray-700">Trésorerie d'ouverture</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(cashFlowData.openingCashBalance)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 text-sm text-gray-700">Trésorerie de clôture</td>
                <td className="px-6 py-2 text-sm text-gray-500"></td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(cashFlowData.closingCashBalance)}</td>
              </tr>
              
              {/* Contrôle */}
              <tr className="bg-gray-100">
                <td className="px-6 py-3 font-medium text-gray-900">
                  CONTRÔLE: Variation calculée (Clôture - Ouverture)
                </td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-medium text-gray-900">
                  {formatCurrency(cashFlowData.cashVariationControl)}
                </td>
              </tr>
              
              <tr className={`${cashFlowData.isCashFlowBalanced ? 'bg-green-100' : 'bg-red-100'}`}>
                <td className="px-6 py-3 font-bold">
                  <div className="flex items-center">
                    {cashFlowData.isCashFlowBalanced ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    ÉCART DE CONTRÔLE
                  </div>
                </td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-bold">
                  <span className={cashFlowData.isCashFlowBalanced ? 'text-green-900' : 'text-red-900'}>
                    {formatCurrency(Math.abs(cashFlowData.cashFlowVariation - cashFlowData.cashVariationControl))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Analyses complémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <CalculatorIcon className="h-5 w-5 mr-2 text-blue-600" />
            Indicateurs de Flux
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Free Cash Flow:</span>
              <div className="text-right">
                <span className="text-sm font-bold text-blue-600">
                  {formatCurrency(cashFlowData.operatingCashFlow + cashFlowData.investmentCashFlow)}
                </span>
                <p className="text-xs text-gray-500">Flux d'exploitation + Investissement</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ratio CAF/Investissement:</span>
              <span className="text-sm font-medium">
                {cashFlowData.fixedAssetsAcquisitions > 0 
                  ? (cashFlowData.selfFinancingCapacity / cashFlowData.fixedAssetsAcquisitions * 100).toFixed(1)
                  : '∞'
                }%
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Couverture des investissements:</span>
              <span className={`text-sm font-medium ${
                cashFlowData.selfFinancingCapacity >= cashFlowData.fixedAssetsAcquisitions ? 'text-green-600' : 'text-red-600'
              }`}>
                {cashFlowData.selfFinancingCapacity >= cashFlowData.fixedAssetsAcquisitions ? 'Couverte' : 'Insuffisante'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Autonomie de financement:</span>
              <span className="text-sm font-medium">
                {cashFlowData.newBorrowings > 0 
                  ? ((cashFlowData.selfFinancingCapacity / (cashFlowData.selfFinancingCapacity + cashFlowData.newBorrowings)) * 100).toFixed(1)
                  : '100.0'
                }%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analyse Qualitative</h3>
          <div className="space-y-4">
            {/* Flux d'exploitation */}
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Flux d'Exploitation</span>
              </div>
              <p className="text-xs text-green-800">
                {cashFlowData.operatingCashFlow > 0 
                  ? 'Flux positif - L\'activité génère de la trésorerie'
                  : 'Flux négatif - L\'activité consomme de la trésorerie'
                }
              </p>
            </div>
            
            {/* Flux d'investissement */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowTrendingDownIcon className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Flux d'Investissement</span>
              </div>
              <p className="text-xs text-blue-800">
                {cashFlowData.investmentCashFlow < 0 
                  ? 'Flux négatif - Phase d\'investissement et de croissance'
                  : 'Flux positif - Cessions supérieures aux acquisitions'
                }
              </p>
            </div>
            
            {/* Flux de financement */}
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <CurrencyDollarIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Flux de Financement</span>
              </div>
              <p className="text-xs text-purple-800">
                {cashFlowData.financingCashFlow > 0 
                  ? 'Apport net de financement externe'
                  : cashFlowData.financingCashFlow < 0
                  ? 'Remboursement net de financements'
                  : 'Flux équilibré'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note méthodologique */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="text-xs text-gray-600">
            <p className="font-medium text-gray-700 mb-2">Note méthodologique:</p>
            <p>
              Tableau établi selon la méthode {cashFlowData.calculationMethod === 'INDIRECT' ? 'indirecte' : 'directe'} 
              conformément aux dispositions du Système Comptable OHADA (SYSCOHADA) révisé en 2017.
            </p>
            <p className="mt-1">
              La méthode indirecte part du résultat net et effectue les retraitements nécessaires pour obtenir 
              les flux de trésorerie réels. Les montants sont exprimés en Francs CFA (XAF).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowStatementSYSCOHADA;