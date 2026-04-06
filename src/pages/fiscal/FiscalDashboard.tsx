// @ts-nocheck

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  Calculator,
  Clock,
  CheckCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  TrendingUp,
  CalendarDays,
  ChevronDown,
  Eye,
  Play,
  CreditCard,
  BarChart3,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart,
} from '../../components/ui/DesignSystem';
import { formatCurrency } from '../../lib/utils';
import { TaxDetectionEngine, TaxDetectionResult } from '../../services/fiscal/TaxDetectionEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

function getDefaultPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0);
  const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { year, month, start: firstDay, end: lastDayStr };
}

function buildPeriodFromSelection(year: number, month: number) {
  const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0);
  const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  return { start: firstDay, end: lastDayStr };
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Brouillon', color: 'text-neutral-600', bgColor: 'bg-neutral-100' },
  pending: { label: 'En attente', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  calculated: { label: 'Calcule', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  validated: { label: 'Valide', color: 'text-green-700', bgColor: 'bg-green-50' },
  declared: { label: 'Declare', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  paid: { label: 'Paye', color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
  overdue: { label: 'En retard', color: 'text-red-700', bgColor: 'bg-red-50' },
  not_applicable: { label: 'N/A', color: 'text-neutral-400', bgColor: 'bg-neutral-50' },
};

function getStatusBadge(status: string, isOverdue: boolean) {
  const effective = isOverdue && status !== 'paid' ? 'overdue' : status;
  const cfg = statusConfig[effective] || statusConfig.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.color}`}>
      {effective === 'paid' && <CheckCircle2 className="h-3 w-3" />}
      {effective === 'overdue' && <AlertTriangle className="h-3 w-3" />}
      {cfg.label}
    </span>
  );
}

const categoryLabels: Record<string, string> = {
  INDIRECT: 'Taxes indirectes',
  DIRECT: 'Impots directs',
  SOCIAL: 'Charges sociales',
  RETENUE: 'Retenues a la source',
};

const categoryColors: Record<string, string> = {
  INDIRECT: 'bg-blue-400',
  DIRECT: 'bg-amber-400',
  SOCIAL: 'bg-emerald-400',
  RETENUE: 'bg-purple-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FiscalDashboard: React.FC = () => {
  const { adapter } = useData();

  // Period state
  const defaultPeriod = getDefaultPeriod();
  const [selectedYear, setSelectedYear] = useState(defaultPeriod.year);
  const [selectedMonth, setSelectedMonth] = useState(defaultPeriod.month);

  // Data state
  const [detectionResults, setDetectionResults] = useState<TaxDetectionResult[]>([]);
  const [declarations, setDeclarations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const period = useMemo(
    () => buildPeriodFromSelection(selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  );

  const engine = useMemo(() => new TaxDetectionEngine(adapter), [adapter]);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await engine.detectTaxesFromAccounts(period.start, period.end);
      setDetectionResults(results);

      const allDecl = await adapter.getAll('taxDeclarations');
      setDeclarations(allDecl as Record<string, unknown>[]);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, [adapter, engine, period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const triggeredResults = useMemo(
    () => detectionResults.filter(r => r.isTriggered),
    [detectionResults]
  );

  const overdueAlerts = useMemo(
    () => triggeredResults.filter(r => r.isOverdue && r.status !== 'paid'),
    [triggeredResults]
  );

  const soonDueAlerts = useMemo(
    () => triggeredResults.filter(r =>
      !r.isOverdue &&
      r.daysUntilDeadline !== null &&
      r.daysUntilDeadline <= 7 &&
      r.status !== 'paid'
    ),
    [triggeredResults]
  );

  const pendingCalcAlerts = useMemo(
    () => triggeredResults.filter(r =>
      r.status === 'pending' || r.status === 'draft'
    ),
    [triggeredResults]
  );

  // KPIs
  const totalObligations = useMemo(
    () => triggeredResults.reduce((sum, r) => sum + (r.amounts?.net || 0), 0),
    [triggeredResults]
  );

  const paidYTD = useMemo(
    () => declarations
      .filter(d => d.status === 'paid' && d.periodStart?.startsWith(String(selectedYear)))
      .reduce((sum, d) => sum + (d.netTax || 0), 0),
    [declarations, selectedYear]
  );

  const pendingCount = useMemo(
    () => triggeredResults.filter(r => r.status !== 'paid' && r.status !== 'not_applicable').length,
    [triggeredResults]
  );

  const vatCredit = useMemo(() => {
    const vatResult = triggeredResults.find(r =>
      r.tax.formula === 'COLLECTED_MINUS_DEDUCTIBLE'
    );
    return vatResult?.amounts?.credit || 0;
  }, [triggeredResults]);

  // Chart data
  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const r of triggeredResults) {
      const cat = r.tax.category || 'INDIRECT';
      byCategory[cat] = (byCategory[cat] || 0) + (r.amounts?.net || 0);
    }
    const data = Object.entries(byCategory).map(([cat, val]) => ({
      label: categoryLabels[cat] || cat,
      value: Math.round(val / 1000),
      color: categoryColors[cat] || 'bg-neutral-400',
    }));
    return data.length > 0
      ? data
      : [{ label: 'Aucune donnee', value: 0, color: 'bg-neutral-300' }];
  }, [triggeredResults]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleCalculateAll = async () => {
    setCalculating(true);
    try {
      for (const r of triggeredResults) {
        if (r.amounts) {
          await engine.createDeclaration(r.tax, period.start, period.end, r.amounts);
        }
      }
      await loadData();
    } catch (err) {
    } finally {
      setCalculating(false);
    }
  };

  const handleCalculateSingle = async (r: TaxDetectionResult) => {
    setActionLoading(r.tax.id);
    try {
      const amounts = await engine.calculateTaxAmounts(r.tax);
      await engine.createDeclaration(r.tax, period.start, period.end, amounts);
      await loadData();
    } catch (err) {
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusTransition = async (r: TaxDetectionResult, newStatus: string) => {
    setActionLoading(r.tax.id);
    try {
      if (r.existingDeclaration) {
        await adapter.update('taxDeclarations', r.existingDeclaration.id, {
          ...r.existingDeclaration,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
        await loadData();
      }
    } catch (err) {
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-lg font-medium text-neutral-700">Chargement du tableau de bord fiscal...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">

        {/* ---- Header ---- */}
        <SectionHeader
          title="Tableau de Bord Fiscal"
          subtitle={`Obligations fiscales — ${MONTHS[selectedMonth]} ${selectedYear}`}
          icon={ShieldAlert}
          action={
            <div className="flex items-center gap-3">
              {/* Period selector */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="appearance-none bg-white border border-neutral-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="appearance-none bg-white border border-neutral-200 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <ElegantButton
                variant="primary"
                icon={calculating ? Loader2 : Calculator}
                onClick={handleCalculateAll}
                disabled={calculating}
              >
                {calculating ? 'Calcul en cours...' : 'Calculer toutes les taxes'}
              </ElegantButton>
            </div>
          }
        />

        {/* ---- Section 1: Alertes urgentes ---- */}
        {(overdueAlerts.length > 0 || soonDueAlerts.length > 0 || pendingCalcAlerts.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            {/* Overdue — Red */}
            {overdueAlerts.map(r => (
              <div
                key={`alert-overdue-${r.tax.id}`}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800">
                    {r.tax.taxCode} — {r.tax.name} est en retard
                  </p>
                  <p className="text-xs text-red-600">
                    Echeance depassee de {Math.abs(r.daysUntilDeadline || 0)} jour(s) — Montant du : {formatCurrency(r.amounts?.net || 0)}
                  </p>
                </div>
              </div>
            ))}

            {/* Soon due — Orange */}
            {soonDueAlerts.map(r => (
              <div
                key={`alert-soon-${r.tax.id}`}
                className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg"
              >
                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-800">
                    {r.tax.taxCode} — {r.tax.name} a declarer dans {r.daysUntilDeadline} jour(s)
                  </p>
                  <p className="text-xs text-orange-600">
                    Echeance : {r.declarationDeadline} — Montant du : {formatCurrency(r.amounts?.net || 0)}
                  </p>
                </div>
              </div>
            ))}

            {/* Pending calculation — Yellow */}
            {pendingCalcAlerts.map(r => (
              <div
                key={`alert-pending-${r.tax.id}`}
                className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-800">
                    {r.tax.taxCode} — {r.tax.name} en attente de calcul
                  </p>
                  <p className="text-xs text-yellow-600">
                    Cliquez sur "Calculer" pour determiner le montant du
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ---- Section 2: KPI Cards ---- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Obligations du mois"
            value={formatCurrency(totalObligations)}
            subtitle={`${triggeredResults.length} taxe(s) declenchee(s)`}
            icon={DollarSign}
            color="error"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Paye YTD"
            value={formatCurrency(paidYTD)}
            subtitle={`Cumul ${selectedYear}`}
            icon={CheckCircle}
            color="success"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="En attente"
            value={String(pendingCount)}
            subtitle="Declarations non payees"
            icon={Clock}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Credit TVA"
            value={formatCurrency(vatCredit)}
            subtitle="Report de credit"
            icon={CreditCard}
            color="success"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* ---- Section 3: Tableau recapitulatif ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <UnifiedCard variant="elevated" size="md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-neutral-500" />
                  Recapitulatif des Obligations
                </h2>
                <ElegantButton variant="ghost" icon={RefreshCw} onClick={loadData}>
                  Actualiser
                </ElegantButton>
              </div>

              {triggeredResults.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Calculator className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p className="text-sm">Aucune taxe declenchee pour cette periode.</p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Verifiez que des ecritures existent sur les comptes fiscaux pour {MONTHS[selectedMonth]} {selectedYear}.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Taxe</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Periode</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral-600">Montant du</th>
                        <th className="text-left py-3 px-4 font-semibold text-neutral-600">Echeance</th>
                        <th className="text-center py-3 px-4 font-semibold text-neutral-600">Statut</th>
                        <th className="text-right py-3 px-4 font-semibold text-neutral-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {triggeredResults.map(r => {
                        const isRowLoading = actionLoading === r.tax.id;
                        return (
                          <tr
                            key={r.tax.id}
                            className={`hover:bg-neutral-50 transition-colors ${r.isOverdue && r.status !== 'paid' ? 'bg-red-50/40' : ''}`}
                          >
                            {/* Taxe */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="font-medium text-neutral-800">{r.tax.taxCode}</span>
                                <span className="text-xs text-neutral-500">{r.tax.name}</span>
                              </div>
                            </td>

                            {/* Periode */}
                            <td className="py-3 px-4 text-neutral-600">
                              {MONTHS[selectedMonth]} {selectedYear}
                            </td>

                            {/* Montant du */}
                            <td className="py-3 px-4 text-right font-medium text-neutral-800">
                              {r.amounts?.net != null
                                ? formatCurrency(r.amounts.net)
                                : '—'}
                            </td>

                            {/* Echeance */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5 text-neutral-400" />
                                <span className={`text-sm ${r.isOverdue && r.status !== 'paid' ? 'text-red-600 font-semibold' : 'text-neutral-600'}`}>
                                  {r.declarationDeadline || '—'}
                                </span>
                              </div>
                              {r.daysUntilDeadline !== null && r.status !== 'paid' && (
                                <span className={`text-xs ${r.isOverdue ? 'text-red-500' : r.daysUntilDeadline <= 7 ? 'text-orange-500' : 'text-neutral-400'}`}>
                                  {r.isOverdue
                                    ? `${Math.abs(r.daysUntilDeadline)}j en retard`
                                    : `${r.daysUntilDeadline}j restant(s)`}
                                </span>
                              )}
                            </td>

                            {/* Statut */}
                            <td className="py-3 px-4 text-center">
                              {getStatusBadge(r.status, r.isOverdue)}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isRowLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                                ) : (
                                  <>
                                    {/* Calculer */}
                                    <button
                                      onClick={() => handleCalculateSingle(r)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                                      title="Calculer"
                                    >
                                      <Calculator className="h-3 w-3" />
                                      Calculer
                                    </button>

                                    {/* Voir detail */}
                                    <button
                                      onClick={() => {}}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-neutral-50 text-neutral-600 hover:bg-neutral-100 transition-colors"
                                      title="Voir detail"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Detail
                                    </button>

                                    {/* Marquer declaree */}
                                    {r.existingDeclaration && r.status !== 'declared' && r.status !== 'paid' && (
                                      <button
                                        onClick={() => handleStatusTransition(r, 'declared')}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                                        title="Marquer declaree"
                                      >
                                        <FileText className="h-3 w-3" />
                                        Declaree
                                      </button>
                                    )}

                                    {/* Marquer payee */}
                                    {r.existingDeclaration && r.status !== 'paid' && (
                                      <button
                                        onClick={() => handleStatusTransition(r, 'paid')}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                        title="Marquer payee"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />
                                        Payee
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </UnifiedCard>
        </motion.div>

        {/* ---- Section 4: Graphique par categorie ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernChartCard
            title="Repartition par Categorie"
            subtitle="Montants nets par type de taxe (en milliers FCFA)"
            icon={BarChart3}
          >
            <ColorfulBarChart data={chartData} height={160} />
          </ModernChartCard>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default FiscalDashboard;
