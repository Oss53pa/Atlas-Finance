import React, { useState, useMemo } from 'react';
import type { DBJournalEntry, DBAccount } from '../../lib/db';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { verifyTrialBalance } from '../../services/trialBalanceService';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import ExportMenu from '../shared/ExportMenu';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, AreaChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Eye,
  Printer, Settings, Filter, Search, Calendar, BarChart3, PieChart as PieChartIcon,
  FileText, Users, Building, CreditCard, AlertCircle, RefreshCw, Save,
  ChevronDown, ChevronRight, Grid3X3, Columns, ZoomIn, Mail, FileSpreadsheet
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { useMoneyFormat } from '@/hooks/useMoneyFormat';
import { money } from '../../utils/money';
import './AdvancedBalance.css';
import Balance from './Balance';
import PrintableArea from '../ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';

interface BalanceData {
  compte: string;
  libelle: string;
  debitPrecedent: number;
  creditPrecedent: number;
  debitMouvement: number;
  creditMouvement: number;
  debitSolde: number;
  creditSolde: number;
  type: 'actif' | 'passif' | 'charges' | 'produits';
  centreCout?: string;
  dernierMouvement?: Date;
}

interface ChartData {
  periode: string;
  actif: number;
  passif: number;
  charges: number;
  produits: number;
}

