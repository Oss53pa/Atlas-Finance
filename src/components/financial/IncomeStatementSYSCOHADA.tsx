import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalculatorIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface IncomeStatementData {
  id: string;
  company: {
    name: string;
    address: string;
  };
  fiscalYear: string;
  statementDate: string;
  
  // CHARGES
  // Activité d'exploitation
  merchandisePurchases: number;
  merchandiseStockVariation: number;
  rawMaterialsPurchases: number;
  rawMaterialsStockVariation: number;
  otherPurchases: number;
  externalServices: number;
  taxesAndDuties: number;
  staffCosts: number;
  otherOperatingExpenses: number;
  
  // Activité financière
  financialExpenses: number;
  
  // Activité exceptionnelle
  exceptionalExpenses: number;
  employeeParticipation: number;
  incomeTax: number;
  
  totalExpenses: number;
  
  // PRODUITS
  // Activité d'exploitation
  merchandiseSales: number;
  productionSold: number;
  productionStored: number;
  productionImmobilized: number;
  operatingSubsidies: number;
  otherOperatingIncome: number;
  provisionsReversals: number;
  
  // Activité financière
  financialIncome: number;
  
  // Activité exceptionnelle
  exceptionalIncome: number;
  
  totalIncome: number;
  
  // RESULTAT
  calculatedNetResult: number;
  
  // Validation
  isValidated: boolean;
  validatedBy?: string;
  validationDate?: string;
}

