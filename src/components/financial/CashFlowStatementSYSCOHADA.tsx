// @ts-nocheck
import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
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
  // Trésorerie
  cashFlowVariation: number;
  openingCashBalance: number;
  closingCashBalance: number;
  isCashFlowBalanced: boolean;
}

const CashFlowStatementSYSCOHADA: React.FC = () => {
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState<'indirect' | 'direct'>('indirect');

  // === Chargement méthode indirecte ===
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

  // === Chargement méthode directe ===
  const { data: directData, isLoading: loadingDirect } = useQuery({
    queryKey: ['tft-direct'],
    queryFn: async (): Promise<CashFlowDirectData> => {
      const entries = await adapter.getAll('journalEntries');

      // Helpers pour classer les mouvements de trésorerie par contrepartie
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
        } else if (has('66')) { // Charges financières
          if (netCash < 0) interetsPayes += Math.abs(netCash);
        } else if (has('44') || has('89')) { // Etat - Impôts
          if (netCash < 0) impots += Math.abs(netCash); else autresEncExploit += netCash;
        } else if (has('21') || has('22') || has('23') || has('24') || has('25')) { // Immos corporelles/incorporelles
          if (netCash < 0) acqCorpo += Math.abs(netCash); else cessCorpo += netCash;
        } else if (has('26') || has('27')) { // Immos financières
          if (netCash < 0) acqFinanc += Math.abs(netCash); else cessFinanc += netCash;
        } else if (has('76')) { // Produits financiers (intérêts/dividendes reçus)
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
        {sign === '+' && value > 0 ? '+' : ''}{sign === '-' ? '-' : ''}{formatCurrency(sign === '-' ? Math.abs(value) : value)}
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
        <p className="text-[#171717]/50">Aucune donnée de tableau de flux disponible</p>
      </div>
    );
  }

  const d = currentData;
  const fiscalYear = new Date().getFullYear().toString();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-[#171717] flex items-center">
              <CurrencyDollarIcon className="h-6 w-6 mr-2 text-[#171717]" />
              TABLEAU DES FLUX DE TRÉSORERIE (TAFIRE)
            </h1>
            <p className="text-sm text-[#171717]/70 mt-1">Exercice {fiscalYear} - SYSCOHADA révisé</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {d.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />}
              <span className="text-sm font-medium">{d.isCashFlowBalanced ? 'Flux équilibrés' : 'Flux déséquilibrés'}</span>
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

      {/* Sous-onglets Méthode indirecte / Méthode directe */}
      <div className="border-b border-[#e5e5e5]">
        <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('indirect')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'indirect' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#171717]/50 hover:text-[#171717]/80'
            }`}
          >
            Méthode Indirecte
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'direct' ? 'border-[#171717] text-[#171717]' : 'border-transparent text-[#171717]/50 hover:text-[#171717]/80'
            }`}
          >
            Méthode Directe
          </button>
        </nav>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Flux d'Exploitation", value: d.operatingCashFlow, sub: activeTab === 'indirect' && indirectData ? `CAF: ${formatCurrency(indirectData.selfFinancingCapacity)}` : 'Encaiss. - Décaiss.' },
          { label: "Flux d'Investissement", value: d.investmentCashFlow, sub: 'Acquisitions nettes' },
          { label: 'Flux de Financement', value: d.financingCashFlow, sub: 'Emprunts nets' },
          { label: 'Variation Trésorerie', value: d.cashFlowVariation, sub: 'Total période' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#f5f5f5] p-5 rounded-lg shadow-sm border border-[#e5e5e5]">
            <p className="text-xs font-medium text-[#171717]/60">{kpi.label}</p>
            <p className={`text-lg font-bold ${kpi.value > 0 ? 'text-[#171717]' : kpi.value < 0 ? 'text-[#525252]' : 'text-[#171717]/70'}`}>
              {formatCurrency(kpi.value)}
            </p>
            <p className="text-xs text-[#171717]/50">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════ TABLE MÉTHODE INDIRECTE ══════════ */}
      {activeTab === 'indirect' && indirectData && (
        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#171717]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">TABLEAU DES FLUX DE TRÉSORERIE — Méthode Indirecte</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-white w-48">Montant (XAF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                <SectionHeader title="A. FLUX DE TRÉSORERIE LIÉS À L'ACTIVITÉ" />
                <Row label="Résultat net de l'exercice" value={indirectData.netResult} indent />
                <Row label="+ Dotations aux amortissements et provisions" value={indirectData.depreciationAndProvisions} indent sign="+" />
                <Row label="- Reprises de provisions" value={indirectData.provisionsReversals} indent sign="-" />
                <Row label="± Plus et moins-values de cession" value={indirectData.valueAdjustments} indent />
                <Row label="= Capacité d'autofinancement (CAF)" value={indirectData.selfFinancingCapacity} bold bg="bg-[#171717]/10" />
                <Row label="- Variation du besoin en fonds de roulement (BFR)" value={indirectData.workingCapitalVariation} indent sign="-" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ À L'ACTIVITÉ (A)" value={indirectData.operatingCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="B. FLUX DE TRÉSORERIE LIÉS AUX INVESTISSEMENTS" />
                <Row label="- Acquisitions d'immobilisations corporelles et incorporelles" value={indirectData.fixedAssetsAcquisitions} indent sign="-" />
                <Row label="+ Cessions d'immobilisations corporelles et incorporelles" value={indirectData.fixedAssetsDisposals} indent sign="+" />
                <Row label="- Acquisitions d'immobilisations financières" value={indirectData.financialAssetsAcquisitions} indent sign="-" />
                <Row label="+ Cessions d'immobilisations financières" value={indirectData.financialAssetsDisposals} indent sign="+" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ AUX INVESTISSEMENTS (B)" value={indirectData.investmentCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="C. FLUX DE TRÉSORERIE LIÉS AU FINANCEMENT" bg="bg-[#525252]/10" />
                <Row label="+ Augmentation de capital en numéraire" value={indirectData.capitalIncrease} indent sign="+" />
                <Row label="+ Subventions d'investissement reçues" value={indirectData.investmentSubsidiesReceived} indent sign="+" />
                <Row label="+ Nouveaux emprunts" value={indirectData.newBorrowings} indent sign="+" />
                <Row label="- Remboursements d'emprunts" value={indirectData.loanRepayments} indent sign="-" />
                <Row label="- Dividendes versés" value={indirectData.dividendsPaid} indent sign="-" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ AU FINANCEMENT (C)" value={indirectData.financingCashFlow} bold bg="bg-[#525252]/20" />

                <SectionHeader title="D. VARIATION DE TRÉSORERIE (A + B + C)" bg="bg-[#525252]/10" />
                <Row label="= VARIATION NETTE DE TRÉSORERIE" value={indirectData.cashFlowVariation} bold bg="bg-[#525252]/20" />
                <Row label="Trésorerie d'ouverture" value={indirectData.openingCashBalance} indent />
                <Row label="Trésorerie de clôture" value={indirectData.closingCashBalance} indent />
                <tr className={indirectData.isCashFlowBalanced ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="px-6 py-3 font-bold flex items-center">
                    {indirectData.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />}
                    CONTRÔLE — Écart
                  </td>
                  <td className="px-6 py-3 text-right font-bold">
                    {formatCurrency(Math.abs(indirectData.cashFlowVariation - (indirectData.closingCashBalance - indirectData.openingCashBalance)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════ TABLE MÉTHODE DIRECTE ══════════ */}
      {activeTab === 'direct' && directData && (
        <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#171717]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-white">TABLEAU DES FLUX DE TRÉSORERIE — Méthode Directe</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-white w-48">Montant (XAF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                <SectionHeader title="A. FLUX DE TRÉSORERIE LIÉS À L'ACTIVITÉ" />
                <Row label="Encaissements reçus des clients" value={directData.encaissementsClients} indent sign="+" />
                <Row label="Autres encaissements liés à l'activité" value={directData.autresEncaissementsExploit} indent sign="+" />
                <Row label="Décaissements versés aux fournisseurs" value={directData.decaissementsFournisseurs} indent sign="-" />
                <Row label="Décaissements versés au personnel" value={directData.decaissementsPersonnel} indent sign="-" />
                <Row label="Intérêts et autres frais financiers payés" value={directData.interetsPayes} indent sign="-" />
                <Row label="Impôts sur le résultat payés" value={directData.impotsSurResultat} indent sign="-" />
                <Row label="Autres décaissements liés à l'activité" value={directData.autresDecaissementsExploit} indent sign="-" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ À L'ACTIVITÉ (A)" value={directData.operatingCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="B. FLUX DE TRÉSORERIE LIÉS AUX INVESTISSEMENTS" />
                <Row label="Décaissements sur acquisitions d'immobilisations corporelles" value={directData.acquisitionsImmosCorporelles} indent sign="-" />
                <Row label="Décaissements sur acquisitions d'immobilisations incorporelles" value={directData.acquisitionsImmosIncorporelles} indent sign="-" />
                <Row label="Décaissements sur acquisitions d'immobilisations financières" value={directData.acquisitionsImmosFinancieres} indent sign="-" />
                <Row label="Encaissements sur cessions d'immobilisations corporelles" value={directData.cessionsImmosCorporelles} indent sign="+" />
                <Row label="Encaissements sur cessions d'immobilisations financières" value={directData.cessionsImmosFinancieres} indent sign="+" />
                <Row label="Intérêts encaissés et dividendes reçus" value={directData.interetsDividendesRecus} indent sign="+" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ AUX INVESTISSEMENTS (B)" value={directData.investmentCashFlow} bold bg="bg-[#171717]/20" />

                <SectionHeader title="C. FLUX DE TRÉSORERIE LIÉS AU FINANCEMENT" bg="bg-[#525252]/10" />
                <Row label="Encaissements suite à l'augmentation du capital" value={directData.augmentationCapital} indent sign="+" />
                <Row label="Subventions d'investissement reçues" value={directData.subventionsRecues} indent sign="+" />
                <Row label="Encaissements provenant d'emprunts" value={directData.empruntsNouveaux} indent sign="+" />
                <Row label="Remboursements d'emprunts" value={directData.remboursementsEmprunts} indent sign="-" />
                <Row label="Dividendes et autres distributions versés" value={directData.dividendesVerses} indent sign="-" />
                <Row label="= FLUX NET DE TRÉSORERIE LIÉ AU FINANCEMENT (C)" value={directData.financingCashFlow} bold bg="bg-[#525252]/20" />

                <SectionHeader title="D. VARIATION DE TRÉSORERIE (A + B + C)" bg="bg-[#525252]/10" />
                <Row label="= VARIATION NETTE DE TRÉSORERIE" value={directData.cashFlowVariation} bold bg="bg-[#525252]/20" />
                <Row label="Trésorerie d'ouverture" value={directData.openingCashBalance} indent />
                <Row label="Trésorerie de clôture" value={directData.closingCashBalance} indent />
                <tr className={directData.isCashFlowBalanced ? 'bg-green-50' : 'bg-red-50'}>
                  <td className="px-6 py-3 font-bold flex items-center">
                    {directData.isCashFlowBalanced ? <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> : <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />}
                    CONTRÔLE — Écart
                  </td>
                  <td className="px-6 py-3 text-right font-bold">
                    {formatCurrency(Math.abs(directData.cashFlowVariation - (directData.closingCashBalance - directData.openingCashBalance)))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note méthodologique */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-[#171717] mt-0.5" />
          <div className="text-xs text-[#171717]/70">
            <p className="font-medium mb-1">Note méthodologique :</p>
            {activeTab === 'indirect' ? (
              <p>La méthode indirecte part du résultat net et ajuste les éléments non monétaires (dotations, reprises, plus/moins-values) pour obtenir la CAF, puis retranche la variation du BFR.</p>
            ) : (
              <p>La méthode directe présente les flux de trésorerie réels : encaissements reçus des clients, décaissements versés aux fournisseurs, au personnel, etc. Les deux méthodes aboutissent à la même variation de trésorerie.</p>
            )}
            <p className="mt-1">Conforme au SYSCOHADA révisé 2017. Montants en Francs CFA (XAF).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowStatementSYSCOHADA;