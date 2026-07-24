import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
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
  Archive,
  MapPin,
  Flag
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

interface SyscohadaReport {
  id: string;
  reportType: 'bilan_syscohada' | 'compte_resultat_syscohada' | 'tafire' | 'notes_annexes' | 'tableau_tresorerie';
  title: string;
  period: string;
  status: 'draft' | 'review' | 'approved' | 'filed';
  lastModified: string;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  filedDate?: string;
  version: string;
  country: string;
  regulatoryRef: string;
  currency: string;
  fileSize: string;
}

interface SyscohadaStandard {
  code: string;
  title: string;
  category: 'measurement' | 'presentation' | 'disclosure';
  applicableCountries: string[];
  compliance: 'compliant' | 'partial' | 'non_compliant' | 'not_applicable';
  lastReview: string;
  impact: 'high' | 'medium' | 'low';
  notes: string;
}

interface OHADACountry {
  code: string;
  name: string;
  currency: string;
  filingDeadline: string;
  localRequirements: string[];
  status: 'active' | 'pending' | 'exempted';
  revenue: number;
  entities: number;
}

interface ReportModal {
  isOpen: boolean;
  mode: 'view' | 'create' | 'edit';
  report?: SyscohadaReport;
}

const ReportingSyscohada: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [viewMode, setViewMode] = useState<'reports' | 'standards' | 'countries'>('reports');
  const [reportModal, setReportModal] = useState<ReportModal>({ isOpen: false, mode: 'view' });
  const [selectedPeriod, setSelectedPeriod] = useState('2024');

  // Load fiscal years from Dexie to generate SYSCOHADA reports
  const { data: fiscalYears = [] } = useQuery({
    queryKey: ['syscohada-fiscal-years'],
    queryFn: () => adapter.getAll<any>('fiscalYears'),
  });

  // Load journal entries to compute real revenue
  const { data: allEntries = [] } = useQuery({
    queryKey: ['syscohada-journal-entries'],
    queryFn: async () => {
      const all = await adapter.getAll<any>('journalEntries');
      return all.filter(e => e.status === 'validated' || e.status === 'posted');
    },
  });

  // Compute total CA from class 7 entries
  const totalCA = useMemo(() => {
    let ca = 0;
    for (const e of allEntries) {
      if (!e.lines) continue;
      for (const l of e.lines) {
        if (l.accountCode?.startsWith('7')) ca += (l.credit || 0) - (l.debit || 0);
      }
    }
    return ca;
  }, [allEntries]);

  const syscohadaReports: SyscohadaReport[] = useMemo(() => {
    const types: Array<{ type: SyscohadaReport['reportType']; label: string }> = [
      { type: 'bilan_syscohada', label: t('reportingSyscohada.typeBalanceSheet') },
      { type: 'compte_resultat_syscohada', label: t('reportingSyscohada.reportIncomeStatement') },
      { type: 'tafire', label: 'TAFIRE' },
      { type: 'notes_annexes', label: t('reportingSyscohada.reportNotes') },
      { type: 'tableau_tresorerie', label: t('reportingSyscohada.reportTreasuryTable') },
    ];
    const zoneLabel = t('reportingSyscohada.zoneOhada');
    const regulatoryRefLabel = t('reportingSyscohada.syscohadaRevised2017');
    const result: SyscohadaReport[] = [];
    for (const fy of fiscalYears) {
      // Le modèle d'exercice expose `isClosed` (booléen), pas un champ `status` string.
      const status: SyscohadaReport['status'] = fy.isClosed ? 'approved' : 'draft';
      for (const t of types) {
        result.push({
          id: `${fy.id}-${t.type}`,
          reportType: t.type,
          title: `${t.label} — ${fy.startDate?.substring(0, 4) || ''}`,
          period: fy.endDate || '',
          status,
          lastModified: fy.endDate || new Date().toISOString().split('T')[0],
          createdBy: 'system',
          version: '1.0',
          country: zoneLabel,
          regulatoryRef: regulatoryRefLabel,
          currency: 'XAF',
          fileSize: '-',
        });
      }
    }
    return result;
  }, [fiscalYears, t]);

  // Static SYSCOHADA standards (reference data)
  const SYSCOHADA_STANDARDS: SyscohadaStandard[] = [
    { code: 'SYSCOHADA-ART-8', title: t('reportingSyscohada.std8Title'), category: 'measurement', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingSyscohada.std8Notes') },
    { code: 'SYSCOHADA-ART-11', title: t('reportingSyscohada.std11Title'), category: 'presentation', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingSyscohada.std11Notes') },
    { code: 'SYSCOHADA-ART-25', title: t('reportingSyscohada.std25Title'), category: 'presentation', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingSyscohada.std25Notes') },
    { code: 'SYSCOHADA-ART-35', title: t('reportingSyscohada.std35Title'), category: 'measurement', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'medium', notes: t('reportingSyscohada.std35Notes') },
    { code: 'SYSCOHADA-ART-75', title: t('reportingSyscohada.std75Title'), category: 'disclosure', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: t('reportingSyscohada.std75Notes') },
  ];

  // Load companies to determine entities per country
  const { data: companies = [] } = useQuery({
    queryKey: ['syscohada-companies'],
    queryFn: () => adapter.getAll<any>('companies').catch(() => []),
  });

  // OHADA zone countries — revenue and entities computed from real data
  const MEMBER_COUNTRIES: OHADACountry[] = useMemo(() => {
    // Count entities per country from societes table
    const entitiesByCountry: Record<string, number> = {};
    for (const c of companies) {
      const code = c.countryCode || c.pays || 'CI';
      entitiesByCountry[code] = (entitiesByCountry[code] || 0) + 1;
    }
    // If no companies, assume 1 entity for the default country
    const hasAnyCompany = Object.keys(entitiesByCountry).length > 0;
    if (!hasAnyCompany) entitiesByCountry['CI'] = 1;

    // The default country gets the real CA
    const defaultCountry = Object.keys(entitiesByCountry)[0] || 'CI';

    const countries: Array<{ code: string; name: string; currency: string; deadline: string; reqs: string[] }> = [
      { code: 'CI', name: t('reportingSyscohada.countryCI'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'CNPS', t('reportingSyscohada.reqChamberCommerce')] },
      { code: 'SN', name: t('reportingSyscohada.countrySN'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'IPRES', 'CSS'] },
      { code: 'CM', name: t('reportingSyscohada.countryCM'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar15'), reqs: ['DGI', 'CNPS'] },
      { code: 'GA', name: t('reportingSyscohada.countryGA'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar31'), reqs: ['DGI', 'CNSS'] },
      { code: 'ML', name: t('reportingSyscohada.countryML'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'INPS'] },
      { code: 'BF', name: t('reportingSyscohada.countryBF'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'CNSS'] },
      { code: 'BJ', name: t('reportingSyscohada.countryBJ'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'CNSS'] },
      { code: 'TG', name: t('reportingSyscohada.countryTG'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'CNSS'] },
      { code: 'NE', name: t('reportingSyscohada.countryNE'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI', 'CNSS'] },
      { code: 'TD', name: t('reportingSyscohada.countryTD'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar31'), reqs: ['DGI', 'CNPS'] },
      { code: 'CF', name: t('reportingSyscohada.countryCF'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar31'), reqs: ['DGI'] },
      { code: 'CG', name: t('reportingSyscohada.countryCG'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar31'), reqs: ['DGI', 'CNSS'] },
      { code: 'GQ', name: t('reportingSyscohada.countryGQ'), currency: 'XAF', deadline: t('reportingSyscohada.deadlineMar31'), reqs: ['DGI'] },
      { code: 'GW', name: t('reportingSyscohada.countryGW'), currency: 'XOF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI'] },
      { code: 'KM', name: t('reportingSyscohada.countryKM'), currency: 'KMF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI'] },
      { code: 'CD', name: t('reportingSyscohada.countryCD'), currency: 'CDF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI'] },
      { code: 'GN', name: t('reportingSyscohada.countryGN'), currency: 'GNF', deadline: t('reportingSyscohada.deadlineApr30'), reqs: ['DGI'] },
    ];

    // On n'affiche QUE les pays où une entité est réellement enregistrée (pas les 17 pays
    // OHADA en dur, dont 16 seraient à zéro et donneraient une fausse couverture multi-pays).
    return countries
      .map(c => ({
        code: c.code,
        name: c.name,
        currency: c.currency,
        filingDeadline: c.deadline,
        localRequirements: c.reqs,
        status: 'active' as const,
        revenue: c.code === defaultCountry ? totalCA : 0,
        entities: entitiesByCountry[c.code] || 0,
      }))
      .filter(c => c.entities > 0);
  }, [companies, totalCA, t]);

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return syscohadaReports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.country.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesType = filterType === 'all' || report.reportType === filterType;
      const matchesCountry = filterCountry === 'all' || report.country === filterCountry;

      return matchesSearch && matchesStatus && matchesType && matchesCountry;
    });
  }, [searchTerm, filterStatus, filterType, filterCountry, syscohadaReports]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalReports = filteredReports.length;
    const approvedReports = filteredReports.filter(r => r.status === 'approved').length;
    const draftReports = filteredReports.filter(r => r.status === 'draft').length;
    const reviewReports = filteredReports.filter(r => r.status === 'review').length;

    const compliantStandards = SYSCOHADA_STANDARDS.filter(s => s.compliance === 'compliant').length;
    const totalStandards = SYSCOHADA_STANDARDS.length;
    const complianceRate = compliantStandards / totalStandards;

    const activeCountries = MEMBER_COUNTRIES.filter(c => c.status === 'active').length;
    const totalRevenue = MEMBER_COUNTRIES.reduce((sum, c) => sum + c.revenue, 0);

    return {
      totalReports,
      approvedReports,
      draftReports,
      reviewReports,
      complianceRate,
      activeCountries,
      totalRevenue
    };
  }, [filteredReports, SYSCOHADA_STANDARDS, MEMBER_COUNTRIES]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-[var(--color-primary)] bg-[var(--color-primary)]/5';
      case 'filed': return 'text-[var(--color-text-secondary)] bg-[var(--color-text-secondary)]/5';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'review': return <Clock className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'filed': return <Archive className="h-4 w-4" />;
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
    bilan_syscohada: t('reportingSyscohada.typeBalanceSheet'),
    compte_resultat_syscohada: t('reportingSyscohada.typeIncomeStatement'),
    tafire: 'TAFIRE',
    tableau_tresorerie: t('reportingSyscohada.typeTreasuryTable'),
    notes_annexes: t('reportingSyscohada.typeNotes')
  };

  const countryCodes = {
    'Côte d\'Ivoire': 'CI',
    'Sénégal': 'SN',
    'Gabon': 'GA',
    'Mali': 'ML',
    'Burkina Faso': 'BF'
  };

  const chartData = [
    { label: t('reportingSyscohada.chartLabelFiled'), value: aggregatedData.approvedReports, color: 'bg-green-500' },
    { label: t('reportingSyscohada.chartLabelReview'), value: aggregatedData.reviewReports, color: 'bg-yellow-500' },
    { label: t('reportingSyscohada.chartLabelDrafts'), value: aggregatedData.draftReports, color: 'bg-[var(--color-primary)]' }
  ];

  const countryChartData = MEMBER_COUNTRIES.map(country => ({
    label: country.code,
    value: country.revenue / 1000000,
    color: country.status === 'active' ? 'bg-green-500' :
           country.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
  }));

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title={t('reportingSyscohada.title')}
          subtitle={t('reportingSyscohada.subtitle')}
          icon={Globe}
          action={
            <div className="flex gap-3">
              <ElegantButton
                variant="outline"
                icon={RefreshCw}
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['syscohada-fiscal-years'] });
                  queryClient.invalidateQueries({ queryKey: ['syscohada-journal-entries'] });
                }}
              >
                {t('reportingSyscohada.refresh')}
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setReportModal({ isOpen: true, mode: 'create' })}
              >
                {t('reportingSyscohada.newReport')}
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title={t('reportingSyscohada.kpiReports')}
            value={aggregatedData.totalReports.toString()}
            subtitle={t('reportingSyscohada.filedCount', { count: String(aggregatedData.approvedReports) })}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title={t('reportingSyscohada.kpiCompliance')}
            value={formatPercentage(aggregatedData.complianceRate * 100)}
            subtitle={t('reportingSyscohada.articlesIndicative', { compliant: String(SYSCOHADA_STANDARDS.filter(s => s.compliance === 'compliant').length), total: String(SYSCOHADA_STANDARDS.length) })}
            icon={Shield}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title={t('reportingSyscohada.kpiActiveCountries')}
            value={aggregatedData.activeCountries.toString()}
            subtitle={t('reportingSyscohada.kpiActiveCountriesSub')}
            icon={Flag}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title={t('reportingSyscohada.kpiRevenue')}
            value={`${(aggregatedData.totalRevenue / 1000000).toFixed(0)}M`}
            subtitle={t('reportingSyscohada.kpiRevenueSub')}
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
              {(['reports', 'standards', 'countries'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[var(--color-primary)] text-white shadow-md'
                      : 'text-neutral-600 hover:text-[var(--color-primary)]'
                  }`}
                >
                  {mode === 'reports' ? t('reportingSyscohada.tabReports') :
                   mode === 'standards' ? t('reportingSyscohada.tabStandards') : t('reportingSyscohada.tabCountries')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">{t('reportingSyscohada.fiscalYearLabel')}</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                title={t('reportingSyscohada.chartReportsTitle')}
                subtitle={t('reportingSyscohada.chartReportsSubtitle')}
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
                <h3 className="text-lg font-semibold text-neutral-800">{t('reportingSyscohada.filtersTitle')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder={t('reportingSyscohada.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{t('reportingSyscohada.allStatuses')}</option>
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="review">{t('reportingSyscohada.statusReview')}</option>
                    <option value="approved">{t('reportingSyscohada.statusApproved')}</option>
                    <option value="filed">{t('reportingSyscohada.statusFiled')}</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{t('reportingSyscohada.allTypes')}</option>
                    <option value="bilan_syscohada">{t('reportingSyscohada.typeBalanceSheet')}</option>
                    <option value="compte_resultat_syscohada">{t('reportingSyscohada.typeIncomeStatement')}</option>
                    <option value="tafire">TAFIRE</option>
                    <option value="tableau_tresorerie">{t('reportingSyscohada.typeTreasuryTable')}</option>
                    <option value="notes_annexes">{t('reportingSyscohada.typeNotes')}</option>
                  </select>

                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{t('reportingSyscohada.allCountries')}</option>
                    <option value="Côte d'Ivoire">{t('reportingSyscohada.countryCI')}</option>
                    <option value="Sénégal">{t('reportingSyscohada.countrySN')}</option>
                    <option value="Gabon">{t('reportingSyscohada.countryGA')}</option>
                    <option value="Mali">{t('reportingSyscohada.countryML')}</option>
                    <option value="Burkina Faso">{t('reportingSyscohada.countryBF')}</option>
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Reports List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  {t('reportingSyscohada.reportsListTitle', { count: String(filteredReports.length) })}
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
                            <div className="p-3 bg-orange-50 rounded-lg">
                              <Globe className="h-6 w-6 text-orange-600" />
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
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1">
                                  <Flag className="h-4 w-4 text-neutral-400" />
                                  <span className="text-sm text-neutral-600">{report.country}</span>
                                </div>
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                                  {report.currency}
                                </span>
                                <span className="text-xs text-neutral-500">{report.regulatoryRef}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center space-x-1 ${getStatusColor(report.status)}`}>
                              {getStatusIcon(report.status)}
                              <span>
                                {report.status === 'draft' ? t('reportingSyscohada.statusDraft') :
                                 report.status === 'review' ? t('reportingSyscohada.statusReview') :
                                 report.status === 'approved' ? t('reportingSyscohada.statusApproved') : t('reportingSyscohada.statusFiled')}
                              </span>
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setReportModal({ isOpen: true, mode: 'view', report })}
                                className="p-2 text-neutral-400 hover:text-[var(--color-primary)] transition-colors"
                                aria-label={t('reportingSyscohada.viewAria')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">{t('reportingSyscohada.createdBy')}</p>
                            <p className="font-medium text-neutral-800">{report.createdBy}</p>
                          </div>
                          {report.reviewedBy && (
                            <div>
                              <p className="text-sm text-neutral-500">{t('reportingSyscohada.reviewedBy')}</p>
                              <p className="font-medium text-neutral-800">{report.reviewedBy}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-neutral-500">{t('reportingSyscohada.lastModified')}</p>
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
                {t('reportingSyscohada.standardsTitle')}
              </h3>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {t('reportingSyscohada.standardsDisclaimer')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thArticle')}</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thTitle')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thCategory')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thCompliance')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thImpact')}</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">{t('reportingSyscohada.thApplicableCountries')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SYSCOHADA_STANDARDS.map((standard, index) => (
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
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-600">
                            {standard.category === 'measurement' ? t('reportingSyscohada.catMeasurement') :
                             standard.category === 'presentation' ? t('reportingSyscohada.catPresentation') : t('reportingSyscohada.catDisclosure')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplianceColor(standard.compliance)}`}>
                            {standard.compliance === 'compliant' ? t('reportingSyscohada.complianceCompliant') :
                             standard.compliance === 'partial' ? t('reportingSyscohada.compliancePartial') :
                             standard.compliance === 'non_compliant' ? t('reportingSyscohada.complianceNonCompliant') : t('reportingSyscohada.complianceNA')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            standard.impact === 'high' ? 'bg-red-50 text-red-600' :
                            standard.impact === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {standard.impact === 'high' ? t('reportingSyscohada.impactHigh') :
                             standard.impact === 'medium' ? t('reportingSyscohada.impactMedium') : t('reportingSyscohada.impactLow')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {standard.applicableCountries.slice(0, 4).map(country => (
                              <span
                                key={country}
                                className="px-1 py-0.5 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded"
                              >
                                {country}
                              </span>
                            ))}
                            {standard.applicableCountries.length > 4 && (
                              <span className="text-xs text-neutral-500">
                                +{standard.applicableCountries.length - 4}
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UnifiedCard>
        )}

        {viewMode === 'countries' && (
          <>
            {/* Country Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ModernChartCard
                title={t('reportingSyscohada.chartCountryTitle')}
                subtitle={t('reportingSyscohada.chartCountrySubtitle')}
                icon={MapPin}
              >
                <ColorfulBarChart
                  data={countryChartData}
                  height={160}
                />
              </ModernChartCard>
            </motion.div>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    {t('reportingSyscohada.countriesScopeTitle')}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {MEMBER_COUNTRIES.map((country, index) => (
                    <motion.div
                      key={country.code}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-50 rounded-lg">
                              <Flag className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-neutral-800">{country.name}</h4>
                              <p className="text-sm text-neutral-500">{t('reportingSyscohada.codeLabel')} {country.code}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            country.status === 'active' ? 'bg-green-50 text-green-600' :
                            country.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {country.status === 'active' ? t('reportingSyscohada.statusActive') :
                             country.status === 'pending' ? t('reportingSyscohada.statusPending') : t('reportingSyscohada.statusExempted')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">{t('reportingSyscohada.currencyLabel')}</span>
                            <span className="font-semibold text-neutral-800">{country.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">{t('reportingSyscohada.entitiesLabel')}</span>
                            <span className="font-medium text-neutral-700">{country.entities}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">{t('reportingSyscohada.localRevenueLabel')}</span>
                            <span className="font-medium text-neutral-700">
                              {formatCurrency(country.revenue, country.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">{t('reportingSyscohada.deadlineLabel')}</span>
                            <span className="font-medium text-neutral-700">
                              {country.filingDeadline}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-100">
                          <p className="text-sm text-neutral-500 mb-2">{t('reportingSyscohada.localRequirementsLabel')}</p>
                          <div className="flex flex-wrap gap-1">
                            {country.localRequirements.map(req => (
                              <span
                                key={req}
                                className="px-2 py-1 text-xs bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full"
                              >
                                {req}
                              </span>
                            ))}
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
                    {reportModal.mode === 'create' ? t('reportingSyscohada.modalCreateTitle') :
                     reportModal.mode === 'edit' ? t('reportingSyscohada.modalEditTitle') : t('reportingSyscohada.modalViewTitle')}
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
                          {t('reportingSyscohada.fieldReportTitle')}
                        </label>
                        <p className="text-neutral-800 font-semibold">{reportModal.report.title}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldReportType')}
                        </label>
                        <p className="text-neutral-800">{reportTypeLabels[reportModal.report.reportType]}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldCountry')}
                        </label>
                        <div className="flex items-center space-x-2">
                          <Flag className="h-4 w-4 text-neutral-500" />
                          <span className="text-neutral-800">{reportModal.report.country}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldRegulatoryRef')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.regulatoryRef}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldStatus')}
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(reportModal.report.status)}`}>
                          {reportModal.report.status === 'draft' ? t('reportingSyscohada.statusDraft') :
                           reportModal.report.status === 'review' ? t('reportingSyscohada.statusReview') :
                           reportModal.report.status === 'approved' ? t('reportingSyscohada.statusApproved') : t('reportingSyscohada.statusFiled')}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldCurrency')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.currency}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldPeriod')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.period}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {t('reportingSyscohada.fieldVersion')}
                        </label>
                        <p className="text-neutral-800">{reportModal.report.version}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>{t('reportingSyscohada.createFormPlaceholder')}</p>
                    <p className="text-sm mt-2">{t('reportingSyscohada.createFormDev')}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setReportModal({ isOpen: false, mode: 'view' })}
                  >
                    {reportModal.mode === 'view' ? t('reportingSyscohada.close') : t('reportingSyscohada.cancel')}
                  </ElegantButton>
                  {reportModal.mode !== 'view' && (
                    <ElegantButton variant="primary" onClick={() => navigate('/reporting/builder')}>
                      {t('reportingSyscohada.openBuilder')}
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

export default ReportingSyscohada;