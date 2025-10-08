import React, { useState } from 'react';
import {
  Package, TrendingUp, Download, Calendar, Filter,
  Building, Computer, Car, FileText, Settings,
  ChevronDown, ChevronUp, DollarSign, BarChart3,
  PieChart, AlertCircle, Info
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';

interface CategoryData {
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

const AssetsCategorySummary: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState({
    from: '1 janvier 2018',
    to: '28 février 2018'
  });

  const categories: CategoryData[] = [
    {
      code: '213-LA',
      description: '213- Logiciels et apps',
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
      code: '212-DL',
      description: '212 - Droits et licences',
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
      code: '211-FD',
      description: '211 - Frais de développement',
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
      code: '221-TB',
      description: '221 - Terrains bâtis',
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
      code: '222-TNB',
      description: '222- Terrains Non-bâtis',
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
      code: '231-BAT',
      description: '231 - Bâtiments',
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
      code: '232-IT',
      description: '232-Installations techniques',
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
      code: '234-AGT',
      description: '234 - Agencements',
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
      code: '234-SS',
      description: '234 - Sécurité et sûreté',
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
      code: '241-MT',
      description: '241 - Matériel technique',
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
    },
    {
      code: '245-VHL',
      description: '245 - Véhicules',
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
      code: '244-MOB',
      description: '244 - Mobilier',
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
      code: '244-EM',
      description: '244 - Équipements de manutention',
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
      code: '244-DS',
      description: '244 - Décoration et signalétique',
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
    }
  ];

  // Calculate totals
  const totals = categories.reduce((acc, cat) => ({
    openingBalance: acc.openingBalance + cat.openingBalance,
    additions: acc.additions + cat.additions,
    revaluations: acc.revaluations + cat.revaluations,
    disposals: acc.disposals + cat.disposals,
    impairment: acc.impairment + cat.impairment,
    closingBalance: acc.closingBalance + cat.closingBalance,
    depOpeningBalance: acc.depOpeningBalance + cat.depOpeningBalance,
    depreciationCost: acc.depreciationCost + cat.depreciationCost,
    depreciationRevaluation: acc.depreciationRevaluation + cat.depreciationRevaluation,
    depreciationTotal: acc.depreciationTotal + cat.depreciationTotal,
    depRevaluations: acc.depRevaluations + cat.depRevaluations,
    depDisposals: acc.depDisposals + cat.depDisposals,
    depClosingBalance: acc.depClosingBalance + cat.depClosingBalance,
    closingCarryingValue: acc.closingCarryingValue + cat.closingCarryingValue,
    revOpeningBalance: acc.revOpeningBalance + cat.revOpeningBalance,
    revaluationSurplus: acc.revaluationSurplus + cat.revaluationSurplus,
    depreciationRevaluation2: acc.depreciationRevaluation2 + cat.depreciationRevaluation2,
    revClosingBalance: acc.revClosingBalance + cat.revClosingBalance,
    impairmentWriteOffs: acc.impairmentWriteOffs + cat.impairmentWriteOffs,
    profitLossOnDisposal: acc.profitLossOnDisposal + cat.profitLossOnDisposal,
    currentMonthDepCost: acc.currentMonthDepCost + cat.currentMonthDepCost,
    currentMonthDepReval: acc.currentMonthDepReval + cat.currentMonthDepReval,
    currentMonthDepTotal: acc.currentMonthDepTotal + cat.currentMonthDepTotal
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

  const toggleCategory = (code: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(code)) {
      newExpanded.delete(code);
    } else {
      newExpanded.add(code);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (code: string) => {
    if (code.startsWith('21') && code.includes('LA')) return Computer;
    if (code.startsWith('22')) return Building;
    if (code.startsWith('23')) return Building;
    if (code.startsWith('24') && code.includes('VHL')) return Car;
    if (code.startsWith('24')) return Package;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm uppercase tracking-wide">Catégorie</p>
            <h1 className="text-2xl font-bold">EMERGENCE PLAZA SA</h1>
            <h2 className="text-xl mt-1">Asset Category Summary</h2>
            <p className="text-sm text-white/80 mt-2">
              From {selectedPeriod.from} to {selectedPeriod.to}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
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
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
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
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
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
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
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
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
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
                <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">
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
            <h3 className="text-lg font-semibold">Résumé par catégorie</h3>
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
                  <th colSpan={6} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-[#6A8A82]/10/50 dark:bg-blue-900/10">
                    Assets at Cost
                  </th>
                  <th colSpan={7} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-orange-50/50 dark:bg-orange-900/10">
                    Accumulated Depreciation
                  </th>
                  <th className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-green-50/50 dark:bg-green-900/10">
                    Closing Value
                  </th>
                  <th colSpan={4} className="text-center py-2 px-2 font-semibold text-[var(--color-text-primary)] bg-[#B87333]/10/50 dark:bg-purple-900/10">
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
                  <th className="text-left py-2 px-2 font-medium text-[var(--color-text-secondary)]">Category</th>
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
                {categories.map((category, index) => {
                  const Icon = getCategoryIcon(category.code);
                  const hasData = category.closingBalance > 0;

                  return (
                    <tr
                      key={category.code}
                      className={`border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)] transition-colors ${
                        hasData ? 'font-medium' : ''
                      }`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${hasData ? 'text-blue-500' : 'text-gray-700'}`} />
                          <span className={`font-mono ${hasData ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                            {category.code}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[var(--color-text-secondary)]">{category.description}</td>
                      {/* Assets at Cost */}
                      <td className="py-2 px-2 text-right">{formatNumber(category.openingBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.additions)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.revaluations)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.disposals)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.impairment)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(category.closingBalance)}</td>
                      {/* Accumulated Depreciation */}
                      <td className="py-2 px-2 text-right">{formatNumber(category.depOpeningBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depreciationCost)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depreciationRevaluation)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depreciationTotal)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depRevaluations)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depDisposals)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(category.depClosingBalance)}</td>
                      {/* Closing Carrying Value */}
                      <td className="py-2 px-2 text-right font-semibold text-green-600 dark:text-green-400">
                        {formatNumber(category.closingCarryingValue)}
                      </td>
                      {/* Revaluation Reserve */}
                      <td className="py-2 px-2 text-right">{formatNumber(category.revOpeningBalance)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.revaluationSurplus)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.depreciationRevaluation2)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.revClosingBalance)}</td>
                      {/* Other */}
                      <td className="py-2 px-2 text-right">{formatNumber(category.impairmentWriteOffs)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.profitLossOnDisposal)}</td>
                      {/* Current Month */}
                      <td className="py-2 px-2 text-right">{formatNumber(category.currentMonthDepCost)}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(category.currentMonthDepReval)}</td>
                      <td className="py-2 px-2 text-right font-semibold">{formatNumber(category.currentMonthDepTotal)}</td>
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

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Répartition par catégorie
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {categories.filter(c => c.closingBalance > 0).map(category => {
                const percentage = (category.closingBalance / totals.closingBalance) * 100;
                return (
                  <div key={category.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#6A8A82]/100" />
                      <span className="text-sm">{category.description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#6A8A82]/100 h-2 rounded-full"
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
              Notes et observations
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p>Les actifs de sécurité (234-SS) représentent 94% de la valeur totale des immobilisations.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
                <p>Une addition significative de 27.5M FCFA en matériel technique (241-MT) ce mois.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <p>Taux d'amortissement global: 1.8% de la valeur brute.</p>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      </div>
    </div>
  );
};

export default AssetsCategorySummary;