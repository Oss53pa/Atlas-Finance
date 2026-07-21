import React, { useState, useMemo } from 'react';
import type { DBJournalEntry } from '../../lib/db';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  FileText, Download, Printer, Settings, Eye, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, BarChart3, PieChart as PieChartIcon, Activity,
  DollarSign, Building, CreditCard, Banknote, Target, Zap, Shield,
  Mail, FileSpreadsheet, RefreshCw, Filter, Search, ChevronDown, ChevronRight
} from 'lucide-react';
import PrintableArea from '../ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import { formatCurrency } from '@/utils/formatters';
import { useMoneyFormat } from '@/hooks/useMoneyFormat';
import { money } from '../../utils/money';

interface BilanData {
  actifImmobilise: {
    immobilisationsIncorporelles: number;
    immobilisationsCorporelles: number;
    immobilisationsFinancieres: number;
    amortissements: number;
  };
  actifCirculant: {
    stocks: number;
    creancesClients: number;
    autresCreances: number;
    disponibilites: number;
  };
  capitauxPropres: {
    capitalSocial: number;
    reserves: number;
    reportANouveau: number;
    resultatExercice: number;
  };
  dettes: {
    dettesFinancieres: number;
    dettesFournisseurs: number;
    dettesExploitation: number;
    autresDettes: number;
  };
}

interface CompteResultatData {
  produits: {
    chiffreAffaires: number;
    productionStockee: number;
    autresProduits: number;
    produitsFinanciers: number;
    produitsExceptionnels: number;
  };
  charges: {
    achatsConsommes: number;
    servicesExterieurs: number;
    personnel: number;
    amortissements: number;
    chargesFinancieres: number;
    chargesExceptionnelles: number;
    impotsSocietes: number;
  };
}

interface SIGData {
  margeCommerciale: number;
  valeurAjoutee: number;
  excedentBrutExploitation: number;
  resultatExploitation: number;
  resultatCourant: number;
  resultatNet: number;
  capaciteAutofinancement: number;
}

interface RatiosData {
  structure: {
    autonomieFinanciere: number;
    gearing: number;
    couvertureImmobilisations: number;
  };
  liquidite: {
    liquiditeGenerale: number;
    liquiditeReduite: number;
    liquiditeImmediate: number;
  };
  rentabilite: {
    roa: number;
    roe: number;
    margeNette: number;
    margeBrute: number;
  };
  activite: {
    rotationStocks: number;
    dso: number;
    dpo: number;
    rotationActif: number;
  };
}

interface AdvancedFinancialStatementsProps {
  defaultView?: 'dashboard' | 'bilan' | 'resultat' | 'flux' | 'ratios';
}

