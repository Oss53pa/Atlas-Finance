import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  BuildingIcon,
  ScaleIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

interface BalanceSheetData {
  id: string;
  company: {
    name: string;
    address: string;
  };
  fiscalYear: string;
  statementDate: string;
  
  // ACTIF
  // Actif immobilisé
  intangibleAssetsGross: number;
  intangibleAssetsDepreciation: number;
  intangibleAssetsNet: number;
  
  tangibleAssetsGross: number;
  tangibleAssetsDepreciation: number;
  tangibleAssetsNet: number;
  
  advancesOnFixedAssets: number;
  
  financialAssetsGross: number;
  financialAssetsProvisions: number;
  financialAssetsNet: number;
  
  totalFixedAssets: number;
  
  // Actif circulant
  haoCurrentAssets: number;
  
  stocksGross: number;
  stocksProvisions: number;
  stocksNet: number;
  
  receivablesGross: number;
  receivablesProvisions: number;
  receivablesNet: number;
  
  totalCurrentAssets: number;
  
  // Trésorerie-Actif
  marketableSecurities: number;
  valuesToCollect: number;
  cashAndBanks: number;
  totalTreasuryAssets: number;
  
  currencyTranslationDiffAssets: number;
  totalAssets: number;
  
  // PASSIF
  // Capitaux propres
  shareCapital: number;
  uncalledShareCapital: number;
  premiumsAndReserves: number;
  revaluationDifferences: number;
  netResult: number;
  otherEquity: number;
  totalEquity: number;
  
  // Dettes financières
  investmentSubsidies: number;
  regulatedProvisions: number;
  financialDebts: number;
  financialProvisions: number;
  totalFinancialDebts: number;
  
  // Passif circulant
  haoCurrentLiabilities: number;
  customerAdvances: number;
  suppliersAndRelated: number;
  taxAndSocialDebts: number;
  otherDebts: number;
  shortTermProvisions: number;
  totalCurrentLiabilities: number;
  
  // Trésorerie-Passif
  bankOverdrafts: number;
  totalTreasuryLiabilities: number;
  
  currencyTranslationDiffLiabilities: number;
  totalLiabilities: number;
  
  // Contrôles
  isBalanced: boolean;
  balanceDifference: number;
  isValidated: boolean;
}

