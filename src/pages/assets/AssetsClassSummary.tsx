import React, { useState } from 'react';
import {
  Layers, Building, Package, FileText, DollarSign, TrendingUp,
  Calendar, Download, Info, AlertCircle, BarChart3, PieChart
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';

interface ClassData {
  code: string;
  description: string;
  // Assets at Cost
  openingBalance: number;
  additions: number;
  revaluations: number;
  disposals: number;
  impairment: number;
  closingBalance: number;
  // Accumulated Depreciation
  depOpeningBalance: number;
  depreciationCost: number;
  depreciationRevaluation: number;
  depreciationTotal: number;
  depRevaluations: number;
  depDisposals: number;
  depClosingBalance: number;
  // Closing Carrying Value
  closingCarryingValue: number;
  // Revaluation Reserve
  revOpeningBalance: number;
  revaluationSurplus: number;
  depreciationRevaluation2: number;
  revClosingBalance: number;
  // Other
  impairmentWriteOffs: number;
  profitLossOnDisposal: number;
  // Current Month Depreciation
  currentMonthDepCost: number;
  currentMonthDepReval: number;
  currentMonthDepTotal: number;
}

const AssetsClassSummary: React.FC = () => {
  const [selectedPeriod] = useState({
    from: '1 janvier 2018',
    to: '28 février 2018'
  });
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const classes: ClassData[] = [
    {
      code: '21-IC',
      description: '21-Immobilisations incorporelles',
      openingBalance: 0,
      additions: 0,
      revaluations: 0,
      disposals: 0,
      impairment: 0,
      closingBalance: 0,
      depOpeningBalance: 0,
      depreciationCost: 0,
      depreciationRevaluation: 0,
      depreciationTotal: 0,
      depRevaluations: 0,
      depDisposals: 0,
      depClosingBalance: 0,
      closingCarryingValue: 0,
      revOpeningBalance: 0,
      revaluationSurplus: 0,
      depreciationRevaluation2: 0,
      revClosingBalance: 0,
      impairmentWriteOffs: 0,
      profitLossOnDisposal: 0,
      currentMonthDepCost: 0,
      currentMonthDepReval: 0,
      currentMonthDepTotal: 0
    },
    {
      code: '22-T',
      description: '22-Terrain',
      openingBalance: 0,
      additions: 0,
      revaluations: 0,
      disposals: 0,
      impairment: 0,
      closingBalance: 0,
      depOpeningBalance: 0,
      depreciationCost: 0,
      depreciationRevaluation: 0,
      depreciationTotal: 0,
      depRevaluations: 0,
      depDisposals: 0,
      depClosingBalance: 0,
      closingCarryingValue: 0,
      revOpeningBalance: 0,
      revaluationSurplus: 0,
      depreciationRevaluation2: 0,
      revClosingBalance: 0,
      impairmentWriteOffs: 0,
      profitLossOnDisposal: 0,
      currentMonthDepCost: 0,
      currentMonthDepReval: 0,
      currentMonthDepTotal: 0
    },
    {
      code: '23-BIA',
      description: '23-Bâtiment, Installation, Agencement',
      openingBalance: 462306404,
      additions: 0,
      revaluations: 0,
      disposals: 0,
      impairment: 0,
      closingBalance: 462306404,
      depOpeningBalance: 6707963,
      depreciationCost: 1985047,
      depreciationRevaluation: 0,
      depreciationTotal: 1985047,
      depRevaluations: 0,
      depDisposals: 0,
      depClosingBalance: 8693010,
      closingCarryingValue: 453613395,
      revOpeningBalance: 0,
      revaluationSurplus: 0,
      depreciationRevaluation2: 0,
      revClosingBalance: 0,
      impairmentWriteOffs: 0,
      profitLossOnDisposal: 0,
      currentMonthDepCost: 992523,
      currentMonthDepReval: 0,
      currentMonthDepTotal: 992523
    },
    {
      code: '24-MM',
      description: '24-Matériel, Mobilier',
      openingBalance: 159600,
      additions: 27520151,
      revaluations: 0,
      disposals: 0,
      impairment: 0,
      closingBalance: 27679751,
      depOpeningBalance: 0,
      depreciationCost: 0,
      depreciationRevaluation: 0,
      depreciationTotal: 0,
      depRevaluations: 0,
      depDisposals: 0,
      depClosingBalance: 0,
      closingCarryingValue: 27679751,
      revOpeningBalance: 0,
      revaluationSurplus: 0,
      depreciationRevaluation2: 0,
      revClosingBalance: 0,
      impairmentWriteOffs: 0,
      profitLossOnDisposal: 0,
      currentMonthDepCost: 0,
      currentMonthDepReval: 0,
      currentMonthDepTotal: 0
    }
  ];

  // Calculate totals
  const totals = classes.reduce((acc, cls) => ({
    openingBalance: acc.openingBalance + cls.openingBalance,
    additions: acc.additions + cls.additions,
    revaluations: acc.revaluations + cls.revaluations,
    disposals: acc.disposals + cls.disposals,
    impairment: acc.impairment + cls.impairment,
    closingBalance: acc.closingBalance + cls.closingBalance,
    depOpeningBalance: acc.depOpeningBalance + cls.depOpeningBalance,
    depreciationCost: acc.depreciationCost + cls.depreciationCost,
    depreciationRevaluation: acc.depreciationRevaluation + cls.depreciationRevaluation,
    depreciationTotal: acc.depreciationTotal + cls.depreciationTotal,
    depRevaluations: acc.depRevaluations + cls.depRevaluations,
    depDisposals: acc.depDisposals + cls.depDisposals,
    depClosingBalance: acc.depClosingBalance + cls.depClosingBalance,
    closingCarryingValue: acc.closingCarryingValue + cls.closingCarryingValue,
    revOpeningBalance: acc.revOpeningBalance + cls.revOpeningBalance,
    revaluationSurplus: acc.revaluationSurplus + cls.revaluationSurplus,
    depreciationRevaluation2: acc.depreciationRevaluation2 + cls.depreciationRevaluation2,
    revClosingBalance: acc.revClosingBalance + cls.revClosingBalance,
    impairmentWriteOffs: acc.impairmentWriteOffs + cls.impairmentWriteOffs,
    profitLossOnDisposal: acc.profitLossOnDisposal + cls.profitLossOnDisposal,
    currentMonthDepCost: acc.currentMonthDepCost + cls.currentMonthDepCost,
    currentMonthDepReval: acc.currentMonthDepReval + cls.currentMonthDepReval,
    currentMonthDepTotal: acc.currentMonthDepTotal + cls.currentMonthDepTotal
  }), {
    openingBalance: 0,
    additions: 0,
    revaluations: 0,
    disposals: 0,
    impairment: 0,
    closingBalance: 0,
    depOpeningBalance: 0,
    depreciationCost: 0,
    depreciationRevaluation: 0,
    depreciationTotal: 0,
    depRevaluations: 0,
    depDisposals: 0,
    depClosingBalance: 0,
    closingCarryingValue: 0,
    revOpeningBalance: 0,
    revaluationSurplus: 0,
    depreciationRevaluation2: 0,
    revClosingBalance: 0,
    impairmentWriteOffs: 0,
    profitLossOnDisposal: 0,
    currentMonthDepCost: 0,
    currentMonthDepReval: 0,
    currentMonthDepTotal: 0
  });

  const formatNumber = (value: number) => {
    if (value === 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getClassIcon = (code: string) => {
    if (code.startsWith('21')) return FileText;
    if (code.startsWith('22')) return Building;
    if (code.startsWith('23')) return Building;
    if (code.startsWith('24')) return Package;
    return Layers;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#171717] to-[#262626] rounded-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm uppercase tracking-wide">Classe</p>
            <h1 className="text-lg font-bold">EMERGENCE PLAZA SA</h1>
            <h2 className="text-xl mt-1">Asset Class Summary</h2>
            <p className="text-sm text-white/80 mt-2">
              From {selectedPeriod.from} to {selectedPeriod.to}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ModernButton
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setShowPeriodModal(true)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Période
            </ModernButton>
            <ModernButton variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Download className="w-4 h-4 mr-1" />
              Exporter
            </ModernButton>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Solde clôture actifs</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {formatNumber(totals.closingBalance)}
                </p>
                <p className="text-xs text-green-500 mt-1">489 986 155</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Amort. cumulés</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {formatNumber(totals.depClosingBalance)}
                </p>
                <p className="text-xs text-orange-500 mt-1">8 693 010</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">VNC totale</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {formatNumber(totals.closingCarryingValue)}
                </p>
                <p className="text-xs text-blue-500 mt-1">481 293 145</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Additions</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {formatNumber(totals.additions)}
                </p>
                <p className="text-xs text-purple-500 mt-1">27 520 151</p>
              </div>
              <Package className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--color-text-secondary)]">Amort. du mois</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {formatNumber(totals.currentMonthDepTotal)}
                </p>
                <p className="text-xs text-red-500 mt-1">992 523</p>
              </div>
              <Calendar className="w-8 h-8 text-red-500 opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Main Table */}
      <ModernCard>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Résumé par classe comptable</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <Info className="w-4 h-4" />
              <span>Toutes les valeurs sont en FCFA</span>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-[var(--color-border)]">
                  <th colSpan={2} className="text-left py-2 px-2 font-semibold"></th>
                  <th colSpan={6} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-[#171717]/10/50 dark:bg-blue-900/10">
                    Assets at Cost
                  </th>
                  <th colSpan={7} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-orange-50/50 dark:bg-orange-900/10">
                    Accumulated Depreciation
                  </th>
                  <th className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-green-50/50 dark:bg-green-900/10">
                    Closing Value
                  </th>
                  <th colSpan={4} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-[#525252]/10/50 dark:bg-purple-900/10">
                    Revaluation Reserve
                  </th>
                  <th colSpan={2} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-red-50/50 dark:bg-red-900/10">
                    Other
                  </th>
                  <th colSpan={3} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-yellow-50/50 dark:bg-yellow-900/10">
                    Current Month
                  </th>
                </tr>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-background-subtle)]">
                  <th className="text-left py-2 px-2 font-medium text-[var(--color-text-secondary)]">Class</th>
                  <th className="text-left py-2 px-2 font-medium text-[var(--color-text-secondary)]">Description</th>
                  {/* Assets at Cost */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Opening Balance</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Additions</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Revaluations</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Disposals</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Impairment</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Closing Balance</th>
                  {/* Accumulated Depreciation */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Opening Balance</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Dep. - Cost</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Dep. - Reval.</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Dep. - Total</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Revaluations</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Disposals</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Closing Balance</th>
                  {/* Closing Carrying Value */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Carrying Value</th>
                  {/* Revaluation Reserve */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Opening Balance</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Reval. Surplus</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Dep. - Reval.</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Closing Balance</th>
                  {/* Other */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Impairment</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">P/(L) Disposal</th>
                  {/* Current Month */}
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Cost</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Reval.</th>
                  <th className="text-right py-2 px-2 font-medium text-[var(--color-text-secondary)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => {
                  const Icon = getClassIcon(cls.code);
                  const hasData = cls.closingBalance > 0;

                  return (
                    <tr
                      key={cls.code}
                      className={`border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] transition-colors ${
                        hasData ? 'font-medium' : ''
                      }`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${hasData ? 'text-purple-500' : 'text-gray-700'}`} />
                          <span className={`font-mono ${hasData ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                            {cls.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[var(--color-text-secondary)]">{cls.description}</td>
                      {/* Assets at Cost */}
                      <td className="py-2 px-2 text-right">{formatNumber(cls.openingBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.additions)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.revaluations)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.disposals)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.impairment)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(cls.closingBalance)}</td>
                      {/* Accumulated Depreciation */}
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depOpeningBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depreciationCost)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depreciationRevaluation)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depreciationTotal)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depRevaluations)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depDisposals)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(cls.depClosingBalance)}</td>
                      {/* Closing Carrying Value */}
                      <td className="py-2 px-2 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatNumber(cls.closingCarryingValue)}
                      </td>
                      {/* Revaluation Reserve */}
                      <td className="py-2 px-2 text-right">{formatNumber(cls.revOpeningBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.revaluationSurplus)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.depreciationRevaluation2)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.revClosingBalance)}</td>
                      {/* Other */}
                      <td className="py-2 px-2 text-right">{formatNumber(cls.impairmentWriteOffs)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.profitLossOnDisposal)}</td>
                      {/* Current Month */}
                      <td className="py-2 px-2 text-right">{formatNumber(cls.currentMonthDepCost)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(cls.currentMonthDepReval)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(cls.currentMonthDepTotal)}</td>
                    </tr>
                  );
                })}

                {/* Totals Row */}
                <tr className="border-t-2 border-[var(--color-border)] bg-[var(--color-background-subtle)] font-bold">
                  <td className="py-3 px-2" colSpan={2}>TOTAL</td>
                  {/* Assets at Cost */}
                  <td className="py-3 px-2 text-right">{formatNumber(totals.openingBalance)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.additions)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.revaluations)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.disposals)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.impairment)}</td>
                  <td className="py-3 px-2 text-right text-blue-600 dark:text-blue-400">
                    {formatNumber(totals.closingBalance)}
                  </td>
                  {/* Accumulated Depreciation */}
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depOpeningBalance)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depreciationCost)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depreciationRevaluation)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depreciationTotal)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depRevaluations)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depDisposals)}</td>
                  <td className="py-3 px-2 text-right text-orange-600 dark:text-orange-400">
                    {formatNumber(totals.depClosingBalance)}
                  </td>
                  {/* Closing Carrying Value */}
                  <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">
                    {formatNumber(totals.closingCarryingValue)}
                  </td>
                  {/* Revaluation Reserve */}
                  <td className="py-3 px-2 text-right">{formatNumber(totals.revOpeningBalance)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.revaluationSurplus)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.depreciationRevaluation2)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.revClosingBalance)}</td>
                  {/* Other */}
                  <td className="py-3 px-2 text-right">{formatNumber(totals.impairmentWriteOffs)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.profitLossOnDisposal)}</td>
                  {/* Current Month */}
                  <td className="py-3 px-2 text-right">{formatNumber(totals.currentMonthDepCost)}</td>
                  <td className="py-3 px-2 text-right">{formatNumber(totals.currentMonthDepReval)}</td>
                  <td className="py-3 px-2 text-right text-red-600 dark:text-red-400">
                    {formatNumber(totals.currentMonthDepTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>

      {/* Additional Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Répartition par classe
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {classes.filter(c => c.closingBalance > 0).map(cls => {
                const percentage = (cls.closingBalance / totals.closingBalance) * 100;
                return (
                  <div key={cls.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#525252]/100" />
                      <span className="text-sm">{cls.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#525252]/100 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Info className="w-5 h-5" />
              Analyse des classes
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-purple-500 mt-0.5" />
                <p>La classe 23-BIA (Bâtiments) représente 94.3% de la valeur totale.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <p>Additions significatives en classe 24-MM (Matériel): 27.5M FCFA.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p>Aucune immobilisation incorporelle (classe 21) active.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                <p>Aucun terrain (classe 22) enregistré dans les actifs.</p>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Update any existing filter logic here
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default AssetsClassSummary;