import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import { FeatureGate, UpgradeBanner, useFeatureAccess } from '../../components/gating';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  PieChart,
  Target,
  FileCheck,
  Globe,
  Building,
  Layers,
  Calculator,
  BookOpen,
  DollarSign,
  Shield,
  Archive
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

interface IFRSReport {
  id: string;
  reportType: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_changes' | 'notes';
  title: string;
  period: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  lastModified: string;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  publishedDate?: string;
  version: string;
  standards: string[];
  consolidation: boolean;
  currency: string;
  fileSize: string;
}

interface IFRSStandard {
  code: string;
  title: string;
  category: 'measurement' | 'presentation' | 'disclosure' | 'consolidation';
  compliance: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  lastReview: string;
  impact: 'high' | 'medium' | 'low';
  notes: string;
}

interface ConsolidationEntity {
  id: string;
  name: string;
  country: string;
  currency: string;
  ownership: number;
  method: 'full' | 'proportional' | 'equity';
  status: 'active' | 'inactive';
  revenue: number;
  assets: number;
  consolidationDate: string;
}

interface ReportModal {
  isOpen: boolean;
  mode: 'view' | 'create' | 'edit';
  report?: IFRSReport;
}

const ReportingIFRS: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'reports' | 'standards' | 'consolidation'>('reports');
  const { allowed: canConsolidate } = useFeatureAccess('consolidation_groupe');
  const [reportModal, setReportModal] = useState<ReportModal>({ isOpen: false, mode: 'view' });
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().getFullYear().toString());

  // Load fiscal years from Dexie to generate IFRS reports
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['ifrs-fiscal-years'],
    queryFn: () => adapter.getAll<any>('fiscalYears'),
  });

  // Load journal entries to compute revenue/assets for consolidation view
  const { data: journalEntries = [] } = useQuery({
    queryKey: ['ifrs-journal-entries'],
    queryFn: async () => {
      const all = await adapter.getAll<any>('journalEntries');
      return all.filter(e => e.status === 'validated' || e.status === 'posted');
    },
  });

  // Build IFRS reports from fiscal years
  const ifrsReports: IFRSReport[] = useMemo(() => {
    const types: Array<{ type: IFRSReport['reportType']; label: string; standards: string[] }> = [
      { type: 'balance_sheet', label: t('reportingIfrs.reportBalanceSheetLabel'), standards: ['IAS 1', 'IFRS 7', 'IFRS 13'] },
      { type: 'income_statement', label: t('reportingIfrs.reportIncomeStatementLabel'), standards: ['IAS 1', 'IFRS 15'] },
      { type: 'cash_flow', label: t('reportingIfrs.reportCashFlowLabel'), standards: ['IAS 7'] },
      { type: 'equity_changes', label: t('reportingIfrs.reportEquityChangesLabel'), standards: ['IAS 1'] },
      { type: 'notes', label: t('reportingIfrs.reportNotesLabel'), standards: ['IFRS 7', 'IFRS 13', 'IAS 24', 'IAS 36'] },
    ];
    const result: IFRSReport[] = [];
    for (const fy of fiscalYears) {
      const fyStatus = fy.isClosed ? 'approved' : 'draft';
      for (const rt of types) {
        result.push({
          id: `${fy.id}-${rt.type}`,
          reportType: rt.type,
          title: `${rt.label} — ${fy.startDate?.substring(0, 4) || ''}`,
          period: fy.endDate || '',
          status: fyStatus as IFRSReport['status'],
          lastModified: fy.endDate || new Date().toISOString().split('T')[0],
          createdBy: 'system',
          version: '1.0',
          standards: rt.standards,
          consolidation: true,
          currency: 'XAF',
          fileSize: '-',
        });
      }
    }
    return result;
  }, [fiscalYears]);

  // Compute total revenue from class 7 entries
  const totalRevenue = useMemo(() => {
    let revenue = 0;
    for (const e of journalEntries) {
      for (const l of (e.lines || [])) {
        if (l.accountCode?.startsWith('7')) {
          revenue += (l.credit || 0) - (l.debit || 0);
        }
      }
    }
    return revenue;
  }, [journalEntries]);

  // Compute total assets = soldes débiteurs des classes 2 à 5 (actif immobilisé + circulant + trésorerie)
  const totalAssets = useMemo(() => {
    let assets = 0;
    for (const e of journalEntries) {
      for (const l of (e.lines || [])) {
        const code = l.accountCode || '';
        if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
          assets += (l.debit || 0) - (l.credit || 0);
        }
      }
    }
    return assets;
  }, [journalEntries]);

  // Static IFRS standards compliance (reference data)
  const IFRS_STANDARDS: IFRSStandard[] = [
    { code: 'IFRS 15', title: t('reportingIfrs.std15Title'), category: 'measurement', compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingIfrs.std15Notes') },
    { code: 'IFRS 16', title: t('reportingIfrs.std16Title'), category: 'measurement', compliance: 'partial', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingIfrs.std16Notes') },
    { code: 'IAS 36', title: t('reportingIfrs.std36Title'), category: 'measurement', compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'medium', notes: t('reportingIfrs.std36Notes') },
    { code: 'IFRS 7', title: t('reportingIfrs.std7Title'), category: 'disclosure', compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingIfrs.std7Notes') },
    { code: 'IFRS 13', title: t('reportingIfrs.std13Title'), category: 'measurement', compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'medium', notes: t('reportingIfrs.std13Notes') },
  ];

  // Consolidation entity built from real data
  const consolidationEntities: ConsolidationEntity[] = useMemo(() => {
    return [{
      id: 'local-entity',
      name: t('reportingIfrs.mainEntityName'),
      country: 'Zone OHADA',
      currency: 'XAF',
      ownership: 100,
      method: 'full' as const,
      status: 'active' as const,
      revenue: totalRevenue,
      assets: totalAssets,
      consolidationDate: new Date().toISOString().split('T')[0],
    }];
  }, [totalRevenue, totalAssets]);

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return ifrsReports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.standards.some(std => std.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesType = filterType === 'all' || report.reportType === filterType;
      const matchesPeriod = filterPeriod === 'all' || report.period.includes(filterPeriod);

      return matchesSearch && matchesStatus && matchesType && matchesPeriod;
    });
  }, [searchTerm, filterStatus, filterType, filterPeriod, ifrsReports]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalReports = filteredReports.length;
    const approvedReports = filteredReports.filter(r => r.status === 'approved').length;
    const draftReports = filteredReports.filter(r => r.status === 'draft').length;
    const reviewReports = filteredReports.filter(r => r.status === 'review').length;

    const compliantStandards = IFRS_STANDARDS.filter(s => s.compliance === 'compliant').length;
    const totalStandards = IFRS_STANDARDS.length;
    const complianceRate = compliantStandards / totalStandards;

    const consolidatedEntities = consolidationEntities.filter(e => e.status === 'active').length;
    const totalRevenue = consolidationEntities.reduce((sum, e) => sum + e.revenue, 0);

    return {
      totalReports,
      approvedReports,
      draftReports,
      reviewReports,
      complianceRate,
      consolidatedEntities,
      totalRevenue
    };
  }, [filteredReports, IFRS_STANDARDS, consolidationEntities]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-[var(--color-primary)] bg-[var(--color-primary)]/5';
      case 'published': return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/5';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'review': return <Clock className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'published': return <FileCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getComplianceColor = (compliance: string) => {
    switch (compliance) {
      case 'compliant': return 'text-green-600 bg-green-50';
      case 'partial': return 'text-yellow-600 bg-yellow-50';
      case 'non_compliant': return 'text-red-600 bg-red-50';
      case 'not_applicable': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const reportTypeLabels = {
    balance_sheet: t('reportingIfrs.typeBalanceSheet'),
    income_statement: t('reportingIfrs.typeIncomeStatement'),
    cash_flow: t('reportingIfrs.typeCashFlow'),
    equity_changes: t('reportingIfrs.typeEquityChanges'),
    notes: t('reportingIfrs.typeNotes')
  };

  const chartData = [
    { label: t('reportingIfrs.chartApproved'), value: aggregatedData.approvedReports, color: 'bg-green-500' },
    { label: t('reportingIfrs.chartInReview'), value: aggregatedData.reviewReports, color: 'bg-yellow-500' },
    { label: t('reportingIfrs.chartDrafts'), value: aggregatedData.draftReports, color: 'bg-[var(--color-primary)]' }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title={t('reportingIfrs.pageTitle')}
          subtitle={t('reportingIfrs.pageSubtitle')}
          icon={FileText}
          action={
            <div className="flex gap-3">
              <ElegantButton
                variant="outline"
                icon={RefreshCw}
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['ifrs-fiscal-years'] });
                  queryClient.invalidateQueries({ queryKey: ['ifrs-journal-entries'] });
                }}
              >
                {t('reportingIfrs.refresh')}
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setReportModal({ isOpen: true, mode: 'create' })}
              >
                {t('reportingIfrs.newReport')}
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={t('reportingIfrs.kpiReportsTitle')}
            value={aggregatedData.totalReports.toString()}
            subtitle={t('reportingIfrs.approvedCount', { count: String(aggregatedData.approvedReports) })}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title={t('reportingIfrs.kpiComplianceTitle')}
            value={formatPercentage(aggregatedData.complianceRate * 100)}
            subtitle={t('reportingIfrs.compliantStandardsSubtitle', { compliant: String(IFRS_STANDARDS.filter(s => s.compliance === 'compliant').length), total: String(IFRS_STANDARDS.length) })}
            icon={Shield}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title={t('reportingIfrs.kpiEntitiesTitle')}
            value={aggregatedData.consolidatedEntities.toString()}
            subtitle={t('reportingIfrs.kpiEntitiesSubtitle')}
            icon={Building}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title={t('reportingIfrs.kpiRevenueTitle')}
            value={`${(aggregatedData.totalRevenue / 1000000).toFixed(0)}M XAF`}
            subtitle={t('reportingIfrs.kpiRevenueSubtitle')}
            icon={TrendingUp}
            color="warning"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* View Mode Selector */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
              {(['reports', 'standards', 'consolidation'] as const).map((mode) => {
                const isLocked = mode === 'consolidation' && !canConsolidate;
                return (
                  <button
                    key={mode}
                    onClick={() => { if (!isLocked) setViewMode(mode); }}
                    disabled={isLocked}
                    title={isLocked ? t('reportingIfrs.consolidationPremiumTooltip') : undefined}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      viewMode === mode
                        ? 'bg-[var(--color-primary)] text-white shadow-md'
                        : isLocked
                          ? 'text-neutral-400 cursor-not-allowed'
                          : 'text-neutral-600 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {mode === 'reports' ? t('reportingIfrs.tabReports') :
                     mode === 'standards' ? t('reportingIfrs.tabStandards') : t('reportingIfrs.tabConsolidation')}
                    {isLocked && (
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(239,159,39,0.15)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)' }}
                      >
                        Premium
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">{t('reportingIfrs.periodLabel')}</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {fiscalYears.length > 0 ? (
                  fiscalYears.map(fy => {
                    const year = fy.startDate?.substring(0, 4) || '';
                    return <option key={fy.id} value={year}>{year}</option>;
                  })
                ) : (
                  <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                )}
              </select>
            </div>
          </div>
        </UnifiedCard>

        {viewMode === 'reports' && (
          <>
            {/* Chart Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ModernChartCard
                title={t('reportingIfrs.chartCardTitle')}
                subtitle={t('reportingIfrs.chartCardSubtitle')}
                icon={PieChart}
              >
                <ColorfulBarChart
                  data={chartData}
                  height={160}
                />
              </ModernChartCard>
            </motion.div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">{t('reportingIfrs.filtersTitle')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder={t('reportingIfrs.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="all">{t('reportingIfrs.allStatuses')}</option>
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="review">{t('reportingIfrs.statusInReview')}</option>
                    <option value="approved">{t('reportingIfrs.statusApproved')}</option>
                    <option value="published">{t('reportingIfrs.statusPublished')}</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="all">{t('reportingIfrs.allTypes')}</option>
                    <option value="balance_sheet">{t('reportingIfrs.typeBalanceSheet')}</option>
                    <option value="income_statement">{t('reportingIfrs.typeIncomeStatement')}</option>
                    <option value="cash_flow">{t('reportingIfrs.typeCashFlow')}</option>
                    <option value="equity_changes">{t('reportingIfrs.typeEquityChanges')}</option>
                    <option value="notes">{t('reportingIfrs.typeNotes')}</option>
                  </select>

                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]"
                  >
                    <option value="all">{t('reportingIfrs.allPeriods')}</option>
                    {fiscalYears.map(fy => {
                      const year = fy.startDate?.substring(0, 4) || '';
                      return <option key={fy.id} value={year}>{year}</option>;
                    })}
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Reports List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  {t('reportingIfrs.reportsListTitle', { count: String(filteredReports.length) })}
                </h3>

                <div className="space-y-4">
                  {filteredReports.map((report, index) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start space-x-4">
                            <div className="p-3 bg-[var(--color-primary)]/10 rounded-lg">
                              <FileText className="h-6 w-6 text-[var(--color-primary)]" />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-neutral-800 text-lg">{report.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span>{reportTypeLabels[report.reportType]}</span>
                                <span>•</span>
                                <span>{report.period}</span>
                                <span>•</span>
                                <span>v{report.version}</span>
                                <span>•</span>
                                <span>{report.fileSize}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {report.standards.map(standard => (
                                  <span
                                    key={standard}
                                    className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                                  >
                                    {standard}
                                  </span>
                                ))}
                                {report.consolidation && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                                    {t('reportingIfrs.consolidatedBadge')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center space-x-1 ${getStatusColor(report.status)}`}>
                              {getStatusIcon(report.status)}
                              <span>
                                {report.status === 'draft' ? t('reportingIfrs.statusDraft') :
                                 report.status === 'review' ? t('reportingIfrs.statusInReview') :
                                 report.status === 'approved' ? t('reportingIfrs.statusApproved') : t('reportingIfrs.statusPublished')}
                              </span>
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setReportModal({ isOpen: true, mode: 'view', report })}
                                className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
                                aria-label={t('reportingIfrs.viewAction')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">{t('reportingIfrs.createdByLabel')}</p>
                            <p className="font-medium text-neutral-800">{report.createdBy}</p>
                          </div>
                          {report.reviewedBy && (
                            <div>
                              <p className="text-sm text-neutral-500">{t('reportingIfrs.reviewedByLabel')}</p>
                              <p className="font-medium text-neutral-800">{report.reviewedBy}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-neutral-500">{t('reportingIfrs.lastModifiedLabel')}</p>
                            <p className="font-medium text-neutral-800">{formatDate(report.lastModified)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </UnifiedCard>
          </>
        )}

        {viewMode === 'standards' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-800">
                {t('reportingIfrs.standardsComplianceTitle')}
              </h3>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {t('reportingIfrs.standardsDisclaimer')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thStandard')}</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thTitle')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thCategory')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thCompliance')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thImpact')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingIfrs.thLastReview')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IFRS_STANDARDS.map((standard, index) => (
                      <motion.tr
                        key={standard.code}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        <td className="py-4 px-4">
                          <span className="font-semibold text-neutral-800">{standard.code}</span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-neutral-800">{standard.title}</p>
                          <p className="text-sm text-neutral-500 mt-1">{standard.notes}</p>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                            {standard.category === 'measurement' ? t('reportingIfrs.categoryMeasurement') :
                             standard.category === 'presentation' ? t('reportingIfrs.categoryPresentation') :
                             standard.category === 'disclosure' ? t('reportingIfrs.categoryDisclosure') : t('reportingIfrs.categoryConsolidation')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplianceColor(standard.compliance)}`}>
                            {standard.compliance === 'compliant' ? t('reportingIfrs.complianceCompliant') :
                             standard.compliance === 'partial' ? t('reportingIfrs.compliancePartial') :
                             standard.compliance === 'non_compliant' ? t('reportingIfrs.complianceNonCompliant') : t('reportingIfrs.complianceNA')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            standard.impact === 'high' ? 'bg-red-50 text-red-600' :
                            standard.impact === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {standard.impact === 'high' ? t('reportingIfrs.impactHigh') :
                             standard.impact === 'medium' ? t('reportingIfrs.impactMedium') : t('reportingIfrs.impactLow')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm text-neutral-600">
                            {formatDate(standard.lastReview)}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UnifiedCard>
        )}

        {viewMode === 'consolidation' && (
          <FeatureGate
            feature="consolidation_groupe"
            fallback={<UpgradeBanner feature="consolidation_groupe" />}
          >
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">
                  {t('reportingIfrs.consolidationScopeTitle')}
                </h3>
                <ElegantButton variant="primary" icon={Plus} onClick={() => navigate('/config/multi-societes')}>
                  {t('reportingIfrs.addEntity')}
                </ElegantButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {consolidationEntities.map((entity, index) => (
                  <motion.div
                    key={entity.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                            <Building className="h-5 w-5 text-[var(--color-primary)]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800">{entity.name}</h4>
                            <p className="text-sm text-neutral-500">{entity.country}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          entity.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                        }`}>
                          {entity.status === 'active' ? t('reportingIfrs.entityActive') : t('reportingIfrs.entityInactive')}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">{t('reportingIfrs.ownershipLabel')}</span>
                          <span className="font-semibold text-neutral-800">{entity.ownership}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">{t('reportingIfrs.methodLabel')}</span>
                          <span className="font-medium text-neutral-700">
                            {entity.method === 'full' ? t('reportingIfrs.methodFull') :
                             entity.method === 'proportional' ? t('reportingIfrs.methodProportional') :
                             t('reportingIfrs.methodEquity')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">{t('reportingIfrs.revenueLabel')}</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(entity.revenue, entity.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">{t('reportingIfrs.assetsLabel')}</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(entity.assets, entity.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500">
                          {t('reportingIfrs.consolidatedAtLabel')} {formatDate(entity.consolidationDate)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </UnifiedCard>
          </FeatureGate>
        )}

        {/* Report Modal */}
        {reportModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    {reportModal.mode === 'create' ? t('reportingIfrs.modalCreateTitle') :
                     reportModal.mode === 'edit' ? t('reportingIfrs.modalEditTitle') : t('reportingIfrs.modalViewTitle')}
                  </h3>
                  <button
                    onClick={() => setReportModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {reportModal.report ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldReportTitle')}
                        </label>
                        <p className="text-neutral-800 font-semibold">{reportModal.report.title}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldReportType')}
                        </label>
                        <p className="text-neutral-800">{reportTypeLabels[reportModal.report.reportType]}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldPeriod')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.period}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldStandardsApplied')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {reportModal.report.standards.map(standard => (
                            <span
                              key={standard}
                              className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                            >
                              {standard}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldStatus')}
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(reportModal.report.status)}`}>
                          {reportModal.report.status === 'draft' ? t('reportingIfrs.statusDraft') :
                           reportModal.report.status === 'review' ? t('reportingIfrs.statusInReview') :
                           reportModal.report.status === 'approved' ? t('reportingIfrs.statusApproved') : t('reportingIfrs.statusPublished')}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldVersion')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.version}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingIfrs.fieldCreatedBy')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.createdBy}</p>
                      </div>

                      {reportModal.report.approvedBy && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {t('reportingIfrs.fieldApprovedBy')}
                          </label>
                          <p className="text-neutral-800">{reportModal.report.approvedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>{t('reportingIfrs.createFormPlaceholder')}</p>
                    <p className="text-sm mt-2">{t('reportingIfrs.createFormSubtext')}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setReportModal({ isOpen: false, mode: 'view' })}
                  >
                    {reportModal.mode === 'view' ? t('reportingIfrs.close') : t('reportingIfrs.cancel')}
                  </ElegantButton>
                  {reportModal.mode !== 'view' && (
                    <ElegantButton variant="primary" onClick={() => navigate('/reporting/builder')}>
                      {t('reportingIfrs.openReportBuilder')}
                    </ElegantButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ReportingIFRS;