const AdvancedFinancialStatements: React.FC<AdvancedFinancialStatementsProps> = ({
  defaultView = 'dashboard'
}) => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();

  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'bilan' | 'resultat' | 'flux' | 'ratios'>(defaultView);
  const [tftMethod, setTftMethod] = useState<'indirect' | 'direct'>('indirect');
  const [tftExpandedRows, setTftExpandedRows] = useState<Set<string>>(new Set());
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showComparative, setShowComparative] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Configuration
  const [config, setConfig] = useState({
    norme: 'SYSCOHADA' as 'SYSCOHADA' | 'IFRS' | 'PCG',
    devise: 'XAF',
    format: 'A4' as 'A4' | 'A3',
    orientation: 'portrait' as 'portrait' | 'landscape',
    includeGraphics: true,
    includeRatios: true,
    showComparison: true
  });

  const { printRef, handlePrint } = usePrintReport({
    orientation: config.orientation,
    title: t('finStatements.title')
  });

  // Load journal entries from Dexie
  const { data: entries = [] } = useQuery({
    queryKey: ['financial-statements-entries'],
    queryFn: async () => {
      const all = await adapter.getAll<DBJournalEntry>('journalEntries');
      return all.filter((e) => e.status === 'validated' || e.status === 'posted');
    },
  });

  // Compute bilan & compte de résultat from real entries
  const { bilanData, compteResultatData, resultatNetReal, details } = useMemo(() => {
    const net = (prefix: string | string[]) => {
      const prefixes = Array.isArray(prefix) ? prefix : [prefix];
      let debit = 0, credit = 0;
      for (const e of entries) {
        for (const l of e.lines) {
          if (prefixes.some(p => l.accountCode.startsWith(p))) {
            debit = money(debit).add(money(l.debit)).toNumber(); credit = money(credit).add(money(l.credit)).toNumber();
          }
        }
      }
      return money(debit).subtract(money(credit)).toNumber();
    };
    const creditNet = (prefix: string | string[]) => -net(prefix);
    // Solde net PAR COMPTE, puis placement par SIGNE (règle SYSCOHADA du bilan).
    // ⚠️ Ne PAS faire Math.max(0, net(classe)) : agréger le net d'une CLASSE avant de
    // choisir le côté compense les comptes de sens opposés (ex. 441 débiteur vs 444
    // créditeur), ce qui déséquilibre le bilan. On somme donc compte par compte.
    const soldesByAccount = (p: string | string[]): number[] => {
      const prefixes = Array.isArray(p) ? p : [p];
      const byAccount = new Map<string, number>();
      for (const e of entries) {
        for (const l of e.lines) {
          if (prefixes.some(x => l.accountCode.startsWith(x))) {
            byAccount.set(l.accountCode, money(byAccount.get(l.accountCode) || 0).add(money(l.debit)).subtract(money(l.credit)).toNumber());
          }
        }
      }
      return Array.from(byAccount.values());
    };
    // Σ des soldes DÉBITEURS (>0) compte par compte.
    const debiteur = (p: string | string[]) => soldesByAccount(p).reduce((s, v) => v > 0 ? money(s).add(money(v)).toNumber() : s, 0);
    // Σ des soldes CRÉDITEURS (<0) compte par compte, en valeur absolue.
    const crediteur = (p: string | string[]) => soldesByAccount(p).reduce((s, v) => v < 0 ? money(s).add(money(-v)).toNumber() : s, 0);
    // Résultat NET d'impôt (−cl.89) calculé AVANT le bilan pour l'y injecter au
    // passif (sinon `creditNet('13')` ≠ résultat net → Actif ≠ Passif).
    const resultatNetReal = money(creditNet('7')).subtract(money(net('6'))).subtract(money(net('89'))).toNumber();

    const bilan: BilanData = {
      actifImmobilise: {
        immobilisationsIncorporelles: net('21'),
        immobilisationsCorporelles: money(net('22')).add(money(net('23'))).add(money(net('24'))).toNumber(),
        immobilisationsFinancieres: money(net('25')).add(money(net('26'))).add(money(net('27'))).toNumber(),
        amortissements: money(creditNet('28')).add(money(creditNet('29'))).toNumber() * -1,
      },
      actifCirculant: {
        stocks: net('3'),
        creancesClients: debiteur('41'),
        autresCreances: money(debiteur('42')).add(money(debiteur('43'))).add(money(debiteur('44'))).add(money(debiteur('45'))).add(money(debiteur('46'))).add(money(debiteur('47'))).toNumber(),
        disponibilites: debiteur('5'),
      },
      capitauxPropres: {
        capitalSocial: money(creditNet('101')).add(money(creditNet('102'))).add(money(creditNet('103'))).add(money(creditNet('104'))).toNumber(),
        reserves: creditNet('11'),
        reportANouveau: creditNet('12'),
        resultatExercice: resultatNetReal,
      },
      dettes: {
        dettesFinancieres: money(creditNet('16')).add(money(creditNet('17'))).toNumber(),
        dettesFournisseurs: crediteur('40'),
        dettesExploitation: money(crediteur('42')).add(money(crediteur('43'))).add(money(crediteur('44'))).toNumber(),
        autresDettes: money(crediteur('45')).add(money(crediteur('46'))).add(money(crediteur('47'))).add(money(crediteur('48'))).toNumber(),
      },
    };

    const cr: CompteResultatData = {
      produits: {
        chiffreAffaires: money(creditNet('70')).add(money(creditNet('71'))).add(money(creditNet('72'))).toNumber(),
        productionStockee: creditNet('73'),
        autresProduits: money(creditNet('74')).add(money(creditNet('75'))).add(money(creditNet('78'))).add(money(creditNet('79'))).toNumber(),
        produitsFinanciers: money(creditNet('76')).add(money(creditNet('77'))).toNumber(),
        produitsExceptionnels: money(creditNet('84')).add(money(creditNet('86'))).add(money(creditNet('88'))).toNumber(),
      },
      charges: {
        achatsConsommes: money(net('60')).add(money(net('61'))).toNumber(),
        // 65 (autres charges) rattaché ici pour que Σ charges couvre TOUTE la classe 6
        // → Total Produits − Total Charges = résultat net (65 et 69 étaient oubliés).
        servicesExterieurs: money(net('62')).add(money(net('63'))).add(money(net('65'))).toNumber(),
        personnel: money(net('64')).add(money(net('66'))).toNumber(),
        amortissements: money(net('68')).add(money(net('69'))).toNumber(),
        chargesFinancieres: net('67'),
        chargesExceptionnelles: money(net('83')).add(money(net('85'))).add(money(net('87'))).toNumber(),
        impotsSocietes: net('89'),
      },
    };

    // Détail (drill-down) des seaux « Autres » : ventilation par sous-classe SYSCOHADA,
    // calculée avec les MÊMES helpers que les totaux (donc Σ détail = total affiché).
    const line = (prefix: string, label: string, fn: (p: string) => number) => ({ prefix, label, amount: fn(prefix) });
    const details = {
      autresCreances: [
        line('42', `${t('finStatements.detailStaff')} (42)`, debiteur), line('43', `${t('finStatements.detailSocialBodies')} (43)`, debiteur),
        line('44', `${t('finStatements.detailState')} (44)`, debiteur), line('45', `${t('finStatements.detailIntlGroup')} (45)`, debiteur),
        line('46', `${t('finStatements.detailPartnersDebtors')} (46)`, debiteur), line('47', `${t('finStatements.detailSuspenseAccounts')} (47)`, debiteur),
      ].filter(d => Math.abs(d.amount) > 0.5),
      autresDettes: [
        line('45', `${t('finStatements.detailIntlGroup')} (45)`, crediteur), line('46', `${t('finStatements.detailPartnersCreditors')} (46)`, crediteur),
        line('47', `${t('finStatements.detailSuspenseAccounts')} (47)`, crediteur), line('48', `${t('finStatements.detailHaoReceivablesPayables')} (48)`, crediteur),
      ].filter(d => Math.abs(d.amount) > 0.5),
      autresProduits: [
        line('74', `${t('finStatements.detailOperatingSubsidies')} (74)`, creditNet), line('75', `${t('finStatements.detailOtherRevenue')} (75)`, creditNet),
        line('78', `${t('finStatements.detailExpenseTransfers')} (78)`, creditNet), line('79', `${t('finStatements.detailProvisionReversals')} (79)`, creditNet),
      ].filter(d => Math.abs(d.amount) > 0.5),
      produitsExceptionnels: [
        line('84', `${t('finStatements.detailHaoRevenue')} (84)`, creditNet), line('86', `${t('finStatements.detailHaoReversals')} (86)`, creditNet), line('88', `${t('finStatements.detailBalancingSubsidies')} (88)`, creditNet),
      ].filter(d => Math.abs(d.amount) > 0.5),
      chargesExceptionnelles: [
        line('83', `${t('finStatements.detailHaoExpenses')} (83)`, net), line('85', `${t('finStatements.detailHaoDepreciation')} (85)`, net), line('87', `${t('finStatements.detailProfitSharing')} (87)`, net),
      ].filter(d => Math.abs(d.amount) > 0.5),
    };

    // resultatNetReal (= cl.7 − cl.6 − cl.89) est calculé plus haut et injecté au
    // passif du bilan (resultatExercice) pour garantir Actif = Passif.
    return { bilanData: bilan, compteResultatData: cr, resultatNetReal, details };
  }, [entries, t]);

  // Lignes « Autres » dépliées (drill-down bilan/CR).
  const [expandedDetail, setExpandedDetail] = React.useState<Set<string>>(new Set());
  const toggleDetail = (key: string) => setExpandedDetail(prev => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });
  const renderAutresRow = (key: string, label: string, total: number, rows: { prefix: string; label: string; amount: number }[]) => (
    <>
      <div className="flex justify-between cursor-pointer hover:bg-gray-50 rounded px-1" onClick={() => toggleDetail(key)} title={t('finStatements.viewDetail')}>
        <span className="text-sm text-gray-600">{expandedDetail.has(key) ? '▾' : '▸'} {label}</span>
        <span className="text-sm font-mono font-medium">{fmt(total)}</span>
      </div>
      {expandedDetail.has(key) && (
        <div className="ml-4 border-l-2 border-gray-100 pl-3 space-y-0.5">
          {rows.length === 0 ? (
            <div className="text-xs text-gray-400 py-0.5">{t('finStatements.noAccountActivity')}</div>
          ) : rows.map(r => (
            <div key={r.prefix} className="flex justify-between text-xs">
              <span className="text-gray-500">{r.label}</span>
              <span className="font-mono text-gray-500">{fmt(r.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Calculs des SIG
  const sigData: SIGData = useMemo(() => {
    const totalProduits = Object.values(compteResultatData.produits).reduce((sum, val) => sum + val, 0);
    const totalCharges = Object.values(compteResultatData.charges).reduce((sum, val) => sum + val, 0);
    
    const margeCommerciale = compteResultatData.produits.chiffreAffaires - compteResultatData.charges.achatsConsommes;
    const valeurAjoutee = margeCommerciale + compteResultatData.produits.productionStockee - compteResultatData.charges.servicesExterieurs;
    const excedentBrutExploitation = valeurAjoutee - compteResultatData.charges.personnel;
    const resultatExploitation = excedentBrutExploitation - compteResultatData.charges.amortissements;
    const resultatCourant = resultatExploitation - compteResultatData.charges.chargesFinancieres + compteResultatData.produits.produitsFinanciers;
    const resultatNet = resultatNetReal;
    const capaciteAutofinancement = resultatNet + compteResultatData.charges.amortissements;
    
    return {
      margeCommerciale,
      valeurAjoutee,
      excedentBrutExploitation,
      resultatExploitation,
      resultatCourant,
      resultatNet,
      capaciteAutofinancement
    };
  }, [compteResultatData, resultatNetReal]);

  // Calculs des ratios
  const ratiosData: RatiosData = useMemo(() => {
    const totalActif = Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0) + 
                      Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0);
    const totalCapitaux = Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0);
    const totalDettes = Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0);
    
    // Division protégée : jamais de NaN/Infinity si un dénominateur est nul.
    const sd = (n: number, d: number) => (d !== 0 && Number.isFinite(n / d)) ? n / d : 0;
    const actifImmob = Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0);
    const actifCirc = Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0);
    const dettesCT = bilanData.dettes.dettesFournisseurs + bilanData.dettes.dettesExploitation;
    const ca = compteResultatData.produits.chiffreAffaires;

    return {
      structure: {
        autonomieFinanciere: sd(totalCapitaux, totalActif) * 100,
        gearing: sd(bilanData.dettes.dettesFinancieres, totalCapitaux) * 100,
        couvertureImmobilisations: sd(totalCapitaux, Math.abs(actifImmob)) * 100
      },
      liquidite: {
        liquiditeGenerale: sd(actifCirc, dettesCT),
        liquiditeReduite: sd(bilanData.actifCirculant.creancesClients + bilanData.actifCirculant.disponibilites, dettesCT),
        liquiditeImmediate: sd(bilanData.actifCirculant.disponibilites, dettesCT)
      },
      rentabilite: {
        roa: sd(sigData.resultatNet, totalActif) * 100,
        roe: sd(sigData.resultatNet, totalCapitaux) * 100,
        margeNette: sd(sigData.resultatNet, ca) * 100,
        margeBrute: sd(sigData.margeCommerciale, ca) * 100
      },
      activite: {
        rotationStocks: sd(compteResultatData.charges.achatsConsommes, bilanData.actifCirculant.stocks),
        dso: sd(bilanData.actifCirculant.creancesClients, ca) * 365,
        dpo: sd(bilanData.dettes.dettesFournisseurs, compteResultatData.charges.achatsConsommes) * 365,
        rotationActif: sd(compteResultatData.produits.chiffreAffaires, totalActif)
      }
    };
  }, [bilanData, compteResultatData, sigData]);

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="min-h-screen bg-gray-50">
      <PrintableArea
        ref={printRef}
        orientation={config.orientation}
        pageSize={config.format}
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{t('finStatements.title')}</h2>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">{t('finStatements.compliantWith')} {config.norme}</p>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Calendar className="w-4 h-4" />
                {dateRange.startDate && dateRange.endDate
                  ? `${dateRange.startDate} - ${dateRange.endDate}`
                  : t('finStatements.selectPeriod')
                }
              </button>
            </div>
          </div>
        }
      >
      {/* En-tête principal */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileText className="w-8 h-8 text-[var(--color-primary)]" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">{t('finStatements.title')}</h1>
              <p className="text-sm text-gray-600">{t('finStatements.completeReporting')} - {t('finStatements.compliantWith')} {config.norme}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select 
              value={config.norme}
              onChange={(e) => setConfig({...config, norme: e.target.value as 'SYSCOHADA' | 'IFRS' | 'PCG'})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="SYSCOHADA">SYSCOHADA</option>
              <option value="IFRS">IFRS</option>
              <option value="PCG">PCG</option>
            </select>
            
            <select
              value={dateRange.startDate || '2026'}
              onChange={(e) => setDateRange({ startDate: e.target.value, endDate: dateRange.endDate })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="2026">{t('finStatements.fiscalYear')} 2026</option>
            </select>
            
            <button 
              onClick={() => setShowComparative(!showComparative)}
              className={`px-4 py-2 rounded-lg border transition-colors ${showComparative ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              {t('finStatements.comparative')}
            </button>
            
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              {t('finStatements.preview')}
            </button>
            
            <button className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors">
              <Download className="w-4 h-4 mr-2 inline" />
              {t('finStatements.export')}
            </button>
          </div>
        </div>
        
        {/* Navigation des états */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'dashboard', label: t('finStatements.tabDashboard'), icon: BarChart3 },
            { id: 'bilan', label: t('accounting.balanceSheet'), icon: Building },
            { id: 'resultat', label: t('finStatements.tabIncomeStatement'), icon: TrendingUp },
            { id: 'flux', label: t('finStatements.tabCashFlow'), icon: Activity },
            { id: 'ratios', label: t('finStatements.tabSigRatios'), icon: Target }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as typeof activeView)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === view.id 
                  ? 'bg-[var(--color-primary)] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <view.icon className="w-4 h-4 mr-2 inline" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau de bord financier */}
      {activeView === 'dashboard' && (
        <div className="p-6 space-y-6">
          
          {/* Indicateurs clés de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('finStatements.kpiRevenue')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">
                    {fmt(compteResultatData.produits.chiffreAffaires)}
                  </p>
                  <p className="text-xs text-gray-700">XAF</p>
                </div>
                <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('finStatements.kpiNetIncome')}</p>
                  <p className={`text-lg font-bold ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(sigData.resultatNet)}
                  </p>
                  <p className="text-xs text-gray-700">
                    {sigData.resultatNet >= 0 ? t('finStatements.profit') : t('finStatements.loss')}
                  </p>
                </div>
                <div className={`w-12 h-12 ${sigData.resultatNet >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                  {sigData.resultatNet >= 0 ? 
                    <TrendingUp className="w-6 h-6 text-green-600" /> :
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  }
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('finStatements.kpiFinancialAutonomy')}</p>
                  <p className={`text-lg font-bold ${ratiosData.structure.autonomieFinanciere > 30 ? 'text-green-600' : 'text-orange-600'}`}>
                    {ratiosData.structure.autonomieFinanciere.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-700">
                    {ratiosData.structure.autonomieFinanciere > 30 ? t('finStatements.solid') : t('finStatements.fragile')}
                  </p>
                </div>
                <div className={`w-12 h-12 ${ratiosData.structure.autonomieFinanciere > 30 ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{t('finStatements.kpiCurrentRatio')}</p>
                  <p className={`text-lg font-bold ${ratiosData.liquidite.liquiditeGenerale > 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {ratiosData.liquidite.liquiditeGenerale.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-700">
                    {ratiosData.liquidite.liquiditeGenerale > 1 ? t('finStatements.correct') : t('finStatements.risky')}
                  </p>
                </div>
                <div className={`w-12 h-12 ${ratiosData.liquidite.liquiditeGenerale > 1 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques de synthèse */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Structure du bilan */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.balanceSheetStructure')}</h3>
                <button className="p-2 text-gray-700 hover:text-gray-600" aria-label={t('finStatements.viewDetails')}>
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { 
                        name: t('finStatements.fixedAssetsShort'),
                        value: Math.abs(Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0))
                      },
                      { 
                        name: t('finStatements.currentAssetsShort'),
                        value: Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0)
                      },
                      { 
                        name: t('finStatements.equityShort'),
                        value: Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0)
                      },
                      { 
                        name: t('finStatements.liabilitiesShort'),
                        value: Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0)
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#235A6E"
                    dataKey="value"
                  >
                    {Array.from({length: 4}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${fmt(value as number)}`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Évolution des SIG */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.sigTrend')}</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>{t('finStatements.last6Months')}</option>
                    <option>{t('finStatements.last12Months')}</option>
                    <option>{t('finStatements.last3Years')}</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { periode: t('finStatements.fiscalYearShort'), va: sigData.valeurAjoutee, ebe: sigData.excedentBrutExploitation, re: sigData.resultatExploitation, rn: sigData.resultatNet },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => `${fmt(value)}`} />
                  <Tooltip formatter={(value) => [`${fmt(value as number)}`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="va" stackId="1" stroke="#235A6E" fill="#235A6E" fillOpacity={0.6} name={t('finStatements.valueAdded')} />
                  <Area type="monotone" dataKey="ebe" stackId="2" stroke="#4E7E8D" fill="#4E7E8D" fillOpacity={0.6} name="EBE" />
                  <Area type="monotone" dataKey="re" stackId="3" stroke="#E8B4B8" fill="#E8B4B8" fillOpacity={0.6} name={t('finStatements.operatingIncomeShort')} />
                  <Area type="monotone" dataKey="rn" stackId="4" stroke="#A8C8EC" fill="#A8C8EC" fillOpacity={0.6} name={t('finStatements.kpiNetIncome')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alertes et indicateurs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Alertes financières */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('finStatements.financialAlerts')}</h4>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('finStatements.alertLowLiquidity')}</span>
                  <span className={`text-sm font-medium ${ratiosData.liquidite.liquiditeGenerale < 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {ratiosData.liquidite.liquiditeGenerale < 1 ? t('finStatements.alert') : t('finStatements.ok')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('finStatements.alertLowAutonomy')}</span>
                  <span className={`text-sm font-medium ${ratiosData.structure.autonomieFinanciere < 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {ratiosData.structure.autonomieFinanciere < 30 ? t('finStatements.alert') : t('finStatements.ok')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('finStatements.alertInsufficientRoe')}</span>
                  <span className={`text-sm font-medium ${ratiosData.rentabilite.roe < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                    {ratiosData.rentabilite.roe < 10 ? t('finStatements.warning') : t('finStatements.excellent')}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance clé */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('finStatements.keyPerformance')}</h4>
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROA</span>
                  <span className="text-sm font-medium text-blue-600">{ratiosData.rentabilite.roa.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROE</span>
                  <span className="text-sm font-medium text-green-600">{ratiosData.rentabilite.roe.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('finStatements.netMargin')}</span>
                  <span className="text-sm font-medium text-primary-600">{ratiosData.rentabilite.margeNette.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Synthèse financière */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">{t('finStatements.financialSummary')}</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CAF</span>
                  <span className="text-sm font-medium text-green-600">
                    {fmt(sigData.capaciteAutofinancement)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EBE</span>
                  <span className="text-sm font-medium text-blue-600">
                    {fmt(sigData.excedentBrutExploitation)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('navigation.treasury')}</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">
                    {fmt(bilanData.actifCirculant.disponibilites)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique de rentabilité */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.profitabilityTrend')}</h3>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-[var(--color-primary)] text-white rounded">
                  {t('finStatements.monthly')}
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  {t('finStatements.quarterly')}
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  {t('finStatements.annual')}
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={(() => {
                const MONTHS = [
                  t('finStatements.monthJan'), t('finStatements.monthFeb'), t('finStatements.monthMar'),
                  t('finStatements.monthApr'), t('finStatements.monthMay'), t('finStatements.monthJun'),
                  t('finStatements.monthJul'), t('finStatements.monthAug'), t('finStatements.monthSep'),
                  t('finStatements.monthOct'), t('finStatements.monthNov'), t('finStatements.monthDec'),
                ];
                return MONTHS.map((mois, idx) => {
                  const m = idx + 1;
                  let ca = 0, charges = 0;
                  for (const e of entries) {
                    const parts = (e as unknown as { date?: string }).date?.split('-');
                    if (!parts || parseInt(parts[1]) !== m) continue;
                    for (const l of (e as unknown as { lines: Array<{ accountCode: string; debit: number; credit: number }> }).lines || []) {
                      if (l.accountCode.startsWith('7')) ca = money(ca).add(money(l.credit).subtract(money(l.debit))).toNumber();
                      if (l.accountCode.startsWith('6')) charges = money(charges).add(money(l.debit).subtract(money(l.credit))).toNumber();
                    }
                  }
                  const rn = money(ca).subtract(money(charges)).toNumber();
                  return { mois, ca, rn, marge: ca > 0 ? Math.round(rn / ca * 1000) / 10 : 0 };
                }).filter(m => m.ca > 0 || m.rn !== 0);
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${fmt(value)}`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(1)}%`} />
                <Tooltip />
                <Legend />
                <Bar radius={[6,6,0,0]} yAxisId="left" dataKey="ca" fill="url(#gradPetrol)" name={`${t('finStatements.kpiRevenue')} (M XAF)`} />
                <Bar radius={[6,6,0,0]} yAxisId="left" dataKey="rn" fill="url(#gradPetrolLight)" name={`${t('finStatements.kpiNetIncome')} (M XAF)`} />
                <Line yAxisId="right" type="monotone" dataKey="marge" stroke="#C0322B" strokeWidth={3} name={`${t('finStatements.netMargin')} (%)`} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bilan comptable et fonctionnel */}
      {activeView === 'bilan' && (
        <div className="p-6 space-y-6">
          
          {/* Sélecteur type de bilan */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.balanceSheetType')}</h3>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg">
                  {t('finStatements.accountingBalanceSheet')}
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  {t('finStatements.functionalBalanceSheet')}
                </button>
              </div>
            </div>
          </div>

          {/* Bilan comptable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ACTIF */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.assets')}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                
                {/* Actif immobilisé */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{t('finStatements.fixedAssets')}</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.intangibleAssets')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifImmobilise.immobilisationsIncorporelles)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.tangibleAssets')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifImmobilise.immobilisationsCorporelles)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.financialAssets')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifImmobilise.immobilisationsFinancieres)}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-sm">{t('finStatements.depreciation')}</span>
                      <span className="text-sm font-mono font-medium">
                        ({fmt(Math.abs(bilanData.actifImmobilise.amortissements))})
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">{t('finStatements.totalFixedAssets')}</span>
                      <span className="text-sm font-mono">
                        {fmt(Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actif circulant */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{t('finStatements.currentAssets')}</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.inventoryAndWip')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifCirculant.stocks)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.tradeReceivables')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifCirculant.creancesClients)}
                      </span>
                    </div>
                    {renderAutresRow('autresCreances', t('finStatements.otherReceivables'), bilanData.actifCirculant.autresCreances, details.autresCreances)}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.cashAndEquivalents')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.actifCirculant.disponibilites)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">{t('finStatements.totalCurrentAssets')}</span>
                      <span className="text-sm font-mono">
                        {fmt(Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total actif */}
                <div className="bg-blue-50 p-3 rounded">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('finStatements.totalAssets')}</span>
                    <span className="font-mono">
                      {fmt((Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0) + 
                        Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSIF */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.liabilities')}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                
                {/* Capitaux propres */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{t('finStatements.equity')}</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.shareCapital')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.capitauxPropres.capitalSocial)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.reserves')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.capitauxPropres.reserves)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.retainedEarnings')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.capitauxPropres.reportANouveau)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.incomeForTheYear')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.capitauxPropres.resultatExercice)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">{t('finStatements.totalEquity')}</span>
                      <span className="text-sm font-mono">
                        {fmt(Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dettes */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">{t('finStatements.debts')}</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.financialDebts')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.dettes.dettesFinancieres)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.tradePayables')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.dettes.dettesFournisseurs)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">{t('finStatements.operatingPayables')}</span>
                      <span className="text-sm font-mono font-medium">
                        {fmt(bilanData.dettes.dettesExploitation)}
                      </span>
                    </div>
                    {renderAutresRow('autresDettes', t('finStatements.otherPayables'), bilanData.dettes.autresDettes, details.autresDettes)}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">{t('finStatements.totalDebts')}</span>
                      <span className="text-sm font-mono">
                        {fmt(Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total passif */}
                <div className="bg-green-50 p-3 rounded">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('finStatements.totalLiabilities')}</span>
                    <span className="font-mono">
                      {fmt((Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0) + 
                        Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0)))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compte de résultat */}
      {activeView === 'resultat' && (
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PRODUITS */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.revenues')}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.turnover')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.produits.chiffreAffaires)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.changeInInventory')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.produits.productionStockee)}
                    </span>
                  </div>
                  {renderAutresRow('autresProduits', t('finStatements.otherRevenue'), compteResultatData.produits.autresProduits, details.autresProduits)}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.financialIncome')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.produits.produitsFinanciers)}
                    </span>
                  </div>
                  {renderAutresRow('produitsExceptionnels', t('finStatements.extraordinaryIncome'), compteResultatData.produits.produitsExceptionnels, details.produitsExceptionnels)}
                </div>
                
                <div className="bg-green-50 p-3 rounded border-t-2 border-green-200">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('finStatements.totalRevenues')}</span>
                    <span className="font-mono text-green-600">
                      {fmt(Object.values(compteResultatData.produits).reduce((sum, val) => sum + val, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CHARGES */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-red-50">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.expenses')}</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.purchasesConsumed')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.achatsConsommes)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.externalServicesAndOther')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.servicesExterieurs)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.payrollExpenses')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.personnel)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.depreciationCharges')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.amortissements)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.financialExpenses')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.chargesFinancieres)}
                    </span>
                  </div>
                  {renderAutresRow('chargesExceptionnelles', t('finStatements.extraordinaryExpenses'), compteResultatData.charges.chargesExceptionnelles, details.chargesExceptionnelles)}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{t('finStatements.corporateIncomeTax')}</span>
                    <span className="text-sm font-mono font-medium">
                      {fmt(compteResultatData.charges.impotsSocietes)}
                    </span>
                  </div>
                </div>
                
                <div className="bg-red-50 p-3 rounded border-t-2 border-red-200">
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('finStatements.totalExpenses')}</span>
                    <span className="font-mono text-red-600">
                      {fmt(Object.values(compteResultatData.charges).reduce((sum, val) => sum + val, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Résultat net */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('finStatements.netIncomeForTheYear')}</h3>
              <div className={`text-lg font-bold mb-2 ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(sigData.resultatNet)}
              </div>
              <div className={`text-lg ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sigData.resultatNet >= 0 ? t('finStatements.profit') : t('finStatements.loss')}
              </div>
              <div className="text-sm text-gray-700 mt-2">
                {t('finStatements.netMargin')}: {ratiosData.rentabilite.margeNette.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau de flux de trésorerie */}
      {activeView === 'flux' && (() => {
        const toggleTftRow = (key: string) => setTftExpandedRows(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
        const net = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t = money(t).add(money(l.debit).subtract(money(l.credit))).toNumber(); return t; };
        const creditN = (...pfx: string[]) => { let t = 0; for (const e of entries) for (const l of e.lines) if (pfx.some(p => l.accountCode.startsWith(p))) t = money(t).add(money(l.credit).subtract(money(l.debit))).toNumber(); return t; };
        const detailEntries = (...pfx: string[]) => entries.filter(e => e.lines?.some((l: any) => pfx.some(p => l.accountCode.startsWith(p)))).map(e => ({ ref: e.entryNumber || e.reference || e.id?.substring(0, 8), date: e.date, label: e.label, journal: e.journal, amount: e.lines.filter((l: any) => pfx.some(p => l.accountCode.startsWith(p))).reduce((s: number, l: any) => money(s).add(money(l.debit).subtract(money(l.credit))).toNumber(), 0) }));

        // Méthode indirecte — résultat NET d'impôt (− cl.89). La contrepartie de
        // l'impôt (dette en 44) est reprise dans la variation du BFR (vFis sur '44'),
        // donc le flux d'exploitation se reconcilie toujours avec la variation de tréso.
        const rn = money(creditN('7')).subtract(money(net('6'))).subtract(money(net('89'))).toNumber();
        const dot = net('68', '69');
        const rep = creditN('78', '79');
        const pmv = money(creditN('82')).subtract(money(net('81'))).toNumber();
        const caf = money(rn).add(money(dot)).subtract(money(rep)).toNumber();
        const vStk = net('3'); const vCli = net('41'); const vAut = net('46');
        const vFrn = creditN('40'); const vFis = creditN('42', '43', '44');
        const fExploit = money(caf).subtract(money(vStk)).subtract(money(vCli)).subtract(money(vAut)).add(money(vFrn)).add(money(vFis)).toNumber();
        let acqI = 0; for (const e of entries) { if (e.journal === 'AN' || e.journal === 'RAN') continue; for (const l of e.lines) if (l.accountCode.startsWith('2') && !l.accountCode.startsWith('28') && l.debit > 0) acqI = money(acqI).add(money(l.debit)).toNumber(); }
        const cesI = creditN('82'); const acqF = net('26', '27') > 0 ? net('26', '27') : 0;
        const fInvest = money(cesI).subtract(money(acqI)).subtract(money(acqF)).toNumber();
        const augCap = creditN('10'); const emp = creditN('16'); const rembE = net('16') > 0 ? net('16') : 0; const div = net('465');
        const fFinanc = money(augCap).add(money(emp)).subtract(money(rembE)).subtract(money(div)).toNumber();
        const varTreso = money(fExploit).add(money(fInvest)).add(money(fFinanc)).toNumber();
        // Trésorerie = classe 5 HORS 59 (dépréciations des titres de placement, créditrices).
        const tresoOuv = (() => { let t = 0; for (const e of entries) { if (e.journal === 'AN' || e.journal === 'RAN') for (const l of e.lines) if (l.accountCode.startsWith('5') && !l.accountCode.startsWith('59')) t = money(t).add(money(l.debit).subtract(money(l.credit))).toNumber(); } return t; })();
        const tresoClo = money(net('5')).subtract(money(net('59'))).toNumber();

        // Méthode directe
        let dEC = 0, dDF = 0, dDP = 0, dDI = 0, dAE = 0, dAD = 0, dDA = 0, dDAF = 0, dECe = 0, dECa = 0, dEE = 0, dDRE = 0, dDD = 0;
        for (const e of entries) {
          if (e.journal === 'AN' || e.journal === 'RAN') continue;
          const cl = e.lines?.filter((l: any) => l.accountCode.startsWith('5')) || [];
          const ot = e.lines?.filter((l: any) => !l.accountCode.startsWith('5')) || [];
          if (cl.length === 0) continue;
          let cd = 0, cc = 0; for (const c of cl) { cd = money(cd).add(money(c.debit)).toNumber(); cc = money(cc).add(money(c.credit)).toNumber(); }
          const nc = money(cd).subtract(money(cc)).toNumber();
          const absNc = money(nc).abs().toNumber();
          const h = (p: string) => ot.some((l: any) => l.accountCode.startsWith(p));
          if (h('41')) { if (nc > 0) dEC = money(dEC).add(money(nc)).toNumber(); else dAD = money(dAD).add(money(absNc)).toNumber(); }
          else if (h('40')) { if (nc < 0) dDF = money(dDF).add(money(absNc)).toNumber(); else dAE = money(dAE).add(money(nc)).toNumber(); }
          else if (h('42') || h('43')) { if (nc < 0) dDP = money(dDP).add(money(absNc)).toNumber(); }
          else if (h('44') || h('89')) { if (nc < 0) dDI = money(dDI).add(money(absNc)).toNumber(); }
          else if (h('21') || h('22') || h('23') || h('24') || h('25')) { if (nc < 0) dDA = money(dDA).add(money(absNc)).toNumber(); else dECe = money(dECe).add(money(nc)).toNumber(); }
          else if (h('26') || h('27')) { if (nc < 0) dDAF = money(dDAF).add(money(absNc)).toNumber(); }
          else if (h('10') || h('11') || h('12')) { if (nc > 0) dECa = money(dECa).add(money(nc)).toNumber(); }
          else if (h('16')) { if (nc > 0) dEE = money(dEE).add(money(nc)).toNumber(); else dDRE = money(dDRE).add(money(absNc)).toNumber(); }
          else if (h('465')) { if (nc < 0) dDD = money(dDD).add(money(absNc)).toNumber(); }
          else { if (nc > 0) dAE = money(dAE).add(money(nc)).toNumber(); else dAD = money(dAD).add(money(absNc)).toNumber(); }
        }
        const dFE = dEC + dAE - dDF - dDP - dDI - dAD;
        const dFI = dECe - dDA - dDAF;
        const dFF = dECa + dEE - dDRE - dDD;
        const dVar = dFE + dFI + dFF;

        const indirectRows = [
          { section: `A. ${t('finStatements.sectionOperatingFlows')}`, color: 'blue' },
          { key: 'i-rn', label: t('finStatements.rowNetIncome'), value: rn, pfx: ['6', '7'] },
          { key: 'i-dot', label: `+ ${t('finStatements.rowDepreciationProvisions')}`, value: dot, pfx: ['68', '69'] },
          { key: 'i-rep', label: `- ${t('finStatements.rowProvisionReversals')}`, value: -rep, pfx: ['78', '79'] },
          { key: 'i-pmv', label: `± ${t('finStatements.rowGainsLossesOnDisposal')}`, value: pmv, pfx: ['81', '82'] },
          { sub: true, label: `= ${t('finStatements.rowCaf')}`, value: caf },
          { key: 'i-stk', label: `- ${t('finStatements.rowChangeInventory')}`, value: -vStk, pfx: ['3'] },
          { key: 'i-cli', label: `- ${t('finStatements.rowChangeReceivables')}`, value: -vCli, pfx: ['41'] },
          { key: 'i-aut', label: `- ${t('finStatements.rowChangeOtherReceivables')}`, value: -vAut, pfx: ['46'] },
          { key: 'i-frn', label: `+ ${t('finStatements.rowChangePayables')}`, value: vFrn, pfx: ['40'] },
          { key: 'i-fis', label: `+ ${t('finStatements.rowChangeTaxSocialPayables')}`, value: vFis, pfx: ['42', '43', '44'] },
          { tot: true, label: `= ${t('finStatements.rowNetOperatingFlows')} (A)`, value: fExploit },
          { section: `B. ${t('finStatements.sectionInvestingFlows')}`, color: 'orange' },
          { key: 'i-acq', label: `- ${t('finStatements.rowAcquisitionsFixedAssets')}`, value: -acqI, pfx: ['21', '22', '23', '24', '25'] },
          { key: 'i-ces', label: `+ ${t('finStatements.rowDisposalsFixedAssets')}`, value: cesI, pfx: ['82'] },
          { key: 'i-af', label: `- ${t('finStatements.rowFinancialAcquisitions')}`, value: -acqF, pfx: ['26', '27'] },
          { tot: true, label: `= ${t('finStatements.rowNetInvestingFlows')} (B)`, value: fInvest },
          { section: `C. ${t('finStatements.sectionFinancingFlows')}`, color: 'purple' },
          { key: 'i-cap', label: `+ ${t('finStatements.rowCapitalIncrease')}`, value: augCap, pfx: ['10'] },
          { key: 'i-emp', label: `+ ${t('finStatements.rowNewBorrowings')}`, value: emp, pfx: ['16'] },
          { key: 'i-rem', label: `- ${t('finStatements.rowLoanRepayments')}`, value: -rembE, pfx: ['16'] },
          { key: 'i-div', label: `- ${t('finStatements.rowDividendsPaid')}`, value: -div, pfx: ['465'] },
          { tot: true, label: `= ${t('finStatements.rowNetFinancingFlows')} (C)`, value: fFinanc },
        ];
        const directRows = [
          { section: `A. ${t('finStatements.sectionOperatingFlows')}`, color: 'blue' },
          { key: 'd-ec', label: `+ ${t('finStatements.rowCustomerReceipts')}`, value: dEC, pfx: ['41'] },
          { key: 'd-ae', label: `+ ${t('finStatements.rowOtherOperatingReceipts')}`, value: dAE, pfx: [] },
          { key: 'd-df', label: `- ${t('finStatements.rowSupplierPayments')}`, value: -dDF, pfx: ['40'] },
          { key: 'd-dp', label: `- ${t('finStatements.rowPayrollPayments')}`, value: -dDP, pfx: ['42', '43'] },
          { key: 'd-di', label: `- ${t('finStatements.rowTaxesPaid')}`, value: -dDI, pfx: ['44', '89'] },
          { key: 'd-ad', label: `- ${t('finStatements.rowOtherOperatingPayments')}`, value: -dAD, pfx: [] },
          { tot: true, label: `= ${t('finStatements.rowNetOperatingFlows')} (A)`, value: dFE },
          { section: `B. ${t('finStatements.sectionInvestingFlows')}`, color: 'orange' },
          { key: 'd-da', label: `- ${t('finStatements.rowPaymentsFixedAssets')}`, value: -dDA, pfx: ['21', '22', '23', '24', '25'] },
          { key: 'd-daf', label: `- ${t('finStatements.rowPaymentsFinancialAssets')}`, value: -dDAF, pfx: ['26', '27'] },
          { key: 'd-ece', label: `+ ${t('finStatements.rowDisposalReceipts')}`, value: dECe, pfx: ['82'] },
          { tot: true, label: `= ${t('finStatements.rowNetInvestingFlows')} (B)`, value: dFI },
          { section: `C. ${t('finStatements.sectionFinancingFlows')}`, color: 'purple' },
          { key: 'd-eca', label: `+ ${t('finStatements.rowCapitalIncreaseReceipts')}`, value: dECa, pfx: ['10'] },
          { key: 'd-ee', label: `+ ${t('finStatements.rowBorrowingReceipts')}`, value: dEE, pfx: ['16'] },
          { key: 'd-dre', label: `- ${t('finStatements.rowLoanRepayments')}`, value: -dDRE, pfx: ['16'] },
          { key: 'd-dd', label: `- ${t('finStatements.rowDividendsPaid')}`, value: -dDD, pfx: ['465'] },
          { tot: true, label: `= ${t('finStatements.rowNetFinancingFlows')} (C)`, value: dFF },
        ];
        const rows = tftMethod === 'indirect' ? indirectRows : directRows;
        const totalVar = tftMethod === 'indirect' ? varTreso : dVar;

        return (
        <div className="p-6 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.cashFlowStatement')}</h3>
              <p className="text-sm text-gray-600">{t('finStatements.compliantWith')} SYSCOHADA — {t('finStatements.clickRowForEntries')}</p>
            </div>

            {/* Sous-onglets Méthode Indirecte / Directe */}
            <div className="flex border-b border-gray-200">
              <button onClick={() => setTftMethod('indirect')} className={`flex-1 px-4 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${tftMethod === 'indirect' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t('finStatements.indirectMethod')}
              </button>
              <button onClick={() => setTftMethod('direct')} className={`flex-1 px-4 py-3 text-sm font-semibold text-center border-b-2 transition-colors ${tftMethod === 'direct' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t('finStatements.directMethod')}
              </button>
            </div>

            <div className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-8 p-2"></th>
                    <th className="text-left p-3 font-medium text-gray-600">{t('finStatements.label')}</th>
                    <th className="text-right p-3 font-medium text-gray-600 w-44">{t('finStatements.amountFcfa')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: any, idx) => {
                    if (row.section) {
                      const colors: any = { blue: 'bg-blue-50 text-blue-800', orange: 'bg-orange-50 text-orange-800', purple: 'bg-purple-50 text-purple-800' };
                      return <tr key={`s${idx}`} className={colors[row.color]}><td className="p-2"></td><td colSpan={2} className="p-3 font-bold">{row.section}</td></tr>;
                    }
                    if (row.sub) return <tr key={`sub${idx}`} className="bg-gray-100 font-semibold"><td className="p-2"></td><td className="p-3">{row.label}</td><td className={`p-3 text-right font-mono font-bold ${row.value < 0 ? 'text-red-600' : ''}`}>{fmt(row.value)}</td></tr>;
                    if (row.tot) return <tr key={`t${idx}`} className="bg-gray-200 font-bold border-t-2 border-gray-400"><td className="p-2"></td><td className="p-3">{row.label}</td><td className={`p-3 text-right font-mono text-base ${row.value < 0 ? 'text-red-600' : 'text-gray-900'}`}>{fmt(row.value)}</td></tr>;
                    const expanded = tftExpandedRows.has(row.key);
                    const details = expanded && row.pfx?.length > 0 ? detailEntries(...row.pfx) : [];
                    return (
                      <React.Fragment key={row.key}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => row.pfx?.length > 0 && toggleTftRow(row.key)}>
                          <td className="p-2 text-center text-gray-400">{row.pfx?.length > 0 && (expanded ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronRight className="w-4 h-4 inline" />)}</td>
                          <td className="p-3 text-gray-700">{row.label}</td>
                          <td className={`p-3 text-right font-mono ${row.value < 0 ? 'text-red-600' : ''}`}>{fmt(row.value)}</td>
                        </tr>
                        {expanded && details.length > 0 && details.slice(0, 25).map((d: any, di: number) => (
                          <tr key={`${row.key}-${di}`} className="bg-blue-50/40 border-b border-blue-100">
                            <td className="p-1"></td>
                            <td className="p-2 pl-10 text-xs text-gray-600"><span className="font-mono text-gray-400 mr-2">{d.date}</span><span className="text-gray-500 mr-1">[{d.journal}]</span> <span className="font-mono mr-1">{d.ref}</span> {d.label}</td>
                            <td className={`p-2 text-right font-mono text-xs ${d.amount < 0 ? 'text-red-500' : 'text-gray-700'}`}>{fmt(d.amount)}</td>
                          </tr>
                        ))}
                        {expanded && details.length === 0 && <tr key={`${row.key}-e`} className="bg-gray-50"><td></td><td colSpan={2} className="p-2 pl-10 text-xs text-gray-400 italic">{t('finStatements.noEntries')}</td></tr>}
                        {expanded && details.length > 25 && <tr key={`${row.key}-m`} className="bg-blue-50/40"><td></td><td colSpan={2} className="p-2 pl-10 text-xs text-blue-600 italic">{t('finStatements.andMoreEntries', { count: String(details.length - 25) })}</td></tr>}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-gray-200 font-bold border-t-4 border-gray-500">
                    <td className="p-3"></td>
                    <td className="p-3 text-gray-900">{t('finStatements.netChangeInCash')} (A+B+C)</td>
                    <td className={`p-3 text-right font-mono text-lg ${totalVar < 0 ? 'text-red-600' : 'text-green-700'}`}>{totalVar >= 0 ? '+' : ''}{fmt(totalVar)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="p-2"></td>
                    <td className="p-3 text-gray-600">{t('finStatements.openingCash')}</td>
                    <td className="p-3 text-right font-mono">{fmt(tresoOuv)}</td>
                  </tr>
                  <tr className="bg-gray-100 font-bold">
                    <td className="p-2"></td>
                    <td className="p-3">{t('finStatements.closingCash')}</td>
                    <td className="p-3 text-right font-mono text-lg text-gray-900">{fmt(tresoClo)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* SIG & Ratios */}
      {activeView === 'ratios' && (
        <div className="p-6 space-y-6">
          
          {/* Soldes Intermédiaires de Gestion */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.sigTitle')}</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {[
                    { label: t('finStatements.grossMargin'), value: sigData.margeCommerciale, color: 'blue' },
                    { label: t('finStatements.valueAdded'), value: sigData.valeurAjoutee, color: 'green' },
                    { label: t('finStatements.ebitda'), value: sigData.excedentBrutExploitation, color: 'primary' }
                  ].map((sig, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 border-${sig.color}-400 bg-${sig.color}-50`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{sig.label}</span>
                        <span className={`text-lg font-bold text-${sig.color}-600 font-mono`}>
                          {fmt(sig.value)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((sig.value / compteResultatData.produits.chiffreAffaires) * 100).toFixed(1)}{t('finStatements.percentOfRevenue')}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: t('finStatements.operatingIncome'), value: sigData.resultatExploitation, color: 'primary' },
                    { label: t('finStatements.ordinaryIncome'), value: sigData.resultatCourant, color: 'orange' },
                    { label: t('finStatements.selfFinancingCapacity'), value: sigData.capaciteAutofinancement, color: 'primary' }
                  ].map((sig, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 border-${sig.color}-400 bg-${sig.color}-50`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{sig.label}</span>
                        <span className={`text-lg font-bold text-${sig.color}-600 font-mono`}>
                          {fmt(sig.value)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((sig.value / compteResultatData.produits.chiffreAffaires) * 100).toFixed(1)}{t('finStatements.percentOfRevenue')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ratios financiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Ratios de structure et liquidité */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">{t('finStatements.structureLiquidityRatios')}</h4>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800">{t('finStatements.financialStructure')}</h5>
                  {[
                    { label: t('finStatements.ratioFinancialAutonomy'), value: ratiosData.structure.autonomieFinanciere, unit: '%', seuil: 30 },
                    { label: t('finStatements.ratioGearing'), value: ratiosData.structure.gearing, unit: '%', seuil: 100 },
                    { label: t('finStatements.ratioFixedAssetCoverage'), value: ratiosData.structure.couvertureImmobilisations, unit: '%', seuil: 100 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600'}`}>
                          {ratio.value.toFixed(1)}{ratio.unit}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500'}`}>
                          {ratio.value >= ratio.seuil ? t('finStatements.correct') : t('finStatements.warning')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h5 className="font-medium text-gray-800">{t('finStatements.liquidity')}</h5>
                  {[
                    { label: t('finStatements.ratioCurrentRatio'), value: ratiosData.liquidite.liquiditeGenerale, seuil: 1 },
                    { label: t('finStatements.ratioQuickRatio'), value: ratiosData.liquidite.liquiditeReduite, seuil: 0.8 },
                    { label: t('finStatements.ratioCashRatio'), value: ratiosData.liquidite.liquiditeImmediate, seuil: 0.2 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-red-600'}`}>
                          {ratio.value.toFixed(2)}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-red-500'}`}>
                          {ratio.value >= ratio.seuil ? t('finStatements.good') : t('finStatements.risky')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ratios de rentabilité et activité */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">{t('finStatements.profitabilityActivityRatios')}</h4>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800">{t('finStatements.profitability')}</h5>
                  {[
                    { label: 'ROA (Return on Assets)', value: ratiosData.rentabilite.roa, unit: '%', seuil: 5 },
                    { label: 'ROE (Return on Equity)', value: ratiosData.rentabilite.roe, unit: '%', seuil: 10 },
                    { label: t('finStatements.netMargin'), value: ratiosData.rentabilite.margeNette, unit: '%', seuil: 5 },
                    { label: t('finStatements.grossMarginRatio'), value: ratiosData.rentabilite.margeBrute, unit: '%', seuil: 20 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600'}`}>
                          {ratio.value.toFixed(1)}{ratio.unit}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500'}`}>
                          {ratio.value >= ratio.seuil ? t('finStatements.excellent') : t('finStatements.weak')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h5 className="font-medium text-gray-800">{t('finStatements.activity')}</h5>
                  {[
                    { label: t('finStatements.ratioInventoryTurnover'), value: ratiosData.activite.rotationStocks, unit: t('finStatements.unitTimesPerYear'), seuil: 4 },
                    { label: t('finStatements.ratioDso'), value: ratiosData.activite.dso, unit: t('finStatements.unitDays'), seuil: 45, inverse: true },
                    { label: t('finStatements.ratioDpo'), value: ratiosData.activite.dpo, unit: t('finStatements.unitDays'), seuil: 30 },
                    { label: t('finStatements.ratioAssetTurnover'), value: ratiosData.activite.rotationActif, unit: t('finStatements.unitTimesPerYear'), seuil: 1 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? 'text-green-600' : 'text-orange-600') :
                            (ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600')
                        }`}>
                          {ratio.value.toFixed(ratio.unit === t('finStatements.unitDays') ? 0 : 1)} {ratio.unit}
                        </span>
                        <div className={`text-xs ${
                          ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? 'text-green-500' : 'text-orange-500') :
                            (ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500')
                        }`}>
                          {ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? t('finStatements.optimal') : t('finStatements.long')) :
                            (ratio.value >= ratio.seuil ? t('finStatements.good') : t('finStatements.weak'))
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Graphique évolution ratios — nécessite un historique pluri-exercices absent de l'import */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('finStatements.keyRatiosTrend')}</h3>
            <div className="flex items-center justify-center h-[200px] text-center text-sm text-gray-400 italic">
              {t('finStatements.noMultiYearHistory')}
            </div>
          </div>
        </div>
      )}
      </PrintableArea>

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">{t('finStatements.previewTitle')}</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">{t('finStatements.formatLabel')}</label>
                    <select 
                      value={config.format}
                      onChange={(e) => setConfig({...config, format: e.target.value as 'A4' | 'A3'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">{t('finStatements.orientationLabel')}</label>
                    <select 
                      value={config.orientation}
                      onChange={(e) => setConfig({...config, orientation: e.target.value as 'portrait' | 'landscape'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="portrait">{t('finStatements.portrait')}</option>
                      <option value="landscape">{t('finStatements.landscape')}</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="text-gray-700 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Options d'impression */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.includeGraphics}
                    onChange={(e) => setConfig({...config, includeGraphics: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('finStatements.includeCharts')}</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.includeRatios}
                    onChange={(e) => setConfig({...config, includeRatios: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('finStatements.includeRatios')}</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.showComparison}
                    onChange={(e) => setConfig({...config, showComparison: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('finStatements.priorYearComparison')}</span>
                </label>
              </div>
            </div>

            {/* Prévisualisation */}
            <div className={`p-8 bg-white ${config.format === 'A3' ? 'text-sm' : 'text-xs'} ${config.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>
              
              {/* En-tête du rapport */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-700" />
                  </div>
                </div>
                <h1 className="text-lg font-bold text-gray-900">{t('finStatements.titleUpper')}</h1>
                <p className="text-gray-600">{t('finStatements.fiscalYear')} {dateRange.startDate || '2026'} - {t('finStatements.compliantWith')} {config.norme}</p>
                <p className="text-gray-700 text-sm">{t('finStatements.generatedOn')} {new Date().toLocaleDateString('fr-FR')}</p>
              </div>

              {/* Résumé des indicateurs */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded">
                <div className="text-center">
                  <div className="text-xs text-gray-600">{t('finStatements.kpiRevenue')}</div>
                  <div className="font-bold text-[var(--color-primary)]">{fmt(compteResultatData.produits.chiffreAffaires)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">{t('finStatements.kpiNetIncome')}</div>
                  <div className={`font-bold ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(sigData.resultatNet)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">ROE</div>
                  <div className="font-bold text-blue-600">{ratiosData.rentabilite.roe.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">{t('finStatements.autonomy')}</div>
                  <div className="font-bold text-primary-600">{ratiosData.structure.autonomieFinanciere.toFixed(1)}%</div>
                </div>
              </div>

              {/* Pied de page */}
              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-700">
                <div>
                  <p><span className="atlas-brand">Atlas FnA</span> - {t('finStatements.title')}</p>
                  <p>{t('finStatements.systemCompliantWith')} {config.norme}</p>
                </div>
                <div className="text-right">
                  <p>{t('finStatements.pageOneOfOne')}</p>
                  <p>{t('finStatements.generatedBy')} —</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('finStatements.close')}
              </button>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  {t('finStatements.sendByEmail')}
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  {t('finStatements.exportExcel')}
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    handlePrint();
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  {t('finStatements.print')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(period: { start: string; end: string }) => {
          setDateRange({ startDate: period.start, endDate: period.end });
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default AdvancedFinancialStatements;