/**
 * ReportBuilderPage — Interface de création et personnalisation de rapports
 * Accessible via /reporting/builder
 * Flux simple : Sources → Configuration → Aperçu → Export
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowLeft, FileText, Database, BarChart3, Table2, PieChart,
  Plus, X, Check, ChevronDown, ChevronRight, Download, Eye,
  Settings, Sparkles, Calendar, Filter, Columns, SortAsc,
  FileSpreadsheet, Users, TrendingUp, Layers, Printer,
  Save, RefreshCw, AlertCircle, CheckCircle, Search,
  LayoutTemplate, GripVertical, Trash2, Edit3, Copy,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// TYPES
// ============================================================================

interface ReportColumn {
  id: string;
  field: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency';
  visible: boolean;
  width?: number;
  format?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

interface ReportFilter {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: string;
}

interface ReportGroup {
  field: string;
  label: string;
}

interface ReportConfig {
  title: string;
  description: string;
  type: 'table' | 'chart' | 'mixed';
  chartType?: 'bar' | 'line' | 'pie' | 'area';
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroup[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  showTotals: boolean;
  showSubtotals: boolean;
  period: { start: string; end: string };
}

type BuilderStep = 'sources' | 'config' | 'preview';

// ============================================================================
// DONNÉES SOURCES DISPONIBLES
// ============================================================================

const AVAILABLE_SOURCES = [
  { id: 'journal', name: 'Écritures comptables', icon: FileText, description: 'Grand livre, journaux, mouvements', rowCount: 'Toutes les écritures validées', category: 'Comptabilité' },
  { id: 'balance', name: 'Balance générale', icon: Table2, description: 'Soldes par compte', rowCount: 'Tous les comptes actifs', category: 'Comptabilité' },
  { id: 'tiers', name: 'Tiers (Clients/Fournisseurs)', icon: Users, description: 'Base clients et fournisseurs', rowCount: 'Tous les tiers', category: 'Tiers' },
  { id: 'tresorerie', name: 'Positions de trésorerie', icon: TrendingUp, description: 'Soldes bancaires, cash-flow', rowCount: 'Comptes 52x/53x', category: 'Trésorerie' },
  { id: 'immobilisations', name: 'Immobilisations', icon: Layers, description: 'Registre des biens, amortissements', rowCount: 'Tous les biens actifs', category: 'Immobilisations' },
  { id: 'budget', name: 'Budget vs Réalisé', icon: BarChart3, description: 'Analyse des écarts budgétaires', rowCount: 'Lignes budgétaires', category: 'Budget' },
];

const COLUMN_PRESETS: Record<string, ReportColumn[]> = {
  journal: [
    { id: 'date', field: 'date', label: 'Date', type: 'date', visible: true },
    { id: 'journal', field: 'journal', label: 'Journal', type: 'text', visible: true },
    { id: 'entry_number', field: 'entryNumber', label: 'N° Pièce', type: 'text', visible: true },
    { id: 'account_code', field: 'accountCode', label: 'Compte', type: 'text', visible: true },
    { id: 'account_name', field: 'accountName', label: 'Libellé compte', type: 'text', visible: true },
    { id: 'label', field: 'label', label: 'Libellé', type: 'text', visible: true },
    { id: 'debit', field: 'debit', label: 'Débit', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'credit', field: 'credit', label: 'Crédit', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'third_party', field: 'thirdPartyName', label: 'Tiers', type: 'text', visible: false },
    { id: 'reference', field: 'reference', label: 'Référence', type: 'text', visible: false },
  ],
  balance: [
    { id: 'account_code', field: 'accountCode', label: 'Compte', type: 'text', visible: true },
    { id: 'account_name', field: 'accountName', label: 'Libellé', type: 'text', visible: true },
    { id: 'class', field: 'accountClass', label: 'Classe', type: 'text', visible: true },
    { id: 'total_debit', field: 'totalDebit', label: 'Total Débit', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'total_credit', field: 'totalCredit', label: 'Total Crédit', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'solde_debit', field: 'soldeDebiteur', label: 'Solde Débiteur', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'solde_credit', field: 'soldeCrediteur', label: 'Solde Créditeur', type: 'currency', visible: true, aggregation: 'sum' },
  ],
  tiers: [
    { id: 'code', field: 'code', label: 'Code', type: 'text', visible: true },
    { id: 'name', field: 'name', label: 'Nom', type: 'text', visible: true },
    { id: 'type', field: 'type', label: 'Type', type: 'text', visible: true },
    { id: 'balance', field: 'balance', label: 'Solde', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'email', field: 'email', label: 'Email', type: 'text', visible: false },
    { id: 'phone', field: 'phone', label: 'Téléphone', type: 'text', visible: false },
  ],
  tresorerie: [
    { id: 'account_code', field: 'accountCode', label: 'Compte', type: 'text', visible: true },
    { id: 'account_name', field: 'accountName', label: 'Banque', type: 'text', visible: true },
    { id: 'solde', field: 'soldeComptable', label: 'Solde', type: 'currency', visible: true, aggregation: 'sum' },
  ],
  immobilisations: [
    { id: 'code', field: 'code', label: 'Code', type: 'text', visible: true },
    { id: 'name', field: 'name', label: 'Désignation', type: 'text', visible: true },
    { id: 'category', field: 'category', label: 'Catégorie', type: 'text', visible: true },
    { id: 'acquisition_date', field: 'acquisitionDate', label: 'Date acquisition', type: 'date', visible: true },
    { id: 'acquisition_value', field: 'acquisitionValue', label: 'Valeur brute', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'depreciation', field: 'cumulDepreciation', label: 'Amort. cumulés', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'vnc', field: 'vnc', label: 'VNC', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'status', field: 'status', label: 'Statut', type: 'text', visible: true },
  ],
  budget: [
    { id: 'account_code', field: 'accountCode', label: 'Compte', type: 'text', visible: true },
    { id: 'period', field: 'period', label: 'Période', type: 'text', visible: true },
    { id: 'budgeted', field: 'budgeted', label: 'Budget', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'actual', field: 'actual', label: 'Réalisé', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'ecart', field: 'ecart', label: 'Écart', type: 'currency', visible: true, aggregation: 'sum' },
    { id: 'ecart_pct', field: 'ecartPercent', label: 'Écart %', type: 'number', visible: true },
  ],
};

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

const ReportBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear().toString();

  // Step
  const [currentStep, setCurrentStep] = useState<BuilderStep>('sources');

  // Sources
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // Config
  const [config, setConfig] = useState<ReportConfig>({
    title: '',
    description: '',
    type: 'table',
    columns: [],
    filters: [],
    groupBy: [],
    sortBy: '',
    sortDirection: 'asc',
    showTotals: true,
    showSubtotals: false,
    period: { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` },
  });

  // UI state
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showFilterForm, setShowFilterForm] = useState(false);

  // Derived
  const primarySource = selectedSources[0] || '';
  const availableColumns = useMemo(() => COLUMN_PRESETS[primarySource] || [], [primarySource]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter(s => s !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
      // Auto-load columns from first source
      if (selectedSources.length === 0 && COLUMN_PRESETS[sourceId]) {
        setConfig(prev => ({ ...prev, columns: COLUMN_PRESETS[sourceId] }));
      }
    }
  };

  const toggleColumn = (columnId: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === columnId ? { ...c, visible: !c.visible } : c),
    }));
  };

  const addFilter = () => {
    const fields = config.columns.filter(c => c.visible);
    if (fields.length === 0) return;
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, { id: `f-${Date.now()}`, field: fields[0].field, operator: 'contains', value: '' }],
    }));
  };

  const removeFilter = (filterId: string) => {
    setConfig(prev => ({ ...prev, filters: prev.filters.filter(f => f.id !== filterId) }));
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setConfig(prev => ({ ...prev, filters: prev.filters.map(f => f.id === filterId ? { ...f, ...updates } : f) }));
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' FCFA';

  const canProceed = () => {
    if (currentStep === 'sources') return selectedSources.length > 0;
    if (currentStep === 'config') return config.title.trim() !== '' && config.columns.some(c => c.visible);
    return true;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/reporting/custom')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Créer un rapport personnalisé</h1>
                <p className="text-sm text-gray-500">Sélectionnez vos données, configurez et prévisualisez</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentStep === 'preview' && (
                <>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Printer className="w-4 h-4" />Imprimer
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    <Download className="w-4 h-4" />Exporter
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90">
                    <Save className="w-4 h-4" />Enregistrer
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1 mt-4">
            {[
              { key: 'sources', label: '1. Sources de données', icon: Database },
              { key: 'config', label: '2. Configuration', icon: Settings },
              { key: 'preview', label: '3. Aperçu & Export', icon: Eye },
            ].map((step, i) => (
              <React.Fragment key={step.key}>
                {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
                <button
                  onClick={() => {
                    if (step.key === 'sources') setCurrentStep('sources');
                    else if (step.key === 'config' && selectedSources.length > 0) setCurrentStep('config');
                    else if (step.key === 'preview' && config.title) setCurrentStep('preview');
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    currentStep === step.key
                      ? 'bg-[#171717] text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  <step.icon className="w-4 h-4" />
                  {step.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ================================================================ */}
        {/* STEP 1: SOURCES */}
        {/* ================================================================ */}
        {currentStep === 'sources' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Choisissez vos sources de données</h2>
              <p className="text-sm text-gray-500 mb-6">Sélectionnez une ou plusieurs sources pour construire votre rapport.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {AVAILABLE_SOURCES.map(source => {
                  const isSelected = selectedSources.includes(source.id);
                  const Icon = source.icon;
                  return (
                    <button
                      key={source.id}
                      onClick={() => toggleSource(source.id)}
                      className={cn(
                        'text-left p-5 rounded-xl border-2 transition-all',
                        isSelected
                          ? 'border-[#171717] bg-gray-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                          isSelected ? 'bg-[#171717] text-white' : 'bg-gray-100 text-gray-600')}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-green-500" />}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{source.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{source.description}</p>
                      <span className="text-xs text-gray-400">{source.rowCount}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Période */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />Période du rapport
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Du</label>
                  <input type="date" value={config.period.start}
                    onChange={e => setConfig(prev => ({ ...prev, period: { ...prev.period, start: e.target.value } }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Au</label>
                  <input type="date" value={config.period.end}
                    onChange={e => setConfig(prev => ({ ...prev, period: { ...prev.period, end: e.target.value } }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Next */}
            <div className="flex justify-end">
              <button onClick={() => { setCurrentStep('config'); if (config.columns.length === 0 && primarySource) setConfig(prev => ({ ...prev, columns: COLUMN_PRESETS[primarySource] || [] })); }}
                disabled={!canProceed()} className={cn('flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
                  canProceed() ? 'bg-[#171717] text-white hover:bg-[#171717]/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
                Suivant<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 2: CONFIG */}
        {/* ================================================================ */}
        {currentStep === 'config' && (
          <div className="space-y-6">
            {/* Titre et description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du rapport</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre du rapport *</label>
                  <input type="text" value={config.title} onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Grand Livre Exercice 2025" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
                  <textarea value={config.description} onChange={e => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description ou notes..." rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            </div>

            {/* Type de rendu */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Type de rendu</h3>
              <div className="flex gap-3">
                {[
                  { key: 'table', label: 'Tableau', icon: Table2 },
                  { key: 'chart', label: 'Graphique', icon: BarChart3 },
                  { key: 'mixed', label: 'Mixte', icon: LayoutTemplate },
                ].map(opt => (
                  <button key={opt.key} onClick={() => setConfig(prev => ({ ...prev, type: opt.key as ReportConfig['type'] }))}
                    className={cn('flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all',
                      config.type === opt.key ? 'border-[#171717] bg-gray-50' : 'border-gray-200 hover:border-gray-400')}>
                    <opt.icon className="w-5 h-5" /><span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
              {(config.type === 'chart' || config.type === 'mixed') && (
                <div className="mt-4 flex gap-3">
                  {[
                    { key: 'bar', label: 'Barres' },
                    { key: 'line', label: 'Lignes' },
                    { key: 'pie', label: 'Camembert' },
                    { key: 'area', label: 'Aires' },
                  ].map(ct => (
                    <button key={ct.key} onClick={() => setConfig(prev => ({ ...prev, chartType: ct.key as ReportConfig['chartType'] }))}
                      className={cn('px-4 py-2 rounded-lg border text-sm',
                        config.chartType === ct.key ? 'border-[#171717] bg-gray-50 font-medium' : 'border-gray-200 hover:border-gray-400')}>
                      {ct.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Colonnes */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Columns className="w-4 h-4" />Colonnes</h3>
                <span className="text-sm text-gray-500">{config.columns.filter(c => c.visible).length} colonnes visibles</span>
              </div>
              <div className="space-y-2">
                {config.columns.map(col => (
                  <div key={col.id} className={cn('flex items-center justify-between p-3 rounded-lg border transition-colors',
                    col.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100')}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleColumn(col.id)}
                        className={cn('w-5 h-5 rounded border-2 flex items-center justify-center',
                          col.visible ? 'bg-[#171717] border-[#171717]' : 'border-gray-300')}>
                        {col.visible && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={cn('text-sm font-medium', col.visible ? 'text-gray-900' : 'text-gray-400')}>{col.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{col.type}</span>
                    </div>
                    {col.visible && col.type === 'currency' && (
                      <select value={col.aggregation || 'sum'}
                        onChange={e => setConfig(prev => ({ ...prev, columns: prev.columns.map(c => c.id === col.id ? { ...c, aggregation: e.target.value as ReportColumn['aggregation'] } : c) }))}
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white">
                        <option value="sum">Somme</option><option value="avg">Moyenne</option><option value="count">Nombre</option><option value="none">Aucun</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Filtres */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Filter className="w-4 h-4" />Filtres</h3>
                <button onClick={addFilter} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  <Plus className="w-4 h-4" />Ajouter un filtre
                </button>
              </div>
              {config.filters.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun filtre — toutes les données seront affichées</p>
              ) : (
                <div className="space-y-3">
                  {config.filters.map(filter => (
                    <div key={filter.id} className="flex items-center gap-3">
                      <select value={filter.field} onChange={e => updateFilter(filter.id, { field: e.target.value })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white flex-1">
                        {config.columns.filter(c => c.visible).map(c => (<option key={c.id} value={c.field}>{c.label}</option>))}
                      </select>
                      <select value={filter.operator} onChange={e => updateFilter(filter.id, { operator: e.target.value as ReportFilter['operator'] })}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="contains">Contient</option><option value="equals">Égal à</option><option value="gt">Supérieur à</option><option value="lt">Inférieur à</option>
                      </select>
                      <input type="text" value={filter.value} onChange={e => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Valeur..." className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1" />
                      <button onClick={() => removeFilter(filter.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Options</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Afficher les totaux</span>
                  <input type="checkbox" checked={config.showTotals} onChange={e => setConfig(prev => ({ ...prev, showTotals: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300" />
                </label>
                <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Afficher les sous-totaux</span>
                  <input type="checkbox" checked={config.showSubtotals} onChange={e => setConfig(prev => ({ ...prev, showSubtotals: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300" />
                </label>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep('sources')} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-4 h-4" />Retour
              </button>
              <button onClick={() => setCurrentStep('preview')} disabled={!canProceed()}
                className={cn('flex items-center gap-2 px-6 py-3 rounded-lg font-medium',
                  canProceed() ? 'bg-[#171717] text-white hover:bg-[#171717]/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}>
                <Eye className="w-4 h-4" />Aperçu<ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* STEP 3: PREVIEW */}
        {/* ================================================================ */}
        {currentStep === 'preview' && (
          <div className="space-y-6">
            {/* Report header */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{config.title || 'Rapport sans titre'}</h2>
              {config.description && <p className="text-gray-500 mb-2">{config.description}</p>}
              <p className="text-sm text-gray-400">
                Période : {new Date(config.period.start).toLocaleDateString('fr-FR')} — {new Date(config.period.end).toLocaleDateString('fr-FR')}
              </p>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
                <span>Sources : {selectedSources.map(s => AVAILABLE_SOURCES.find(a => a.id === s)?.name).join(', ')}</span>
                <span>•</span>
                <span>{config.columns.filter(c => c.visible).length} colonnes</span>
                <span>•</span>
                <span>{config.filters.length} filtre{config.filters.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Preview table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {config.columns.filter(c => c.visible).map(col => (
                        <th key={col.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={config.columns.filter(c => c.visible).length} className="px-4 py-12 text-center text-gray-400">
                      <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">Aperçu du rapport</p>
                      <p className="text-xs mt-1">Les données seront chargées depuis vos écritures comptables lors de l'export</p>
                    </td></tr>
                  </tbody>
                  {config.showTotals && (
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                        {config.columns.filter(c => c.visible).map((col, i) => (
                          <td key={col.id} className="px-4 py-3 text-sm">
                            {i === 0 ? 'TOTAL' : col.aggregation === 'sum' ? '—' : ''}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <button onClick={() => setCurrentStep('config')} className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-4 h-4" />Modifier la configuration
              </button>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Download className="w-4 h-4" />Exporter Excel
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Printer className="w-4 h-4" />Exporter PDF
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90">
                  <Save className="w-4 h-4" />Enregistrer le rapport
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportBuilderPage;
