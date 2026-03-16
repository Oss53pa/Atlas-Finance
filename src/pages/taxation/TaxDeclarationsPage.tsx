// @ts-nocheck
/**
 * TaxDeclarationsPage — Déclarations Fiscales
 *
 * Connecté au moteur de détection automatique TaxDetectionEngine.
 * Les taxes sont détectées depuis les comptes SYSCOHADA actifs.
 * Les paramètres des taxes sont gérés dans Admin → Registre Fiscal.
 *
 * Fonctionnalités :
 * 1. Détection automatique des taxes depuis les écritures comptables
 * 2. Calcul des montants (TVA, IS, IRPP, CNPS, RAS, etc.)
 * 3. Workflow : draft → calculated → validated → declared → paid
 * 4. Alertes retard / échéances
 * 5. Détail par déclaration avec écritures sources
 */
import React, { useState, useMemo, useCallback } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TaxDetectionEngine } from '../../services/fiscal/TaxDetectionEngine';
import { seedTaxRegistryCI, seedIRPPBracketsCI } from '../../services/fiscal/taxRegistrySeeds';
import type { DBTaxDeclaration, DBTaxRegistry } from '../../lib/db';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CalculatorIcon,
  BoltIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const TaxDeclarationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<DBTaxDeclaration | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDetectionPanel, setShowDetectionPanel] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Period selector
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const periodStart = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const periodEnd = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

  // Load tax registry
  const { data: taxRegistry = [], isLoading: loadingRegistry } = useQuery({
    queryKey: ['tax-registry'],
    queryFn: () => adapter.getAll<DBTaxRegistry>('taxRegistry'),
  });

  // Load declarations from Dexie
  const { data: declarations = [], isLoading: loadingDeclarations } = useQuery({
    queryKey: ['tax-declarations'],
    queryFn: () => adapter.getAll<DBTaxDeclaration>('taxDeclarations'),
  });

  // Detection results
  const { data: detectionResults = [], isLoading: loadingDetection, refetch: refetchDetection } = useQuery({
    queryKey: ['tax-detection', periodStart, periodEnd],
    queryFn: async () => {
      if (taxRegistry.length === 0) return [];
      const engine = new TaxDetectionEngine(adapter, 'CI');
      return engine.detectTaxesFromAccounts(periodStart, periodEnd);
    },
    enabled: taxRegistry.length > 0,
  });

  // Get unique tax codes from registry for filter
  const taxTypes = useMemo(() => {
    const types = new Map<string, string>();
    for (const t of taxRegistry) types.set(t.taxCode, t.taxShortName);
    return [...types.entries()];
  }, [taxRegistry]);

  // Filter declarations
  const filteredDeclarations = useMemo(() => {
    return declarations
      .filter(d => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (!d.taxCode.toLowerCase().includes(term) && !d.periodLabel?.toLowerCase().includes(term)) return false;
        }
        if (selectedType !== 'all' && d.taxCode !== selectedType) return false;
        if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
        if (selectedCategory !== 'all') {
          const reg = taxRegistry.find(r => r.taxCode === d.taxCode);
          if (reg && reg.taxCategory !== selectedCategory) return false;
        }
        return true;
      })
      .sort((a, b) => b.periodStart.localeCompare(a.periodStart));
  }, [declarations, searchTerm, selectedType, selectedStatus, selectedCategory, taxRegistry]);

  const paginatedDeclarations = filteredDeclarations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredDeclarations.length / itemsPerPage);
  const isLoading = loadingRegistry || loadingDeclarations;

  // Stats
  const totalAmount = filteredDeclarations.reduce((s, d) => s + (d.netTax || 0), 0);
  const totalPaid = filteredDeclarations.filter(d => d.status === 'paid').reduce((s, d) => s + (d.netTax || 0), 0);
  const totalPending = totalAmount - totalPaid;
  const overdueCount = filteredDeclarations.filter(d =>
    d.declarationDeadline && new Date(d.declarationDeadline) < new Date() && d.status !== 'paid' && d.status !== 'declared'
  ).length;

  // Triggered taxes from detection
  const triggeredTaxes = detectionResults.filter(r => r.isTriggered);
  const overdueTaxes = triggeredTaxes.filter(r => r.isOverdue);
  const dueSoonTaxes = triggeredTaxes.filter(r => !r.isOverdue && (r.daysUntilDeadline ?? 999) <= 7);

  // ── Actions ─────────────────────────────────────────────────

  const handleCalculateAll = useCallback(async () => {
    if (taxRegistry.length === 0) {
      toast.error('Aucune taxe configurée. Allez dans Admin → Registre Fiscal pour initialiser.');
      return;
    }
    setIsCalculating(true);
    try {
      const engine = new TaxDetectionEngine(adapter, 'CI');
      const results = await engine.detectTaxesFromAccounts(periodStart, periodEnd);
      let count = 0;
      for (const r of results) {
        if (r.isTriggered && r.amounts) {
          await engine.createDeclaration(r.tax, periodStart, periodEnd, r.amounts);
          count++;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
      await refetchDetection();
      toast.success(`${count} déclaration(s) calculée(s) pour ${MONTHS[selectedMonth - 1]} ${selectedYear}`);
    } catch (err) {
      toast.error('Erreur lors du calcul: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCalculating(false);
    }
  }, [adapter, taxRegistry, periodStart, periodEnd, selectedMonth, selectedYear, queryClient, refetchDetection]);

  const handleStatusChange = useCallback(async (decl: DBTaxDeclaration, newStatus: string) => {
    const now = new Date().toISOString();
    const updates: Partial<DBTaxDeclaration> = { status: newStatus as DBTaxDeclaration['status'], updatedAt: now };
    if (newStatus === 'declared') updates.declaredAt = now;
    if (newStatus === 'paid') updates.paidAt = now;
    await adapter.update('taxDeclarations', decl.id, updates);
    await queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
    toast.success(`Déclaration ${decl.taxCode} → ${newStatus}`);
  }, [adapter, queryClient]);

  const handleSeedRegistry = useCallback(async () => {
    await seedTaxRegistryCI(adapter);
    await seedIRPPBracketsCI(adapter);
    await queryClient.invalidateQueries({ queryKey: ['tax-registry'] });
    toast.success('15 taxes CI initialisées dans le registre');
  }, [adapter, queryClient]);

  const handleDelete = useCallback(async (id: string) => {
    await adapter.delete('taxDeclarations', id);
    await queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
    toast.success('Déclaration supprimée');
  }, [adapter, queryClient]);

  // ── Helpers ─────────────────────────────────────────────────

  const getTaxName = (code: string) => {
    const reg = taxRegistry.find(r => r.taxCode === code);
    return reg?.taxShortName || code;
  };

  const getTypeColor = (code: string) => {
    const reg = taxRegistry.find(r => r.taxCode === code);
    switch (reg?.taxCategory) {
      case 'INDIRECT': return 'bg-blue-100 text-blue-800';
      case 'DIRECT': return 'bg-purple-100 text-purple-800';
      case 'SOCIAL': return 'bg-green-100 text-green-800';
      case 'RETENUE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'declared': return 'bg-indigo-100 text-indigo-800';
      case 'validated': return 'bg-blue-100 text-blue-800';
      case 'calculated': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payée';
      case 'declared': return 'Déclarée';
      case 'validated': return 'Validée';
      case 'calculated': return 'Calculée';
      case 'draft': return 'Brouillon';
      case 'overdue': return 'En retard';
      case 'rectified': return 'Rectifiée';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'declared': return <DocumentArrowDownIcon className="h-4 w-4 text-indigo-600" />;
      case 'validated': return <CheckCircleIcon className="h-4 w-4 text-blue-600" />;
      case 'calculated': return <CalculatorIcon className="h-4 w-4 text-yellow-600" />;
      case 'draft': return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
      case 'overdue': return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
      default: return <DocumentTextIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Déclarations Fiscales</h1>
          <p className="text-gray-600">Détection automatique et calcul depuis les comptes SYSCOHADA</p>
        </div>
        <div className="flex space-x-3">
          {taxRegistry.length === 0 && (
            <button
              onClick={handleSeedRegistry}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <BoltIcon className="h-5 w-5" />
              <span>Initialiser taxes CI</span>
            </button>
          )}
          <button
            onClick={handleCalculateAll}
            disabled={isCalculating || taxRegistry.length === 0}
            className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {isCalculating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CalculatorIcon className="h-5 w-5" />}
            <span>Calculer {MONTHS[selectedMonth - 1]} {selectedYear}</span>
          </button>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(overdueTaxes.length > 0 || dueSoonTaxes.length > 0) && (
        <div className="space-y-2">
          {overdueTaxes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-red-800">{overdueTaxes.length} déclaration(s) EN RETARD : </span>
                <span className="text-red-700">{overdueTaxes.map(r => r.tax.taxShortName).join(', ')}</span>
              </div>
            </div>
          )}
          {dueSoonTaxes.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-orange-800">{dueSoonTaxes.length} déclaration(s) dues sous 7 jours : </span>
                <span className="text-orange-700">{dueSoonTaxes.map(r => `${r.tax.taxShortName} (J-${r.daysUntilDeadline})`).join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Déclarations</p>
          <p className="text-xl font-bold text-gray-900">{filteredDeclarations.length}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total dû</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Payé</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">En attente</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">En retard</p>
          <p className="text-xl font-bold text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Détection automatique — panneau dépliable */}
      {triggeredTaxes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <button
            onClick={() => setShowDetectionPanel(!showDetectionPanel)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <BoltIcon className="h-5 w-5 text-primary" />
              <span className="font-medium text-gray-900">
                {triggeredTaxes.length} taxe(s) détectée(s) pour {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <ChevronDownIcon className={`h-5 w-5 text-gray-500 transition-transform ${showDetectionPanel ? 'rotate-180' : ''}`} />
          </button>
          {showDetectionPanel && (
            <div className="border-t border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {triggeredTaxes.map(r => (
                  <div key={r.tax.taxCode} className={`p-3 rounded-lg border ${r.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-gray-900">{r.tax.taxShortName}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getTypeColor(r.tax.taxCode)}`}>{r.tax.taxCategory}</span>
                      </div>
                      {r.isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Retard</span>}
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Montant :</span>
                        <span className="font-medium">{r.amounts?.net != null ? formatCurrency(r.amounts.net) : 'Manuel'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Échéance :</span>
                        <span className={r.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                          {r.declarationDeadline ? new Date(r.declarationDeadline).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Formule :</span>
                        <span className="text-gray-700 text-xs">{r.tax.formula}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sélecteur de période + Filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
          <div className="flex items-center space-x-3">
            {/* Période */}
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <div className="relative ml-3">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <FunnelIcon className="h-4 w-4" />
              <span>Filtres</span>
            </button>
          </div>

          <button
            onClick={() => { toast.success('Export CSV en cours...'); }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-1 text-sm transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">Toutes les taxes</option>
              {taxTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">Toutes catégories</option>
              <option value="INDIRECT">Indirect (TVA, etc.)</option>
              <option value="DIRECT">Direct (IS, IRPP, etc.)</option>
              <option value="SOCIAL">Social (CNPS, CMU, etc.)</option>
              <option value="RETENUE">Retenues à la source</option>
              <option value="AUTRE">Autre</option>
            </select>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="calculated">Calculée</option>
              <option value="validated">Validée</option>
              <option value="declared">Déclarée</option>
              <option value="paid">Payée</option>
              <option value="overdue">En retard</option>
            </select>
          </div>
        )}
      </div>

      {/* Tableau des déclarations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Taxe</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Période</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Échéance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Base</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Montant dû</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : paginatedDeclarations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {taxRegistry.length === 0
                      ? 'Aucune taxe configurée. Cliquez sur "Initialiser taxes CI" pour commencer.'
                      : `Aucune déclaration. Cliquez sur "Calculer ${MONTHS[selectedMonth - 1]} ${selectedYear}" pour détecter les taxes.`}
                  </td>
                </tr>
              ) : (
                paginatedDeclarations.map(decl => {
                  const isOver = decl.declarationDeadline && new Date(decl.declarationDeadline) < new Date() && decl.status !== 'paid' && decl.status !== 'declared';
                  return (
                    <tr key={decl.id} className={`hover:bg-gray-50 ${isOver ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(decl.taxCode)}`}>
                            {getTaxName(decl.taxCode)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{decl.periodLabel}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(isOver ? 'overdue' : decl.status)}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(isOver ? 'overdue' : decl.status)}`}>
                            {isOver ? 'En retard' : getStatusLabel(decl.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {decl.declarationDeadline ? (
                          <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-900'}>
                            {new Date(decl.declarationDeadline).toLocaleDateString('fr-FR')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {decl.base ? formatCurrency(decl.base) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        {formatCurrency(decl.netTax)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-1">
                          <button onClick={() => { setSelectedDeclaration(decl); setShowViewModal(true); }} className="p-1.5 text-gray-500 hover:text-primary transition-colors" title="Détail">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {decl.status === 'calculated' && (
                            <button onClick={() => handleStatusChange(decl, 'validated')} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors" title="Valider">
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {decl.status === 'validated' && (
                            <button onClick={() => handleStatusChange(decl, 'declared')} className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors" title="Marquer déclarée">
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                          )}
                          {decl.status === 'declared' && (
                            <button onClick={() => handleStatusChange(decl, 'paid')} className="p-1.5 text-gray-500 hover:text-green-600 transition-colors" title="Marquer payée">
                              <CurrencyDollarIcon className="h-4 w-4" />
                            </button>
                          )}
                          {(decl.status === 'draft' || decl.status === 'calculated') && (
                            <button onClick={() => setDeleteConfirm({ isOpen: true, id: decl.id })} className="p-1.5 text-gray-500 hover:text-red-600 transition-colors" title="Supprimer">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredDeclarations.length)} sur {filteredDeclarations.length}
            </p>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Précédent</button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal détail déclaration */}
      {showViewModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {getTaxName(selectedDeclaration.taxCode)} — {selectedDeclaration.periodLabel}
              </h2>
              <button onClick={() => { setShowViewModal(false); setSelectedDeclaration(null); }} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + badges */}
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor(selectedDeclaration.taxCode)}`}>
                  {getTaxName(selectedDeclaration.taxCode)}
                </span>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedDeclaration.status)}`}>
                  {getStatusLabel(selectedDeclaration.status)}
                </span>
                {selectedDeclaration.declarationDeadline && (
                  <span className="text-sm text-gray-600">
                    Échéance : {new Date(selectedDeclaration.declarationDeadline).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Montants */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Base imposable</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeclaration.base)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Taxe brute</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeclaration.grossTax)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Déductible</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedDeclaration.deductible)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Net à payer</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedDeclaration.netTax)}</p>
                </div>
              </div>

              {/* Détail du calcul */}
              {selectedDeclaration.calculationDetail && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Détail du calcul</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                      {Object.entries(selectedDeclaration.calculationDetail).map(([key, val]) =>
                        `${key}: ${typeof val === 'number' ? formatCurrency(val) : JSON.stringify(val)}`
                      ).join('\n')}
                    </pre>
                  </div>
                </div>
              )}

              {/* Crédit TVA */}
              {selectedDeclaration.credit > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">
                    Crédit de TVA : {formatCurrency(selectedDeclaration.credit)} — reportable sur la période suivante.
                  </p>
                </div>
              )}

              {/* Historique */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Historique</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Créée le {new Date(selectedDeclaration.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                  {selectedDeclaration.declaredAt && (
                    <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                      <DocumentArrowDownIcon className="h-5 w-5 text-indigo-500" />
                      <p className="text-sm font-medium">Déclarée le {new Date(selectedDeclaration.declaredAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                  {selectedDeclaration.paidAt && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                      <p className="text-sm font-medium">Payée le {new Date(selectedDeclaration.paidAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              {selectedDeclaration.status === 'calculated' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'validated'); setShowViewModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Valider
                </button>
              )}
              {selectedDeclaration.status === 'validated' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'declared'); setShowViewModal(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  Marquer déclarée
                </button>
              )}
              {selectedDeclaration.status === 'declared' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'paid'); setShowViewModal(false); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Marquer payée
                </button>
              )}
              <button onClick={() => { setShowViewModal(false); setSelectedDeclaration(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation suppression */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={() => { if (deleteConfirm.id) handleDelete(deleteConfirm.id); setDeleteConfirm({ isOpen: false, id: null }); }}
        title="Supprimer la déclaration"
        message="Êtes-vous sûr de vouloir supprimer cette déclaration ? Cette action est irréversible."
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

export default TaxDeclarationsPage;
