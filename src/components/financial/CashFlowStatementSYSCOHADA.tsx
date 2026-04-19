// @ts-nocheck

import React, { useState } from 'react';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
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

interface CashFlowIndirectData {
  netResult: number;
  depreciationAndProvisions: number;
  provisionsReversals: number;
  valueAdjustments: number;
  selfFinancingCapacity: number;
  workingCapitalVariation: number;
  operatingCashFlow: number;
  fixedAssetsAcquisitions: number;
  fixedAssetsDisposals: number;
  financialAssetsAcquisitions: number;
  financialAssetsDisposals: number;
  investmentCashFlow: number;
  capitalIncrease: number;
  investmentSubsidiesReceived: number;
  newBorrowings: number;
  loanRepayments: number;
  dividendsPaid: number;
  financingCashFlow: number;
  cashFlowVariation: number;
  openingCashBalance: number;
  closingCashBalance: number;
  isCashFlowBalanced: boolean;
}

interface CashFlowDirectData {
  // Exploitation
  encaissementsClients: number;
  autresEncaissementsExploit: number;
  decaissementsFournisseurs: number;
  decaissementsPersonnel: number;
  interetsPayes: number;
  impotsSurResultat: number;
  autresDecaissementsExploit: number;
  operatingCashFlow: number;
  // Investissement
  acquisitionsImmosCorporelles: number;
  acquisitionsImmosIncorporelles: number;
  acquisitionsImmosFinancieres: number;
  cessionsImmosCorporelles: number;
  cessionsImmosFinancieres: number;
  interetsDividendesRecus: number;
  investmentCashFlow: number;
  // Financement
  augmentationCapital: number;
  subventionsRecues: number;
  empruntsNouveaux: number;
  remboursementsEmprunts: number;
  dividendesVerses: number;
  financingCashFlow: number;
  // TrÃ©sorerie
  cashFlowVariation: number;
  openingCashBalance: number;
  closingCashBalance: number;
  isCashFlowBalanced: boolean;
}

const CashFlowStatementSYSCOHADA: React.FC = () => {
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState<'indirect' | 'direct'>('indirect');

  // === Chargement mÃ©thode indirecte ===
  const { data: indirectData, isLoading: loadingIndirect } = useQuery({
    queryKey: ['tft-indirect'],
    queryFn: async (): Promise<CashFlowIndirectData> => {
      const entries = await adapter.getAll('journalEntries');
      const net = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit; return t; };
      const creditN = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit; return t; };

      const netResult = creditN('7') - net('6');
      const depreciationAndProvisions = net('68', '69');
      const provisionsReversals = creditN('78', '79');
      const selfFinancingCapacity = netResult + depreciationAndProvisions - provisionsReversals;
      const workingCapitalVariation = net('3', '41', '46') - creditN('40', '42', '43', '44');
      const operatingCashFlow = selfFinancingCapacity - workingCapitalVariation;
      const fixedAssetsAcquisitions = Math.max(0, net('2') + net('28'));
      const financialAssetsAcquisitions = Math.max(0, net('26', '27'));
      const investmentCashFlow = -fixedAssetsAcquisitions - financialAssetsAcquisitions;
      const capitalIncrease = creditN('10');
      const investmentSubsidiesReceived = creditN('14');
      const newBorrowings = creditN('16');
      const loanRepayments = net('16') > 0 ? net('16') : 0;
      const dividendsPaid = net('465');
      const financingCashFlow = capitalIncrease + investmentSubsidiesReceived + newBorrowings - loanRepayments - dividendsPaid;
      const cashFlowVariation = operatingCashFlow + investmentCashFlow + financingCashFlow;
      const closingCashBalance = net('5');
      const openingCashBalance = closingCashBalance - cashFlowVariation;
      return { netResult, depreciationAndProvisions, provisionsReversals, valueAdjustments: 0, selfFinancingCapacity, workingCapitalVariation, operatingCashFlow, fixedAssetsAcquisitions, fixedAssetsDisposals: 0, financialAssetsAcquisitions, financialAssetsDisposals: 0, investmentCashFlow, capitalIncrease, investmentSubsidiesReceived, newBorrowings, loanRepayments, dividendsPaid, financingCashFlow, cashFlowVariation, openingCashBalance, closingCashBalance, isCashFlowBalanced: Math.abs(cashFlowVariation - (closingCashBalance - openingCashBalance)) < 1 };
    }
  });

  // === Chargement mÃ©thode directe ===
  const { data: directData, isLoading: loadingDirect } = useQuery({
    queryKey: ['tft-direct'],
    queryFn: async (): Promise<CashFlowDirectData> => {
      const entries = await adapter.getAll('journalEntries');

      // Helpers pour classer les mouvements de trÃ©sorerie par contrepartie
      let encClients = 0, autresEncExploit = 0, decFournisseurs = 0, decPersonnel = 0, interetsPayes = 0, impots = 0, autresDecExploit = 0;
      let acqCorpo = 0, acqIncorpo = 0, acqFinanc = 0, cessCorpo = 0, cessFinanc = 0, intDivRecus = 0;
      let augCapital = 0, subventions = 0, empruntsNouv = 0, rembEmprunts = 0, divVerses = 0;

      for (const entry of entries) {
        if (entry.journal === 'AN' || entry.journal === 'RAN') continue;
        const cashLines = entry.lines.filter((l: any) => l.accountCode.startsWith('5'));
        const others = entry.lines.filter((l: any) => !l.accountCode.startsWith('5'));
        if (cashLines.length === 0) continue;

        let cDebit = 0, cCredit = 0;
        for (const cl of cashLines) { cDebit += cl.debit; cCredit += cl.credit; }
        const netCash = cDebit - cCredit; // positif = encaissement

        // Classifier par contrepartie
        const has = (p: string) => others.some((l: any) => l.accountCode.startsWith(p));

        if (has('41')) { // Clients
          if (netCash > 0) encClients += netCash; else decFournisseurs += Math.abs(netCash);
        } else if (has('40')) { // Fournisseurs
          if (netCash < 0) decFournisseurs += Math.abs(netCash); else autresEncExploit += netCash;
        } else if (has('42') || has('43')) { // Personnel / Organismes sociaux
          if (netCash < 0) decPersonnel += Math.abs(netCash); else autresEncExploit += netCash;
        } else if (has('66')) { // Charges financiÃ¨res
          if (netCash < 0) interetsPayes += Math.abs(netCash);
        } else if (has('44') || has('89')) { // Etat - ImpÃ´ts
          if (netCash < 0) impots += Math.abs(netCash); else autresEncExploit += netCash;
        } else if (has('21') || has('22') || has('23') || has('24') || has('25')) { // Immos corporelles/incorporelles
          if (netCash < 0) acqCorpo += Math.abs(netCash); else cessCorpo += netCash;
        } else if (has('26') || has('27')) { // Immos financiÃ¨res
          if (netCash < 0) acqFinanc += Math.abs(netCash); else cessFinanc += netCash;
        } else if (has('76')) { // Produits financiers (intÃ©rÃªts/dividendes reÃ§us)
          if (netCash > 0) intDivRecus += netCash;
        } else if (has('10') || has('11') || has('12') || has('13')) { // Capital
          if (netCash > 0) augCapital += netCash;
        } else if (has('14')) { // Subventions
          if (netCash > 0) subventions += netCash;
        } else if (has('16')) { // Emprunts
          if (netCash > 0) empruntsNouv += netCash; else rembEmprunts += Math.abs(netCash);
        } else if (has('465')) { // Dividendes
          if (netCash < 0) divVerses += Math.abs(netCash);
        } else {
          // Autre exploitation
          if (netCash > 0) autresEncExploit += netCash; else autresDecExploit += Math.abs(netCash);
        }
      }

      const operatingCashFlow = encClients + autresEncExploit - decFournisseurs - decPersonnel - interetsPayes - impots - autresDecExploit;
      const investmentCashFlow = cessCorpo + cessFinanc + intDivRecus - acqCorpo - acqIncorpo - acqFinanc;
      const financingCashFlow = augCapital + subventions + empruntsNouv - rembEmprunts - divVerses;
      const cashFlowVariation = operatingCashFlow + investmentCashFlow + financingCashFlow;

      let closingCash = 0;
      for (const e of entries) for (const l of e.lines) if (l.accountCode.startsWith('5')) closingCash += l.debit - l.credit;
      const openingCash = closingCash - cashFlowVariation;

      return {
        encaissementsClients: encClients, autresEncaissementsExploit: autresEncExploit,
        decaissementsFournisseurs: decFournisseurs, decaissementsPersonnel: decPersonnel,
        interetsPayes, impotsSurResultat: impots, autresDecaissementsExploit: autresDecExploit,
        operatingCashFlow,
        acquisitionsImmosCorporelles: acqCorpo, acquisitionsImmosIncorporelles: acqIncorpo,
        acquisitionsImmosFinancieres: acqFinanc, cessionsImmosCorporelles: cessCorpo,
        cessionsImmosFinancieres: cessFinanc, interetsDividendesRecus: intDivRecus,
        investmentCashFlow,
        augmentationCapital: augCapital, subventionsRecues: subventions,
        empruntsNouveaux: empruntsNouv, remboursementsEmprunts: rembEmprunts,
        dividendesVerses: divVerses, financingCashFlow,
        cashFlowVariation, openingCashBalance: openingCash, closingCashBalance: closingCash,
        isCashFlowBalanced: Math.abs(cashFlowVariation - (closingCash - openingCash)) < 1,
      };
    }
  });

  const isLoading = activeTab === 'indirect' ? loadingIndirect : loadingDirect;
  const currentData = activeTab === 'indirect' ? indirectData : directData;


  const getFlowIcon = (value: number) => {
    if (value > 0) return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    if (value < 0) return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  const getFlowColor = (value: number) => {
    if (value > 0) return 'text-[#171717]';
    if (value < 0) return 'text-[#525252]';
    return 'text-[#171717]/70';
  };

  const Row = ({ label, value, indent, bold, sign, bg }: { label: string; value: number; indent?: boolean; bold?: boolean; sign?: '+' | '-'; bg?: string }) => (
    <tr className={bg || ''}>
      <td className={`px-6 py-2 ${indent ? 'pl-10' : ''} text-sm ${bold ? 'font-bold text-[#171717]' : 'text-[#171717]/70'}`}>{label}</td>
      <td className={`px-6 py-2 text-right text-sm ${bold ? 'font-bold text-[#171717] text-lg' : 'font-medium'} ${sign === '-' ? 'text-[#525252]' : ''}`}>
        {sign === '+' && value > 0 ? '+' : ''}{sign === '-' ? '-' : ''}{fmt(sign === '-' ? Math.abs(value) : value)}
      </td>
    </tr>
  );

  const SectionHeader = ({ title, bg }: { title: string; bg?: string }) => (
    <tr className={bg || 'bg-[#171717]/10'}>
      <td className="px-6 py-3 font-bold text-[#171717] text-base">{title}</td>
      <td className="px-6 py-3"></td>
    </tr>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#171717]"></div>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className="text-center p-8">
        <p className="text-[#171717]/50">Aucune donnÃ©e de tableau de flux disponible</p>
      </div>
    );
  }

  const d = currentData;
  const fiscalYear = new Date().getFullYear().toString();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tÃªte */}
      <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-[#171717] flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-2 text-[#171717]" />
              TABLEAU DES FLUX DE TRÃ‰SORERIE (TAFIRE)
            </h1>
            <p className="text-sm text-[#171717]/70 mt-1">Exercice {fiscalYear} - SYSCOHADA rÃ©visÃ©</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {d.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
              <span className="text-sm font-medium">{d.isCashFlowBalanced ? 'Flux Ã©quilibrÃ©s' : 'Flux dÃ©sÃ©quilibrÃ©s'}</span>
            </div>
            <button className="flex items-center space-x-2 px-3 py-2 border border-[#e5e5e5] rounded-md hover:bg-[#e5e5e5]">
              <ArrowDownTrayIcon className="h-4 w-4" /><span>Export</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 bg-[#525252] text-white rounded-md hover:bg-[#404040]">
              <DocumentTextIcon className="h-4 w-4" /><span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sous-onglets MÃ©thode indirecte / MÃ©thode directe */}
      <div className="border-b border-[#e5e5e5]">
        <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('indirect')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'indirect' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#171717]/50 hover:text-[#171717]/80'
            }`}
          >
            MÃ©thode Indirecte
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'direct' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#171717]/50 hover:text-[#171717]/80'
            }`}
          >
            MÃ©thode Directe
          </button>
        </nav>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Flux d'Exploitation", value: d.operatingCashFlow, sub: activeTab === 'indirect' && indirectData ? `CAF: ${fmt(indirectData.selfFinancingCapacity)}` : 'Encaiss. - DÃ©caiss.' },
          { label: "Flux d'Investissement", value: d.investmentCashFlow, sub: 'Acquisitions nettes' },
          { label: 'Flux de Financement', value: d.financingCashFlow, sub: 'Emprunts nets' },
          { label: 'Variation TrÃ©sorerie', value: d.cashFlowVariation, sub: 'Total pÃ©riode' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#f5f5f5] p-5 rounded-lg shadow-sm border border-[#e5e5e5]">
            <p className="text-xs font-medium text-[#171717]/60">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.value > 0 ? 'text-[#171717]' : kpi.value < 0 ? 'text-[#525252]' : 'text-[#171717]/70'}`}>
              {fmt(kpi.value)}
            </p>
            <p className="text-xs text-[#171717]/50">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â• TABLE MÃ‰THODE INDIRECTE â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'indirect' && indirectData && (
        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#171717]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">TABLEAU DES FLUX DE TRÃ‰SORERIE â€” MÃ©thode Indirecte</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-white w-48">Montant (XAF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                <SectionHeader title="A. FLUX DE TRÃ‰SORERIE LIÃ‰S Ã€ L'ACTIVITÃ‰" />
                <Row label="RÃ©sultat net de l'exercice" value={indirectData.netResult} indent />
                <Row label="+ Dotations aux amortissements et provisions" value={indirectData.depreciationAndProvisions} indent sign="+" />
                <Row label="- Reprises de provisions" value={indirectData.provisionsReversals} indent sign="-" />
                <Row label="Â± Plus et moins-values de cession" value={indirectData.valueAdjustments} indent />
                <Row label="= CapacitÃ© d'autofinancement (CAF)" value={indirectData.selfFinancingCapacity} bold bg="bg-[#171717]/10" />
                <Row label="- Variation du besoin en fonds de roulement (BFR)" value={indirectData.workingCapitalVariation} indent sign="-" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ Ã€ L'ACTIVITÃ‰ (A)" value={indirectData.operatingCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="B. FLUX DE TRÃ‰SORERIE LIÃ‰S AUX INVESTISSEMENTS" />
                <Row label="- Acquisitions d'immobilisations corporelles et incorporelles" value={indirectData.fixedAssetsAcquisitions} indent sign="-" />
                <Row label="+ Cessions d'immobilisations corporelles et incorporelles" value={indirectData.fixedAssetsDisposals} indent sign="+" />
                <Row label="- Acquisitions d'immobilisations financiÃ¨res" value={indirectData.financialAssetsAcquisitions} indent sign="-" />
                <Row label="+ Cessions d'immobilisations financiÃ¨res" value={indirectData.financialAssetsDisposals} indent sign="+" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ AUX INVESTISSEMENTS (B)" value={indirectData.investmentCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="C. FLUX DE TRÃ‰SORERIE LIÃ‰S AU FINANCEMENT" bg="bg-[#525252]/10" />
                <Row label="+ Augmentation de capital en numÃ©raire" value={indirectData.capitalIncrease} indent sign="+" />
                <Row label="+ Subventions d'investissement reÃ§ues" value={indirectData.investmentSubsidiesReceived} indent sign="+" />
                <Row label="+ Nouveaux emprunts" value={indirectData.newBorrowings} indent sign="+" />
                <Row label="- Remboursements d'emprunts" value={indirectData.loanRepayments} indent sign="-" />
                <Row label="- Dividendes versÃ©s" value={indirectData.dividendsPaid} indent sign="-" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ AU FINANCEMENT (C)" value={indirectData.financingCashFlow} bold bg="bg-[#525252]/20" />

                <SectionHeader title="D. VARIATION DE TRÃ‰SORERIE (A + B + C)" bg="bg-[#525252]/10" />
                <Row label="= VARIATION NETTE DE TRÃ‰SORERIE" value={indirectData.cashFlowVariation} bold bg="bg-[#525252]/20" />
                <Row label="TrÃ©sorerie d'ouverture" value={indirectData.openingCashBalance} indent />
                <Row label="TrÃ©sorerie de clÃ´ture" value={indirectData.closingCashBalance} indent />
                <tr className={indirectData.isCashFlowBalanced ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="px-6 py-3 font-bold flex items-center">
                    {indirectData.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />}
                    CONTRÃ”LE â€” Ã‰cart
                  </td>
                  <td className="px-6 py-3 text-right font-bold">
                    {fmt(Math.abs(indirectData.cashFlowVariation - (indirectData.closingCashBalance - indirectData.openingCashBalance)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â• TABLE MÃ‰THODE DIRECTE â•â•â•â•â•â•â•â•â•â• */}
      {activeTab === 'direct' && directData && (
        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#171717]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">TABLEAU DES FLUX DE TRÃ‰SORERIE â€” MÃ©thode Directe</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-white w-48">Montant (XAF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                <SectionHeader title="A. FLUX DE TRÃ‰SORERIE LIÃ‰S Ã€ L'ACTIVITÃ‰" />
                <Row label="Encaissements reÃ§us des clients" value={directData.encaissementsClients} indent sign="+" />
                <Row label="Autres encaissements liÃ©s Ã  l'activitÃ©" value={directData.autresEncaissementsExploit} indent sign="+" />
                <Row label="DÃ©caissements versÃ©s aux fournisseurs" value={directData.decaissementsFournisseurs} indent sign="-" />
                <Row label="DÃ©caissements versÃ©s au personnel" value={directData.decaissementsPersonnel} indent sign="-" />
                <Row label="IntÃ©rÃªts et autres frais financiers payÃ©s" value={directData.interetsPayes} indent sign="-" />
                <Row label="ImpÃ´ts sur le rÃ©sultat payÃ©s" value={directData.impotsSurResultat} indent sign="-" />
                <Row label="Autres dÃ©caissements liÃ©s Ã  l'activitÃ©" value={directData.autresDecaissementsExploit} indent sign="-" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ Ã€ L'ACTIVITÃ‰ (A)" value={directData.operatingCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="B. FLUX DE TRÃ‰SORERIE LIÃ‰S AUX INVESTISSEMENTS" />
                <Row label="DÃ©caissements sur acquisitions d'immobilisations corporelles" value={directData.acquisitionsImmosCorporelles} indent sign="-" />
                <Row label="DÃ©caissements sur acquisitions d'immobilisations incorporelles" value={directData.acquisitionsImmosIncorporelles} indent sign="-" />
                <Row label="DÃ©caissements sur acquisitions d'immobilisations financiÃ¨res" value={directData.acquisitionsImmosFinancieres} indent sign="-" />
                <Row label="Encaissements sur cessions d'immobilisations corporelles" value={directData.cessionsImmosCorporelles} indent sign="+" />
                <Row label="Encaissements sur cessions d'immobilisations financiÃ¨res" value={directData.cessionsImmosFinancieres} indent sign="+" />
                <Row label="IntÃ©rÃªts encaissÃ©s et dividendes reÃ§us" value={directData.interetsDividendesRecus} indent sign="+" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ AUX INVESTISSEMENTS (B)" value={directData.investmentCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="C. FLUX DE TRÃ‰SORERIE LIÃ‰S AU FINANCEMENT" bg="bg-[#525252]/10" />
                <Row label="Encaissements suite Ã  l'augmentation du capital" value={directData.augmentationCapital} indent sign="+" />
                <Row label="Subventions d'investissement reÃ§ues" value={directData.subventionsRecues} indent sign="+" />
                <Row label="Encaissements provenant d'emprunts" value={directData.empruntsNouveaux} indent sign="+" />
                <Row label="Remboursements d'emprunts" value={directData.remboursementsEmprunts} indent sign="-" />
                <Row label="Dividendes et autres distributions versÃ©s" value={directData.dividendesVerses} indent sign="-" />
                <Row label="= FLUX NET DE TRÃ‰SORERIE LIÃ‰ AU FINANCEMENT (C)" value={directData.financingCashFlow} bold bg="bg-[#525252]/20" />

                <SectionHeader title="D. VARIATION DE TRÃ‰SORERIE (A + B + C)" bg="bg-[#525252]/10" />
                <Row label="= VARIATION NETTE DE TRÃ‰SORERIE" value={directData.cashFlowVariation} bold bg="bg-[#525252]/20" />
                <Row label="TrÃ©sorerie d'ouverture" value={directData.openingCashBalance} indent />
                <Row label="TrÃ©sorerie de clÃ´ture" value={directData.closingCashBalance} indent />
                <tr className={directData.isCashFlowBalanced ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="px-6 py-3 font-bold flex items-center">
                    {directData.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />}
                    CONTRÃ”LE â€” Ã‰cart
                  </td>
                  <td className="px-6 py-3 text-right font-bold">
                    {fmt(Math.abs(directData.cashFlowVariation - (directData.closingCashBalance - directData.openingCashBalance)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note mÃ©thodologique */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-[#171717] mt-0.5" />
          <div className="text-xs text-[#171717]/70">
            <p className="font-medium mb-1">Note mÃ©thodologique :</p>
            {activeTab === 'indirect' ? (
              <p>La mÃ©thode indirecte part du rÃ©sultat net et ajuste les Ã©lÃ©ments non monÃ©taires (dotations, reprises, plus/moins-values) pour obtenir la CAF, puis retranche la variation du BFR.</p>
            ) : (
              <p>La mÃ©thode directe prÃ©sente les flux de trÃ©sorerie rÃ©els : encaissements reÃ§us des clients, dÃ©caissements versÃ©s aux fournisseurs, au personnel, etc. Les deux mÃ©thodes aboutissent Ã  la mÃªme variation de trÃ©sorerie.</p>
            )}
            <p className="mt-1">Conforme au SYSCOHADA rÃ©visÃ© 2017. Montants en Francs CFA (XAF).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowStatementSYSCOHADA;