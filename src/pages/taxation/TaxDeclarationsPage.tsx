
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
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { TaxDetectionEngine } from '../../services/fiscal/TaxDetectionEngine';
import { seedTaxRegistryCI, seedIRPPBracketsCI } from '../../services/fiscal/taxRegistrySeeds';
import { calculerTVAMensuelle, calculerIS } from '../../services/fiscal/declarationFiscaleService';
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

const MONTH_KEYS = [
  'taxDeclarations.monthJanuary',
  'taxDeclarations.monthFebruary',
  'taxDeclarations.monthMarch',
  'taxDeclarations.monthApril',
  'taxDeclarations.monthMay',
  'taxDeclarations.monthJune',
  'taxDeclarations.monthJuly',
  'taxDeclarations.monthAugust',
  'taxDeclarations.monthSeptember',
  'taxDeclarations.monthOctober',
  'taxDeclarations.monthNovember',
  'taxDeclarations.monthDecember',
];

const TaxDeclarationsPage: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const monthLabel = useCallback((idx: number) => t(MONTH_KEYS[idx]), [t]);

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
  const { data: detectionResults = [], isLoading: loadingDetection, isError: isDetectionError, refetch: refetchDetection } = useQuery({
    queryKey: ['tax-detection', periodStart, periodEnd],
    queryFn: async () => {
      if (taxRegistry.length === 0) return [];
      const engine = new TaxDetectionEngine(adapter, 'CI');
      return engine.detectTaxesFromAccounts(periodStart, periodEnd);
    },
    enabled: taxRegistry.length > 0,
  });

  // Real TVA calculation from declarationFiscaleService
  const { data: tvaCalc } = useQuery({
    queryKey: ['tva-calc', selectedMonth, selectedYear],
    queryFn: () => calculerTVAMensuelle(adapter, `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`),
  });

  // Real IS calculation from declarationFiscaleService
  const { data: isCalc } = useQuery({
    queryKey: ['is-calc', selectedYear],
    queryFn: () => calculerIS(adapter, String(selectedYear)),
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
      toast.error(t('taxDeclarations.noRegistryConfigured'));
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
      toast.success(t('taxDeclarations.declarationsCalculated', { count: String(count), month: monthLabel(selectedMonth - 1), year: String(selectedYear) }));
    } catch (err) {
      toast.error(t('taxDeclarations.calcError') + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCalculating(false);
    }
  }, [adapter, taxRegistry, periodStart, periodEnd, selectedMonth, selectedYear, queryClient, refetchDetection, t, monthLabel]);

  const handleStatusChange = useCallback(async (decl: DBTaxDeclaration, newStatus: string) => {
    const now = new Date().toISOString();
    const updates: Partial<DBTaxDeclaration> = { status: newStatus as DBTaxDeclaration['status'], updatedAt: now };
    if (newStatus === 'declared') updates.declaredAt = now;
    if (newStatus === 'paid') updates.paidAt = now;
    try {
      await adapter.update('taxDeclarations', decl.id, updates);
      await queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
      toast.success(t('taxDeclarations.statusChanged', { code: decl.taxCode, status: newStatus }));
    } catch (err) {
      console.error('[TaxDeclarations] handleStatusChange error:', err);
      toast.error(t('taxDeclarations.statusUpdateError') + (err instanceof Error ? err.message : String(err)));
    }
  }, [adapter, queryClient, t]);

  const handleSeedRegistry = useCallback(async () => {
    try {
      await seedTaxRegistryCI(adapter);
      await seedIRPPBracketsCI(adapter);
      await queryClient.invalidateQueries({ queryKey: ['tax-registry'] });
      toast.success(t('taxDeclarations.registrySeeded'));
    } catch (err) {
      console.error('[TaxDeclarations] handleSeedRegistry error:', err);
      toast.error(t('taxDeclarations.seedError') + (err instanceof Error ? err.message : String(err)));
    }
  }, [adapter, queryClient, t]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await adapter.delete('taxDeclarations', id);
      await queryClient.invalidateQueries({ queryKey: ['tax-declarations'] });
      toast.success(t('taxDeclarations.declarationDeleted'));
    } catch (err) {
      console.error('[TaxDeclarations] handleDelete error:', err);
      toast.error(t('taxDeclarations.deleteError') + (err instanceof Error ? err.message : String(err)));
    }
  }, [adapter, queryClient, t]);

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
      case 'paid': return t('taxDeclarations.statusPaid');
      case 'declared': return t('taxDeclarations.statusDeclared');
      case 'validated': return t('taxDeclarations.statusValidated');
      case 'calculated': return t('taxDeclarations.statusCalculated');
      case 'draft': return t('taxDeclarations.statusDraft');
      case 'overdue': return t('taxDeclarations.statusOverdue');
      case 'rectified': return t('taxDeclarations.statusRectified');
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
          <h1 className="text-lg font-bold text-gray-900">{t('taxDeclarations.title')}</h1>
          <p className="text-gray-600">{t('taxDeclarations.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          {taxRegistry.length === 0 && (
            <button
              onClick={handleSeedRegistry}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <BoltIcon className="h-5 w-5" />
              <span>{t('taxDeclarations.seedButton')}</span>
            </button>
          )}
          <button
            onClick={handleCalculateAll}
            disabled={isCalculating || taxRegistry.length === 0}
            className="bg-primary hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            {isCalculating ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CalculatorIcon className="h-5 w-5" />}
            <span>{t('taxDeclarations.calculateButton', { month: monthLabel(selectedMonth - 1), year: String(selectedYear) })}</span>
          </button>
        </div>
      </div>

      {/* Erreur moteur de détection */}
      {isDetectionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <span className="font-medium text-red-800">{t('taxDeclarations.detectionErrorTitle')}</span>
            <span className="text-red-700 ml-1">{t('taxDeclarations.detectionErrorDesc')}</span>
          </div>
        </div>
      )}

      {/* Chargement détection */}
      {loadingDetection && taxRegistry.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-3">
          <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
          <span className="text-sm text-blue-700">{t('taxDeclarations.detectingTaxes')}</span>
        </div>
      )}

      {/* Alertes urgentes */}
      {(overdueTaxes.length > 0 || dueSoonTaxes.length > 0) && (
        <div className="space-y-2">
          {overdueTaxes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-red-800">{t('taxDeclarations.overdueAlert', { count: String(overdueTaxes.length) })}</span>
                <span className="text-red-700">{overdueTaxes.map(r => r.tax.taxShortName).join(', ')}</span>
              </div>
            </div>
          )}
          {dueSoonTaxes.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div>
                <span className="font-medium text-orange-800">{t('taxDeclarations.dueSoonAlert', { count: String(dueSoonTaxes.length) })}</span>
                <span className="text-orange-700">{dueSoonTaxes.map(r => `${r.tax.taxShortName} (J-${r.daysUntilDeadline})`).join(', ')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{t('taxDeclarations.statDeclarations')}</p>
          <p className="text-xl font-bold text-gray-900">{filteredDeclarations.length}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{t('taxDeclarations.statTotalDue')}</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{t('taxDeclarations.statPaid')}</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{t('taxDeclarations.statPending')}</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{t('taxDeclarations.statOverdue')}</p>
          <p className="text-xl font-bold text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Calcul TVA/IS réel depuis les écritures */}
      {(tvaCalc || isCalc) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tvaCalc && (
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CalculatorIcon className="h-4 w-4" /> {t('taxDeclarations.tvaTitle', { month: monthLabel(selectedMonth - 1), year: String(selectedYear) })}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.tvaCollected')}</span><span className="font-medium">{formatCurrency(tvaCalc.tvaCollectee)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.tvaDeductible')}</span><span className="font-medium">{formatCurrency(tvaCalc.tvaDeductible)}</span></div>
                <hr />
                <div className="flex justify-between font-bold"><span>{t('taxDeclarations.netToPay')}</span><span className={tvaCalc.montantNetAPayer > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(tvaCalc.montantNetAPayer)}</span></div>
                {tvaCalc.creditAReporter > 0 && <div className="flex justify-between text-blue-600"><span>{t('taxDeclarations.creditToCarry')}</span><span>{formatCurrency(tvaCalc.creditAReporter)}</span></div>}
              </div>
            </div>
          )}
          {isCalc && (
            <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CalculatorIcon className="h-4 w-4" /> {t('taxDeclarations.isImfTitle', { year: String(selectedYear) })}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.accountingResult')}</span><span className="font-medium">{formatCurrency(isCalc.resultatComptable)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.fiscalResult')}</span><span className="font-medium">{formatCurrency(isCalc.resultatFiscal)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.isRate', { rate: String(isCalc.tauxIS) })}</span><span>{formatCurrency(isCalc.montantIS)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">{t('taxDeclarations.imfLabel')}</span><span>{formatCurrency(isCalc.imf)}</span></div>
                <hr />
                <div className="flex justify-between font-bold"><span>{t('taxDeclarations.amountDueMaxLabel')}</span><span className={isCalc.montantDu > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(isCalc.montantDu)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

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
                {t('taxDeclarations.taxesDetected', { count: String(triggeredTaxes.length), month: monthLabel(selectedMonth - 1), year: String(selectedYear) })}
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
                      {r.isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">{t('taxDeclarations.overdueBadge')}</span>}
                    </div>
                    <div className="mt-2 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('taxDeclarations.amountLabel')}</span>
                        <span className="font-medium">{r.amounts?.net != null ? formatCurrency(r.amounts.net) : t('taxDeclarations.manual')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('taxDeclarations.deadlineLabel')}</span>
                        <span className={r.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                          {r.declarationDeadline ? new Date(r.declarationDeadline).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('taxDeclarations.formulaLabel')}</span>
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
              {MONTH_KEYS.map((m, i) => <option key={i} value={i + 1}>{t(m)}</option>)}
            </select>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <div className="relative ml-3">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('taxDeclarations.searchPlaceholder')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-48"
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center space-x-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              <FunnelIcon className="h-4 w-4" />
              <span>{t('taxDeclarations.filters')}</span>
            </button>
          </div>

          <button
            onClick={() => {
              try {
                if (filteredDeclarations.length === 0) {
                  toast.error(t('taxDeclarations.noDeclToExport'));
                  return;
                }
                const header = t('taxDeclarations.csvHeader') + '\n';
                const rows = filteredDeclarations.map(d =>
                  [
                    getTaxName(d.taxCode),
                    d.periodLabel ?? '',
                    getStatusLabel(d.status),
                    d.declarationDeadline ? new Date(d.declarationDeadline).toLocaleDateString('fr-FR') : '',
                    d.base ?? 0,
                    d.netTax ?? 0,
                  ].join(';')
                ).join('\n');
                const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8;' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `declarations_fiscales_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                toast.success(t('taxDeclarations.exportedCsv', { count: String(filteredDeclarations.length) }));
              } catch (err) {
                console.error('[TaxDeclarations] exportCSV error:', err);
                toast.error(t('taxDeclarations.exportCsvError') + (err instanceof Error ? err.message : String(err)));
              }
            }}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center space-x-1 text-sm transition-colors"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>{t('taxDeclarations.export')}</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">{t('taxDeclarations.allTaxes')}</option>
              {taxTypes.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">{t('taxDeclarations.allCategories')}</option>
              <option value="INDIRECT">{t('taxDeclarations.catIndirect')}</option>
              <option value="DIRECT">{t('taxDeclarations.catDirect')}</option>
              <option value="SOCIAL">{t('taxDeclarations.catSocial')}</option>
              <option value="RETENUE">{t('taxDeclarations.catRetenue')}</option>
              <option value="AUTRE">{t('taxDeclarations.catOther')}</option>
            </select>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="all">{t('taxDeclarations.allStatuses')}</option>
              <option value="draft">{t('taxDeclarations.statusDraft')}</option>
              <option value="calculated">{t('taxDeclarations.statusCalculated')}</option>
              <option value="validated">{t('taxDeclarations.statusValidated')}</option>
              <option value="declared">{t('taxDeclarations.statusDeclared')}</option>
              <option value="paid">{t('taxDeclarations.statusPaid')}</option>
              <option value="overdue">{t('taxDeclarations.statusOverdue')}</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colTax')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colPeriod')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colStatus')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colDeadline')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colBase')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colAmountDue')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{t('taxDeclarations.colActions')}</th>
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
                      ? t('taxDeclarations.emptyNoRegistry')
                      : t('taxDeclarations.emptyNoDecl', { month: monthLabel(selectedMonth - 1), year: String(selectedYear) })}
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
                            {isOver ? t('taxDeclarations.statusOverdue') : getStatusLabel(decl.status)}
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
                          <button onClick={() => { setSelectedDeclaration(decl); setShowViewModal(true); }} className="p-1.5 text-gray-500 hover:text-primary transition-colors" title={t('taxDeclarations.actionDetail')}>
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {decl.status === 'calculated' && (
                            <button onClick={() => handleStatusChange(decl, 'validated')} className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors" title={t('taxDeclarations.actionValidate')}>
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          {decl.status === 'validated' && (
                            <button onClick={() => handleStatusChange(decl, 'declared')} className="p-1.5 text-gray-500 hover:text-indigo-600 transition-colors" title={t('taxDeclarations.actionMarkDeclared')}>
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                          )}
                          {decl.status === 'declared' && (
                            <button onClick={() => handleStatusChange(decl, 'paid')} className="p-1.5 text-gray-500 hover:text-green-600 transition-colors" title={t('taxDeclarations.actionMarkPaid')}>
                              <CurrencyDollarIcon className="h-4 w-4" />
                            </button>
                          )}
                          {(decl.status === 'draft' || decl.status === 'calculated') && (
                            <button onClick={() => setDeleteConfirm({ isOpen: true, id: decl.id })} className="p-1.5 text-gray-500 hover:text-red-600 transition-colors" title={t('taxDeclarations.actionDelete')}>
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
              {t('taxDeclarations.paginationInfo', { from: String((currentPage - 1) * itemsPerPage + 1), to: String(Math.min(currentPage * itemsPerPage, filteredDeclarations.length)), total: String(filteredDeclarations.length) })}
            </p>
            <div className="flex space-x-2">
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">{t('taxDeclarations.previous')}</button>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50">{t('taxDeclarations.next')}</button>
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
                    {t('taxDeclarations.deadlineLabel')} {new Date(selectedDeclaration.declarationDeadline).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>

              {/* Montants */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('taxDeclarations.taxableBase')}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeclaration.base)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('taxDeclarations.grossTax')}</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedDeclaration.grossTax)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{t('taxDeclarations.deductible')}</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedDeclaration.deductible)}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">{t('taxDeclarations.netToPay')}</p>
                  <p className="text-lg font-bold text-blue-800">{formatCurrency(selectedDeclaration.netTax)}</p>
                </div>
              </div>

              {/* Détail du calcul */}
              {selectedDeclaration.calculationDetail && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">{t('taxDeclarations.calcDetail')}</h4>
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
                    {t('taxDeclarations.tvaCreditMsg', { amount: formatCurrency(selectedDeclaration.credit) })}
                  </p>
                </div>
              )}

              {/* Historique */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">{t('taxDeclarations.history')}</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{t('taxDeclarations.createdOn', { date: new Date(selectedDeclaration.createdAt).toLocaleDateString('fr-FR') })}</p>
                    </div>
                  </div>
                  {selectedDeclaration.declaredAt && (
                    <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg">
                      <DocumentArrowDownIcon className="h-5 w-5 text-indigo-500" />
                      <p className="text-sm font-medium">{t('taxDeclarations.declaredOn', { date: new Date(selectedDeclaration.declaredAt).toLocaleDateString('fr-FR') })}</p>
                    </div>
                  )}
                  {selectedDeclaration.paidAt && (
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                      <p className="text-sm font-medium">{t('taxDeclarations.paidOn', { date: new Date(selectedDeclaration.paidAt).toLocaleDateString('fr-FR') })}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0">
              {selectedDeclaration.status === 'calculated' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'validated'); setShowViewModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('taxDeclarations.actionValidate')}
                </button>
              )}
              {selectedDeclaration.status === 'validated' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'declared'); setShowViewModal(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {t('taxDeclarations.actionMarkDeclared')}
                </button>
              )}
              {selectedDeclaration.status === 'declared' && (
                <button onClick={() => { handleStatusChange(selectedDeclaration, 'paid'); setShowViewModal(false); }} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  {t('taxDeclarations.actionMarkPaid')}
                </button>
              )}
              <button onClick={() => { setShowViewModal(false); setSelectedDeclaration(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">
                {t('taxDeclarations.close')}
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
        title={t('taxDeclarations.deleteTitle')}
        message={t('taxDeclarations.deleteMessage')}
        variant="danger"
        confirmText={t('taxDeclarations.actionDelete')}
        cancelText={t('taxDeclarations.cancel')}
      />
    </div>
  );
};

export default TaxDeclarationsPage;
