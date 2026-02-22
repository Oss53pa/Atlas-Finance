import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
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
    queryFn: () => db.fiscalYears.toArray(),
  });

  const syscohadaReports: SyscohadaReport[] = useMemo(() => {
    const types: Array<{ type: SyscohadaReport['reportType']; label: string }> = [
      { type: 'bilan_syscohada', label: 'Bilan SYSCOHADA' },
      { type: 'compte_resultat_syscohada', label: 'Compte de Résultat SYSCOHADA' },
      { type: 'tafire', label: 'TAFIRE' },
      { type: 'notes_annexes', label: 'Notes Annexes SYSCOHADA' },
      { type: 'tableau_tresorerie', label: 'Tableau de Trésorerie SYSCOHADA' },
    ];
    const result: SyscohadaReport[] = [];
    for (const fy of fiscalYears) {
      const fyStatus = (fy as unknown as Record<string, string>).status || 'active';
      const status: SyscohadaReport['status'] = fyStatus === 'closed' ? 'approved' : 'draft';
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
          country: 'Zone OHADA',
          regulatoryRef: 'SYSCOHADA Révisé 2017',
          currency: 'XAF',
          fileSize: '-',
        });
      }
    }
    return result;
  }, [fiscalYears]);

  // Static SYSCOHADA standards (reference data)
  const SYSCOHADA_STANDARDS: SyscohadaStandard[] = [
    { code: 'SYSCOHADA-ART-8', title: 'Principes comptables fondamentaux', category: 'measurement', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: 'Prudence, continuité, coût historique, permanence des méthodes' },
    { code: 'SYSCOHADA-ART-11', title: 'Présentation du Bilan', category: 'presentation', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: 'Structure Actif immobilisé / Circulant / Trésorerie' },
    { code: 'SYSCOHADA-ART-25', title: 'Compte de Résultat par Nature', category: 'presentation', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: 'Classification charges (6) et produits (7) par nature' },
    { code: 'SYSCOHADA-ART-35', title: 'Évaluation des Immobilisations', category: 'measurement', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'medium', notes: 'Amortissement linéaire et dégressif, réévaluation légale' },
    { code: 'SYSCOHADA-ART-75', title: 'États Annexes et Notes', category: 'disclosure', applicableCountries: ['CI','SN','ML','BF','NE','TG','BJ','GW','CM','GA','TD','CF','CG','GQ','KM','CD','GN'], compliance: 'compliant', lastReview: new Date().toISOString().split('T')[0], impact: 'high', notes: 'Informations complémentaires obligatoires' },
  ];

  // Static OHADA zone countries
  const MEMBER_COUNTRIES: OHADACountry[] = [
    { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'CNPS', 'Chambre de Commerce'], status: 'active', revenue: 0, entities: 1 },
    { code: 'SN', name: 'Sénégal', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'IPRES', 'CSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'CM', name: 'Cameroun', currency: 'XAF', filingDeadline: '15 mars', localRequirements: ['DGI', 'CNPS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'GA', name: 'Gabon', currency: 'XAF', filingDeadline: '31 mars', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'ML', name: 'Mali', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'INPS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'BF', name: 'Burkina Faso', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'BJ', name: 'Bénin', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'TG', name: 'Togo', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'NE', name: 'Niger', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'TD', name: 'Tchad', currency: 'XAF', filingDeadline: '31 mars', localRequirements: ['DGI', 'CNPS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'CF', name: 'Centrafrique', currency: 'XAF', filingDeadline: '31 mars', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
    { code: 'CG', name: 'Congo', currency: 'XAF', filingDeadline: '31 mars', localRequirements: ['DGI', 'CNSS'], status: 'active', revenue: 0, entities: 0 },
    { code: 'GQ', name: 'Guinée Équatoriale', currency: 'XAF', filingDeadline: '31 mars', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
    { code: 'GW', name: 'Guinée-Bissau', currency: 'XOF', filingDeadline: '30 avril', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
    { code: 'KM', name: 'Comores', currency: 'KMF', filingDeadline: '30 avril', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
    { code: 'CD', name: 'RD Congo', currency: 'CDF', filingDeadline: '30 avril', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
    { code: 'GN', name: 'Guinée', currency: 'GNF', filingDeadline: '30 avril', localRequirements: ['DGI'], status: 'active', revenue: 0, entities: 0 },
  ];

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
      case 'draft': return 'text-[#171717] bg-[#171717]/5';
      case 'filed': return 'text-[#525252] bg-[#525252]/5';
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
    bilan_syscohada: 'Bilan SYSCOHADA',
    compte_resultat_syscohada: 'Compte de Résultat',
    tafire: 'TAFIRE',
    tableau_tresorerie: 'Tableau Trésorerie',
    notes_annexes: 'Notes Annexes'
  };

  const countryCodes = {
    'Côte d\'Ivoire': 'CI',
    'Sénégal': 'SN',
    'Gabon': 'GA',
    'Mali': 'ML',
    'Burkina Faso': 'BF'
  };

  const chartData = [
    { label: 'Déposés', value: aggregatedData.approvedReports, color: 'bg-green-500' },
    { label: 'En révision', value: aggregatedData.reviewReports, color: 'bg-yellow-500' },
    { label: 'Brouillons', value: aggregatedData.draftReports, color: 'bg-[#171717]' }
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
          title="Reporting SYSCOHADA"
          subtitle="États financiers conformes au système comptable OHADA"
          icon={Globe}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={RefreshCw}>
                Actualiser
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Package OHADA
              </ElegantButton>
              <ElegantButton
                variant="primary"
                icon={Plus}
                onClick={() => setReportModal({ isOpen: true, mode: 'create' })}
              >
                Nouveau Rapport
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Rapports SYSCOHADA"
            value={aggregatedData.totalReports.toString()}
            subtitle={`${aggregatedData.approvedReports} déposés`}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Conformité OHADA"
            value={formatPercentage(aggregatedData.complianceRate)}
            subtitle={`${SYSCOHADA_STANDARDS.filter(s => s.compliance === 'compliant').length}/${SYSCOHADA_STANDARDS.length} articles`}
            icon={Shield}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Pays Actifs"
            value={aggregatedData.activeCountries.toString()}
            subtitle="Zone OHADA couverte"
            icon={Flag}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="CA Zone OHADA"
            value={`${(aggregatedData.totalRevenue / 1000000).toFixed(0)}M`}
            subtitle="Chiffre d'affaires total"
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
                      ? 'bg-[#171717] text-white shadow-md'
                      : 'text-neutral-600 hover:text-[#171717]'
                  }`}
                >
                  {mode === 'reports' ? 'Rapports' :
                   mode === 'standards' ? 'Articles SYSCOHADA' : 'Pays OHADA'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Exercice:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
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
                title="État des Rapports SYSCOHADA"
                subtitle="Répartition par statut de traitement"
                icon={PieChart}
              >
                <ColorfulBarChart
                  data={chartData}
                  height={160}
                  showValues={true}
                  valueFormatter={(value) => `${value} rapport${value !== 1 ? 's' : ''}`}
                />
              </ModernChartCard>
            </motion.div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Rechercher..."
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
                    <option value="all">Tous les statuts</option>
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="review">En révision</option>
                    <option value="approved">Approuvé</option>
                    <option value="filed">Déposé</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les types</option>
                    <option value="bilan_syscohada">Bilan SYSCOHADA</option>
                    <option value="compte_resultat_syscohada">Compte de Résultat</option>
                    <option value="tafire">TAFIRE</option>
                    <option value="tableau_tresorerie">Tableau Trésorerie</option>
                    <option value="notes_annexes">Notes Annexes</option>
                  </select>

                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tous les pays</option>
                    <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                    <option value="Sénégal">Sénégal</option>
                    <option value="Gabon">Gabon</option>
                    <option value="Mali">Mali</option>
                    <option value="Burkina Faso">Burkina Faso</option>
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Reports List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Rapports SYSCOHADA ({filteredReports.length})
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
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#171717]/10 text-[#171717]">
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
                                {report.status === 'draft' ? 'Brouillon' :
                                 report.status === 'review' ? 'En révision' :
                                 report.status === 'approved' ? 'Approuvé' : 'Déposé'}
                              </span>
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setReportModal({ isOpen: true, mode: 'view', report })}
                                className="p-2 text-neutral-400 hover:text-[#171717] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-neutral-400 hover:text-green-600 transition-colors" aria-label="Télécharger">
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">Créé par:</p>
                            <p className="font-medium text-neutral-800">{report.createdBy}</p>
                          </div>
                          {report.reviewedBy && (
                            <div>
                              <p className="text-sm text-neutral-500">Révisé par:</p>
                              <p className="font-medium text-neutral-800">{report.reviewedBy}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-neutral-500">Dernière modification:</p>
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
                Conformité aux Articles SYSCOHADA
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Article</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Titre</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Catégorie</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Conformité</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Impact</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Pays Applicables</th>
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
                            {standard.category === 'measurement' ? 'Évaluation' :
                             standard.category === 'presentation' ? 'Présentation' : 'Information'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplianceColor(standard.compliance)}`}>
                            {standard.compliance === 'compliant' ? 'Conforme' :
                             standard.compliance === 'partial' ? 'Partiel' :
                             standard.compliance === 'non_compliant' ? 'Non conforme' : 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            standard.impact === 'high' ? 'bg-red-50 text-red-600' :
                            standard.impact === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-green-50 text-green-600'
                          }`}>
                            {standard.impact === 'high' ? 'Élevé' :
                             standard.impact === 'medium' ? 'Moyen' : 'Faible'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {standard.applicableCountries.slice(0, 4).map(country => (
                              <span
                                key={country}
                                className="px-1 py-0.5 text-xs bg-[#171717]/10 text-[#171717] rounded"
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
                title="Chiffre d'Affaires par Pays OHADA"
                subtitle="Répartition du CA en millions d'unités locales"
                icon={MapPin}
              >
                <ColorfulBarChart
                  data={countryChartData}
                  height={160}
                  showValues={true}
                  valueFormatter={(value) => `${value.toFixed(0)}M`}
                />
              </ModernChartCard>
            </motion.div>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-neutral-800">
                    Pays OHADA - Périmètre de Reporting
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
                              <p className="text-sm text-neutral-500">Code: {country.code}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            country.status === 'active' ? 'bg-green-50 text-green-600' :
                            country.status === 'pending' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-gray-50 text-gray-600'
                          }`}>
                            {country.status === 'active' ? 'Actif' :
                             country.status === 'pending' ? 'En attente' : 'Exempté'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Devise:</span>
                            <span className="font-semibold text-neutral-800">{country.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Entités:</span>
                            <span className="font-medium text-neutral-700">{country.entities}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">CA Local:</span>
                            <span className="font-medium text-neutral-700">
                              {formatCurrency(country.revenue, country.currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-500">Échéance:</span>
                            <span className="font-medium text-neutral-700">
                              {formatDate(country.filingDeadline)}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-100">
                          <p className="text-sm text-neutral-500 mb-2">Obligations locales:</p>
                          <div className="flex flex-wrap gap-1">
                            {country.localRequirements.map(req => (
                              <span
                                key={req}
                                className="px-2 py-1 text-xs bg-[#171717]/10 text-[#171717] rounded-full"
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
                    {reportModal.mode === 'create' ? 'Nouveau Rapport SYSCOHADA' :
                     reportModal.mode === 'edit' ? 'Modifier le Rapport' : 'Détails du Rapport'}
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
                          Titre du Rapport
                        </label>
                        <p className="text-neutral-800 font-semibold">{reportModal.report.title}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Type de Rapport
                        </label>
                        <p className="text-neutral-800">{reportTypeLabels[reportModal.report.reportType]}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Pays
                        </label>
                        <div className="flex items-center space-x-2">
                          <Flag className="h-4 w-4 text-neutral-500" />
                          <span className="text-neutral-800">{reportModal.report.country}</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Référence Réglementaire
                        </label>
                        <p className="text-neutral-800">{reportModal.report.regulatoryRef}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(reportModal.report.status)}`}>
                          {reportModal.report.status === 'draft' ? 'Brouillon' :
                           reportModal.report.status === 'review' ? 'En révision' :
                           reportModal.report.status === 'approved' ? 'Approuvé' : 'Déposé'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Devise
                        </label>
                        <p className="text-neutral-800">{reportModal.report.currency}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Période
                        </label>
                        <p className="text-neutral-800">{reportModal.report.period}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Version
                        </label>
                        <p className="text-neutral-800">{reportModal.report.version}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>Formulaire de création de rapport SYSCOHADA...</p>
                    <p className="text-sm mt-2">Interface de création en développement</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setReportModal({ isOpen: false, mode: 'view' })}
                  >
                    {reportModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {reportModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {reportModal.mode === 'create' ? 'Créer Rapport' : 'Sauvegarder'}
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