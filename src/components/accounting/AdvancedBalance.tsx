import React, { useState, useMemo } from 'react';
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
  const { adapter } = useData();
  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'generale' | 'analytique'>('dashboard');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-12-31' });
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
      const entries = await adapter.getAll('journalEntries');
      const accounts = await adapter.getAll('accounts');
      const accountNames = new Map(accounts.map(a => [a.code, a.name]));

      const movements = new Map<string, { debit: number; credit: number; name: string; centreCout?: string }>();
      for (const entry of entries) {
        if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
        for (const line of entry.lines) {
          const existing = movements.get(line.accountCode) || {
            debit: 0, credit: 0,
            name: line.accountName || accountNames.get(line.accountCode) || line.accountCode,
            centreCout: line.analyticalCode,
          };
          existing.debit += line.debit;
          existing.credit += line.credit;
          movements.set(line.accountCode, existing);
        }
      }

      const getType = (code: string): BalanceData['type'] => {
        const c = code.charAt(0);
        if (c === '6' || c === '8') return 'charges';
        if (c === '7') return 'produits';
        if (c === '2' || c === '3' || c === '5') return 'actif';
        if (c === '1') return 'passif';
        if (code.startsWith('40')) return 'passif';
        return 'actif';
      };

      return Array.from(movements.entries()).map(([code, mov]): BalanceData => {
        const solde = mov.debit - mov.credit;
        return {
          compte: code,
          libelle: mov.name,
          debitPrecedent: 0,
          creditPrecedent: 0,
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
    const totalDebit = balanceData.reduce((sum, item) => sum + item.debitSolde, 0);
    const totalCredit = balanceData.reduce((sum, item) => sum + item.creditSolde, 0);
    const equilibre = Math.abs(totalDebit - totalCredit);
    const tauxEquilibre = totalCredit > 0 ? ((totalCredit - equilibre) / totalCredit) * 100 : 0;
    
    const actif = balanceData.filter(item => item.type === 'actif').reduce((sum, item) => sum + item.debitSolde - item.creditSolde, 0);
    const passif = balanceData.filter(item => item.type === 'passif').reduce((sum, item) => sum + item.creditSolde - item.debitSolde, 0);
    const charges = balanceData.filter(item => item.type === 'charges').reduce((sum, item) => sum + item.debitSolde, 0);
    const produits = balanceData.filter(item => item.type === 'produits').reduce((sum, item) => sum + item.creditSolde, 0);
    
    return { totalDebit, totalCredit, equilibre, tauxEquilibre, actif, passif, charges, produits };
  }, [balanceData]);

  // Trial balance verification
  const { data: trialBalance } = useQuery({
    queryKey: ['trial-balance-check', dateRange],
    queryFn: () => verifyTrialBalance(dateRange.start?.substring(0, 4)),
    enabled: balanceData.length > 0,
  });

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <PrintableArea
        ref={printRef}
        orientation={printConfig.orientation}
        pageSize={printConfig.format}
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Balance Avancée</h2>
            <p className="text-sm text-gray-600">Conforme SYSCOHADA - {dateRange.start} au {dateRange.end}</p>
          </div>
        }
      >
      {/* En-tête principal */}
      <div className="bg-[#f5f5f5] border-b border-[#e5e5e5] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BarChart3 className="w-8 h-8 text-[#171717]" />
            <div>
              <h1 className="text-lg font-bold text-[#171717]">Balance Avancée</h1>
              <p className="text-sm text-[#171717]/70">Tableau de bord interactif - Conforme SYSCOHADA</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Bouton de sélection de période */}
            <button
              onClick={() => setShowPeriodModal(true)}
              className="px-3 py-2 border border-[#e5e5e5] rounded-lg focus:ring-2 focus:ring-[#171717] text-left flex items-center space-x-2 hover:bg-gray-50"
            >
              <Calendar className="w-4 h-4 text-[#171717]" />
              <span className="text-sm">
                {dateRange.start && dateRange.end
                  ? `${new Date(dateRange.start).toLocaleDateString('fr-FR')} - ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Période'
                }
              </span>
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-[#171717] text-[#f5f5f5] border-[#171717]' : 'bg-[#f5f5f5] text-[#171717]/70 border-[#e5e5e5] hover:bg-[#e5e5e5]'}`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              Filtres
            </button>
            
            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 bg-[#f5f5f5] text-[#171717]/70 border border-[#e5e5e5] rounded-lg hover:bg-[#e5e5e5] transition-colors"
            >
              <Settings className="w-4 h-4 mr-2 inline" />
              Configuration
            </button>
            
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-[#f5f5f5] text-[#171717]/70 border border-[#e5e5e5] rounded-lg hover:bg-[#e5e5e5] transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              Aperçu
            </button>
            
            <ExportMenu
              data={filteredData as unknown as Record<string, unknown>[]}
              filename="balance-avancee"
              columns={{
                compte: 'Compte',
                libelle: 'Libellé',
                debitPrecedent: 'Débit Précédent',
                creditPrecedent: 'Crédit Précédent',
                debitMouvement: 'Débit Mouvement',
                creditMouvement: 'Crédit Mouvement',
                debitSolde: 'Débit Solde',
                creditSolde: 'Crédit Solde',
                type: 'Type'
              }}
              buttonText="Exporter"
            />
          </div>
        </div>
        
        {/* Navigation des vues */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
            { id: 'generale', label: 'Balance Générale', icon: Grid3X3 },
            { id: 'analytique', label: 'Balance Analytique', icon: PieChartIcon }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as 'dashboard' | 'generale' | 'analytique')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === view.id 
                  ? 'bg-[#171717] text-[#f5f5f5]'
                  : 'text-[#171717]/70 hover:bg-[#e5e5e5]'
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
        <div className="bg-[#f5f5f5] border-b border-[#e5e5e5] px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Date début</label>
              <input 
                type="date" 
                value={filters.dateDebut}
                onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Date fin</label>
              <input 
                type="date" 
                value={filters.dateFin}
                onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Compte (Min)</label>
              <input 
                type="text" 
                placeholder="101000"
                value={filters.compteMin}
                onChange={(e) => setFilters({...filters, compteMin: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Compte (Max)</label>
              <input 
                type="text" 
                placeholder="899999"
                value={filters.compteMax}
                onChange={(e) => setFilters({...filters, compteMax: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Recherche libellé</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#171717]/50" />
                <input
                  type="text"
                  placeholder="Compte ou libellé..."
                  value={filters.libelle}
                  onChange={(e) => setFilters({...filters, libelle: e.target.value})}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Centre de coût</label>
              <select
                value={filters.centreCout}
                onChange={(e) => setFilters({...filters, centreCout: e.target.value})}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-md text-sm"
              >
                <option value="">Tous</option>
                <option value="CC001">CC001 - Commercial</option>
                <option value="CC002">CC002 - Production</option>
                <option value="CC003">CC003 - Administration</option>
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
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
                <span className="text-sm text-[#171717]/70">Afficher soldes nuls</span>
              </label>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.onlyMovement}
                  onChange={(e) => setFilters({...filters, onlyMovement: e.target.checked})}
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
                <span className="text-sm text-[#171717]/70">Avec mouvements seulement</span>
              </label>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.onlyUnbalanced}
                  onChange={(e) => setFilters({...filters, onlyUnbalanced: e.target.checked})}
                  className="rounded border-gray-300 text-[#171717] focus:ring-[#171717]"
                />
                <span className="text-sm text-[#171717]/70">Déséquilibrés seulement</span>
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
                className="px-4 py-2 border border-[#e5e5e5] text-[#171717]/70 rounded-md hover:bg-[#e5e5e5] transition-colors"
              >
                Réinitialiser
              </button>
              <button className="px-4 py-2 bg-[#171717] text-white rounded-md hover:bg-[#262626] transition-colors">
                <Search className="w-4 h-4 mr-2 inline" />
                Appliquer filtres
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
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717]/70">Total Débit</p>
                  <p className="text-lg font-bold text-blue-600">{(indicators.totalDebit / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-[#171717]/50">XAF</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717]/70">Total Crédit</p>
                  <p className="text-lg font-bold text-green-600">{(indicators.totalCredit / 1000000).toFixed(1)}M</p>
                  <p className="text-xs text-[#171717]/50">XAF</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717]/70">Taux d'Équilibre</p>
                  <p className={`text-lg font-bold ${indicators.tauxEquilibre > 98 ? 'text-green-600' : 'text-orange-600'}`}>
                    {indicators.tauxEquilibre.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-700">
                    {indicators.equilibre === 0 ? 'Parfait' : `Écart: ${(indicators.equilibre / 1000).toFixed(0)}K`}
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

            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#171717]/70">Comptes Actifs</p>
                  <p className="text-lg font-bold text-[#171717]">{balanceData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length}</p>
                  <p className="text-xs text-gray-700">sur {balanceData.length} total</p>
                </div>
                <div className="w-12 h-12 bg-[#171717]/10 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-[#171717]" />
                </div>
              </div>
            </div>
          </div>

          {/* Vérification balance de vérification */}
          {trialBalance && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#171717]">
                  Balance de Vérification
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trialBalance.isBalanced
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {trialBalance.isBalanced ? 'Conforme' : 'Anomalie(s)'}
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
              <p className="text-xs text-gray-400 mt-3">{trialBalance.entriesChecked} écritures vérifiées</p>
            </div>
          )}

          {/* Graphiques principaux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Évolution par période */}
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#171717]">Évolution par Période</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-[#e5e5e5] rounded text-sm">
                    <option>Mensuelle</option>
                    <option>Trimestrielle</option>
                    <option>Annuelle</option>
                  </select>
                  <button className="p-2 text-[#171717]/50 hover:text-[#171717]/70">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                  <Bar dataKey="actif" fill="#171717" name="Actif" />
                  <Bar dataKey="passif" fill="#525252" name="Passif" />
                  <Line type="monotone" dataKey="charges" stroke="#ef4444" name="Charges" />
                  <Line type="monotone" dataKey="produits" stroke="#22c55e" name="Produits" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par type */}
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-[#171717]">Répartition par Type</h3>
                <button className="p-2 text-gray-700 hover:text-gray-600" aria-label="Voir les détails">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Actif', value: indicators.actif },
                      { name: 'Passif', value: indicators.passif },
                      { name: 'Charges', value: indicators.charges },
                      { name: 'Produits', value: indicators.produits }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#737373"
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top comptes mouvementés */}
          <div className="bg-[#f5f5f5] rounded-lg shadow-sm border border-[#e5e5e5]">
            <div className="p-6 border-b border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#171717]">Top 10 - Comptes les Plus Mouvementés</h3>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1 text-sm border border-[#e5e5e5] rounded hover:bg-[#e5e5e5]">
                    Débit
                  </button>
                  <button className="px-3 py-1 text-sm border border-[#e5e5e5] rounded hover:bg-[#e5e5e5]">
                    Crédit
                  </button>
                  <button className="px-3 py-1 text-sm bg-[#171717] text-white rounded">
                    Mouvement
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#171717]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">Rang</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">{t('accounting.account')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">{t('accounting.label')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">Mouvement Débit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">Mouvement Crédit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">Total Mouvement</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[#f5f5f5] uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-[#f5f5f5] divide-y divide-[#e5e5e5]">
                  {balanceData
                    .sort((a, b) => (b.debitMouvement + b.creditMouvement) - (a.debitMouvement + a.creditMouvement))
                    .slice(0, 10)
                    .map((item, index) => (
                      <tr key={item.compte} className="hover:bg-[#e5e5e5]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              index < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-[#e5e5e5] text-[#171717]/70'
                            }`}>
                              {index + 1}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[#171717]">{item.compte}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#171717]">{item.libelle}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-blue-600">
                          {formatCurrency(item.debitMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-green-600">
                          {formatCurrency(item.creditMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right font-medium text-gray-900">
                          {formatCurrency(item.debitMouvement + item.creditMouvement)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (item.debitSolde - item.creditSolde) === 0 ? 'bg-green-100 text-green-800' : 
                            Math.abs(item.debitSolde - item.creditSolde) > 1000000 ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {(item.debitSolde - item.creditSolde) === 0 ? 'Équilibré' : 
                             Math.abs(item.debitSolde - item.creditSolde) > 1000000 ? 'Déséquilibré' : 'Actif'}
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
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[#171717]">Comptes Non Lettrés</h4>
                <AlertCircle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#171717]/70">Clients (411xxx)</span>
                  <span className="text-sm font-medium text-orange-600">3 comptes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#171717]/70">Fournisseurs (401xxx)</span>
                  <span className="text-sm font-medium text-orange-600">2 comptes</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#171717]">Total non lettré</span>
                    <span className="text-sm font-bold text-orange-600">3.2M XAF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Variations significatives */}
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[#171717]">Variations Importantes</h4>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-[#171717]">607000</span>
                    <p className="text-xs text-[#171717]/50">Achats marchandises</p>
                  </div>
                  <span className="text-sm font-medium text-red-600">+56%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-[#171717]">241000</span>
                    <p className="text-xs text-[#171717]/50">Matériel industriel</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">+16%</span>
                </div>
              </div>
            </div>

            {/* Taux de rapprochement */}
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-[#171717]">Taux de Rapprochement</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#171717]/70">Rappr. bancaire</span>
                  <span className="text-sm font-medium text-green-600">98%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#171717]/70">Lettrage clients</span>
                  <span className="text-sm font-medium text-orange-600">87%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#171717]/70">Lettrage fournisseurs</span>
                  <span className="text-sm font-medium text-green-600">94%</span>
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
            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <h3 className="text-lg font-semibold text-[#171717] mb-6">Répartition par Centre de Coût</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { centre: 'CC001 - Commercial', budget: 15000000, reel: 16200000, ecart: 1200000 },
                  { centre: 'CC002 - Production', budget: 25000000, reel: 23800000, ecart: -1200000 },
                  { centre: 'CC003 - Administration', budget: 8000000, reel: 8500000, ecart: 500000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="centre" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                  <Bar dataKey="budget" fill="#525252" name={t('navigation.budget')} />
                  <Bar dataKey="reel" fill="#171717" name="Réel" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#f5f5f5] p-6 rounded-lg shadow-sm border border-[#e5e5e5]">
              <h3 className="text-lg font-semibold text-[#171717] mb-6">Évolution des Écarts</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={[
                  { mois: 'Jan', commercial: 200000, production: -500000, admin: 100000 },
                  { mois: 'Fév', commercial: 450000, production: -200000, admin: 150000 },
                  { mois: 'Mar', commercial: 300000, production: 100000, admin: 200000 },
                  { mois: 'Avr', commercial: 600000, production: -300000, admin: 250000 },
                  { mois: 'Mai', commercial: 800000, production: -800000, admin: 300000 },
                  { mois: 'Jun', commercial: 1200000, production: -1200000, admin: 500000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => [`${(value as number / 1000).toFixed(0)}K XAF`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="commercial" stroke="#171717" name="Commercial" />
                  <Line type="monotone" dataKey="production" stroke="#525252" name="Production" />
                  <Line type="monotone" dataKey="admin" stroke="#E8B4B8" name="Administration" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tableau analytique détaillé */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-md font-semibold text-[#171717]">Balance Analytique Détaillée</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#171717]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5f5] uppercase">Centre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#f5f5f5] uppercase">Projet</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase">Budget Initial</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase">Réalisé</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[#f5f5f5] uppercase">Écart €</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Écart %</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { centre: 'CC001', projet: 'Projet Alpha', budget: 5000000, realise: 5200000, ecart: 200000, ecartPct: 4, statut: 'warning' },
                    { centre: 'CC001', projet: 'Projet Beta', budget: 3000000, realise: 2800000, ecart: -200000, ecartPct: -6.7, statut: 'success' },
                    { centre: 'CC002', projet: 'Production Line 1', budget: 12000000, realise: 11500000, ecart: -500000, ecartPct: -4.2, statut: 'success' },
                    { centre: 'CC003', projet: 'Infrastructure IT', budget: 2500000, realise: 2700000, ecart: 200000, ecartPct: 8, statut: 'danger' }
                  ].map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{item.centre}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.projet}</td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-600">
                        {formatCurrency(item.budget)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-right text-gray-900">
                        {formatCurrency(item.realise)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-mono text-right font-medium ${
                        item.ecart >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.ecart >= 0 ? '+' : ''}{formatCurrency(item.ecart)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-mono text-right font-medium ${
                        item.ecart >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {item.ecartPct >= 0 ? '+' : ''}{item.ecartPct.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.statut === 'success' ? 'bg-green-100 text-green-800' :
                          item.statut === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {item.statut === 'success' ? 'Conforme' :
                           item.statut === 'warning' ? 'Attention' : 'Dépassement'}
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
          <div className="bg-[#f5f5f5] rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e5e5e5]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#171717]">Configuration des Colonnes</h3>
                <button
                  onClick={() => setShowConfig(false)}
                  className="text-[#171717]/50 hover:text-[#171717]/70"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#171717] mb-2">
                  Nombre total de colonnes ({columnConfig.totalColumns})
                </label>
                <input 
                  type="range"
                  min="4" 
                  max="12"
                  value={columnConfig.totalColumns}
                  onChange={(e) => setColumnConfig({...columnConfig, totalColumns: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[#171717]/50 mt-1">
                  <span>4 (Minimal)</span>
                  <span>8 (Recommandé)</span>
                  <span>12 (Complet)</span>
                </div>
              </div>

              <div>
                <h4 className="text-md font-medium text-[#171717] mb-4">Colonnes disponibles</h4>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'debitPrecedent', label: 'Débit Précédent' },
                    { id: 'creditPrecedent', label: 'Crédit Précédent' },
                    { id: 'debitMouvement', label: 'Mouvement Débit' },
                    { id: 'creditMouvement', label: 'Mouvement Crédit' },
                    { id: 'debitSolde', label: 'Solde Débit' },
                    { id: 'creditSolde', label: 'Solde Crédit' }
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
            
            <div className="p-6 border-t border-[#e5e5e5] flex justify-end space-x-3">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 text-[#171717]/70 border border-[#e5e5e5] rounded-lg hover:bg-[#e5e5e5]"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  // Sauvegarder la configuration
                  setShowConfig(false);
                }}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626]"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#f5f5f5] rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#171717]">Aperçu Avant Impression</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-[#171717]/70">Format:</label>
                    <select 
                      value={printConfig.format}
                      onChange={(e) => setPrintConfig({...printConfig, format: e.target.value as 'A4' | 'A3'})}
                      className="px-2 py-1 border border-[#e5e5e5] rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-[#171717]/70">Orientation:</label>
                    <select 
                      value={printConfig.orientation}
                      onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value as 'portrait' | 'landscape'})}
                      className="px-2 py-1 border border-[#e5e5e5] rounded text-sm"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Paysage</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="text-[#171717]/50 hover:text-[#171717]/70"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Options d'impression */}
            <div className="p-4 bg-[#e5e5e5] border-b border-[#e5e5e5]">
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.includeCharts}
                    onChange={(e) => setPrintConfig({...printConfig, includeCharts: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Inclure les graphiques</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.includeDetails}
                    onChange={(e) => setPrintConfig({...printConfig, includeDetails: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Inclure les détails</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={printConfig.showLogos}
                    onChange={(e) => setPrintConfig({...printConfig, showLogos: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Afficher les logos</span>
                </label>
              </div>
            </div>

            {/* Prévisualisation */}
            <div className={`p-8 bg-[#f5f5f5] ${printConfig.format === 'A3' ? 'text-sm' : 'text-xs'} ${printConfig.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>
              
              {/* En-tête du rapport */}
              <div className="text-center mb-6">
                {printConfig.showLogos && (
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-[#e5e5e5] rounded-lg flex items-center justify-center">
                      <Building className="w-8 h-8 text-[#171717]/50" />
                    </div>
                  </div>
                )}
                <h1 className="text-lg font-bold text-[#171717]">BALANCE GÉNÉRALE</h1>
                <p className="text-[#171717]/70">Période du {filters.dateDebut} au {filters.dateFin}</p>
                <p className="text-[#171717]/50 text-sm">Généré le {new Date().toLocaleDateString('fr-FR')} - Conforme SYSCOHADA</p>
              </div>

              {/* Résumé des indicateurs */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-[#e5e5e5] rounded">
                <div className="text-center">
                  <div className="text-xs text-[#171717]/70">Total Débit</div>
                  <div className="font-bold text-blue-600">{(indicators.totalDebit / 1000000).toFixed(1)}M XAF</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#171717]/70">Total Crédit</div>
                  <div className="font-bold text-green-600">{(indicators.totalCredit / 1000000).toFixed(1)}M XAF</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#171717]/70">Équilibre</div>
                  <div className={`font-bold ${indicators.equilibre === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {indicators.equilibre === 0 ? 'Parfait' : `Écart: ${(indicators.equilibre / 1000).toFixed(0)}K`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-[#171717]/70">Comptes Actifs</div>
                  <div className="font-bold text-[#171717]">
                    {balanceData.filter(item => item.debitSolde > 0 || item.creditSolde > 0).length}
                  </div>
                </div>
              </div>

              {/* Tableau principal */}
              <table className="w-full border border-[#e5e5e5]">
                <thead>
                  <tr className="bg-[#171717] border-b border-[#e5e5e5]">
                    <th className="border-r border-[#e5e5e5] px-2 py-1 text-left font-medium text-[#f5f5f5]">{t('accounting.account')}</th>
                    <th className="border-r border-[#e5e5e5] px-2 py-1 text-left font-medium text-[#f5f5f5]">{t('accounting.label')}</th>
                    <th className="border-r border-[#e5e5e5] px-2 py-1 text-right font-medium text-[#f5f5f5]">Solde Débit</th>
                    <th className="px-2 py-1 text-right font-medium text-[#f5f5f5]">Solde Crédit</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceData.slice(0, 15).map((item) => (
                    <tr key={item.compte} className="border-b border-[#e5e5e5]">
                      <td className="border-r border-[#e5e5e5] px-2 py-1 font-mono">{item.compte}</td>
                      <td className="border-r border-[#e5e5e5] px-2 py-1">{item.libelle}</td>
                      <td className="border-r border-[#e5e5e5] px-2 py-1 text-right font-mono">
                        {item.debitSolde > 0 ? formatCurrency(item.debitSolde) : '-'}
                      </td>
                      <td className="px-2 py-1 text-right font-mono">
                        {item.creditSolde > 0 ? formatCurrency(item.creditSolde) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#171717] border-t-2 border-[#e5e5e5]">
                  <tr>
                    <td colSpan={2} className="px-2 py-2 font-bold text-[#f5f5f5]">TOTAUX</td>
                    <td className="px-2 py-2 text-right font-mono font-bold border-r border-[#e5e5e5] text-[#f5f5f5]">
                      {formatCurrency(indicators.totalDebit)}
                    </td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-[#f5f5f5]">
                      {formatCurrency(indicators.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Pied de page */}
              <div className="mt-8 pt-4 border-t border-[#e5e5e5] flex justify-between items-center text-xs text-[#171717]/50">
                <div>
                  <p>Atlas Finance - Balance Générale</p>
                  <p>Système conforme SYSCOHADA</p>
                </div>
                <div className="text-right">
                  <p>Page 1 sur 1</p>
                  <p>Généré par: Jean Dupont</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-[#e5e5e5] flex justify-between">
              <button
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-[#171717]/70 border border-[#e5e5e5] rounded-lg hover:bg-[#e5e5e5]"
              >
                Fermer
              </button>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  Envoyer par email
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  Exporter Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626]"
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  Imprimer
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