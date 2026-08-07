import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
  ShareIcon,
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart3,
  PieChart,
  FileText,
  Users,
  Eye,
  Share,
  Download,
  Filter,
  TrendingUp
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
import { formatDate } from '../../lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Report {
  id: string;
  name: string;
  type: 'financial' | 'analytical' | 'management' | 'regulatory';
  category: string;
  description: string;
  lastGenerated: string;
  generatedBy: string;
  views: number;
  status: 'active' | 'draft' | 'archived';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';
  format: 'pdf' | 'excel' | 'dashboard';
  isPublic: boolean;
  tags: string[];
}

// Supported export formats — derived from static capabilities; update when adapter adds new formats
const SUPPORTED_FORMATS = ['PDF', 'Excel', 'Dashboard'] as const;

const ReportingDashboard: React.FC = () => {
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'overview' | 'reports' | 'dashboards'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Load fiscal years from adapter.
  // NB : on NE filtre PAS par fenêtre calendaire glissante (7/30/90 j depuis aujourd'hui) :
  // les données comptables sont datées dans leurs exercices (souvent antérieurs), un cutoff
  // « N derniers jours » les masquerait entièrement (KPI à 0, rapports jamais générés).
  const { data: fiscalYears = [], isLoading: fyLoading, isError: fyError } = useQuery({
    queryKey: ['dashboard-fiscal-years'],
    queryFn: () => adapter.getAll<any>('fiscalYears'),
  });

  // Load journal entries (hors brouillons) — sans troncature calendaire glissante.
  const { data: journalEntries = [], isLoading: jeLoading, isError: jeError } = useQuery({
    queryKey: ['dashboard-journal-entries'],
    queryFn: async () => {
      const all = await adapter.getAll<any>('journalEntries');
      return (all as Array<any>).filter(e => e.status !== 'draft');
    },
  });

  // Build report list from real data
  const reports: Report[] = useMemo(() => {
    const result: Report[] = [];

    // Financial report per fiscal year
    for (const fy of fiscalYears) {
      result.push({
        id: `fy-${fy.id}`,
        name: t('reportingDashboard.balanceSheetFor', { name: fy.name || fy.code }),
        type: 'financial',
        category: t('reportingDashboard.catAccounting'),
        description: t('reportingDashboard.financialStatementsForYear', { year: fy.startDate?.substring(0, 4) || '' }),
        lastGenerated: fy.endDate || new Date().toISOString(),
        generatedBy: 'system',
        views: 0,
        status: fy.isClosed ? 'active' : 'draft',
        frequency: 'annual',
        format: 'pdf',
        isPublic: true,
        // Les tags alimentent la recherche plein texte : ils sont traduits,
        // sinon la recherche par mot-clé ne fonctionne qu'en français.
        tags: [t('reportingDashboard.tagBalanceSheet'), t('reportingDashboard.tagAccounting'), 'syscohada'],
      });
    }

    // Analytical report if entries exist
    if (journalEntries.length > 0) {
      const latestEntry = journalEntries.reduce((latest, e) => e.date > latest.date ? e : latest, journalEntries[0]);
      result.push({
        id: 'analytical-current',
        name: t('reportingDashboard.profitabilityAnalysis'),
        type: 'analytical',
        category: t('reportingDashboard.catAnalysis'),
        description: t('reportingDashboard.analysisBasedOn', { count: String(journalEntries.length) }),
        lastGenerated: latestEntry.date,
        generatedBy: 'system',
        views: 0,
        status: 'active',
        frequency: 'monthly',
        format: 'excel',
        isPublic: true,
        tags: [t('reportingDashboard.tagProfitability'), t('reportingDashboard.tagAnalysis')],
      });
    }

    return result;
  }, [fiscalYears, journalEntries, t]);

  const reportsLoading = fyLoading || jeLoading;
  const reportsError = fyError || jeError;

  // Compute total entry count for "Générations" KPI
  const totalGenerations = journalEntries.length.toString();

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
      case 'analytical': return 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]';
      case 'management': return 'bg-primary-100 text-primary-700';
      default: return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
    }
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <BarChart3 className="h-4 w-4" />;
      case 'analytical': return <PieChart className="h-4 w-4" />;
      case 'management': return <TrendingUp className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (reportsLoading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-6 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md"
          >
            <div className="w-20 h-20 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">{t('reportingDashboard.loading')}</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  if (reportsError) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md text-center">
            <DocumentTextIcon className="h-12 w-12 text-red-400" />
            <p className="text-lg font-semibold text-neutral-700">{t('reportingDashboard.loadError')}</p>
            <p className="text-sm text-neutral-500">{t('reportingDashboard.loadErrorHint')}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title={t('reportingDashboard.title')}
          subtitle={t('reportingDashboard.subtitle')}
          icon={ChartBarIcon}
          action={
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white border border-neutral-200 rounded-2xl px-4 py-2 text-sm font-medium"
              >
                <option value="7d">{t('reportingDashboard.period7d')}</option>
                <option value="30d">{t('reportingDashboard.period30d')}</option>
                <option value="90d">{t('reportingDashboard.period90d')}</option>
              </select>
              <ElegantButton icon={PlusIcon} onClick={() => navigate('/reporting/reports')}>
                {t('reportingDashboard.newReport')}
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={t('reportingDashboard.kpiActive')}
            value={reports.filter(r => r.status === 'active').length.toString()}
            subtitle={t('reportingDashboard.kpiActiveSub')}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title={t('reportingDashboard.kpiGenerated')}
            value={reports.length.toString()}
            subtitle={t('reportingDashboard.kpiGeneratedSub', { period: t(selectedPeriod === '7d' ? 'reportingDashboard.span7d' : selectedPeriod === '30d' ? 'reportingDashboard.span30d' : 'reportingDashboard.span90d') })}
            icon={Eye}
            color="success"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title={t('reportingDashboard.kpiShared')}
            value={reports.filter(r => r.isPublic).length.toString()}
            subtitle={t('reportingDashboard.kpiSharedSub')}
            icon={Share}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title={t('reportingDashboard.kpiEntries')}
            value={totalGenerations}
            subtitle={t('reportingDashboard.kpiEntriesSub')}
            icon={Download}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Report Types Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernChartCard
            title={t('reportingDashboard.chartTitle')}
            subtitle={t('reportingDashboard.chartSubtitle')}
            icon={PieChart}
          >
            <ColorfulBarChart
              data={[
                { label: t('reportingDashboard.typeFinancial'), value: reports.filter(r => r.type === 'financial').length, color: 'bg-[var(--color-primary)]' },
                { label: t('reportingDashboard.typeAnalytical'), value: reports.filter(r => r.type === 'analytical').length, color: 'bg-[var(--color-text-secondary)]' },
                { label: t('reportingDashboard.typeManagement'), value: reports.filter(r => r.type === 'management').length, color: 'bg-primary-400' },
                { label: t('reportingDashboard.typeRegulatory'), value: reports.filter(r => r.type === 'regulatory').length, color: 'bg-orange-400' }
              ]}
              height={200}
            />
          </ModernChartCard>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reports */}
          <UnifiedCard variant="elevated" size="lg" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/90 rounded-2xl">
                  <FileText className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">{t('reportingDashboard.recentReports')}</h2>
                  <p className="text-neutral-600">{t('reportingDashboard.recentReportsSub')}</p>
                </div>
              </div>
              <Link to="/reporting/reports">
                <ElegantButton variant="outline">
                  {t('reportingDashboard.viewAll')}
                </ElegantButton>
              </Link>
            </div>

            <div className="space-y-6">
              {reports.length === 0 && (
                <div className="flex flex-col items-center py-12 text-neutral-500 space-y-2">
                  <FileText className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm font-medium">{t('reportingDashboard.noReport')}</p>
                  <p className="text-xs text-neutral-400">{t('reportingDashboard.noReportHint')}</p>
                </div>
              )}
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-start justify-between p-6 border border-neutral-200 rounded-2xl hover:border-[var(--color-primary)]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary)]/10 rounded-2xl text-[var(--color-primary)]">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 group-hover:text-[var(--color-primary)] transition-colors">
                        {report.name}
                      </h4>
                      <p className="text-sm text-neutral-600 mb-2">{report.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-neutral-500">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {report.generatedBy}
                        </span>
                        <span className="flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {t('reportingDashboard.viewsCount', { count: String(report.views) })}
                        </span>
                        <span className="flex items-center">
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {formatDate(report.lastGenerated)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getReportTypeColor(report.type)}`}>
                      {t(report.type === 'financial' ? 'reportingDashboard.typeFinancial' :
                         report.type === 'analytical' ? 'reportingDashboard.typeAnalytical' :
                         report.type === 'management' ? 'reportingDashboard.typeManagement' : 'reportingDashboard.typeRegulatory')}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'active' ? 'bg-primary-100 text-primary-700' :
                      report.status === 'draft' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {t(report.status === 'active' ? 'reportingDashboard.statusActive' :
                         report.status === 'draft' ? 'reportingDashboard.statusDraft' : 'reportingDashboard.statusArchived')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </UnifiedCard>

          {/* Quick Stats */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">{t('reportingDashboard.statistics')}</h2>
                <p className="text-neutral-600">{t('reportingDashboard.statisticsSub')}</p>
              </div>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl border bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[var(--color-primary)]">{t('reportingDashboard.automaticReports')}</span>
                  <span className="font-bold text-xl text-[var(--color-primary)]">
                    {reports.filter(r => r.frequency !== 'on_demand').length}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-primary)]/80">{t('reportingDashboard.automaticReportsSub')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl border bg-primary-50/80 border-primary-200/60"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-primary-900">{t('reportingDashboard.supportedFormats')}</span>
                  <span className="font-bold text-xl text-primary-900">{SUPPORTED_FORMATS.length}</span>
                </div>
                <p className="text-sm text-primary-700">{SUPPORTED_FORMATS.join(', ')}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl border bg-[var(--color-text-secondary)]/5 border-[var(--color-text-secondary)]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[var(--color-text-secondary)]">{t('reportingDashboard.fiscalYears')}</span>
                  <span className="font-bold text-xl text-[var(--color-text-secondary)]">{fiscalYears.length}</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]/80">{t('reportingDashboard.fiscalYearsSub')}</p>
              </motion.div>
            </div>
          </UnifiedCard>
        </div>

        {/* Quick Actions */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">{t('reportingDashboard.quickActions')}</h2>
            <p className="text-neutral-600">{t('reportingDashboard.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/reporting/reports">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[var(--color-primary)]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary)]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <PlusIcon className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('reportingDashboard.createReport')}</h3>
                <p className="text-sm text-neutral-600">{t('reportingDashboard.createReportSub')}</p>
              </motion.div>
            </Link>

            <Link to="/reporting/syscohada">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <DocumentTextIcon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('reportingDashboard.templates')}</h3>
                <p className="text-sm text-neutral-600">{t('reportingDashboard.templatesSub')}</p>
              </motion.div>
            </Link>

            <Link to="/reporting/dashboards">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[var(--color-text-secondary)]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-text-secondary)]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-6 w-6 text-[var(--color-text-secondary)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('reportingDashboard.dashboards')}</h3>
                <p className="text-sm text-neutral-600">{t('reportingDashboard.dashboardsSub')}</p>
              </motion.div>
            </Link>

            <Link to="/reporting/tax">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-warning-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <ClockIcon className="h-6 w-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('reportingDashboard.scheduling')}</h3>
                <p className="text-sm text-neutral-600">{t('reportingDashboard.schedulingSub')}</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>
      </div>
    </PageContainer>
  );
};

export default ReportingDashboard;