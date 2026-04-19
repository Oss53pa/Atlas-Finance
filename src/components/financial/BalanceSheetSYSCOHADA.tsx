// @ts-nocheck

import React, { useState } from 'react';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
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
  // Actif immobilisÃƒÂ©
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
  
  // TrÃƒÂ©sorerie-Actif
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
  
  // Dettes financiÃƒÂ¨res
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
  
  // TrÃƒÂ©sorerie-Passif
  bankOverdrafts: number;
  totalTreasuryLiabilities: number;
  
  currencyTranslationDiffLiabilities: number;
  totalLiabilities: number;
  
  // ContrÃƒÂ´les
  isBalanced: boolean;
  balanceDifference: number;
  isValidated: boolean;
}

const BalanceSheetSYSCOHADA: React.FC = () => {
  const fmt = useMoneyFormat();
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showPreviousYear, setShowPreviousYear] = useState(true);
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>('detailed');

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['balance-sheet-syscohada', selectedPeriod],
    queryFn: async (): Promise<BalanceSheetData> => {
      const entries = await adapter.getAll('journalEntries');
      const settings = await adapter.getById('settings', 'company_name');

      // Helper: net balance (debit - credit)
      const net = (...pfx: string[]) => {
        let t = 0;
        for (const e of entries) for (const l of e.lines)
          if (pfx.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit;
        return t;
      };
      const creditN = (...pfx: string[]) => {
        let t = 0;
        for (const e of entries) for (const l of e.lines)
          if (pfx.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit;
        return t;
      };

      // ACTIF
      const intGross = Math.max(0, net('21'));
      const intDepr = Math.abs(Math.min(0, net('281')));
      const tanGross = Math.max(0, net('22', '23', '24'));
      const tanDepr = Math.abs(Math.min(0, net('282', '283', '284')));
      const finGross = Math.max(0, net('25', '26', '27'));
      const finProv = Math.abs(Math.min(0, net('29')));
      const totalFixed = (intGross - intDepr) + (tanGross - tanDepr) + (finGross - finProv);

      const stocksGross = Math.max(0, net('3'));
      const stocksProv = Math.abs(Math.min(0, net('39')));
      const recGross = Math.max(0, net('41', '42', '43', '44', '45', '46'));
      const recProv = Math.abs(Math.min(0, net('491')));
      const totalCurrent = (stocksGross - stocksProv) + (recGross - recProv);

      const marketSec = Math.max(0, net('50'));
      const cashBanks = Math.max(0, net('52', '57'));
      const totalTreasury = marketSec + cashBanks;
      const totalAssets = totalFixed + totalCurrent + totalTreasury;

      // PASSIF
      const capital = creditN('10');
      const reserves = creditN('11', '12');
      const resultatNet = creditN('7') - net('6');
      const totalEquity = capital + reserves + resultatNet;

      const financialDebts = creditN('16', '17');
      const totalFinDebts = financialDebts;

      const suppliers = creditN('40');
      const taxSocial = creditN('42', '43', '44');
      const otherDebts = creditN('45', '46', '47');
      const totalCurrentLiab = suppliers + taxSocial + otherDebts;
      const totalLiabilities = totalEquity + totalFinDebts + totalCurrentLiab;

      return {
        id: '1',
        company: { name: settings?.value || 'ATLAS FINANCE', address: '' },
        fiscalYear: new Date().getFullYear().toString(),
        statementDate: new Date().toISOString().split('T')[0],
        intangibleAssetsGross: intGross, intangibleAssetsDepreciation: intDepr, intangibleAssetsNet: intGross - intDepr,
        tangibleAssetsGross: tanGross, tangibleAssetsDepreciation: tanDepr, tangibleAssetsNet: tanGross - tanDepr,
        advancesOnFixedAssets: 0,
        financialAssetsGross: finGross, financialAssetsProvisions: finProv, financialAssetsNet: finGross - finProv,
        totalFixedAssets: totalFixed,
        haoCurrentAssets: 0,
        stocksGross, stocksProvisions: stocksProv, stocksNet: stocksGross - stocksProv,
        receivablesGross: recGross, receivablesProvisions: recProv, receivablesNet: recGross - recProv,
        totalCurrentAssets: totalCurrent,
        marketableSecurities: marketSec, valuesToCollect: 0, cashAndBanks: cashBanks,
        totalTreasuryAssets: totalTreasury,
        currencyTranslationDiffAssets: 0, totalAssets,
        shareCapital: capital, uncalledShareCapital: 0, premiumsAndReserves: reserves,
        revaluationDifferences: 0, netResult: resultatNet, otherEquity: 0, totalEquity,
        investmentSubsidies: 0, regulatedProvisions: 0,
        financialDebts, financialProvisions: 0, totalFinancialDebts: totalFinDebts,
        haoCurrentLiabilities: 0, customerAdvances: 0,
        suppliersAndRelated: suppliers, taxAndSocialDebts: taxSocial,
        otherDebts, shortTermProvisions: 0, totalCurrentLiabilities: totalCurrentLiab,
        bankOverdrafts: 0, totalTreasuryLiabilities: 0,
        currencyTranslationDiffLiabilities: 0, totalLiabilities,
        isBalanced: Math.abs(totalAssets - totalLiabilities) < 1,
        balanceDifference: totalAssets - totalLiabilities,
        isValidated: false,
      };
    }
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717]"></div>
      </div>
    );
  }

  if (!balanceData) {
    return (
      <div className="text-center p-8">
        <p className="text-[#171717]/50">Aucune donnÃƒÂ©e de bilan disponible</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* En-tÃƒÂªte */}
      <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-[#171717] flex items-center">
              <ScaleIcon className="h-6 w-6 mr-2 text-[#171717]" />
              BILAN SYSCOHADA
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-lg font-semibold text-[#171717]/90">{balanceData.company.name}</p>
              <p className="text-sm text-[#171717]/70">{balanceData.company.address}</p>
              <p className="text-sm text-[#171717]/70">
                Exercice {balanceData.fiscalYear} - ArrÃƒÂªtÃƒÂ© au {new Date(balanceData.statementDate).toLocaleDateString('fr-FR')}
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
                balanceData.isBalanced ? 'text-[#171717]' : 'text-red-600'
              }`}>
                {balanceData.isBalanced ? 'Ãƒâ€°quilibrÃƒÂ©' : `Ãƒâ€°cart: ${fmt(balanceData.balanceDifference)} XAF`}
              </span>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-2 px-3 py-2 border border-[#e5e5e5] rounded-md hover:bg-[#e5e5e5]">
                <EyeIcon className="h-4 w-4" />
                <span>Voir N-1</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 border border-[#e5e5e5] rounded-md hover:bg-[#e5e5e5]">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <button className="flex items-center space-x-2 px-3 py-2 bg-[#525252] text-[#f5f5f5] rounded-md hover:bg-[#404040]">
                <DocumentTextIcon className="h-4 w-4" />
                <span>Imprimer PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bilan SYSCOHADA */}
      <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#171717]">
              <tr>
                <th colSpan={3} className="px-6 py-4 text-center text-lg font-bold text-[#f5f5f5] border-b-2 border-[#171717]">
                  BILAN AU {new Date(balanceData.statementDate).toLocaleDateString('fr-FR')} - Exercice {balanceData.fiscalYear}
                </th>
                <th colSpan={3} className="px-6 py-4 text-center text-lg font-bold text-[#f5f5f5] border-b-2 border-[#171717]">
                  (en XAF)
                </th>
              </tr>
              <tr className="bg-[#e5e5e5]">
                <th className="px-6 py-3 text-left text-sm font-bold text-[#171717] w-1/2">ACTIF</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#171717] w-1/6">BRUT</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#171717] w-1/6">AMORT/PROV</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#171717] w-1/6">NET</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-[#171717] w-1/2">PASSIF</th>
                <th className="px-6 py-3 text-right text-sm font-bold text-[#171717] w-1/6">MONTANT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              {/* ACTIF IMMOBILISE */}
              <tr className="bg-[#171717]/10">
                <td className="px-6 py-3 font-semibold text-[#171717]">ACTIF IMMOBILISE</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#171717]">
                  {fmt(balanceData.totalFixedAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#525252]">CAPITAUX PROPRES</td>
                <td className="px-6 py-3 text-right font-semibold text-[#525252]">
                  {fmt(balanceData.totalEquity)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Immobilisations incorporelles</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.intangibleAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.intangibleAssetsDepreciation)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.intangibleAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Capital</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.shareCapital)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Immobilisations corporelles</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.tangibleAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.tangibleAssetsDepreciation)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.tangibleAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Primes et rÃƒÂ©serves</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.premiumsAndReserves)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Avances et acomptes sur immobilisations</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.advancesOnFixedAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.advancesOnFixedAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Ãƒâ€°carts de rÃƒÂ©ÃƒÂ©valuation</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.revaluationDifferences)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Immobilisations financiÃƒÂ¨res</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.financialAssetsGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.financialAssetsProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.financialAssetsNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">RÃƒÂ©sultat net de l'exercice</td>
                <td className="px-6 py-2 text-right text-sm font-semibold text-[#525252]">
                  {fmt(balanceData.netResult)}
                </td>
              </tr>
              
              {/* ACTIF CIRCULANT */}
              <tr className="bg-[#525252]/10">
                <td className="px-6 py-3 font-semibold text-[#525252]">ACTIF CIRCULANT</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#525252]">
                  {fmt(balanceData.totalCurrentAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#171717]">DETTES FINANCIERES</td>
                <td className="px-6 py-3 text-right font-semibold text-[#171717]">
                  {fmt(balanceData.totalFinancialDebts)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Actif circulant HAO</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.haoCurrentAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.haoCurrentAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Subventions d'investissement</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.investmentSubsidies)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Stocks et en-cours</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.stocksGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.stocksProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.stocksNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Provisions rÃƒÂ©glementÃƒÂ©es</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.regulatedProvisions)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">CrÃƒÂ©ances et emplois assimilÃƒÂ©s</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.receivablesGross)}</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.receivablesProvisions)}</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.receivablesNet)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Emprunts et dettes financiÃƒÂ¨res</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.financialDebts)}</td>
              </tr>
              
              {/* TRESORERIE ACTIF */}
              <tr className="bg-[#171717]/15">
                <td className="px-6 py-3 font-semibold text-[#171717]">TRESORERIE-ACTIF</td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right font-semibold text-[#171717]">
                  {fmt(balanceData.totalTreasuryAssets)}
                </td>
                <td className="px-6 py-3 font-semibold text-[#525252]">PASSIF CIRCULANT</td>
                <td className="px-6 py-3 text-right font-semibold text-[#525252]">
                  {fmt(balanceData.totalCurrentLiabilities)}
                </td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Titres de placement</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.marketableSecurities)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.marketableSecurities)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Clients, avances reÃƒÂ§ues</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.customerAdvances)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Valeurs ÃƒÂ  encaisser</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.valuesToCollect)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.valuesToCollect)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Fournisseurs et comptes rattachÃƒÂ©s</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.suppliersAndRelated)}</td>
              </tr>
              
              <tr>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Banques, chÃƒÂ¨ques postaux, caisse</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.cashAndBanks)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.cashAndBanks)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Dettes fiscales et sociales</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.taxAndSocialDebts)}</td>
              </tr>
              
              {/* Ãƒâ€°cart de conversion */}
              <tr>
                <td className="px-6 py-2 text-sm text-[#171717]/70">Ãƒâ€°cart de conversion-Actif</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.currencyTranslationDiffAssets)}</td>
                <td className="px-6 py-2 text-right text-sm">-</td>
                <td className="px-6 py-2 text-right text-sm font-medium">{fmt(balanceData.currencyTranslationDiffAssets)}</td>
                <td className="px-6 py-2 pl-8 text-sm text-[#171717]/70">Autres dettes</td>
                <td className="px-6 py-2 text-right text-sm">{fmt(balanceData.otherDebts)}</td>
              </tr>
              
              {/* TOTAUX */}
              <tr className="bg-[#e5e5e5] font-bold text-[#171717]">
                <td className="px-6 py-4 text-lg">TOTAL GENERAL</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right text-lg">{fmt(balanceData.totalAssets)}</td>
                <td className="px-6 py-4 text-lg">TOTAL GENERAL</td>
                <td className="px-6 py-4 text-right text-lg">{fmt(balanceData.totalLiabilities)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Informations complÃƒÂ©mentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
          <h3 className="text-lg font-medium text-[#171717] mb-4">Ratios ClÃƒÂ©s</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">Autonomie financiÃƒÂ¨re:</span>
              <span className="text-sm font-medium">
                {((balanceData.totalEquity / balanceData.totalAssets) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">Endettement:</span>
              <span className="text-sm font-medium">
                {((balanceData.totalFinancialDebts / balanceData.totalAssets) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">LiquiditÃƒÂ© gÃƒÂ©nÃƒÂ©rale:</span>
              <span className="text-sm font-medium">
                {(balanceData.totalCurrentAssets / balanceData.totalCurrentLiabilities).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
          <h3 className="text-lg font-medium text-[#171717] mb-4">Ãƒâ€°quilibre Financier</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">Fonds de roulement:</span>
              <span className="text-sm font-medium text-[#171717]">
                {fmt(balanceData.totalEquity + balanceData.totalFinancialDebts - balanceData.totalFixedAssets)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">BFR:</span>
              <span className="text-sm font-medium text-[#525252]">
                {fmt(balanceData.totalCurrentAssets - balanceData.totalCurrentLiabilities)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">TrÃƒÂ©sorerie nette:</span>
              <span className="text-sm font-medium text-[#171717]">
                {fmt(balanceData.totalTreasuryAssets - balanceData.totalTreasuryLiabilities)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
          <h3 className="text-lg font-medium text-[#171717] mb-4">Validation</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {balanceData.isBalanced ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              )}
              <span className={`text-sm font-medium ${
                balanceData.isBalanced ? 'text-[#171717]' : 'text-red-600'
              }`}>
                {balanceData.isBalanced ? 'Bilan ÃƒÂ©quilibrÃƒÂ©' : 'Bilan dÃƒÂ©sÃƒÂ©quilibrÃƒÂ©'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#171717]/70">Ãƒâ€°cart:</span>
              <span className="text-sm font-medium">{fmt(balanceData.balanceDifference)}</span>
            </div>
            <div className="flex items-center space-x-2">
              {balanceData.isValidated ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-[#171717]">{t('accounting.validated')}</span>
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
      <div className="bg-[#e5e5e5] rounded-lg p-4 text-xs text-[#171717]/70">
        <p className="text-center">
          Bilan ÃƒÂ©tabli conformÃƒÂ©ment aux dispositions du SystÃƒÂ¨me Comptable OHADA (SYSCOHADA) rÃƒÂ©visÃƒÂ© en 2017.
          <br />
          Les montants sont exprimÃƒÂ©s en Francs CFA (XAF). ArrÃƒÂªtÃƒÂ© des comptes effectuÃƒÂ© le {new Date().toLocaleDateString('fr-FR')}.
        </p>
      </div>
    </div>
  );
};

export default BalanceSheetSYSCOHADA;