const BalanceSheetSYSCOHADA: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showPreviousYear, setShowPreviousYear] = useState(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['balance-sheet-syscohada', selectedPeriod],
    queryFn: async (): Promise<BalanceSheetData> => {
      // Mock data conforme SYSCOHADA
      return {
        id: '1',
        company: {
          name: 'ATLAS FINANCE SARL',
          address: 'Yaoundé, Cameroun'
        },
        fiscalYear: '2024',
        statementDate: '2024-08-31',
        
        // ACTIF
        intangibleAssetsGross: 500000,
        intangibleAssetsDepreciation: 150000,
        intangibleAssetsNet: 350000,
        
        tangibleAssetsGross: 8500000,
        tangibleAssetsDepreciation: 3200000,
        tangibleAssetsNet: 5300000,
        
        advancesOnFixedAssets: 200000,
        
        financialAssetsGross: 1200000,
        financialAssetsProvisions: 100000,
        financialAssetsNet: 1100000,
        
        totalFixedAssets: 6950000,
        
        haoCurrentAssets: 150000,
        
        stocksGross: 2800000,
        stocksProvisions: 180000,
        stocksNet: 2620000,
        
        receivablesGross: 4200000,
        receivablesProvisions: 320000,
        receivablesNet: 3880000,
        
        totalCurrentAssets: 6650000,
        
        marketableSecurities: 500000,
        valuesToCollect: 120000,
        cashAndBanks: 1850000,
        totalTreasuryAssets: 2470000,
        
        currencyTranslationDiffAssets: 25000,
        totalAssets: 16095000,
        
        // PASSIF
        shareCapital: 3000000,
        uncalledShareCapital: 0,
        premiumsAndReserves: 2200000,
        revaluationDifferences: 0,
        netResult: 1450000,
        otherEquity: 150000,
        totalEquity: 6800000,
        
        investmentSubsidies: 800000,
        regulatedProvisions: 200000,
        financialDebts: 4500000,
        financialProvisions: 180000,
        totalFinancialDebts: 5680000,
        
        haoCurrentLiabilities: 80000,
        customerAdvances: 320000,
        suppliersAndRelated: 1850000,
        taxAndSocialDebts: 980000,
        otherDebts: 350000,
        shortTermProvisions: 120000,
        totalCurrentLiabilities: 3700000,
        
        bankOverdrafts: 0,
        totalTreasuryLiabilities: 0,
        
        currencyTranslationDiffLiabilities: 15000,
        totalLiabilities: 16095000,
        
        isBalanced: true,
        balanceDifference: 0,
        isValidated: true
      };
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6A8A82]"></div>
      </div>
    );
  }

  if (!balanceData) {
    return (
      <div className="text-center p-8">
        <p className="text-[#191919]/50">Aucune donnée de bilan disponible</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-[#ECECEC] p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-[#191919] flex items-center">
              <ScaleIcon className="h-6 w-6 mr-2 text-[#6A8A82]" />
              BILAN SYSCOHADA
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-lg font-semibold text-[#191919]/90">{balanceData.company.name}</p>
              <p className="text-sm text-[#191919]/70">{balanceData.company.address}</p>
              <p className="text-sm text-[#191919]/70">
                Exercice {balanceData.fiscalYear} - Arrêté au {new Date(balanceData.statementDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {balanceData.isBalanced ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                balanceData.isBalanced ? 'text-[#6A8A82]' : 'text-red-600'
              }`}>
                {balanceData.isBalanced ? 'Équilibré' : `Écart: ${formatCurrency(balanceData.balanceDifference)} XAF`}
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 border border-[#ECECEC] rounded-md hover:bg-[#ECECEC]">
                <EyeIcon className="h-4 w-4" />
                <span>Voir N-1</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 border border-[#ECECEC] rounded-md hover:bg-[#ECECEC]">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-[#F0F3F2] rounded-md hover:bg-[#A66B2A]">
                <DocumentTextIcon className="h-4 w-4" />
                <span>Imprimer PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bilan SYSCOHADA */}
      <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-[#ECECEC] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#6A8A82]">
              <tr>
                <th colSpan={3} className="px-6 py-4 text-center text-lg font-bold text-[#F0F3F2] border-b-2 border-[#6A8A82]">
                  BILAN AU {new Date(balanceData.statementDate).toLocaleDateString('fr-FR')} - Exercice {balanceData.fiscalYear}
                </th>
                <th colSpan={3} className="px-6 py-4 text-center text-lg font-bold text-[#F0F3F2] border-b-2 border-[#6A8A82]">
                  (en XAF)
                </th>
              </tr>
              <tr className="bg-[#ECECEC]">
                <th className="px-6 py-3 text-left text-sm font-bold text-[#191919] w-1/2">ACTIF</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#191919] w-1/6">BRUT</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#191919] w-1/6">AMORT/PROV</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#191919] w-1/6">NET</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-[#191919] w-1/2">PASSIF</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#191919] w-1/6">MONTANT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECECEC]">
              {/* ACTIF IMMOBILISE */}
              <tr className="bg-[#6A8A82]/10">
                <td className="px-6 py-3 font-semibold text-[#6A8A82]">ACTIF IMMOBILISE</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#6A8A82]">
                  {formatCurrency(balanceData.totalFixedAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#B87333]">CAPITAUX PROPRES</td>
                <td className="px-6 py-3 text-right font-semibold text-[#B87333]">
                  {formatCurrency(balanceData.totalEquity)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Immobilisations incorporelles</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.intangibleAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.intangibleAssetsDepreciation)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.intangibleAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Capital</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.shareCapital)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Immobilisations corporelles</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.tangibleAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.tangibleAssetsDepreciation)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.tangibleAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Primes et réserves</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.premiumsAndReserves)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Avances et acomptes sur immobilisations</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.advancesOnFixedAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.advancesOnFixedAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Écarts de réévaluation</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.revaluationDifferences)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Immobilisations financières</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.financialAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.financialAssetsProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.financialAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Résultat net de l'exercice</td>
                <td className="px-6 py-2 text-right text-sm font-semibold text-[#B87333]">
                  {formatCurrency(balanceData.netResult)}
                </td>
              </tr>
              
              {/* ACTIF CIRCULANT */}
              <tr className="bg-[#B87333]/10">
                <td className="px-6 py-3 font-semibold text-[#B87333]">ACTIF CIRCULANT</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#B87333]">
                  {formatCurrency(balanceData.totalCurrentAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#6A8A82]">DETTES FINANCIERES</td>
                <td className="px-6 py-3 text-right font-semibold text-[#6A8A82]">
                  {formatCurrency(balanceData.totalFinancialDebts)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Actif circulant HAO</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.haoCurrentAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.haoCurrentAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Subventions d'investissement</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.investmentSubsidies)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Stocks et en-cours</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.stocksGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.stocksProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.stocksNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Provisions réglementées</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.regulatedProvisions)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Créances et emplois assimilés</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.receivablesGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.receivablesProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.receivablesNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Emprunts et dettes financières</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.financialDebts)}</td>
              </tr>
              
              {/* TRESORERIE ACTIF */}
              <tr className="bg-[#6A8A82]/15">
                <td className="px-6 py-3 font-semibold text-[#6A8A82]">TRESORERIE-ACTIF</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#6A8A82]">
                  {formatCurrency(balanceData.totalTreasuryAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#B87333]">PASSIF CIRCULANT</td>
                <td className="px-6 py-3 text-right font-semibold text-[#B87333]">
                  {formatCurrency(balanceData.totalCurrentLiabilities)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Titres de placement</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.marketableSecurities)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.marketableSecurities)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Clients, avances reçues</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.customerAdvances)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Valeurs à encaisser</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.valuesToCollect)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.valuesToCollect)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Fournisseurs et comptes rattachés</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.suppliersAndRelated)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Banques, chèques postaux, caisse</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.cashAndBanks)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.cashAndBanks)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Dettes fiscales et sociales</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.taxAndSocialDebts)}</td>
              </tr>
              
              {/* Écart de conversion */}
              <tr>
                <td className="px-6 py-2 text-sm text-[#191919]/70">Écart de conversion-Actif</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.currencyTranslationDiffAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{formatCurrency(balanceData.currencyTranslationDiffAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#191919]/70">Autres dettes</td>
                <td className="px-6 py-2 text-right text-sm">{formatCurrency(balanceData.otherDebts)}</td>
              </tr>
              
              {/* TOTAUX */}
              <tr className="bg-[#ECECEC] font-bold text-[#191919]">
                <td className="px-6 py-4 text-lg">TOTAL GENERAL</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right text-lg">{formatCurrency(balanceData.totalAssets)}</td>
                <td className="px-6 py-4 text-lg">TOTAL GENERAL</td>
                <td className="px-6 py-4 text-right text-lg">{formatCurrency(balanceData.totalLiabilities)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Informations complémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-[#ECECEC] p-6">
          <h3 className="text-lg font-medium text-[#191919] mb-4">Ratios Clés</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Autonomie financière:</span>
              <span className="text-sm font-medium">
                {((balanceData.totalEquity / balanceData.totalAssets) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Endettement:</span>
              <span className="text-sm font-medium">
                {((balanceData.totalFinancialDebts / balanceData.totalAssets) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Liquidité générale:</span>
              <span className="text-sm font-medium">
                {(balanceData.totalCurrentAssets / balanceData.totalCurrentLiabilities).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-[#ECECEC] p-6">
          <h3 className="text-lg font-medium text-[#191919] mb-4">Équilibre Financier</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Fonds de roulement:</span>
              <span className="text-sm font-medium text-[#6A8A82]">
                {formatCurrency(balanceData.totalEquity + balanceData.totalFinancialDebts - balanceData.totalFixedAssets)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">BFR:</span>
              <span className="text-sm font-medium text-[#B87333]">
                {formatCurrency(balanceData.totalCurrentAssets - balanceData.totalCurrentLiabilities)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Trésorerie nette:</span>
              <span className="text-sm font-medium text-[#6A8A82]">
                {formatCurrency(balanceData.totalTreasuryAssets - balanceData.totalTreasuryLiabilities)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#F0F3F2] rounded-lg shadow-sm border border-[#ECECEC] p-6">
          <h3 className="text-lg font-medium text-[#191919] mb-4">Validation</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {balanceData.isBalanced ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                balanceData.isBalanced ? 'text-[#6A8A82]' : 'text-red-600'
              }`}>
                {balanceData.isBalanced ? 'Bilan équilibré' : 'Bilan déséquilibré'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#191919]/70">Écart:</span>
              <span className="text-sm font-medium">{formatCurrency(balanceData.balanceDifference)}</span>
            </div>
            <div className="flex items-center space-x-2">
              {balanceData.isValidated ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-[#6A8A82]">{t('accounting.validated')}</span>
                </>
              ) : (
                <>
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-yellow-600">{t('status.pending')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note de bas de page */}
      <div className="bg-[#ECECEC] rounded-lg p-4 text-xs text-[#191919]/70">
        <p className="text-center">
          Bilan établi conformément aux dispositions du Système Comptable OHADA (SYSCOHADA) révisé en 2017.
          <br />
          Les montants sont exprimés en Francs CFA (XAF). Arrêté des comptes effectué le {new Date().toLocaleDateString('fr-FR')}.
        </p>
      </div>
    </div>
  );
};

export default BalanceSheetSYSCOHADA;