const IncomeStatementSYSCOHADA: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showComparison, setShowComparison] = useState(true);
  const [viewMode, setViewMode] = useState<'nature' | 'function'>('nature');

  const { data: incomeData, isLoading } = useQuery({
    queryKey: ['income-statement-syscohada', selectedPeriod],
    queryFn: async (): Promise<IncomeStatementData> => {
      // Mock data conforme SYSCOHADA
      return {
        id: '1',
        company: {
          name: 'WISEBOOK SARL',
          address: 'Yaoundé, Cameroun'
        },
        fiscalYear: '2024',
        statementDate: '2024-08-31',
        
        // CHARGES
        merchandisePurchases: 2800000,
        merchandiseStockVariation: 150000,
        rawMaterialsPurchases: 1200000,
        rawMaterialsStockVariation: -80000,
        otherPurchases: 450000,
        externalServices: 1800000,
        taxesAndDuties: 320000,
        staffCosts: 2100000,
        otherOperatingExpenses: 280000,
        
        financialExpenses: 180000,
        
        exceptionalExpenses: 45000,
        employeeParticipation: 0,
        incomeTax: 520000,
        
        totalExpenses: 9765000,
        
        // PRODUITS
        merchandiseSales: 4200000,
        productionSold: 7800000,
        productionStored: 200000,
        productionImmobilized: 150000,
        operatingSubsidies: 120000,
        otherOperatingIncome: 180000,
        provisionsReversals: 85000,
        
        financialIncome: 45000,
        
        exceptionalIncome: 80000,
        
        totalIncome: 12860000,
        
        calculatedNetResult: 3095000,
        
        isValidated: true,
        validatedBy: 'Marie Dubois',
        validationDate: '2024-08-31T16:30:00Z'
      };
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateMargin = (result: number, revenue: number) => {
    return revenue > 0 ? ((result / revenue) * 100).toFixed(1) : '0.0';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!incomeData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Aucune donnée de compte de résultat disponible</p>
      </div>
    );
  }

  // Calculs des soldes intermédiaires
  const grossProfit = incomeData.merchandiseSales - incomeData.merchandisePurchases - incomeData.merchandiseStockVariation;
  const production = incomeData.productionSold + incomeData.productionStored + incomeData.productionImmobilized;
  const valueAdded = grossProfit + production - (incomeData.rawMaterialsPurchases + incomeData.rawMaterialsStockVariation + incomeData.otherPurchases + incomeData.externalServices);
  const grossOperatingSurplus = valueAdded + incomeData.operatingSubsidies - incomeData.taxesAndDuties - incomeData.staffCosts;
  const operatingResult = grossOperatingSurplus + incomeData.otherOperatingIncome + incomeData.provisionsReversals - incomeData.otherOperatingExpenses;
  const financialResult = incomeData.financialIncome - incomeData.financialExpenses;
  const currentResultBeforeTax = operatingResult + financialResult;
  const exceptionalResult = incomeData.exceptionalIncome - incomeData.exceptionalExpenses;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2 text-indigo-600" />
              COMPTE DE RÉSULTAT SYSCOHADA
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-lg font-semibold text-gray-800">{incomeData.company.name}</p>
              <p className="text-sm text-gray-600">{incomeData.company.address}</p>
              <p className="text-sm text-gray-600">
                Exercice {incomeData.fiscalYear} - Du 01/01/{incomeData.fiscalYear} au {new Date(incomeData.statementDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {incomeData.isValidated ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              )}
              <span className={`text-sm font-medium ${
                incomeData.isValidated ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {incomeData.isValidated ? 'Validé' : 'En attente'}
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <EyeIcon className="h-4 w-4" />
                <span>Comparaison N-1</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                <ChartBarIcon className="h-4 w-4" />
                <span>Imprimer PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compte de Résultat */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-indigo-50">
              <tr>
                <th colSpan={2} className="px-6 py-4 text-center text-lg font-bold text-indigo-900 border-b-2 border-indigo-200">
                  COMPTE DE RÉSULTAT AU {new Date(incomeData.statementDate).toLocaleDateString('fr-FR')}
                </th>
                <th className="px-6 py-4 text-center text-lg font-bold text-indigo-900 border-b-2 border-indigo-200">
                  Exercice {incomeData.fiscalYear} (XAF)
                </th>
                {showComparison && (
                  <th className="px-6 py-4 text-center text-lg font-bold text-indigo-900 border-b-2 border-indigo-200">
                    Exercice {parseInt(incomeData.fiscalYear) - 1} (XAF)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* CHARGES */}
              <tr className="bg-red-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-red-900 text-lg">CHARGES</td>
                <td className="px-6 py-3"></td>
                {showComparison && <td className="px-6 py-3"></td>}
              </tr>
              
              <tr className="bg-red-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-red-800">ACTIVITÉ D'EXPLOITATION</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Achats de marchandises</td>
                <td className="px-6 py-2 text-sm text-gray-500">(601)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.merchandisePurchases)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">2,650,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Variation stocks marchandises</td>
                <td className="px-6 py-2 text-sm text-gray-500">(6031)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.merchandiseStockVariation)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">120,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Achats de matières premières</td>
                <td className="px-6 py-2 text-sm text-gray-500">(602)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.rawMaterialsPurchases)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">1,100,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Services extérieurs</td>
                <td className="px-6 py-2 text-sm text-gray-500">(61-62)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.externalServices)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">1,650,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Impôts, taxes et versements assimilés</td>
                <td className="px-6 py-2 text-sm text-gray-500">(63)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.taxesAndDuties)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">295,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Charges de personnel</td>
                <td className="px-6 py-2 text-sm text-gray-500">(64)</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(incomeData.staffCosts)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">1,950,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Autres charges</td>
                <td className="px-6 py-2 text-sm text-gray-500">(65)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.otherOperatingExpenses)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">250,000</td>}
              </tr>
              
              {/* Activité financière */}
              <tr className="bg-red-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-red-800">ACTIVITÉ FINANCIÈRE</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Charges financières</td>
                <td className="px-6 py-2 text-sm text-gray-500">(67)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.financialExpenses)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">165,000</td>}
              </tr>
              
              {/* Activité exceptionnelle */}
              <tr className="bg-red-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-red-800">ACTIVITÉ EXCEPTIONNELLE</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Charges exceptionnelles (HAO)</td>
                <td className="px-6 py-2 text-sm text-gray-500">(81-85)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.exceptionalExpenses)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">38,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Impôts sur le résultat</td>
                <td className="px-6 py-2 text-sm text-gray-500">(89)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.incomeTax)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">480,000</td>}
              </tr>
              
              {/* Total charges */}
              <tr className="bg-red-100 font-bold">
                <td colSpan={2} className="px-6 py-3 text-red-900">TOTAL CHARGES</td>
                <td className="px-6 py-3 text-right text-red-900">{formatCurrency(incomeData.totalExpenses)}</td>
                {showComparison && <td className="px-6 py-3 text-right text-red-900">8,968,000</td>}
              </tr>
              
              {/* Espace entre charges et produits */}
              <tr>
                <td colSpan={showComparison ? 4 : 3} className="py-2"></td>
              </tr>
              
              {/* PRODUITS */}
              <tr className="bg-green-50">
                <td colSpan={2} className="px-6 py-3 font-bold text-green-900 text-lg">PRODUITS</td>
                <td className="px-6 py-3"></td>
                {showComparison && <td className="px-6 py-3"></td>}
              </tr>
              
              <tr className="bg-green-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-green-800">ACTIVITÉ D'EXPLOITATION</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Ventes de marchandises</td>
                <td className="px-6 py-2 text-sm text-gray-500">(701)</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(incomeData.merchandiseSales)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">3,980,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Production vendue</td>
                <td className="px-6 py-2 text-sm text-gray-500">(702-708)</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(incomeData.productionSold)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">7,200,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Production stockée</td>
                <td className="px-6 py-2 text-sm text-gray-500">(713-714)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.productionStored)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">180,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Production immobilisée</td>
                <td className="px-6 py-2 text-sm text-gray-500">(72)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.productionImmobilized)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">130,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Subventions d'exploitation</td>
                <td className="px-6 py-2 text-sm text-gray-500">(74)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.operatingSubsidies)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">100,000</td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Autres produits</td>
                <td className="px-6 py-2 text-sm text-gray-500">(75)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.otherOperatingIncome)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">165,000</td>}
              </tr>
              
              {/* Activité financière */}
              <tr className="bg-green-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-green-800">ACTIVITÉ FINANCIÈRE</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Produits financiers</td>
                <td className="px-6 py-2 text-sm text-gray-500">(77)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.financialIncome)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">38,000</td>}
              </tr>
              
              {/* Activité exceptionnelle */}
              <tr className="bg-green-25">
                <td colSpan={2} className="px-6 py-2 font-semibold text-green-800">ACTIVITÉ EXCEPTIONNELLE</td>
                <td className="px-6 py-2"></td>
                {showComparison && <td className="px-6 py-2"></td>}
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-gray-700">Produits exceptionnels (HAO)</td>
                <td className="px-6 py-2 text-sm text-gray-500">(82-88)</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(incomeData.exceptionalIncome)}</td>
                {showComparison && <td className="px-6 py-2 text-right text-sm">65,000</td>}
              </tr>
              
              {/* Total produits */}
              <tr className="bg-green-100 font-bold">
                <td colSpan={2} className="px-6 py-3 text-green-900">TOTAL PRODUITS</td>
                <td className="px-6 py-3 text-right text-green-900">{formatCurrency(incomeData.totalIncome)}</td>
                {showComparison && <td className="px-6 py-3 text-right text-green-900">11,858,000</td>}
              </tr>
              
              {/* RÉSULTAT NET */}
              <tr className="bg-indigo-100 font-bold text-lg">
                <td colSpan={2} className="px-6 py-4 text-indigo-900">RÉSULTAT NET DE L'EXERCICE</td>
                <td className="px-6 py-4 text-right text-indigo-900">
                  {formatCurrency(incomeData.calculatedNetResult)}
                </td>
                {showComparison && <td className="px-6 py-4 text-right text-indigo-900">2,890,000</td>}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Soldes Intermédiaires de Gestion */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <CalculatorIcon className="h-5 w-5 mr-2 text-blue-600" />
          Soldes Intermédiaires de Gestion (SIG)
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Solde</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Montant (XAF)</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">% du CA</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Évolution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">1. Marge commerciale</td>
                <td className="px-6 py-3 text-right text-sm font-medium">{formatCurrency(grossProfit)}</td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(grossProfit, incomeData.merchandiseSales)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +5.2%
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">2. Production de l'exercice</td>
                <td className="px-6 py-3 text-right text-sm font-medium">{formatCurrency(production)}</td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(production, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +3.1%
                  </span>
                </td>
              </tr>
              
              <tr className="bg-blue-50">
                <td className="px-6 py-3 text-sm font-semibold text-blue-900">3. Valeur ajoutée</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-blue-900">{formatCurrency(valueAdded)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-blue-900">{calculateMargin(valueAdded, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +2.8%
                  </span>
                </td>
              </tr>
              
              <tr className="bg-green-50">
                <td className="px-6 py-3 text-sm font-semibold text-green-900">4. Excédent brut d'exploitation (EBE)</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-green-900">{formatCurrency(grossOperatingSurplus)}</td>
                <td className="px-6 py-3 text-right text-sm font-semibold text-green-900">{calculateMargin(grossOperatingSurplus, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <ArrowTrendingDownIcon className="w-3 h-3 mr-1" /> -1.5%
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">5. Résultat d'exploitation</td>
                <td className="px-6 py-3 text-right text-sm font-medium">{formatCurrency(operatingResult)}</td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(operatingResult, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +4.2%
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">6. Résultat financier</td>
                <td className="px-6 py-3 text-right text-sm font-medium">
                  <span className={financialResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(financialResult)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(financialResult, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <ArrowTrendingDownIcon className="w-3 h-3 mr-1" /> -8.3%
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">7. Résultat courant avant impôts</td>
                <td className="px-6 py-3 text-right text-sm font-medium">{formatCurrency(currentResultBeforeTax)}</td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(currentResultBeforeTax, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +6.7%
                  </span>
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">8. Résultat exceptionnel</td>
                <td className="px-6 py-3 text-right text-sm font-medium">
                  <span className={exceptionalResult >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(exceptionalResult)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right text-sm">{calculateMargin(exceptionalResult, incomeData.totalIncome)}%</td>
                <td className="px-6 py-3 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +12.5%
                  </span>
                </td>
              </tr>
              
              {/* RÉSULTAT NET FINAL */}
              <tr className="bg-indigo-100 font-bold text-lg">
                <td className="px-6 py-4 text-indigo-900">9. RÉSULTAT NET</td>
                <td className="px-6 py-4 text-right text-indigo-900">{formatCurrency(incomeData.calculatedNetResult)}</td>
                <td className="px-6 py-4 text-right text-indigo-900">{calculateMargin(incomeData.calculatedNetResult, incomeData.totalIncome)}%</td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" /> +7.1%
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Analyse de Rentabilité</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Marge commerciale:</span>
              <div className="text-right">
                <span className="text-sm font-medium">{calculateMargin(grossProfit, incomeData.merchandiseSales)}%</span>
                <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(calculateMargin(grossProfit, incomeData.merchandiseSales)))}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Marge d'exploitation:</span>
              <div className="text-right">
                <span className="text-sm font-medium">{calculateMargin(operatingResult, incomeData.totalIncome)}%</span>
                <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(calculateMargin(operatingResult, incomeData.totalIncome)))}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Marge nette:</span>
              <div className="text-right">
                <span className="text-sm font-medium text-indigo-600">{calculateMargin(incomeData.calculatedNetResult, incomeData.totalIncome)}%</span>
                <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${Math.min(100, parseFloat(calculateMargin(incomeData.calculatedNetResult, incomeData.totalIncome)))}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Structure des Coûts</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Achats et consommations:</span>
              <span className="text-sm font-medium">
                {((incomeData.merchandisePurchases + incomeData.rawMaterialsPurchases + incomeData.otherPurchases) / incomeData.totalExpenses * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Charges de personnel:</span>
              <span className="text-sm font-medium">
                {(incomeData.staffCosts / incomeData.totalExpenses * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Services extérieurs:</span>
              <span className="text-sm font-medium">
                {(incomeData.externalServices / incomeData.totalExpenses * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Charges financières:</span>
              <span className="text-sm font-medium">
                {(incomeData.financialExpenses / incomeData.totalExpenses * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Note de conformité */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
        <p className="text-center">
          Compte de résultat établi conformément aux dispositions du Système Comptable OHADA (SYSCOHADA) révisé en 2017.
          <br />
          Présentation par nature des charges et produits. Les montants sont exprimés en Francs CFA (XAF).
        </p>
      </div>
    </div>
  );
};

export default IncomeStatementSYSCOHADA;