const AdvancedBalance: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'generale' | 'analytique'>('dashboard');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: `${new Date().getFullYear()}-01-01`, end: `${new Date().getFullYear()}-12-31` });
  const [filteredData, setFilteredData] = useState<BalanceData[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  
  // Configuration des colonnes
  const [columnConfig, setColumnConfig] = useState({
    totalColumns: 8,
    visibleColumns: ['compte', 'libelle', 'debitPrecedent', 'creditPrecedent', 'debitMouvement', 'creditMouvement', 'debitSolde', 'creditSolde']
  });
  
  // Filtres avancés
  const [filters, setFilters] = useState({
    dateDebut: '2025-01-01',
    dateFin: '2025-12-31',
    compteMin: '',
    compteMax: '',
    libelle: '',
    tiers: '',
    centreCout: '',
    devise: 'XAF',
    montantMin: '',
    montantMax: '',
    onlyMovement: false,
    onlyUnbalanced: false,
    showZeroBalance: false
  });

  // Configuration d'impression
  const [printConfig, setPrintConfig] = useState({
    format: 'A4' as 'A4' | 'A3',
    orientation: 'landscape' as 'portrait' | 'landscape',
    includeCharts: true,
    includeDetails: true,
    showLogos: true
  });

  const { printRef, handlePrint } = usePrintReport({
    orientation: printConfig.orientation,
    fileName: 'balance-avancee.pdf'
  });

  // Charger les données de balance depuis Dexie
  const { data: balanceData = [] } = useQuery<BalanceData[]>({
    queryKey: ['advanced-balance', dateRange.start, dateRange.end],
    queryFn: async () => {
      const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
      const entries = allEntries.filter(e => e.status !== 'draft'); // brouillons exclus
      const accounts = await adapter.getAll<DBAccount>('accounts');
      const accountNames = new Map(accounts.map(a => [a.code, a.name]));

      const isAN = (e: any) => {
        const j = String(e?.journal || '').toUpperCase();
        return j === 'AN' || j === 'RAN';
      };

      // Bloc À NOUVEAU (ouverture) par compte, séparé des mouvements de période.
      const opening = new Map<string, { debit: number; credit: number }>();
      for (const entry of entries) {
        if (!isAN(entry)) continue;
        for (const line of (entry.lines || [])) {
          const o = opening.get(line.accountCode) || { debit: 0, credit: 0 };
          o.debit = money(o.debit).add(money(line.debit)).toNumber();
          o.credit = money(o.credit).add(money(line.credit)).toNumber();
          opening.set(line.accountCode, o);
        }
      }

      const movements = new Map<string, { debit: number; credit: number; name: string; centreCout?: string }>();
      for (const entry of entries) {
        if (isAN(entry)) continue; // À Nouveau exclu des mouvements
        if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
        for (const line of (entry.lines || [])) {
          const existing = movements.get(line.accountCode) || {
            debit: 0, credit: 0,
            name: line.accountName || accountNames.get(line.accountCode) || line.accountCode,
            centreCout: line.analyticalCode,
          };
          existing.debit = money(existing.debit).add(money(line.debit)).toNumber();
          existing.credit = money(existing.credit).add(money(line.credit)).toNumber();
          movements.set(line.accountCode, existing);
        }
      }

      // Ventilation SYSCOHADA (alignée sur useBalanceData) : classe 4 par sous-classe.
      const getType = (code: string): BalanceData['type'] => {
        const c = code.charAt(0);
        if (c === '6' || c === '8') return 'charges';
        if (c === '7') return 'produits';
        if (c === '2' || c === '3' || c === '5') return 'actif';
        if (c === '1') return 'passif';
        if (c === '4') {
          // 41/45/46/47 = créances (actif) ; 40/42/43/44/48/49 = dettes (passif)
          return (code.startsWith('41') || code.startsWith('45') || code.startsWith('46') || code.startsWith('47')) ? 'actif' : 'passif';
        }
        return 'actif';
      };

      const allCodes = new Set<string>([...movements.keys(), ...opening.keys()]);
      return Array.from(allCodes).map((code): BalanceData => {
        const mov = movements.get(code) || { debit: 0, credit: 0, name: accountNames.get(code) || code, centreCout: undefined };
        const opn = opening.get(code) || { debit: 0, credit: 0 };
        const soldeOuv = money(opn.debit).subtract(money(opn.credit)).toNumber();
        const solde = money(soldeOuv).add(money(mov.debit)).subtract(money(mov.credit)).toNumber();
        return {
          compte: code,
          libelle: mov.name,
          debitPrecedent: opn.debit,
          creditPrecedent: opn.credit,
          debitMouvement: mov.debit,
          creditMouvement: mov.credit,
          debitSolde: solde > 0 ? solde : 0,
          creditSolde: solde < 0 ? Math.abs(solde) : 0,
          type: getType(code),
          centreCout: mov.centreCout,
        };
      }).sort((a, b) => a.compte.localeCompare(b.compte));
    },
  });

  // Comptes non lettrés (calcul RÉEL, fini les valeurs codées en dur 3/2/3.2M).
  const { data: nonLettre = { clients: 0, fournisseurs: 0, total: 0 } } = useQuery({
    queryKey: ['balance-non-lettre'],
    queryFn: async () => {
      const all = await adapter.getAll<DBJournalEntry>('journalEntries');
      const clientsAcc = new Set<string>(), fournAcc = new Set<string>();
      let total = 0;
      for (const e of all.filter(x => x.status !== 'draft')) {
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if ((l as any).lettrageCode) continue;
          const montant = Math.abs((l.debit || 0) - (l.credit || 0));
          if (montant < 0.5) continue;
          if (code.startsWith('41')) { clientsAcc.add(code); total += montant; }
          else if (code.startsWith('40')) { fournAcc.add(code); total += montant; }
        }
      }
      return { clients: clientsAcc.size, fournisseurs: fournAcc.size, total };
    },
  });

  // Graphique évolution — calculé depuis les données
  const chartData: ChartData[] = useMemo(() => {
    if (!balanceData.length) return [];
    return [{
      periode: `${dateRange.start} - ${dateRange.end}`,
      actif: balanceData.filter(i => i.type === 'actif').reduce((s, i) => s + i.debitSolde, 0),
      passif: balanceData.filter(i => i.type === 'passif').reduce((s, i) => s + i.creditSolde, 0),
      charges: balanceData.filter(i => i.type === 'charges').reduce((s, i) => s + i.debitSolde, 0),
      produits: balanceData.filter(i => i.type === 'produits').reduce((s, i) => s + i.creditSolde, 0),
    }];
  }, [balanceData, dateRange]);

  // Calculs des indicateurs
  const indicators = useMemo(() => {
    // Contrôle d'équilibre = Σ débits mouvements vs Σ crédits mouvements (doivent être
    // égaux, ex. 33,18 Md). L'égalité des SOLDES débiteurs/créditeurs n'a aucune raison
    // d'être vraie (elle relève de Actif=Passif+Résultat, pas du contrôle de balance).
    const totalDebit = balanceData.reduce((sum, item) => money(sum).add(money(item.debitMouvement)).toNumber(), 0);
    const totalCredit = balanceData.reduce((sum, item) => money(sum).add(money(item.creditMouvement)).toNumber(), 0);
    const equilibre = money(totalDebit).subtract(money(totalCredit)).abs().toNumber();
    const tauxEquilibre = totalCredit > 0 ? money(totalCredit).subtract(money(equilibre)).divide(totalCredit).multiply(100).toNumber() : 0;

    const actif = balanceData.filter(item => item.type === 'actif').reduce((sum, item) => money(sum).add(money(item.debitSolde)).subtract(money(item.creditSolde)).toNumber(), 0);
    const passif = balanceData.filter(item => item.type === 'passif').reduce((sum, item) => money(sum).add(money(item.creditSolde)).subtract(money(item.debitSolde)).toNumber(), 0);
    const charges = balanceData.filter(item => item.type === 'charges').reduce((sum, item) => money(sum).add(money(item.debitSolde)).toNumber(), 0);
    const produits = balanceData.filter(item => item.type === 'produits').reduce((sum, item) => money(sum).add(money(item.creditSolde)).toNumber(), 0);
    
    return { totalDebit, totalCredit, equilibre, tauxEquilibre, actif, passif, charges, produits };
  }, [balanceData]);

  // Top 3 comptes par mouvement (variations importantes) — calculés
  const topVariations = useMemo(() => {
    return [...balanceData]
      .sort((a, b) => (b.debitMouvement + b.creditMouvement) - (a.debitMouvement + a.creditMouvement))
      .slice(0, 3)
      .map(item => ({
        compte: item.compte,
        libelle: item.libelle,
        total: item.debitMouvement + item.creditMouvement,
        solde: item.debitSolde - item.creditSolde,
      }));
  }, [balanceData]);

  // Données analytiques — groupées par centre de coût (champ centreCout)
  const analyticsData = useMemo(() => {
    const centreMap = new Map<string, { reel: number; debit: number; credit: number }>();
    for (const item of balanceData) {
      const centre = item.centreCout || '';
      if (!centre) continue;
      const existing = centreMap.get(centre) || { reel: 0, debit: 0, credit: 0 };
      existing.reel += item.debitMouvement + item.creditMouvement;
      existing.debit += item.debitMouvement;
      existing.credit += item.creditMouvement;
      centreMap.set(centre, existing);
    }
    return Array.from(centreMap.entries()).map(([centre, data]) => ({
      centre,
      budget: 0,
      reel: data.reel,
      ecart: 0,
    }));
  }, [balanceData]);

  // Trial balance verification
  const { data: trialBalance } = useQuery({
    queryKey: ['trial-balance-check', dateRange],
    queryFn: () => verifyTrialBalance(adapter, dateRange.start?.substring(0, 4)),
    enabled: balanceData.length > 0,
  });

  const COLORS = ['#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C', '#7FA3AF'];

  return (
    <div className="min-h-screen bg-[var(--color-surface-hover)]">
      <PrintableArea
        ref={printRef}
        orientation={printConfig.orientation}
        pageSize={printConfig.format}
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{t('advBalance.title')}</h2>
            <p className="text-sm text-gray-600">{t('advBalance.printSubtitle', { start: dateRange.start, end: dateRange.end })}</p>
          </div>
        }
      >
      {/* En-tête principal */}
      <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BarChart3 className="w-8 h-8 text-[var(--color-primary)]" />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('advBalance.title')}</h1>
              <p className="text-sm text-[var(--color-primary)]/70">{t('advBalance.subtitle')}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Bouton de sélection de période */}
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] text-left flex items-center space-x-2 hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `${new Date(dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : t('advBalance.period')
                }
              </span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)] border-[var(--color-primary)]' : 'bg-[var(--color-surface-hover)] text-[var(--color-primary)]/70 border-[var(--color-border)] hover:bg-[var(--color-border)]'}`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              {t('advBalance.filters')}
            </button>
            
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-primary)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <Settings className="w-4 h-4 mr-2 inline" />
              {t('advBalance.configuration')}
            </button>
            
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-[var(--color-surface-hover)] text-[var(--color-primary)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)] transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              {t('advBalance.preview')}
            </button>
            
            <ExportMenu
              data={filteredData as unknown as Record<string, unknown>[]}
              filename="balance-avancee"
              columns={{
                compte: t('advBalance.colCompte'),
                libelle: t('advBalance.colLibelle'),
                debitPrecedent: t('advBalance.colDebitPrecedent'),
                creditPrecedent: t('advBalance.colCreditPrecedent'),
                debitMouvement: t('advBalance.colDebitMouvement'),
                creditMouvement: t('advBalance.colCreditMouvement'),
                debitSolde: t('advBalance.colDebitSolde'),
                creditSolde: t('advBalance.colCreditSolde'),
                type: t('advBalance.colType')
              }}
              buttonText={t('advBalance.export')}
            />
          </div>
        </div>
        
        {/* Navigation des vues */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'dashboard', label: t('advBalance.tabDashboard'), icon: BarChart3 },
            { id: 'generale', label: t('advBalance.tabGeneral'), icon: Grid3X3 },
            { id: 'analytique', label: t('advBalance.tabAnalytic'), icon: PieChartIcon }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as 'dashboard' | 'generale' | 'analytique')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === view.id 
                  ? 'bg-[var(--color-primary)] text-[var(--color-surface-hover)]'
                  : 'text-[var(--color-primary)]/70 hover:bg-[var(--color-border)]'
              }`}
            >
              <view.icon className="w-4 h-4 mr-2 inline" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres avancés (collapsible) */}
      {showFilters && (
        <div className="bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.dateStart')}</label>
              <input 
                type="date" 
                value={filters.dateDebut}
                onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.dateEnd')}</label>
              <input 
                type="date" 
                value={filters.dateFin}
                onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.accountMin')}</label>
              <input 
                type="text" 
                placeholder="101000"
                value={filters.compteMin}
                onChange={(e) => setFilters({...filters, compteMin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.accountMax')}</label>
              <input 
                type="text" 
                placeholder="899999"
                value={filters.compteMax}
                onChange={(e) => setFilters({...filters, compteMax: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.searchLabel')}</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-primary)]/50" />
                <input
                  type="text"
                  placeholder={t('advBalance.searchPlaceholder')}
                  value={filters.libelle}
                  onChange={(e) => setFilters({...filters, libelle: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-primary)] mb-1">{t('advBalance.costCenter')}</label>
              <select
                value={filters.centreCout}
                onChange={(e) => setFilters({...filters, centreCout: e.target.value})}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm"
              >
                <option value="">{t('advBalance.all')}</option>
                <option value="CC001">{t('advBalance.cc001')}</option>
                <option value="CC002">{t('advBalance.cc002')}</option>
                <option value="CC003">{t('advBalance.cc003')}</option>
              </select>
            </div>
          </div>

          {/* Deuxième ligne de filtres */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.showZeroBalance}
                  onChange={(e) => setFilters({...filters, showZeroBalance: e.target.checked})}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.showZeroBalance')}</span>
              </label>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.onlyMovement}
                  onChange={(e) => setFilters({...filters, onlyMovement: e.target.checked})}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.onlyMovement')}</span>
              </label>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.onlyUnbalanced}
                  onChange={(e) => setFilters({...filters, onlyUnbalanced: e.target.checked})}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.onlyUnbalanced')}</span>
              </label>
            </div>
            <div className="col-span-3 flex items-center justify-end space-x-3">
              <button
                onClick={() => setFilters({
                  dateDebut: '2025-01-01',
                  dateFin: '2025-12-31',
                  compteMin: '',
                  compteMax: '',
                  libelle: '',
                  tiers: '',
                  centreCout: '',
                  devise: 'XAF',
                  montantMin: '',
                  montantMax: '',
                  onlyMovement: false,
                  onlyUnbalanced: false,
                  showZeroBalance: false
                })}
                className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-primary)]/70 rounded-md hover:bg-[var(--color-border)] transition-colors"
              >
                {t('advBalance.reset')}
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors">
                <Search className="w-4 h-4 mr-2 inline" />
                {t('advBalance.applyFilters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tableau de bord principal */}
      {activeView === 'dashboard' && (
        <div className="p-6 space-y-6">
          
          {/* Indicateurs clés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-primary)]/70">{t('advBalance.totalDebit')}</p>
                  <p className="text-lg font-bold text-blue-600">{fmt(indicators.totalDebit)}</p>
                  <p className="text-xs text-[var(--color-primary)]/50">XAF</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-primary)]/70">{t('advBalance.totalCredit')}</p>
                  <p className="text-lg font-bold text-green-600">{fmt(indicators.totalCredit)}</p>
                  <p className="text-xs text-[var(--color-primary)]/50">XAF</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-primary)]/70">{t('advBalance.balanceRate')}</p>
                  <p className={`text-lg font-bold ${indicators.tauxEquilibre > 98 ? 'text-green-600' : 'text-orange-600'}`}>
                    {indicators.tauxEquilibre.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-700">
                    {indicators.equilibre === 0 ? t('advBalance.perfect') : t('advBalance.gapK', { value: (indicators.equilibre / 1000).toFixed(0) })}
                  </p>
                </div>
                <div className={`w-12 h-12 ${indicators.equilibre === 0 ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                  {indicators.equilibre === 0 ? 
                    <CheckCircle className="w-6 h-6 text-green-600" /> :
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  }
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--color-primary)]/70">{t('advBalance.activeAccounts')}</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{balanceData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length}</p>
                  <p className="text-xs text-gray-700">{t('advBalance.ofTotal', { count: String(balanceData.length) })}</p>
                </div>
                <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Vérification balance de vérification */}
          {trialBalance && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">
                  {t('advBalance.trialBalanceCheck')}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trialBalance.isBalanced
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trialBalance.isBalanced ? t('advBalance.compliant') : t('advBalance.anomalies')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trialBalance.checks.map((check, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    check.status === 'pass' ? 'border-green-200 bg-green-50'
                      : check.status === 'warning' ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      {check.status === 'pass' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : check.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium text-gray-800">{check.name}</span>
                    </div>
                    <p className="text-xs text-gray-600">{check.details}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">{t('advBalance.entriesChecked', { count: String(trialBalance.entriesChecked) })}</p>
            </div>
          )}

          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Évolution par période */}
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('advBalance.evolutionByPeriod')}</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-[var(--color-border)] rounded text-sm">
                    <option>{t('advBalance.monthly')}</option>
                    <option>{t('advBalance.quarterly')}</option>
                    <option>{t('advBalance.yearly')}</option>
                  </select>
                  <button className="p-2 text-[var(--color-primary)]/50 hover:text-[var(--color-primary)]/70">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => fmt(value)} />
                  <Tooltip formatter={(value) => [fmt(value as number), '']} />
                  <Legend />
                  <Bar radius={[6,6,0,0]} dataKey="actif" fill="url(#gradPetrol)" name={t('advBalance.assets')} />
                  <Bar radius={[6,6,0,0]} dataKey="passif" fill="url(#gradPetrolLight)" name={t('advBalance.liabilities')} />
                  <Line type="monotone" dataKey="charges" stroke="#C0322B" name={t('advBalance.expenses')} />
                  <Line type="monotone" dataKey="produits" stroke="#15803D" name={t('advBalance.revenues')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par type */}
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('advBalance.breakdownByType')}</h3>
                <button className="p-2 text-gray-700 hover:text-gray-600" aria-label={t('advBalance.viewDetails')}>
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t('advBalance.assets'), value: indicators.actif },
                      { name: t('advBalance.liabilities'), value: indicators.passif },
                      { name: t('advBalance.expenses'), value: indicators.charges },
                      { name: t('advBalance.revenues'), value: indicators.produits }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#235A6E"
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [fmt(value as number), '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top comptes mouvementés */}
          <div className="bg-[var(--color-surface-hover)] rounded-lg shadow-sm border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('advBalance.topAccounts')}</h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-sm border border-[var(--color-border)] rounded hover:bg-[var(--color-border)]">
                    {t('advBalance.debit')}
                  </button>
                  <button className="px-3 py-1 text-sm border border-[var(--color-border)] rounded hover:bg-[var(--color-border)]">
                    {t('advBalance.credit')}
                  </button>
                  <button className="px-3 py-1 text-sm bg-[var(--color-primary)] text-white rounded">
                    {t('advBalance.movement')}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-primary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('advBalance.rank')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('accounting.account')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('accounting.label')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('advBalance.movementDebit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('advBalance.movementCredit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('advBalance.totalMovement')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--color-surface-hover)] uppercase tracking-wider">{t('advBalance.status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-surface-hover)] divide-y divide-[var(--color-border)]">
                  {balanceData
                    .sort((a, b) => (b.debitMouvement + b.creditMouvement) - (a.debitMouvement + a.creditMouvement))
                    .slice(0, 10)
                    .map((item, index) => (
                      <tr key={item.compte} className="hover:bg-[var(--color-border)]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-[var(--color-border)] text-[var(--color-primary)]/70'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--color-primary)]">{item.compte}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-primary)]">{item.libelle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-blue-600">
                          {fmt(item.debitMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-green-600">
                          {fmt(item.creditMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right font-medium text-gray-900">
                          {fmt(item.debitMouvement + item.creditMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (item.debitSolde - item.creditSolde) === 0 ? 'bg-green-100 text-green-800' : 
                            Math.abs(item.debitSolde - item.creditSolde) > 1000000 ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(item.debitSolde - item.creditSolde) === 0 ? t('advBalance.balanced') :
                             Math.abs(item.debitSolde - item.creditSolde) > 1000000 ? t('advBalance.unbalanced') : t('advBalance.active')}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Alertes et notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Comptes non lettrés */}
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('advBalance.unmatchedAccounts')}</h4>
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.customers41')}</span>
                  <span className="text-sm font-medium text-orange-600">{t('advBalance.accountsCount', { count: String(nonLettre.clients) })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.suppliers40')}</span>
                  <span className="text-sm font-medium text-orange-600">{t('advBalance.accountsCount', { count: String(nonLettre.fournisseurs) })}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[var(--color-primary)]">{t('advBalance.totalUnmatched')}</span>
                    <span className="text-sm font-bold text-orange-600">{formatCurrency(nonLettre.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variations significatives */}
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('advBalance.topMovements')}</h4>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                {topVariations.length === 0 ? (
                  <p className="text-xs text-[var(--color-primary)]/50 text-center py-2">{t('advBalance.noData')}</p>
                ) : topVariations.map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div>
                      <span className="text-sm font-medium text-[var(--color-primary)]">{item.compte}</span>
                      <p className="text-xs text-[var(--color-primary)]/50 truncate max-w-[160px]">{item.libelle}</p>
                    </div>
                    <span className={`text-sm font-medium ${item.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(item.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Taux de rapprochement */}
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('advBalance.balanceEquilibrium')}</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.equilibriumRate')}</span>
                  <span className={`text-sm font-medium ${indicators.tauxEquilibre >= 99 ? 'text-green-600' : indicators.tauxEquilibre >= 95 ? 'text-orange-600' : 'text-red-600'}`}>
                    {indicators.tauxEquilibre > 0 ? `${Math.min(100, indicators.tauxEquilibre).toFixed(1)}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.debitCreditGap')}</span>
                  <span className={`text-sm font-medium ${indicators.equilibre < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(indicators.equilibre)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-primary)]/70">{t('advBalance.movedAccounts')}</span>
                  <span className="text-sm font-medium text-[var(--color-primary)]">
                    {balanceData.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Générale */}
      {activeView === 'generale' && (
        <Balance />
      )}

      {/* Balance Analytique */}
      {activeView === 'analytique' && (
        <div className="p-6 space-y-6">
          
          {/* Graphique par centre de coût */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-6">{t('advBalance.breakdownByCostCenter')}</h3>
              {analyticsData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-[var(--color-primary)]/50">
                  {t('advBalance.noAnalyticAxis')}
                  <br />{t('advBalance.assignCostCenters')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="centre" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <Tooltip formatter={(value) => [fmt(value as number), '']} />
                    <Legend />
                    <Bar radius={[6,6,0,0]} dataKey="reel" fill="url(#gradPetrol)" name={t('advBalance.actual')} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-[var(--color-surface-hover)] p-6 rounded-lg shadow-sm border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-6">{t('advBalance.varianceTrend')}</h3>
              {analyticsData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-sm text-[var(--color-primary)]/50">
                  {t('advBalance.insufficientData')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="centre" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <Tooltip formatter={(value) => [fmt(value as number), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="reel" stroke="#235A6E" name={t('advBalance.actual')} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Tableau analytique détaillé */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-semibold text-[var(--color-primary)]">{t('advBalance.detailedAnalyticBalance')}</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-primary)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-hover)] uppercase">{t('advBalance.center')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-surface-hover)] uppercase">{t('advBalance.project')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase">{t('advBalance.initialBudget')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase">{t('advBalance.actualAmount')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--color-surface-hover)] uppercase">{t('advBalance.varianceAmount')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('advBalance.variancePercent')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">{t('advBalance.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analyticsData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                        {t('advBalance.noAnalyticAxisRow')}
                      </td>
                    </tr>
                  ) : analyticsData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{item.centre}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">—</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-400">—</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-900">
                        {fmt(item.reel)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-400">—</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-400">—</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {t('advBalance.actualOnly')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuration des Colonnes */}
      {showConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface-hover)] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('advBalance.columnConfiguration')}</h3>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-[var(--color-primary)]/50 hover:text-[var(--color-primary)]/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--color-primary)] mb-2">
                  {t('advBalance.totalColumnsCount', { count: String(columnConfig.totalColumns) })}
                </label>
                <input 
                  type="range"
                  min="4" 
                  max="12"
                  value={columnConfig.totalColumns}
                  onChange={(e) => setColumnConfig({...columnConfig, totalColumns: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--color-primary)]/50 mt-1">
                  <span>{t('advBalance.colsMinimal')}</span>
                  <span>{t('advBalance.colsRecommended')}</span>
                  <span>{t('advBalance.colsComplete')}</span>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-[var(--color-primary)] mb-4">{t('advBalance.availableColumns')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'debitPrecedent', label: t('advBalance.colDebitPrecedent') },
                    { id: 'creditPrecedent', label: t('advBalance.colCreditPrecedent') },
                    { id: 'debitMouvement', label: t('advBalance.movementDebit') },
                    { id: 'creditMouvement', label: t('advBalance.movementCredit') },
                    { id: 'debitSolde', label: t('advBalance.colSoldeDebit') },
                    { id: 'creditSolde', label: t('advBalance.colSoldeCredit') }
                  ].map((col) => (
                    <label key={col.id} className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={columnConfig.visibleColumns.includes(col.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setColumnConfig({
                              ...columnConfig,
                              visibleColumns: [...columnConfig.visibleColumns, col.id]
                            });
                          } else {
                            setColumnConfig({
                              ...columnConfig,
                              visibleColumns: columnConfig.visibleColumns.filter(c => c !== col.id)
                            });
                          }
                        }}
                        className="rounded mr-3"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 text-[var(--color-primary)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]"
              >
                {t('advBalance.cancel')}
              </button>
              <button 
                onClick={() => {
                  // Sauvegarder la configuration
                  setShowConfig(false);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                {t('advBalance.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--color-surface-hover)] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--color-primary)]">{t('advBalance.printPreview')}</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-[var(--color-primary)]/70">{t('advBalance.format')}</label>
                    <select 
                      value={printConfig.format}
                      onChange={(e) => setPrintConfig({...printConfig, format: e.target.value as 'A4' | 'A3'})}
                      className="px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-[var(--color-primary)]/70">{t('advBalance.orientation')}</label>
                    <select 
                      value={printConfig.orientation}
                      onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value as 'portrait' | 'landscape'})}
                      className="px-2 py-1 border border-[var(--color-border)] rounded text-sm"
                    >
                      <option value="portrait">{t('advBalance.portrait')}</option>
                      <option value="landscape">{t('advBalance.landscape')}</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="text-[var(--color-primary)]/50 hover:text-[var(--color-primary)]/70"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Options d'impression */}
            <div className="p-4 bg-[var(--color-border)] border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.includeCharts}
                    onChange={(e) => setPrintConfig({...printConfig, includeCharts: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('advBalance.includeCharts')}</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.includeDetails}
                    onChange={(e) => setPrintConfig({...printConfig, includeDetails: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('advBalance.includeDetails')}</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.showLogos}
                    onChange={(e) => setPrintConfig({...printConfig, showLogos: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">{t('advBalance.showLogos')}</span>
                </label>
              </div>
            </div>

            {/* Prévisualisation */}
            <div className={`p-8 bg-[var(--color-surface-hover)] ${printConfig.format === 'A3' ? 'text-sm' : 'text-xs'} ${printConfig.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>
              
              {/* En-tête du rapport */}
              <div className="text-center mb-6">
                {printConfig.showLogos && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-[var(--color-border)] rounded-lg flex items-center justify-center">
                      <Building className="w-8 h-8 text-[var(--color-primary)]/50" />
                    </div>
                  </div>
                )}
                <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('advBalance.generalBalanceUpper')}</h1>
                <p className="text-[var(--color-primary)]/70">{t('advBalance.periodFromTo', { start: filters.dateDebut, end: filters.dateFin })}</p>
                <p className="text-[var(--color-primary)]/50 text-sm">{t('advBalance.generatedOn', { date: new Date().toLocaleDateString('fr-FR') })}</p>
              </div>

              {/* Résumé des indicateurs */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[var(--color-border)] rounded">
                <div className="text-center">
                  <div className="text-xs text-[var(--color-primary)]/70">{t('advBalance.totalDebit')}</div>
                  <div className="font-bold text-blue-600">{fmt(indicators.totalDebit)} XAF</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[var(--color-primary)]/70">{t('advBalance.totalCredit')}</div>
                  <div className="font-bold text-green-600">{fmt(indicators.totalCredit)} XAF</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[var(--color-primary)]/70">{t('advBalance.equilibrium')}</div>
                  <div className={`font-bold ${indicators.equilibre === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {indicators.equilibre === 0 ? t('advBalance.perfect') : t('advBalance.gapK', { value: (indicators.equilibre / 1000).toFixed(0) })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[var(--color-primary)]/70">{t('advBalance.activeAccounts')}</div>
                  <div className="font-bold text-[var(--color-primary)]">
                    {balanceData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length}
                  </div>
                </div>
              </div>

              {/* Tableau principal */}
              <table className="w-full border border-[var(--color-border)]">
                <thead>
                  <tr className="bg-[var(--color-primary)] border-b border-[var(--color-border)]">
                    <th className="border-r border-[var(--color-border)] px-2 py-1 text-left font-medium text-[var(--color-surface-hover)]">{t('accounting.account')}</th>
                    <th className="border-r border-[var(--color-border)] px-2 py-1 text-left font-medium text-[var(--color-surface-hover)]">{t('accounting.label')}</th>
                    <th className="border-r border-[var(--color-border)] px-2 py-1 text-right font-medium text-[var(--color-surface-hover)]">{t('advBalance.colSoldeDebit')}</th>
                    <th className="px-2 py-1 text-right font-medium text-[var(--color-surface-hover)]">{t('advBalance.colSoldeCredit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceData.slice(0, 15).map((item) => (
                    <tr key={item.compte} className="border-b border-[var(--color-border)]">
                      <td className="border-r border-[var(--color-border)] px-2 py-1 font-mono">{item.compte}</td>
                      <td className="border-r border-[var(--color-border)] px-2 py-1">{item.libelle}</td>
                      <td className="border-r border-[var(--color-border)] px-2 py-1 text-right font-mono">
                        {item.debitSolde > 0 ? fmt(item.debitSolde) : '-'}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {item.creditSolde > 0 ? fmt(item.creditSolde) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[var(--color-primary)] border-t-2 border-[var(--color-border)]">
                  <tr>
                    <td colSpan={2} className="px-2 py-2 font-bold text-[var(--color-surface-hover)]">{t('advBalance.totals')}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold border-r border-[var(--color-border)] text-[var(--color-surface-hover)]">
                      {fmt(indicators.totalDebit)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-[var(--color-surface-hover)]">
                      {fmt(indicators.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Pied de page */}
              <div className="mt-8 pt-4 border-t border-[var(--color-border)] flex justify-between items-center text-xs text-[var(--color-primary)]/50">
                <div>
                  <p><span className="atlas-brand">Atlas FnA</span> - {t('advBalance.generalBalance')}</p>
                  <p>{t('advBalance.syscohadaCompliantSystem')}</p>
                </div>
                <div className="text-right">
                  <p>{t('advBalance.pageXofY', { current: '1', total: '1' })}</p>
                  <p>{t('advBalance.generatedBy')}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-[var(--color-primary)]/70 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-border)]"
              >
                {t('advBalance.close')}
              </button>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  {t('advBalance.sendByEmail')}
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  {t('advBalance.exportExcel')}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  {t('advBalance.print')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PrintableArea>

    {/* Modal de sélection de période */}
    <PeriodSelectorModal
      isOpen={showPeriodModal}
      onClose={() => setShowPeriodModal(false)}
      onApply={(range) => setDateRange(range)}
      initialDateRange={dateRange}
    />
  </div>
  );
};

export default AdvancedBalance;