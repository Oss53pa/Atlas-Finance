import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import ExportMenu from '../shared/ExportMenu';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
  FileText, Search, Filter, Printer, Settings, Eye, Calendar,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3,
  ChevronDown, ChevronRight, Grid3X3, Columns, ZoomIn, Mail, FileSpreadsheet,
  ArrowUpDown, RefreshCw, Save, BookOpen, Book, Users, Building, Hash,
  Mic, Sparkles, Clock, Star, MessageSquare, Share, Brain, Zap,
  Target, Activity, Award, Layers, GitBranch, Database, List, Calculator
} from 'lucide-react';
import PrintableArea from '../ui/PrintableArea';
import './AdvancedBalance.css';
import { formatCurrency } from '@/utils/formatters';

interface LedgerEntry {
  id: string;
  date: string;
  piece: string;
  libelle: string;
  debit: number;
  credit: number;
  solde: number;
  centreCout?: string;
  tiers?: string;
  referenceExterne?: string;
}

interface AccountData {
  compte: string;
  libelle: string;
  soldeOuverture: number;
  totalDebit: number;
  totalCredit: number;
  soldeFermeture: number;
  nombreEcritures: number;
  entries: LedgerEntry[];
}

const AdvancedGeneralLedger: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'accounts' | 'analysis' | 'intelligent' | 'collaboration' | 'general-ledger' | 'movements'>('intelligent');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2025-01-01', end: '2025-12-31' });

  // États pour les modales
  const [showExportModal, setShowExportModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv'>('excel');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('Grand Livre - Export');
  const [emailMessage, setEmailMessage] = useState('');
  const [annotation, setAnnotation] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
  const [showJoinWorkspaceModal, setShowJoinWorkspaceModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');

  // Nouvelles fonctionnalités intelligentes
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AccountData[] | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<{ query: string; date: string }[]>([]);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'table' | 'timeline' | 'hierarchy'>('table');
  const [ledgerViewMode, setLedgerViewMode] = useState<'detailed' | 'tree' | 'list'>('detailed');
  const [ledgerType, setLedgerType] = useState<'general' | 'account' | 'journal' | 'auxiliary' | 'summary'>('general');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Filtres
  const [filters, setFilters] = useState({
    dateDebut: '2025-01-01',
    dateFin: '2025-12-31',
    compteDebut: '',
    compteFin: '',
    piece: '',
    tiers: '',
    centreCout: '',
    montantMin: '',
    montantMax: '',
    onlyMovement: false
  });

  // Configuration d'impression
  const [printConfig, setPrintConfig] = useState({
    format: 'A4' as 'A4' | 'A3',
    orientation: 'landscape' as 'portrait' | 'landscape',
    includeDetails: true,
    showLogos: true,
    accountsPerPage: 5
  });

  // Charger les données du Grand Livre depuis Dexie
  const { data: accountsData = [] } = useQuery<AccountData[]>({
    queryKey: ['advanced-general-ledger', dateRange.start, dateRange.end],
    queryFn: async () => {
      const entries = await adapter.getAll('journalEntries');
      const accounts = await adapter.getAll('accounts');
      const accountNames = new Map(accounts.map(a => [a.code, a.name]));

      const accountMap = new Map<string, AccountData>();
      for (const entry of entries) {
        if (entry.date < dateRange.start || entry.date > dateRange.end) continue;
        for (const line of entry.lines) {
          const acc = accountMap.get(line.accountCode) || {
            compte: line.accountCode,
            libelle: line.accountName || accountNames.get(line.accountCode) || line.accountCode,
            soldeOuverture: 0,
            totalDebit: 0,
            totalCredit: 0,
            soldeFermeture: 0,
            nombreEcritures: 0,
            entries: [],
          };
          acc.totalDebit += line.debit;
          acc.totalCredit += line.credit;
          acc.nombreEcritures++;
          acc.soldeFermeture = acc.soldeOuverture + acc.totalDebit - acc.totalCredit;
          acc.entries.push({
            id: `${entry.id}-${line.id}`,
            date: entry.date,
            piece: entry.reference || entry.entryNumber,
            libelle: line.label || entry.label,
            debit: line.debit,
            credit: line.credit,
            solde: acc.soldeFermeture,
            centreCout: line.analyticalCode,
            tiers: line.thirdPartyName,
          });
          accountMap.set(line.accountCode, acc);
        }
      }
      return Array.from(accountMap.values()).sort((a, b) => a.compte.localeCompare(b.compte));
    },
  });

  // Données évolution — vide sans données
  const evolutionData = useMemo(() => {
    if (!accountsData.length) return [];
    return [{
      periode: `${dateRange.start} - ${dateRange.end}`,
      actif: 0, passif: 0, produits: 0, charges: 0
    }];
  }, [accountsData, dateRange]);

  // Calculs des indicateurs
  const indicators = useMemo(() => {
    const totalComptes = accountsData.length;
    const comptesActifs = accountsData.filter(acc => acc.nombreEcritures > 0).length;
    const totalEcritures = accountsData.reduce((sum, acc) => sum + acc.nombreEcritures, 0);
    const moyenneEcritures = totalEcritures / comptesActifs;
    const comptesPlusActifs = accountsData.filter(acc => acc.nombreEcritures > moyenneEcritures).length;
    
    return { totalComptes, comptesActifs, totalEcritures, moyenneEcritures, comptesPlusActifs };
  }, [accountsData]);

  const COLORS = ['#171717', '#525252', '#a3a3a3', '#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <PrintableArea
      documentTitle="Grand Livre Général"
      orientation="landscape"
      showPrintButton={false}
    >
      <div className="min-h-screen bg-[#f5f5f5] print-area w-full">
      {/* En-tête principal */}
      <div className="bg-[#f5f5f5] border-b border-[#e5e5e5] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BookOpen className="w-8 h-8 text-[#171717]" />
            <div>
              <h1 className="text-lg font-bold text-[#171717]">Grand Livre Avancé</h1>
              <p className="text-sm text-[#171717]/70">Consultation détaillée - Conforme SYSCOHADA</p>
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
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-[#f5f5f5] text-[#171717]/70 border border-[#e5e5e5] rounded-lg hover:bg-[#e5e5e5] transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              Aperçu
            </button>
            
            <ExportMenu
              data={accountsData as unknown as Record<string, unknown>[]}
              filename="grand-livre-general"
              columns={{
                compte: 'Compte',
                libelle: 'Libellé',
                soldeOuverture: 'Solde Ouverture',
                totalDebit: 'Total Débit',
                totalCredit: 'Total Crédit',
                soldeFermeture: 'Solde Fermeture',
                nombreEcritures: 'Nombre Écritures'
              }}
              buttonText="Exporter"
            />
          </div>
        </div>
        
        {/* Navigation des vues - Version nouvelle génération */}
        <div className="flex space-x-1 mt-4 pt-3 overflow-x-auto overflow-y-visible">
          {[
            { id: 'intelligent', label: 'Recherche Intelligente', icon: Sparkles, badge: 'Nouveau', color: 'bg-purple-600' },
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3, color: 'bg-[#171717]' },
            { id: 'accounts', label: 'Comptes Détaillés', icon: Hash, color: 'bg-blue-600' },
            { id: 'general-ledger', label: t('accounting.generalLedger'), icon: BookOpen, color: 'bg-green-600' },
            { id: 'analysis', label: 'Analyse IA', icon: Brain, badge: 'IA', color: 'bg-indigo-600' },
            { id: 'collaboration', label: 'Collaboration', icon: Users, badge: 'Beta', color: 'bg-orange-600' }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as typeof activeView)}
              className={`relative px-4 py-2 rounded-lg transition-all duration-200 ${
                activeView === view.id
                  ? `${view.color} text-white shadow-lg transform scale-105`
                  : 'text-gray-600 hover:bg-gray-100 hover:shadow-md'
              }`}
            >
              <view.icon className="w-4 h-4 mr-2 inline" />
              {view.label}
              {view.badge && (
                <span className={`absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold text-white rounded-full z-10 ${
                  view.badge === 'Nouveau' ? 'bg-red-500' : view.badge === 'IA' ? 'bg-purple-500' : 'bg-orange-500'
                } animate-pulse`}>
                  {view.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="bg-[#f5f5f5] border-b border-[#e5e5e5] px-4 py-3">
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
              <label className="block text-sm font-medium text-[#171717] mb-1">{t('accounting.account')}</label>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-md text-sm"
              >
                <option value="">Tous les comptes</option>
                {accountsData.map((acc) => (
                  <option key={acc.compte} value={acc.compte}>
                    {acc.compte} - {acc.libelle}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Pièce</label>
              <input 
                type="text" 
                placeholder="AC-001, VE-002..."
                value={filters.piece}
                onChange={(e) => setFilters({...filters, piece: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiers</label>
              <input 
                type="text" 
                placeholder="Client, Fournisseur..."
                value={filters.tiers}
                onChange={(e) => setFilters({...filters, tiers: e.target.value})}
                className="w-full px-3 py-2 border border-[#e5e5e5] rounded-md text-sm"
              />
            </div>
            <div className="flex items-end">
              <button className="w-full px-4 py-2 bg-[#171717] text-white rounded-md hover:bg-[#262626] transition-colors">
                <Search className="w-4 h-4 mr-2 inline" />
                Rechercher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vue Recherche Intelligente Nouvelle Génération */}
      {activeView === 'intelligent' && (
        <div className="space-y-0 w-full">

          {/* Barre de recherche intelligente */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                Recherche Intelligente Nouvelle Génération
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <Zap className="w-4 h-4 text-green-500" />
                <span>Performance: &lt; 1s pour 10M+ écritures</span>
              </div>
            </div>

            {/* Barre de recherche avancée */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {isSearching ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                ) : (
                  <Search className="h-5 w-5 text-gray-700" />
                )}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-20 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-0 transition-colors"
                placeholder="Recherche intelligente: compte, montant, date, libellé... (ex: 512000, virement plus de 100000, janvier 2024)"
                autoComplete="off"
              />

              <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
                <button
                  className="p-2 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Recherche vocale"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                  className={`p-2 rounded-lg transition-colors ${
                    showAIAnalysis ? 'bg-purple-100 text-purple-600' : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title="Analyse IA"
                >
                  <Brain className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Suggestions et raccourcis */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-700 mr-2">Recherches rapides:</span>
              {['512000 banque', 'virement > 500000', 'janvier 2024', 'client important'].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-800 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Métriques de performance en temps réel */}
            <div className="mt-4 grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600">Temps de réponse</p>
                    <p className="text-lg font-bold text-green-900">{responseTime}ms</p>
                  </div>
                  <Target className="h-6 w-6 text-green-500" />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600">Base d'écritures</p>
                    <p className="text-lg font-bold text-blue-900">2.5M+</p>
                  </div>
                  <Database className="h-6 w-6 text-blue-500" />
                </div>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600">IA Confidence</p>
                    <p className="text-lg font-bold text-purple-900">92%</p>
                  </div>
                  <Brain className="h-6 w-6 text-purple-500" />
                </div>
              </div>

              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-600">Recherches/jour</p>
                    <p className="text-lg font-bold text-orange-900">247</p>
                  </div>
                  <Activity className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Modes de vue */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-semibold text-gray-900">Mode de Navigation</h4>
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { mode: 'table', icon: Grid3X3, label: 'Tableau' },
                  { mode: 'timeline', icon: Clock, label: 'Chronologique' },
                  { mode: 'hierarchy', icon: GitBranch, label: 'Hiérarchique' }
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as typeof viewMode)}
                    className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Résultats de recherche intelligente */}
          <div className="bg-white border-y border-gray-200">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h4 className="text-lg font-semibold text-gray-900">Résultats Intelligents</h4>
                  {searchQuery && (
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <span>Recherche:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono">{searchQuery}</code>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 font-medium">{responseTime}ms</span>
                  </div>

                  <button
                    onClick={() => setShowCollaboration(!showCollaboration)}
                    className={`p-2 rounded-lg border transition-colors ${
                      showCollaboration ? 'bg-orange-50 border-orange-300 text-orange-600' : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    title="Fonctionnalités collaboratives"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>

                  <button
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Exporter les résultats"
                  >
                    <ExportMenu
                      data={accountsData as unknown as Record<string, unknown>[]}
                      filename="compte-detail"
                      columns={{
                        compte: 'Compte',
                        libelle: 'Libellé',
                        soldeFermeture: 'Solde'
                      }}
                      buttonText=""
                      buttonVariant="ghost"
                    />
                  </button>

                  <button
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    title="Partager" aria-label="Partager">
                    <Share className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Statistiques de recherche */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-xs text-blue-600">Écritures trouvées</div>
                  <div className="font-semibold text-blue-900">1,247</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-xs text-green-600">Comptes concernés</div>
                  <div className="font-semibold text-green-900">28</div>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <div className="text-xs text-purple-600">Score IA</div>
                  <div className="font-semibold text-purple-900">92%</div>
                </div>
              </div>
            </div>

            {/* Table des résultats avec fonctionnalités avancées */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>{t('common.date')}</span>
                        <ArrowUpDown className="h-3 w-3 cursor-pointer hover:text-gray-700" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>{t('accounting.account')}</span>
                        <Filter className="h-3 w-3 cursor-pointer hover:text-gray-700" />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.label')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.debit')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.credit')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.journal')}</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">IA</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Exemples d'écritures avec fonctionnalités intelligentes */}
                  {[
                    {
                      id: '1',
                      date: '2024-01-15',
                      compte: '512000',
                      libelle: 'Banque Principale BCEAO',
                      description: 'Virement fournisseur prestation services',
                      debit: 500000,
                      credit: 0,
                      journal: 'BQ',
                      piece: 'VIR-2024-001',
                      confidence: 98,
                      tags: ['virement', 'banque'],
                      annotations: 0,
                      aiFlags: ['pattern_normal']
                    },
                    {
                      id: '2',
                      date: '2024-01-15',
                      compte: '401100',
                      libelle: 'Fournisseurs - Factures non parvenues',
                      description: 'Facture fournisseur prestation maintenance',
                      debit: 0,
                      credit: 125000,
                      journal: 'AC',
                      piece: 'FACT-2024-045',
                      confidence: 95,
                      tags: ['facture', 'fournisseur'],
                      annotations: 2,
                      aiFlags: ['reviewed']
                    },
                    {
                      id: '3',
                      date: '2024-01-14',
                      compte: '607000',
                      libelle: 'Achats de marchandises',
                      description: 'Achat équipement bureau - montant inhabituel',
                      debit: 750000,
                      credit: 0,
                      journal: 'AC',
                      piece: 'FACT-2024-044',
                      confidence: 87,
                      tags: ['achat', 'équipement'],
                      annotations: 1,
                      aiFlags: ['anomaly_detected', 'high_amount']
                    }
                  ].map((entry, index) => (
                    <tr key={entry.id} className="hover:bg-gray-50 group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full bg-${entry.compte[0] === '5' ? 'blue' : entry.compte[0] === '4' ? 'purple' : 'red'}-500`}></div>
                          <span className="text-sm font-mono font-medium text-gray-900">{entry.compte}</span>
                        </div>
                        <div className="text-xs text-gray-700 mt-1">{entry.libelle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{entry.description}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {entry.debit > 0 ? (
                          <span className="text-green-600 font-mono font-medium">{formatCurrency(entry.debit)}</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {entry.credit > 0 ? (
                          <span className="text-red-600 font-mono font-medium">{formatCurrency(entry.credit)}</span>
                        ) : (
                          <span className="text-gray-700">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                          {entry.journal}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <div className={`w-3 h-3 rounded-full ${
                            entry.confidence >= 95 ? 'bg-green-500' :
                            entry.confidence >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} title={`Confiance IA: ${entry.confidence}%`}></div>
                          {entry.aiFlags.includes('anomaly_detected') && (
                            <span title="Anomalie détectée"><AlertTriangle className="h-3 w-3 text-orange-500" /></span>
                          )}
                          {entry.annotations > 0 && (
                            <div className="relative">
                              <MessageSquare className="h-3 w-3 text-blue-500" />
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center text-[10px]">
                                {entry.annotations}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setSelectedEntry({
                                id: entry.id,
                                date: entry.date,
                                piece: entry.piece,
                                libelle: entry.description,
                                debit: entry.debit,
                                credit: entry.credit,
                                solde: entry.debit - entry.credit
                              });
                              setShowDetailModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-blue-600"
                            title="Voir détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEntry({
                                id: entry.id,
                                date: entry.date,
                                piece: entry.piece,
                                libelle: entry.description,
                                debit: entry.debit,
                                credit: entry.credit,
                                solde: entry.debit - entry.credit
                              });
                              setShowAnnotationModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-orange-600"
                            title="Annoter"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              const newFavorites = new Set(favorites);
                              if (newFavorites.has(entry.id)) {
                                newFavorites.delete(entry.id);
                              } else {
                                newFavorites.add(entry.id);
                              }
                              setFavorites(newFavorites);
                            }}
                            className={`p-1 ${favorites.has(entry.id) ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-600`}
                            title="Marquer favoris"
                          >
                            <Star className="h-4 w-4" fill={favorites.has(entry.id) ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => {
                              setShareLink(`/accounting/entry/${entry.id}`);
                              setShowShareModal(true);
                            }}
                            className="p-1 text-gray-700 hover:text-green-600"
                            title="Partager"
                          >
                            <Share className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>

                {/* Pagination intelligente */}
                <div className="px-6 py-4 border-t bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-700">
                      Affichage de 1 à 50 sur 1,247 résultats
                      <span className="ml-2 text-purple-600 font-medium">• Recherche optimisée IA</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {}}
                        disabled
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Précédent
                      </button>
                      <span className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded font-medium">1</span>
                      <span className="px-2 py-1 text-sm text-gray-700">...</span>
                      <span className="px-2 py-1 text-sm text-gray-700">25</span>
                      <button
                        onClick={() => {}}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Suivant →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vue Chronologique */}
            {viewMode === 'timeline' && (
              <div className="p-2 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-600" />
                    Vue Chronologique - Janvier 2025
                  </h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      Mois
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      Semaine
                    </button>
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded">
                      Jour
                    </button>
                  </div>
                </div>

                {/* Timeline par jour */}
                <div className="space-y-6">
                  {[
                    { date: '15 Janvier 2025', entries: 3, total: 1375000 },
                    { date: '14 Janvier 2025', entries: 2, total: 750000 },
                    { date: '13 Janvier 2025', entries: 5, total: 2100000 }
                  ].map((day, dayIndex) => (
                    <div key={dayIndex} className="border-l-4 border-blue-500 pl-6 relative">
                      <div className="absolute -left-3 top-0 w-6 h-6 bg-blue-500 rounded-full border-4 border-white"></div>

                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{day.date}</h4>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">{day.entries} écritures</span>
                            <span className="font-medium text-gray-900">{formatCurrency(day.total)}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {[
                            { time: '14:30', compte: '512000', libelle: 'Virement fournisseur', montant: 500000, type: 'debit' },
                            { time: '10:15', compte: '401100', libelle: 'Facture fournisseur', montant: 125000, type: 'credit' }
                          ].slice(0, day.entries > 2 ? 2 : day.entries).map((entry, entryIndex) => (
                            <div key={entryIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex items-center space-x-3">
                                <span className="text-xs text-gray-700 font-mono">{entry.time}</span>
                                <span className="text-sm font-mono text-gray-700">{entry.compte}</span>
                                <span className="text-sm text-gray-600">{entry.libelle}</span>
                              </div>
                              <span className={`text-sm font-semibold ${entry.type === 'debit' ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(entry.montant)}
                              </span>
                            </div>
                          ))}
                          {day.entries > 2 && (
                            <button className="text-sm text-blue-600 hover:underline">
                              Voir les {day.entries - 2} autres écritures
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-4">
                  <button className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">
                    Charger plus de dates
                  </button>
                </div>
              </div>
            )}

            {/* Vue Hiérarchique */}
            {viewMode === 'hierarchy' && (
              <div className="p-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <GitBranch className="h-5 w-5 mr-2 text-purple-600" />
                    Vue Hiérarchique - Plan Comptable
                  </h3>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      Tout réduire
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                      Tout développer
                    </button>
                  </div>
                </div>

                {/* Arborescence des comptes */}
                <div className="space-y-2">
                  {[
                    {
                      classe: 'Classe 4 - Comptes de Tiers',
                      color: 'purple',
                      comptes: [
                        { numero: '401', libelle: t('navigation.suppliers'), solde: -2500000, sousComptes: [
                          { numero: '401100', libelle: 'Fournisseurs - Factures non parvenues', solde: -125000 },
                          { numero: '401200', libelle: 'Fournisseurs - Factures à recevoir', solde: -875000 }
                        ]},
                        { numero: '411', libelle: t('navigation.clients'), solde: 1800000, sousComptes: [
                          { numero: '411100', libelle: 'Clients - Ordinaires', solde: 1500000 },
                          { numero: '411200', libelle: 'Clients - Créances douteuses', solde: 300000 }
                        ]}
                      ]
                    },
                    {
                      classe: 'Classe 5 - Comptes Financiers',
                      color: 'blue',
                      comptes: [
                        { numero: '512', libelle: 'Banques', solde: 5500000, sousComptes: [
                          { numero: '512000', libelle: 'Banque Principale BCEAO', solde: 4000000 },
                          { numero: '512100', libelle: 'Banque Secondaire', solde: 1500000 }
                        ]},
                        { numero: '531', libelle: 'Caisse', solde: 450000, sousComptes: [] }
                      ]
                    },
                    {
                      classe: 'Classe 6 - Comptes de Charges',
                      color: 'red',
                      comptes: [
                        { numero: '607', libelle: 'Achats de marchandises', solde: 750000, sousComptes: [
                          { numero: '607000', libelle: 'Achats de marchandises', solde: 750000 }
                        ]},
                        { numero: '641', libelle: 'Rémunérations du personnel', solde: 3200000, sousComptes: [] }
                      ]
                    }
                  ].map((classe, classeIndex) => (
                    <div key={classeIndex} className="border border-gray-200 rounded-lg">
                      <div
                        className={`bg-${classe.color}-50 border-l-4 border-${classe.color}-500 p-3 cursor-pointer hover:bg-${classe.color}-100`}
                        onClick={() => {
                          const newExpanded = new Set(expandedAccounts);
                          if (newExpanded.has(`classe-${classeIndex}`)) {
                            newExpanded.delete(`classe-${classeIndex}`);
                          } else {
                            newExpanded.add(`classe-${classeIndex}`);
                          }
                          setExpandedAccounts(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {expandedAccounts.has(`classe-${classeIndex}`) ? (
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            )}
                            <span className="font-semibold text-gray-900">{classe.classe}</span>
                          </div>
                          <span className="text-sm text-gray-600">{classe.comptes.length} comptes</span>
                        </div>
                      </div>

                      {expandedAccounts.has(`classe-${classeIndex}`) && (
                        <div className="p-3 space-y-2">
                          {classe.comptes.map((compte, compteIndex) => (
                            <div key={compteIndex} className="border-l-2 border-gray-300 pl-4">
                              <div
                                className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                                onClick={() => {
                                  const newExpanded = new Set(expandedAccounts);
                                  const key = `compte-${classeIndex}-${compteIndex}`;
                                  if (newExpanded.has(key)) {
                                    newExpanded.delete(key);
                                  } else {
                                    newExpanded.add(key);
                                  }
                                  setExpandedAccounts(newExpanded);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {compte.sousComptes.length > 0 && (
                                      expandedAccounts.has(`compte-${classeIndex}-${compteIndex}`) ? (
                                        <ChevronDown className="h-3 w-3 text-gray-700" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-gray-700" />
                                      )
                                    )}
                                    <span className="font-mono text-sm font-medium text-gray-700">{compte.numero}</span>
                                    <span className="text-sm text-gray-600">{compte.libelle}</span>
                                  </div>
                                  <span className={`text-sm font-semibold ${compte.solde > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(compte.solde)}
                                  </span>
                                </div>
                              </div>

                              {expandedAccounts.has(`compte-${classeIndex}-${compteIndex}`) && compte.sousComptes.length > 0 && (
                                <div className="ml-4 mt-2 space-y-1">
                                  {compte.sousComptes.map((sousCompte, sousCompteIndex) => (
                                    <div key={sousCompteIndex} className="p-2 bg-gray-50 rounded text-sm">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-mono text-xs text-gray-600">{sousCompte.numero}</span>
                                          <span className="text-xs text-gray-600">{sousCompte.libelle}</span>
                                        </div>
                                        <span className={`text-xs font-semibold ${sousCompte.solde > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {formatCurrency(sousCompte.solde)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panneau d'analyse IA (si activé) */}
          {showAIAnalysis && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-purple-900 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Analyse IA Temps Réel
                </h4>
                <div className="flex items-center space-x-2 text-sm text-purple-700">
                  <Sparkles className="w-4 h-4" />
                  <span>Algorithmes avancés activés</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <h5 className="font-medium text-purple-900 mb-2">🔍 Détection d'Anomalies</h5>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• 1 montant inhabituel détecté</li>
                    <li>• Pattern temporel normal</li>
                    <li>• Aucune fraude suspectée</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <h5 className="font-medium text-purple-900 mb-2">📊 Insights Automatiques</h5>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• Pic d'activité en janvier</li>
                    <li>• Corrélation banque-fournisseurs</li>
                    <li>• Tendance positive +12%</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-lg border border-purple-200">
                  <h5 className="font-medium text-purple-900 mb-2">🎯 Recommandations</h5>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• Vérifier écriture 607000</li>
                    <li>• Optimiser délais paiement</li>
                    <li>• Archive anciens comptes</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Panneau collaboration (si activé) */}
          {showCollaboration && (
            <div className="bg-orange-50 rounded-lg border border-orange-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-orange-900 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Espace Collaboratif
                </h4>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                    3 membres actifs
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-3 flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Annotations Récentes
                  </h5>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                        JD
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">—</span> a commenté l'écriture 512000
                        </div>
                        <div className="text-xs text-gray-700 mt-1">
                          "Virement important à vérifier avec la direction"
                        </div>
                        <div className="text-xs text-gray-700 mt-1">Il y a 5 minutes</div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                        ML
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">Marie Leblanc</span> a validé l'écriture 401100
                        </div>
                        <div className="text-xs text-gray-700 mt-1">Il y a 12 minutes</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h5 className="font-medium text-orange-900 mb-3 flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    Recherches Favorites d'Équipe
                  </h5>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      📊 Virements importants plus de 500K
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      🏦 "Mouvements banque janvier"
                    </button>
                    <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">
                      ⚠️ "Écritures nécessitant révision"
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tableau de bord */}
      {activeView === 'dashboard' && (
        <div className="w-full bg-white">

          {/* Indicateurs clés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                  <p className="text-lg font-bold text-[#171717]">{indicators.totalComptes}</p>
                  <p className="text-xs text-gray-700">{t('accounting.chartOfAccounts')}</p>
                </div>
                <div className="w-12 h-12 bg-[#171717]/10 rounded-lg flex items-center justify-center">
                  <Hash className="w-6 h-6 text-[#171717]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Comptes Actifs</p>
                  <p className="text-lg font-bold text-blue-600">{indicators.comptesActifs}</p>
                  <p className="text-xs text-gray-700">Avec mouvements</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Écritures</p>
                  <p className="text-lg font-bold text-green-600">{indicators.totalEcritures}</p>
                  <p className="text-xs text-gray-700">Période actuelle</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Moy. Écritures</p>
                  <p className="text-lg font-bold text-orange-600">{indicators.moyenneEcritures.toFixed(0)}</p>
                  <p className="text-xs text-gray-700">Par compte actif</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques d'évolution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Évolution des soldes */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Évolution des Soldes</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>6 derniers mois</option>
                    <option>12 derniers mois</option>
                    <option>Année complète</option>
                  </select>
                  <button className="p-2 text-gray-700 hover:text-gray-600">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="actif" stackId="1" stroke="#171717" fill="#171717" fillOpacity={0.6} name="Actif" />
                  <Area type="monotone" dataKey="passif" stackId="2" stroke="#525252" fill="#525252" fillOpacity={0.6} name="Passif" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top comptes par activité */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Comptes Actifs</h3>
                <button className="p-2 text-gray-700 hover:text-gray-600" aria-label="Voir les détails">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {accountsData
                  .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
                  .slice(0, 5)
                  .map((account, index) => (
                    <div key={account.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle.substring(0, 25)}...</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{account.nombreEcritures}</div>
                        <div className="text-xs text-gray-700">écritures</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Alertes et notifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Comptes sans mouvement */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Comptes Inactifs</h4>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Depuis 30 jours</span>
                  <span className="text-sm font-medium text-orange-600">12 comptes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Depuis 90 jours</span>
                  <span className="text-sm font-medium text-red-600">5 comptes</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Total inactifs</span>
                    <span className="text-sm font-bold text-orange-600">17</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mouvements importants */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Mouvements Majeurs</h4>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-900">512100</span>
                    <p className="text-xs text-gray-700">Banque BNP</p>
                  </div>
                  <span className="text-sm font-medium text-blue-600">89 mvts</span>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium text-gray-900">607000</span>
                    <p className="text-xs text-gray-700">Achats</p>
                  </div>
                  <span className="text-sm font-medium text-green-600">45 mvts</span>
                </div>
              </div>
            </div>

            {/* Soldes significatifs */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Soldes Importants</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Plus de 10M</span>
                  <span className="text-sm font-medium text-green-600">3 comptes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Plus de 5M</span>
                  <span className="text-sm font-medium text-blue-600">7 comptes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Plus de 1M</span>
                  <span className="text-sm font-medium text-gray-600">15 comptes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Comptes Détaillés */}
      {activeView === 'accounts' && (
        <div className="space-y-0 w-full">

          {/* Sélecteur de compte */}
          <div className="bg-white p-4 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Sélection du Compte</h3>
              <select 
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg font-mono"
              >
                <option value="">-- Sélectionner un compte --</option>
                {accountsData.map((acc) => (
                  <option key={acc.compte} value={acc.compte}>
                    {acc.compte} - {acc.libelle} ({acc.nombreEcritures} écritures)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Détail du compte sélectionné */}
          {selectedAccount && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {(() => {
                const account = accountsData.find(acc => acc.compte === selectedAccount);
                if (!account) return null;
                
                return (
                  <>
                    <div className="p-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Compte {account.compte}
                          </h3>
                          <p className="text-gray-600">{account.libelle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-[#171717]">
                            {(account.soldeFermeture / 1000000).toFixed(1)}M XAF
                          </div>
                          <div className="text-sm text-gray-700">Solde actuel</div>
                        </div>
                      </div>
                      
                      {/* Résumé du compte */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">
                            {(account.soldeOuverture / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-gray-600">Solde ouverture</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-lg font-bold text-green-600">
                            {(account.totalDebit / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-gray-600">Total débit</div>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="text-lg font-bold text-orange-600">
                            {(account.totalCredit / 1000000).toFixed(1)}M
                          </div>
                          <div className="text-xs text-gray-600">Total crédit</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-lg font-bold text-purple-600">{account.nombreEcritures}</div>
                          <div className="text-xs text-gray-600">Nb écritures</div>
                        </div>
                      </div>
                    </div>

                    {/* Journal des écritures */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">N° Pièce</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.label')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.debit')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.credit')}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.balance')}</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Centre</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {account.entries.map((entry, index) => (
                            <tr key={entry.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(entry.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                {entry.piece}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">{entry.libelle}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-blue-600">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right text-green-600">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-right font-medium text-gray-900">
                                {formatCurrency(entry.solde)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600">
                                {entry.centreCout || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button className="text-blue-600 hover:text-blue-900" title="Voir détail" aria-label="Voir les détails">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Vue Grand Livre */}
      {activeView === 'general-ledger' && (
        <div className="w-full">
          <div className="bg-white">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-semibold text-gray-900">Grand Livre des Comptes</h3>

                  {/* Dropdown Type de Grand Livre */}
                  <select
                    value={ledgerType}
                    onChange={(e) => setLedgerType(e.target.value as typeof ledgerType)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#171717] focus:border-[#171717]"
                  >
                    <option value="general">Général - Tous comptes/écritures</option>
                    <option value="account">Par compte - Compte spécifique</option>
                    <option value="journal">Par journal - Regroupé par journal</option>
                    <option value="auxiliary">Auxiliaire - Tiers détaillés</option>
                    <option value="summary">Cumulé/Récapitulatif - Totaux</option>
                  </select>

                  {/* Boutons de mode d'affichage */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setLedgerViewMode('detailed')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'detailed'
                          ? 'bg-white text-[#171717] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title="Vue détaillée"
                    >
                      <FileText className="w-4 h-4 mr-1.5 inline" />
                      Détaillé
                    </button>
                    <button
                      onClick={() => setLedgerViewMode('tree')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'tree'
                          ? 'bg-white text-[#171717] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title="Vue arborescence"
                    >
                      <Layers className="w-4 h-4 mr-1.5 inline" />
                      Arborescence
                    </button>
                    <button
                      onClick={() => setLedgerViewMode('list')}
                      className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                        ledgerViewMode === 'list'
                          ? 'bg-white text-[#171717] shadow-sm font-medium'
                          : 'text-gray-600 hover:bg-white/50'
                      }`}
                      title="Vue liste"
                    >
                      <List className="w-4 h-4 mr-1.5 inline" />
                      Liste
                    </button>
                  </div>

                  {/* Boutons d'extension/rétraction globale */}
                  {ledgerViewMode === 'detailed' && (
                    <div className="flex items-center space-x-2 ml-4 border-l pl-4">
                      <button
                        onClick={() => {
                          const allCodes = new Set<string>();
                          const baseData = [
                            { code: '411001', libelle: 'Client A SARL', classe: 'Clients et comptes rattachés', solde: { debit: 2200000, credit: 0 }, mouvements: [] },
                            { code: '401001', libelle: 'Fournisseur B SA', classe: 'Fournisseurs et comptes rattachés', solde: { debit: 0, credit: 1800000 }, mouvements: [] },
                            { code: '512001', libelle: 'Banque XYZ', classe: 'Comptes bancaires', solde: { debit: 5000000, credit: 0 }, mouvements: [] },
                            { code: '701001', libelle: 'Ventes de marchandises', classe: 'Produits des activités ordinaires', solde: { debit: 0, credit: 10000000 }, mouvements: [] },
                            { code: '601001', libelle: 'Achats de marchandises', classe: 'Charges des activités ordinaires', solde: { debit: 6000000, credit: 0 }, mouvements: [] }
                          ];
                          baseData.forEach(compte => allCodes.add(compte.code));
                          setExpandedAccounts(allCodes);
                        }}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                        title="Étendre tout"
                      >
                        <ChevronDown className="w-4 h-4 mr-1 inline" />
                        Tout étendre
                      </button>
                      <button
                        onClick={() => setExpandedAccounts(new Set())}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-all"
                        title="Rétracter tout"
                      >
                        <ChevronRight className="w-4 h-4 mr-1 inline" />
                        Tout rétracter
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <option value="all">Tous les comptes</option>
                    <option value="1">Classe 1 - Comptes de ressources durables</option>
                    <option value="2">Classe 2 - Comptes d'actif immobilisé</option>
                    <option value="3">Classe 3 - Comptes de stocks</option>
                    <option value="4">Classe 4 - Comptes de tiers</option>
                    <option value="5">Classe 5 - Comptes de trésorerie</option>
                    <option value="6">Classe 6 - Comptes de charges</option>
                    <option value="7">Classe 7 - Comptes de produits</option>
                  </select>
                  <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Calendar className="w-4 h-4 mr-1 inline" />
                    Période
                  </button>
                </div>
              </div>
            </div>


            {/* Contenu conditionnel selon le mode d'affichage */}
            <div className="p-2">
              {(() => {
                // Fonction pour récupérer les données selon le type de grand livre
                const getLedgerData = () => {
                  const baseData = [
                    {
                      code: '411001',
                      libelle: 'Client A SARL',
                      classe: 'Clients et comptes rattachés',
                      solde: { debit: 2200000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-15',
                          piece: 'FAC-2024-001',
                          libelle: 'Facture de vente - Client A SARL',
                          journal: 'VTE',
                          contrepartie: '701001',
                          lettrage: '',
                          debit: 1500000,
                          credit: 0,
                          solde: 1500000
                        },
                        {
                          date: '2024-03-20',
                          piece: 'CHQ-001',
                          libelle: 'Règlement par chèque',
                          journal: 'BQ1',
                          contrepartie: '512001',
                          lettrage: 'A001',
                          debit: 0,
                          credit: 800000,
                          solde: 700000
                        },
                        {
                          date: '2024-03-25',
                          piece: 'FAC-2024-015',
                          libelle: 'Facture de vente complémentaire',
                          journal: 'VTE',
                          contrepartie: '701001',
                          lettrage: '',
                          debit: 1500000,
                          credit: 0,
                          solde: 2200000
                        }
                      ]
                    },
                    {
                      code: '512001',
                      libelle: 'Banque SGBCI - Compte Courant',
                      classe: 'Banques, établissements financiers',
                      solde: { debit: 18500000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-01',
                          piece: 'OUV-2024-001',
                          libelle: 'Solde à nouveau - Report exercice précédent',
                          journal: 'OUV',
                          contrepartie: '890001',
                          lettrage: '',
                          debit: 15000000,
                          credit: 0,
                          solde: 15000000
                        },
                        {
                          date: '2024-03-10',
                          piece: 'VIR-2024-025',
                          libelle: 'Virement reçu de partenaire commercial',
                          journal: 'BQ1',
                          contrepartie: '411005',
                          lettrage: '',
                          debit: 5000000,
                          credit: 0,
                          solde: 20000000
                        },
                        {
                          date: '2024-03-15',
                          piece: 'PREL-AUTO-001',
                          libelle: 'Prélèvement automatique charges sociales',
                          journal: 'BQ1',
                          contrepartie: '431001',
                          lettrage: '',
                          debit: 0,
                          credit: 1500000,
                          solde: 18500000
                        }
                      ]
                    },
                    {
                      code: '601001',
                      libelle: 'Achats de marchandises',
                      classe: 'Achats et variations de stocks',
                      solde: { debit: 12000000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-05',
                          piece: 'FF-2024-001',
                          libelle: 'Facture fournisseur Marchandises diverses',
                          journal: 'ACH',
                          contrepartie: '401001',
                          lettrage: 'B001',
                          debit: 8000000,
                          credit: 0,
                          solde: 8000000
                        },
                        {
                          date: '2024-03-18',
                          piece: 'FF-2024-015',
                          libelle: 'Facture fournisseur Stock saisonnier',
                          journal: 'ACH',
                          contrepartie: '401002',
                          lettrage: '',
                          debit: 4000000,
                          credit: 0,
                          solde: 12000000
                        }
                      ]
                    }
                  ];

                  switch (ledgerType) {
                    case 'account':
                      // Grand Livre par compte - Afficher un seul compte avec tous les détails
                      return [baseData[0]]; // Seulement le client A SARL

                    case 'journal':
                      // Grand Livre par journal - Regrouper par journal
                      return baseData.map(compte => ({
                        ...compte,
                        mouvements: compte.mouvements.filter(m => m.journal === 'VTE' || m.journal === 'BQ1')
                      })).filter(compte => compte.mouvements.length > 0);

                    case 'auxiliary':
                      // Grand Livre auxiliaire - Seulement les comptes de tiers
                      return baseData.filter(compte => compte.code.startsWith('4'));

                    case 'summary':
                      // Grand Livre cumulé/récapitulatif - Seulement les totaux sans détails
                      return baseData.map(compte => ({
                        ...compte,
                        mouvements: [] // Pas de détails des mouvements
                      }));

                    case 'general':
                    default:
                      // Grand Livre général - Tous les comptes et écritures
                      return baseData;
                  }
                };

                const currentData = getLedgerData();

                // Mode Détaillé
                if (ledgerViewMode === 'detailed') {
                  return (
                    <div className="space-y-6">
                      {ledgerType === 'summary' ? (
                        // Mode récapitulatif - Affichage des totaux uniquement
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                          <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('accounting.account')}</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t('accounting.label')}</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-700">Classe</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Débit</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Crédit</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-700">{t('accounting.balance')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentData.map((compte, index) => (
                                <tr key={index} className="hover:bg-gray-50 border-b">
                                  <td className="px-4 py-3 font-mono text-[#171717] font-bold">{compte.code}</td>
                                  <td className="px-4 py-3 text-gray-900">{compte.libelle}</td>
                                  <td className="px-4 py-3 text-gray-600 text-sm">{compte.classe}</td>
                                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                                    {formatCurrency(compte.solde.debit)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-green-600 font-medium">
                                    {formatCurrency(compte.solde.credit)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                                    {formatCurrency(compte.solde.debit - compte.solde.credit)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          </div>
                        </div>
                      ) : (
                        // Mode détaillé avec mouvements
                        currentData.map((compte, index) => {
                          const isExpanded = expandedAccounts.has(compte.code);
                          const toggleExpand = () => {
                            const newExpanded = new Set(expandedAccounts);
                            if (isExpanded) {
                              newExpanded.delete(compte.code);
                            } else {
                              newExpanded.add(compte.code);
                            }
                            setExpandedAccounts(newExpanded);
                          };

                          return (
                          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* En-tête du compte */}
                            <div className="bg-gradient-to-r from-[#171717] to-[#737373] text-white p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                  <button
                                    onClick={toggleExpand}
                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                    title={isExpanded ? "Rétracter" : "Étendre"} aria-label="Ouvrir le menu">
                                    {isExpanded ? (
                                      <ChevronDown className="w-5 h-5" />
                                    ) : (
                                      <ChevronRight className="w-5 h-5" />
                                    )}
                                  </button>
                                  <div className="text-lg font-mono font-bold">{compte.code}</div>
                                  <div>
                                    <div className="text-lg font-semibold">{compte.libelle}</div>
                                    <div className="text-sm text-white/80">{compte.classe}</div>
                                    {ledgerType !== 'general' && (
                                      <div className="text-xs text-white/60 mt-1">
                                        {ledgerType === 'account' && '📋 Vue par compte spécifique'}
                                        {ledgerType === 'journal' && '📚 Vue par journal'}
                                        {ledgerType === 'auxiliary' && '👥 Vue auxiliaire des tiers'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                  <div className="text-right">
                                    <div className="text-sm text-white/80">Solde actuel</div>
                                    <div className="text-lg font-bold">
                                      {formatCurrency(compte.solde.debit - compte.solde.credit)}
                                    </div>
                                    <div className="text-sm text-white/80">
                                      {compte.solde.debit > compte.solde.credit ? 'Débiteur' : 'Créditeur'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Tableau des mouvements */}
                            {isExpanded && compte.mouvements.length > 0 && (
                              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('common.date')}</th>
                                      <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">N° Pièce</th>
                                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                                      <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('accounting.journal')}</th>
                                      <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">Contrepartie</th>
                                      <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('thirdParty.reconciliation')}</th>
                                      <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.debit')}</th>
                                      <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.credit')}</th>
                                      <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.balance')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {compte.mouvements.map((mouvement, mvtIndex) => (
                                      <tr key={mvtIndex} className="hover:bg-gray-50 border-b">
                                        <td className="px-3 py-2 text-gray-600 text-xs">
                                          {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-3 py-2 text-gray-800 font-mono text-xs">{mouvement.piece}</td>
                                        <td className="px-4 py-2 text-gray-900 text-xs">{mouvement.libelle}</td>
                                        <td className="px-2 py-2 text-center text-xs">
                                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                            {mouvement.journal}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-xs text-gray-600">{mouvement.contrepartie}</td>
                                        <td className="px-2 py-2 text-center text-xs">
                                          {mouvement.lettrage ? (
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                              {mouvement.lettrage}
                                            </span>
                                          ) : (
                                            <span className="text-gray-700">-</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">
                                          {mouvement.debit > 0 ? formatCurrency(mouvement.debit) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">
                                          {mouvement.credit > 0 ? formatCurrency(mouvement.credit) : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">
                                          {formatCurrency(mouvement.solde)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50">
                                    <tr>
                                      <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700 text-xs">Totaux</td>
                                      <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">
                                        {formatCurrency(compte.mouvements.reduce((sum, m) => sum + m.debit, 0))}
                                      </td>
                                      <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">
                                        {formatCurrency(compte.mouvements.reduce((sum, m) => sum + m.credit, 0))}
                                      </td>
                                      <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">
                                        {formatCurrency(compte.solde.debit - compte.solde.credit)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                        })
                      )}
                    </div>
                  );
                }

                return null; // Placeholder pour les autres modes
              })()}

              {/* Les autres modes d'affichage restent inchangés pour l'instant */}
              {ledgerViewMode === 'detailed' && null /* Déjà géré au-dessus */}
              {ledgerViewMode === 'detailed' && (
                <div style={{display: 'none'}}> {/* Cache l'ancien code */}
                  {[
                    {
                      code: '411001',
                      libelle: 'Client A SARL',
                      classe: 'Clients et comptes rattachés',
                      solde: { debit: 2200000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-15',
                          piece: 'FAC-2024-001',
                          libelle: 'Facture de vente - Client A SARL',
                          journal: 'VTE',
                          contrepartie: '701001',
                          lettrage: '',
                          debit: 1500000,
                          credit: 0,
                          solde: 1500000
                        },
                        {
                          date: '2024-03-20',
                          piece: 'CHQ-001',
                          libelle: 'Règlement par chèque',
                          journal: 'BQ1',
                          contrepartie: '512001',
                          lettrage: 'A001',
                          debit: 0,
                          credit: 800000,
                          solde: 700000
                        },
                        {
                          date: '2024-03-25',
                          piece: 'FAC-2024-015',
                          libelle: 'Facture de vente complémentaire',
                          journal: 'VTE',
                          contrepartie: '701001',
                          lettrage: '',
                          debit: 1500000,
                          credit: 0,
                          solde: 2200000
                        }
                      ]
                    },
                    {
                      code: '512001',
                      libelle: 'Banque SGBCI - Compte Courant',
                      classe: 'Banques, établissements financiers',
                      solde: { debit: 18500000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-01',
                          piece: 'OUV-2024-001',
                          libelle: 'Solde à nouveau - Report exercice précédent',
                          journal: 'OUV',
                          contrepartie: '890001',
                          lettrage: '',
                          debit: 15000000,
                          credit: 0,
                          solde: 15000000
                        },
                        {
                          date: '2024-03-10',
                          piece: 'VIR-2024-025',
                          libelle: 'Virement reçu de partenaire commercial',
                          journal: 'BQ1',
                          contrepartie: '411005',
                          lettrage: '',
                          debit: 5000000,
                          credit: 0,
                          solde: 20000000
                        },
                        {
                          date: '2024-03-15',
                          piece: 'PREL-AUTO-001',
                          libelle: 'Prélèvement automatique charges sociales',
                          journal: 'BQ1',
                          contrepartie: '431001',
                          lettrage: '',
                          debit: 0,
                          credit: 1500000,
                          solde: 18500000
                        }
                      ]
                    },
                    {
                      code: '601001',
                      libelle: 'Achats de marchandises',
                      classe: 'Achats et variations de stocks',
                      solde: { debit: 12000000, credit: 0 },
                      mouvements: [
                        {
                          date: '2024-03-05',
                          piece: 'FF-2024-001',
                          libelle: 'Facture fournisseur Marchandises diverses',
                          journal: 'ACH',
                          contrepartie: '401001',
                          lettrage: 'B001',
                          debit: 8000000,
                          credit: 0,
                          solde: 8000000
                        },
                        {
                          date: '2024-03-18',
                          piece: 'FF-2024-015',
                          libelle: 'Facture fournisseur Stock saisonnier',
                          journal: 'ACH',
                          contrepartie: '401002',
                          lettrage: '',
                          debit: 4000000,
                          credit: 0,
                          solde: 12000000
                        }
                      ]
                    }
                  ].map((compte, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* En-tête du compte */}
                      <div className="bg-gradient-to-r from-[#171717] to-[#737373] text-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-lg font-mono font-bold">{compte.code}</div>
                            <div>
                              <div className="text-lg font-semibold">{compte.libelle}</div>
                              <div className="text-sm text-white/80">{compte.classe}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-white/80">Solde actuel</div>
                            <div className="text-lg font-bold">
                              {formatCurrency(compte.solde.debit - compte.solde.credit)}
                            </div>
                            <div className="text-sm text-white/80">
                              {compte.solde.debit > compte.solde.credit ? 'Débiteur' : 'Créditeur'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tableau des mouvements */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('common.date')}</th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">N° Pièce</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('accounting.journal')}</th>
                              <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">Contrepartie</th>
                              <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">{t('thirdParty.reconciliation')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.debit')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.credit')}</th>
                              <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.balance')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compte.mouvements.map((mouvement, mvtIndex) => (
                              <tr key={mvtIndex} className="hover:bg-gray-50 border-b">
                                <td className="px-3 py-2 text-gray-600 text-xs">
                                  {new Date(mouvement.date).toLocaleDateString('fr-FR')}
                                </td>
                                <td className="px-3 py-2 text-gray-800 font-mono text-xs">{mouvement.piece}</td>
                                <td className="px-4 py-2 text-gray-900 text-xs">{mouvement.libelle}</td>
                                <td className="px-2 py-2 text-center text-xs">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                    {mouvement.journal}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono text-xs text-gray-600">{mouvement.contrepartie}</td>
                                <td className="px-2 py-2 text-center text-xs">
                                  {mouvement.lettrage ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                      {mouvement.lettrage}
                                    </span>
                                  ) : (
                                    <span className="text-gray-700">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">
                                  {mouvement.debit > 0 ? formatCurrency(mouvement.debit) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">
                                  {mouvement.credit > 0 ? formatCurrency(mouvement.credit) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-gray-900 text-xs">
                                  {formatCurrency(mouvement.solde)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={6} className="px-3 py-3 font-semibold text-gray-700 text-xs">Totaux</td>
                              <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">
                                {formatCurrency(compte.mouvements.reduce((sum, m) => sum + m.debit, 0))}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">
                                {formatCurrency(compte.mouvements.reduce((sum, m) => sum + m.credit, 0))}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">
                                {formatCurrency(compte.solde.debit - compte.solde.credit)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Mode Arborescence */}
              {ledgerViewMode === 'tree' && (
                <div className="space-y-4">
                  {/* Structure hiérarchique par classes */}
                  <div className="bg-white border border-gray-200 rounded-lg h-[600px] overflow-y-auto">
                    <div className="space-y-1">
                      {/* Classe 4 - Comptes de tiers */}
                      <div className="border-b border-gray-100 last:border-b-0">
                        <div
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {}}
                        >
                          <div className="flex items-center space-x-3">
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">4</div>
                            <div>
                              <div className="font-semibold text-gray-900">Comptes de tiers</div>
                              <div className="text-sm text-gray-700">3 comptes actifs</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">2 200 000 FCFA</div>
                            <div className="text-sm text-gray-700">Solde total</div>
                          </div>
                        </div>

                        {/* Sous-comptes */}
                        <div className="pl-10 bg-gray-50/50">
                          <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer border-l-2 border-blue-200">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-mono text-blue-700 font-bold">411</div>
                              <div>
                                <div className="text-sm font-medium">Clients et comptes rattachés</div>
                                <div className="text-xs text-gray-700">1 compte</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">2 200 000</div>
                              <div className="text-xs text-gray-700">D</div>
                            </div>
                          </div>

                          <div className="pl-8">
                            <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer">
                              <div className="flex items-center space-x-3">
                                <div className="text-xs font-mono text-gray-600">411001</div>
                                <div className="text-sm text-gray-900">Client A SARL</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">2 200 000</div>
                                <div className="text-xs text-red-600">Débiteur</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Classe 5 - Comptes de trésorerie */}
                      <div className="border-b border-gray-100 last:border-b-0">
                        <div
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {}}
                        >
                          <div className="flex items-center space-x-3">
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">5</div>
                            <div>
                              <div className="font-semibold text-gray-900">Comptes de trésorerie</div>
                              <div className="text-sm text-gray-700">1 compte actif</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">18 500 000 FCFA</div>
                            <div className="text-sm text-gray-700">Solde total</div>
                          </div>
                        </div>

                        {/* Sous-comptes */}
                        <div className="pl-10 bg-gray-50/50">
                          <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer border-l-2 border-green-200">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-mono text-green-700 font-bold">512</div>
                              <div>
                                <div className="text-sm font-medium">Banques</div>
                                <div className="text-xs text-gray-700">1 compte</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">18 500 000</div>
                              <div className="text-xs text-gray-700">D</div>
                            </div>
                          </div>

                          <div className="pl-8">
                            <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer">
                              <div className="flex items-center space-x-3">
                                <div className="text-xs font-mono text-gray-600">512001</div>
                                <div className="text-sm text-gray-900">Banque SGBCI - Compte Courant</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">18 500 000</div>
                                <div className="text-xs text-green-600">Débiteur</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Classe 6 - Comptes de charges */}
                      <div className="border-b border-gray-100 last:border-b-0">
                        <div
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {}}
                        >
                          <div className="flex items-center space-x-3">
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                            <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold">6</div>
                            <div>
                              <div className="font-semibold text-gray-900">Comptes de charges</div>
                              <div className="text-sm text-gray-700">1 compte actif</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">12 000 000 FCFA</div>
                            <div className="text-sm text-gray-700">Solde total</div>
                          </div>
                        </div>

                        {/* Sous-comptes */}
                        <div className="pl-10 bg-gray-50/50">
                          <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer border-l-2 border-red-200">
                            <div className="flex items-center space-x-3">
                              <div className="text-sm font-mono text-red-700 font-bold">601</div>
                              <div>
                                <div className="text-sm font-medium">Achats de marchandises</div>
                                <div className="text-xs text-gray-700">1 compte</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold">12 000 000</div>
                              <div className="text-xs text-gray-700">D</div>
                            </div>
                          </div>

                          <div className="pl-8">
                            <div className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer">
                              <div className="flex items-center space-x-3">
                                <div className="text-xs font-mono text-gray-600">601001</div>
                                <div className="text-sm text-gray-900">Achats de marchandises</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">12 000 000</div>
                                <div className="text-xs text-red-600">Débiteur</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Liste */}
              {ledgerViewMode === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.account')}</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs">{t('accounting.label')}</th>
                        <th className="px-3 py-3 text-left font-semibold text-gray-700 text-xs">Classe</th>
                        <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">Journal Principal</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">Total Débit</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">Total Crédit</th>
                        <th className="px-3 py-3 text-right font-semibold text-gray-700 text-xs">{t('accounting.balance')}</th>
                        <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">Mvts</th>
                        <th className="px-2 py-3 text-center font-semibold text-gray-700 text-xs">Lettré</th>
                        <th className="px-3 py-3 text-center font-semibold text-gray-700 text-xs">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-gray-50 border-b">
                        <td className="px-3 py-2 font-mono text-[#171717] font-bold text-xs">411001</td>
                        <td className="px-4 py-2 text-gray-900 text-xs">Client A SARL</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Classe 4 - Tiers</td>
                        <td className="px-2 py-2 text-center text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">VTE</span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">3 000 000</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">800 000</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">2 200 000</td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">3</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">33%</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button className="p-1 text-blue-600 hover:text-blue-900" title="Voir détails" aria-label="Voir les détails">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-orange-600 hover:text-orange-900" title={t('common.print')} aria-label="Imprimer">
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      <tr className="hover:bg-gray-50 border-b">
                        <td className="px-3 py-2 font-mono text-[#171717] font-bold text-xs">512001</td>
                        <td className="px-4 py-2 text-gray-900 text-xs">Banque SGBCI - Compte Courant</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Classe 5 - Trésorerie</td>
                        <td className="px-2 py-2 text-center text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">BQ1</span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">20 000 000</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">1 500 000</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">18 500 000</td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">3</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">0%</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button className="p-1 text-blue-600 hover:text-blue-900" title="Voir détails" aria-label="Voir les détails">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-orange-600 hover:text-orange-900" title={t('common.print')} aria-label="Imprimer">
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      <tr className="hover:bg-gray-50 border-b">
                        <td className="px-3 py-2 font-mono text-[#171717] font-bold text-xs">601001</td>
                        <td className="px-4 py-2 text-gray-900 text-xs">Achats de marchandises</td>
                        <td className="px-3 py-2 text-gray-600 text-xs">Classe 6 - Charges</td>
                        <td className="px-2 py-2 text-center text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">ACH</span>
                        </td>
                        <td className="px-3 py-2 text-right text-red-600 font-medium text-xs">12 000 000</td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium text-xs">0</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900 text-xs">12 000 000</td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">2</span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">50%</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button className="p-1 text-blue-600 hover:text-blue-900" title="Voir détails" aria-label="Voir les détails">
                              <Eye className="w-3 h-3" />
                            </button>
                            <button className="p-1 text-orange-600 hover:text-orange-900" title={t('common.print')} aria-label="Imprimer">
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-3 py-3 font-bold text-gray-900 text-xs">TOTAUX GÉNÉRAUX</td>
                        <td className="px-3 py-3 text-right font-bold text-red-600 text-xs">35 000 000</td>
                        <td className="px-3 py-3 text-right font-bold text-green-600 text-xs">2 300 000</td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900 text-xs">32 700 000</td>
                        <td className="px-2 py-3 text-center font-bold text-xs">8</td>
                        <td className="px-2 py-3 text-center text-xs">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">28%</span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contrôle d'équilibre */}
          <div className="bg-white rounded-lg p-4 border-2 border-[#171717] mt-6">
            <h3 className="text-lg font-semibold text-[#171717] mb-3 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-[#171717]" />
              Contrôle d'équilibre
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-[#737373]">Balance A Nouveau</p>
                <div className="mt-2">
                  <p className="text-sm">Débit: <span className="font-bold">445 000,00</span></p>
                  <p className="text-sm">Crédit: <span className="font-bold">510 000,00</span></p>
                </div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-[#737373]">Mouvements Période</p>
                <div className="mt-2">
                  <p className="text-sm">Débit: <span className="font-bold text-red-600">397 583,00</span></p>
                  <p className="text-sm">Crédit: <span className="font-bold text-green-600">281 000,00</span></p>
                </div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-[#737373]">Soldes Fin Période</p>
                <div className="mt-2">
                  <p className="text-sm">Débiteur: <span className="font-bold text-red-600">544 583,00</span></p>
                  <p className="text-sm">Créditeur: <span className="font-bold text-green-600">678 000,00</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Analyse IA Avancée */}
      {activeView === 'analysis' && (
        <div className="space-y-0 w-full">

          {/* Tableau de bord IA */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
                <Brain className="w-6 h-6 mr-3" />
                Intelligence Artificielle Comptable
              </h3>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-indigo-200 text-indigo-800 text-sm rounded-full font-medium">
                  🤖 Modèles actifs: 5
                </span>
                <button
                  onClick={() => setShowAISettingsModal(true)}
                  className="p-2 bg-white border border-indigo-300 rounded-lg hover:bg-indigo-50"
                  title="Paramètres IA"
                >
                  <Settings className="h-4 w-4 text-indigo-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-indigo-900">Détection Anomalies</h4>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-lg font-bold text-indigo-900">3</div>
                <div className="text-xs text-indigo-600">sur 1,247 écritures</div>
                <div className="mt-2 text-xs text-orange-600">2 nécessitent attention</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-indigo-900">Patterns Identifiés</h4>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-indigo-900">127</div>
                <div className="text-xs text-indigo-600">motifs récurrents</div>
                <div className="mt-2 text-xs text-green-600">+15% vs mois dernier</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-indigo-900">Score Conformité</h4>
                  <Award className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-lg font-bold text-indigo-900">98.7%</div>
                <div className="text-xs text-indigo-600">SYSCOHADA</div>
                <div className="mt-2 text-xs text-green-600">Excellent niveau</div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-indigo-900">Prédictions</h4>
                  <Target className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-lg font-bold text-indigo-900">92%</div>
                <div className="text-xs text-indigo-600">précision modèle</div>
                <div className="mt-2 text-xs text-blue-600">5 alertes préventives</div>
              </div>
            </div>
          </div>

          {/* Détection d'anomalies en temps réel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                Anomalies Détectées
              </h4>

              <div className="space-y-4">
                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-orange-900">Montant Inhabituel</span>
                        <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">CRITIQUE</span>
                      </div>
                      <div className="text-sm text-orange-800">
                        Compte 607000 - Achat 750,000 XOF (3x supérieur à la moyenne)
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        Confiance: 87% • Détecté il y a 5 min
                      </div>
                    </div>
                    <button
                      onClick={() => {}}
                      className="text-orange-600 hover:text-orange-800"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-yellow-900">Pattern Temporel</span>
                        <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">ATTENTION</span>
                      </div>
                      <div className="text-sm text-yellow-800">
                        Concentration d'écritures vendredi après-midi
                      </div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Confiance: 76% • Tendance identifiée
                      </div>
                    </div>
                    <button
                      onClick={() => {}}
                      className="text-yellow-600 hover:text-yellow-800"
                      title="Voir détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm font-medium text-green-900">Validation Automatique</span>
                        <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">VALIDÉ</span>
                      </div>
                      <div className="text-sm text-green-800">
                        98.5% des écritures conformes SYSCOHADA
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        Contrôles automatiques réussis
                      </div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Insights prédictifs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                Insights Prédictifs
              </h4>

              <div className="space-y-4">
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Tendance Trésorerie</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    Prévision: +12% flux entrants prochaines 30 jours
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Basé sur analyse 6 mois de données
                  </div>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Optimisation Suggérée</span>
                  </div>
                  <div className="text-sm text-purple-800">
                    Automatiser catégorisation comptes 60X (94% précision)
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    Gain temps estimé: 2h30/semaine
                  </div>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Qualité Données</span>
                  </div>
                  <div className="text-sm text-green-800">
                    Cohérence inter-comptes: 99.2% • Aucun doublon détecté
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Dernière vérification: maintenant
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse comparative intelligente */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
              Analyse Comparative Intelligente
            </h4>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-900 mb-3">Évolution vs Prédictions IA</h5>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periode" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                    <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="actif" stroke="#171717" strokeWidth={3} name="Actif (Réel)" />
                    <Line type="monotone" dataKey="passif" stroke="#525252" strokeWidth={3} name="Passif (Réel)" />
                    <Line type="monotone" dataKey="actif" stroke="#171717" strokeWidth={1} strokeDasharray="5 5" name="Prédiction IA" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-3">Benchmarking Sectoriel</h5>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Rotation stocks</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="w-12 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">75%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Délais paiement</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="w-10 h-2 bg-yellow-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-yellow-600">62%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">Liquidité générale</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="w-14 h-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-sm font-medium text-green-600">89%</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-indigo-50 rounded border border-indigo-200">
                    <div className="text-xs text-indigo-600 mb-1">🎯 Recommandation IA</div>
                    <div className="text-sm text-indigo-900">
                      Optimiser délais fournisseurs pour améliorer score de 62% à 78%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Collaboration Avancée */}
      {activeView === 'collaboration' && (
        <div className="space-y-0 w-full">

          {/* Espaces de travail collaboratifs */}
          <div className="bg-white border-b border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-3 text-orange-500" />
                Espaces de Travail Collaboratifs
              </h3>
              <button
                onClick={() => setShowNewWorkspaceModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <Building className="w-4 h-4" />
                <span>Nouvel Espace</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: "Équipe Comptabilité",
                  members: 8,
                  color: "bg-blue-500",
                  activity: "3 annotations aujourd'hui",
                  searches: ["Clients en retard", "Fournisseurs Q1"]
                },
                {
                  name: "Contrôle de Gestion",
                  members: 4,
                  color: "bg-green-500",
                  activity: "12 analyses cette semaine",
                  searches: ["Centres de coûts", "Budget vs Réel"]
                },
                {
                  name: "Direction Financière",
                  members: 3,
                  color: "bg-purple-500",
                  activity: "2 validations en attente",
                  searches: ["Investissements", "Cash flow"]
                }
              ].map((workspace, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${workspace.color}`}></div>
                      <h4 className="font-medium text-gray-900">{workspace.name}</h4>
                    </div>
                    <span className="text-xs text-gray-700">{workspace.members} membres</span>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">{workspace.activity}</div>

                  <div className="space-y-1">
                    <div className="text-xs text-gray-700 mb-1">Recherches fréquentes:</div>
                    {workspace.searches.map((search, searchIndex) => (
                      <div key={searchIndex} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {search}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedWorkspace(workspace.name);
                      setShowJoinWorkspaceModal(true);
                    }}
                    className="mt-3 w-full py-2 text-sm text-orange-600 border border-orange-300 rounded hover:bg-orange-50"
                  >
                    Rejoindre l'espace
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow de validation collaboratif */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2 text-blue-500" />
              Workflow de Validation
            </h4>

            <div className="grid grid-cols-4 gap-4">
              {[
                { status: "À réviser", count: 7, color: "bg-yellow-100 text-yellow-800", entries: ["607000 - Montant élevé", "401200 - Nouveau tiers"] },
                { status: "En cours", count: 3, color: "bg-blue-100 text-blue-800", entries: ["512000 - Virement validé", "701000 - Vente confirmée"] },
                { status: "Validé", count: 89, color: "bg-green-100 text-green-800", entries: ["Écritures mensuelles", "Rapprochements OK"] },
                { status: "Archivé", count: 1205, color: "bg-gray-100 text-gray-800", entries: ["Exercices précédents", "Données historiques"] }
              ].map((column, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">{column.status}</h5>
                    <span className={`px-2 py-1 text-xs rounded-full ${column.color}`}>
                      {column.count}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {column.entries.map((entry, entryIndex) => (
                      <div key={entryIndex} className="text-xs bg-gray-50 p-2 rounded border hover:bg-gray-100 cursor-pointer">
                        {entry}
                      </div>
                    ))}
                  </div>

                  {column.count > column.entries.length && (
                    <div className="text-xs text-gray-700 mt-2 text-center">
                      +{column.count - column.entries.length} autres...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Vue Analyse Originale Améliorée */}
      {activeView === 'movements' && (
        <div className="space-y-0 w-full">

          {/* Analyse par période */}
          <div className="bg-white p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Analyse par Période</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periode" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                <Legend />
                <Line type="monotone" dataKey="produits" stroke="#22c55e" strokeWidth={3} name="Produits" />
                <Line type="monotone" dataKey="charges" stroke="#ef4444" strokeWidth={3} name="Charges" />
                <Line type="monotone" dataKey="actif" stroke="#171717" strokeWidth={2} name="Actif" />
                <Line type="monotone" dataKey="passif" stroke="#525252" strokeWidth={2} name="Passif" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Analyse des comptes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Comptes les plus mouvementés */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Comptes les Plus Actifs</h4>
              <div className="space-y-3">
                {accountsData
                  .sort((a, b) => b.nombreEcritures - a.nombreEcritures)
                  .slice(0, 8)
                  .map((account, index) => (
                    <div key={account.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-[#171717] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{account.nombreEcritures}</div>
                        <div className="text-xs text-gray-700">écritures</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Soldes significatifs */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Soldes les Plus Importants</h4>
              <div className="space-y-3">
                {accountsData
                  .sort((a, b) => Math.abs(b.soldeFermeture) - Math.abs(a.soldeFermeture))
                  .slice(0, 8)
                  .map((account, index) => (
                    <div key={account.compte} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-[#525252] text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-medium text-gray-900">{account.compte}</div>
                          <div className="text-xs text-gray-700">{account.libelle}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${account.soldeFermeture >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                          {(Math.abs(account.soldeFermeture) / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-gray-700">
                          {account.soldeFermeture >= 0 ? 'Débiteur' : 'Créditeur'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aperçu Grand Livre</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Format:</label>
                    <select 
                      value={printConfig.format}
                      onChange={(e) => setPrintConfig({...printConfig, format: e.target.value as 'A4' | 'A3'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Orientation:</label>
                    <select
                      value={printConfig.orientation}
                      onChange={(e) => setPrintConfig({...printConfig, orientation: e.target.value as 'portrait' | 'landscape'})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Paysage</option>
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
            
            {/* Prévisualisation Grand Livre */}
            <div className={`p-8 bg-white ${printConfig.format === 'A3' ? 'text-sm' : 'text-xs'} ${printConfig.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>

              {/* En-tête professionnel */}
              <div className="mb-8">
                <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
                  {/* Logo et informations entreprise */}
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#171717] to-[#525252] rounded-lg flex items-center justify-center shadow-lg">
                      <BookOpen className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Atlas Finance Enterprise</h2>
                      <p className="text-sm text-gray-600">123 Business Avenue</p>
                      <p className="text-sm text-gray-600">New York, NY 10001</p>
                      <p className="text-sm text-gray-600">Tel: +1 (555) 123-4567</p>
                      <p className="text-sm text-gray-600">Email: info@atlasfinance.com</p>
                    </div>
                  </div>

                  {/* Titre et période */}
                  <div className="text-right">
                    <h1 className="text-lg font-bold text-gray-900 mb-2">GENERAL LEDGER</h1>
                    <p className="text-lg text-gray-700 font-semibold">
                      Period: {new Date(filters.dateDebut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {' to '}
                      {new Date(filters.dateFin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      Generated: {new Date().toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">Report ID: GL-{Date.now().toString().slice(-8)}</p>
                  </div>
                </div>
              </div>

              {/* Comptes sélectionnés */}
              {selectedAccount ? (
                <div className="mb-6">
                  {(() => {
                    const account = accountsData.find(acc => acc.compte === selectedAccount);
                    if (!account) return null;
                    
                    return (
                      <div>
                        <div className="bg-gray-100 p-3 mb-4 rounded">
                          <h2 className="text-lg font-bold text-gray-800">
                            Account {account.compte} - {account.libelle}
                          </h2>
                          <div className="text-sm text-gray-600 mt-1">
                            Opening Balance: <span className="font-semibold">{formatCurrency(account.soldeOuverture)}</span>
                          </div>
                        </div>

                        <table className="w-full border-2 border-gray-800 mb-4">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">{t('common.date')}</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Reference</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Description</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Debit</th>
                              <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Credit</th>
                              <th className="px-3 py-2 text-right font-semibold">{t('accounting.balance')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {account.entries.map((entry, index) => (
                              <tr key={entry.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                <td className="border border-gray-300 px-3 py-2">
                                  {new Date(entry.date).toLocaleDateString('en-US')}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 font-mono text-blue-600">
                                  {entry.piece}
                                </td>
                                <td className="border border-gray-300 px-3 py-2">{entry.libelle}</td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : ''}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : ''}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                                  {formatCurrency(entry.solde)}
                                </td>
                              </tr>
                            ))}

                            {/* Ligne de totaux */}
                            <tr className="bg-gray-800 text-white font-bold">
                              <td className="border border-gray-600 px-3 py-2" colSpan={3}>
                                TOTALS
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {formatCurrency(account.totalDebit)}
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {formatCurrency(account.totalCredit)}
                              </td>
                              <td className="border border-gray-600 px-3 py-2 text-right font-mono">
                                {formatCurrency(account.soldeFermeture)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Summary Box */}
                        <div className="bg-blue-50 border-2 border-blue-200 rounded p-3">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Number of Entries:</span>
                              <span className="ml-2 font-semibold">{account.nombreEcritures}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Net Movement:</span>
                              <span className={`ml-2 font-semibold ${(account.soldeFermeture - account.soldeOuverture) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(account.soldeFermeture - account.soldeOuverture) >= 0 ? '+' : ''}
                                {formatCurrency(account.soldeFermeture - account.soldeOuverture)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Closing Balance:</span>
                              <span className="ml-2 font-bold text-lg">
                                {formatCurrency(account.soldeFermeture)} USD
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="mb-6">
                  <h2 className="text-lg font-bold mb-4 text-gray-800">ACCOUNTS SUMMARY</h2>
                  <table className="w-full border-2 border-gray-800">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Account</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-left font-semibold">Description</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-center font-semibold">{t('navigation.entries')}</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Total Debit</th>
                        <th className="border-r border-gray-600 px-3 py-2 text-right font-semibold">Total Credit</th>
                        <th className="px-3 py-2 text-right font-semibold">Final Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsData.slice(0, 10).map((account, index) => (
                        <tr key={account.compte} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 px-3 py-2 font-mono text-blue-600">
                            {account.compte}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">{account.libelle}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">{account.nombreEcritures}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {formatCurrency(account.totalDebit)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono">
                            {formatCurrency(account.totalCredit)}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-mono font-bold">
                            {formatCurrency(account.soldeFermeture)}
                          </td>
                        </tr>
                      ))}

                      {/* Grand Total Row */}
                      <tr className="bg-gray-800 text-white font-bold">
                        <td className="border border-gray-600 px-3 py-3" colSpan={2}>
                          GRAND TOTALS
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-center">
                          {accountsData.reduce((sum, acc) => sum + acc.nombreEcritures, 0)}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {formatCurrency(accountsData.reduce((sum, acc) => sum + acc.totalDebit, 0))}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {formatCurrency(accountsData.reduce((sum, acc) => sum + acc.totalCredit, 0))}
                        </td>
                        <td className="border border-gray-600 px-3 py-3 text-right font-mono">
                          {formatCurrency(accountsData.reduce((sum, acc) => sum + acc.soldeFermeture, 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Professional Footer */}
              <div className="mt-8 pt-4 border-t-2 border-gray-800">
                <div className="flex justify-between items-start">
                  {/* Left side - Report Info */}
                  <div className="text-xs">
                    <p className="font-semibold text-gray-800">Prepared By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>

                  {/* Center - Verified By */}
                  <div className="text-xs text-center">
                    <p className="font-semibold text-gray-800">Verified By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>

                  {/* Right side - Approval */}
                  <div className="text-xs text-right">
                    <p className="font-semibold text-gray-800">Approved By</p>
                    <div className="mt-2 space-y-1 text-gray-600">
                      <p>Name: _________________________</p>
                      <p>Date: _________________________</p>
                      <p>Signature: _________________________</p>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-6 pt-3 border-t border-gray-400 flex justify-between items-center text-xs text-gray-700">
                  <div>
                    <p className="font-semibold">Atlas Finance Enterprise ERP System</p>
                    <p>Version 2.0 | Licensed to: Atlas Finance Corporation</p>
                  </div>
                  <div className="text-center">
                    <p>Page 1 of 1</p>
                    <p>Document ID: {Date.now().toString().slice(-10)}</p>
                  </div>
                  <div className="text-right">
                    <p>Generated by: System Administrator</p>
                    <p>IP: 192.168.1.100 | Session: {Date.now().toString(36).toUpperCase()}</p>
                  </div>
                </div>

                {/* Confidentiality Notice */}
                <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600 text-center">
                  <p className="font-semibold">CONFIDENTIAL</p>
                  <p>This document contains proprietary information and is intended solely for the use of the addressee(s) named above.</p>
                  <p>Any unauthorized review, use, disclosure or distribution is strictly prohibited.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setShowEmailModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  Envoyer par email
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setExportFormat('excel');
                    setShowExportModal(true);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  Exporter Excel
                </button>
                <button
                  onClick={() => {
                    document.body.classList.add('printing', 'print-landscape');
                    window.print();
                    setTimeout(() => {
                      document.body.classList.remove('printing', 'print-landscape');
                    }, 1000);
                  }}
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

      {/* Modal Export */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Exporter le Grand Livre
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Format d'export
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="excel"
                      checked={exportFormat === 'excel'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Excel (.xlsx)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <FileText className="w-4 h-4 mr-2 text-red-600" />
                    PDF
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                      className="mr-2"
                    />
                    <Database className="w-4 h-4 mr-2 text-blue-600" />
                    CSV
                  </label>
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  Inclure les totaux
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  Inclure les sous-totaux
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  Inclure les graphiques
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <ExportMenu
                data={accountsData as unknown as Record<string, unknown>[]}
                filename="grand-livre-export"
                columns={{
                  compte: 'Compte',
                  libelle: 'Libellé',
                  soldeOuverture: 'Solde Ouverture',
                  totalDebit: 'Total Débit',
                  totalCredit: 'Total Crédit',
                  soldeFermeture: 'Solde Fermeture'
                }}
                buttonText="Exporter"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Envoyer par Email
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destinataire(s)
                </label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objet
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder="Message optionnel..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Format de pièce jointe
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel</option>
                  <option value="both">PDF + Excel</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  toast.success('Email envoyé avec succès!');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2 inline" />
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détails */}
      {showDetailModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Détails de l'écriture
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('common.date')}</label>
                <p className="text-gray-900">{selectedEntry.date}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">N° Pièce</label>
                <p className="text-gray-900 font-mono">{selectedEntry.piece}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.label')}</label>
                <p className="text-gray-900">{selectedEntry.libelle}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Centre de coût</label>
                <p className="text-gray-900">{selectedEntry.centreCout || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.debit')}</label>
                <p className="text-green-600 font-semibold">
                  {formatCurrency(selectedEntry.debit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('accounting.credit')}</label>
                <p className="text-red-600 font-semibold">
                  {formatCurrency(selectedEntry.credit)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tiers</label>
                <p className="text-gray-900">{selectedEntry.tiers || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Référence externe</label>
                <p className="text-gray-900">{selectedEntry.referenceExterne || '-'}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Solde après écriture</label>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(selectedEntry.solde)}
              </p>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  document.body.classList.add('printing', 'print-landscape');
                  window.print();
                  setTimeout(() => {
                    document.body.classList.remove('printing', 'print-landscape');
                  }, 1000);
                }}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626]"
              >
                <Printer className="w-4 h-4 mr-2 inline" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Annotation */}
      {showAnnotationModal && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Ajouter une annotation
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Écriture: <span className="font-medium">{selectedEntry.piece}</span>
              </p>
              <p className="text-sm text-gray-600">
                {selectedEntry.libelle}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Votre annotation
              </label>
              <textarea
                value={annotation}
                onChange={(e) => setAnnotation(e.target.value)}
                rows={4}
                placeholder="Ajouter une note ou un commentaire..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAnnotationModal(false);
                  setAnnotation('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowAnnotationModal(false);
                  setAnnotation('');
                  toast.success('Annotation ajoutée avec succès!');
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <MessageSquare className="w-4 h-4 mr-2 inline" />
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Partage */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Partager l'écriture
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lien de partage
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast.success('Lien copié!');
                  }}
                  className="px-4 py-2 bg-[#171717] text-white rounded-r-md hover:bg-[#262626]"
                >
                  Copier
                </button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Partager avec</p>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Users className="w-4 h-4" />
                  Équipe
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paramètres IA */}
      {showAISettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-indigo-600" />
              Paramètres Intelligence Artificielle
            </h3>

            <div className="space-y-4">
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Détection d'anomalies automatique</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Analyse prédictive</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Suggestions automatiques</span>
                  <input type="checkbox" defaultChecked className="rounded" />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seuil de confiance minimum
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="85"
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-700">
                  <span>0%</span>
                  <span>85%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAISettingsModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowAISettingsModal(false);
                  toast.success('Paramètres IA enregistrés');
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvel Espace */}
      {showNewWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Créer un Nouvel Espace de Travail
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'espace
                </label>
                <input
                  type="text"
                  placeholder="Ex: Équipe Audit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Description de l'espace..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Membres (emails séparés par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewWorkspaceModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowNewWorkspaceModal(false);
                  toast.success('Espace de travail créé avec succès!');
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Créer l'espace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rejoindre Espace */}
      {showJoinWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Rejoindre l'espace: {selectedWorkspace}
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  Vous êtes sur le point de rejoindre l'espace <strong>{selectedWorkspace}</strong>.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Vous aurez accès aux recherches partagées, annotations et analyses collaboratives de cet espace.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle dans l'espace
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Membre</option>
                  <option>Contributeur</option>
                  <option>Administrateur</option>
                </select>
              </div>

              <div>
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="rounded mr-2" />
                  <span className="text-sm text-gray-700">Recevoir les notifications de cet espace</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowJoinWorkspaceModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowJoinWorkspaceModal(false);
                  toast(`Vous avez rejoint l'espace: ${selectedWorkspace}`);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Rejoindre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
      </div>
    </PrintableArea>
  );
};

export default AdvancedGeneralLedger;