import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'reports' | 'standards' | 'consolidation'>('reports');
  const [reportModal, setReportModal] = useState<ReportModal>({ isOpen: false, mode: 'view' });
  const [selectedPeriod, setSelectedPeriod] = useState('2024');

  // Mock data for IFRS reports
  const mockReports: IFRSReport[] = [
    {
      id: '1',
      reportType: 'balance_sheet',
      title: 'État de la Situation Financière (IAS 1)',
      period: '2024-Q3',
      status: 'approved',
      lastModified: '2024-09-15T14:30:00Z',
      createdBy: 'Marie Dubois',
      reviewedBy: 'Jean Martin',
      approvedBy: 'Sophie Laurent',
      publishedDate: '2024-09-16T09:00:00Z',
      version: '1.2',
      standards: ['IAS 1', 'IFRS 7', 'IFRS 13'],
      consolidation: true,
      currency: 'EUR',
      fileSize: '2.4 MB'
    },
    {
      id: '2',
      reportType: 'income_statement',
      title: 'État du Résultat Global (IAS 1)',
      period: '2024-Q3',
      status: 'review',
      lastModified: '2024-09-18T16:45:00Z',
      createdBy: 'Pierre Leroy',
      reviewedBy: 'Marie Dubois',
      version: '1.0',
      standards: ['IAS 1', 'IAS 18', 'IFRS 15'],
      consolidation: true,
      currency: 'EUR',
      fileSize: '1.8 MB'
    },
    {
      id: '3',
      reportType: 'cash_flow',
      title: 'Tableau des Flux de Trésorerie (IAS 7)',
      period: '2024-Q3',
      status: 'draft',
      lastModified: '2024-09-19T11:20:00Z',
      createdBy: 'Antoine Rousseau',
      version: '0.5',
      standards: ['IAS 7'],
      consolidation: true,
      currency: 'EUR',
      fileSize: '1.2 MB'
    },
    {
      id: '4',
      reportType: 'equity_changes',
      title: 'État des Variations des Capitaux Propres',
      period: '2024-Q3',
      status: 'approved',
      lastModified: '2024-09-14T13:15:00Z',
      createdBy: 'Isabelle Moreau',
      reviewedBy: 'Jean Martin',
      approvedBy: 'Sophie Laurent',
      publishedDate: '2024-09-16T09:00:00Z',
      version: '1.1',
      standards: ['IAS 1'],
      consolidation: true,
      currency: 'EUR',
      fileSize: '0.9 MB'
    },
    {
      id: '5',
      reportType: 'notes',
      title: 'Notes aux États Financiers IFRS',
      period: '2024-Q3',
      status: 'review',
      lastModified: '2024-09-19T09:30:00Z',
      createdBy: 'Thomas Bernard',
      reviewedBy: 'Sophie Laurent',
      version: '2.3',
      standards: ['IFRS 7', 'IFRS 13', 'IAS 24', 'IAS 36'],
      consolidation: true,
      currency: 'EUR',
      fileSize: '5.1 MB'
    }
  ];

  // Mock IFRS standards compliance
  const mockStandards: IFRSStandard[] = [
    {
      code: 'IFRS 15',
      title: 'Produits des activités ordinaires tirés de contrats avec des clients',
      category: 'measurement',
      compliance: 'compliant',
      lastReview: '2024-08-15',
      impact: 'high',
      notes: 'Implémentation complète pour les contrats clients'
    },
    {
      code: 'IFRS 16',
      title: 'Contrats de location',
      category: 'measurement',
      compliance: 'partial',
      lastReview: '2024-09-01',
      impact: 'high',
      notes: 'En cours d\'adaptation pour nouveaux contrats'
    },
    {
      code: 'IAS 36',
      title: 'Dépréciation d\'actifs',
      category: 'measurement',
      compliance: 'compliant',
      lastReview: '2024-07-20',
      impact: 'medium',
      notes: 'Tests de dépréciation réguliers effectués'
    },
    {
      code: 'IFRS 7',
      title: 'Instruments financiers: Informations à fournir',
      category: 'disclosure',
      compliance: 'compliant',
      lastReview: '2024-09-10',
      impact: 'high',
      notes: 'Divulgations complètes sur risques financiers'
    },
    {
      code: 'IFRS 13',
      title: 'Évaluation de la juste valeur',
      category: 'measurement',
      compliance: 'compliant',
      lastReview: '2024-08-25',
      impact: 'medium',
      notes: 'Hiérarchie des justes valeurs respectée'
    }
  ];

  // Mock consolidation entities
  const mockEntities: ConsolidationEntity[] = [
    {
      id: '1',
      name: 'WiseBook France SAS',
      country: 'France',
      currency: 'EUR',
      ownership: 100,
      method: 'full',
      status: 'active',
      revenue: 25000000,
      assets: 45000000,
      consolidationDate: '2024-09-30'
    },
    {
      id: '2',
      name: 'WiseBook UK Ltd',
      country: 'Royaume-Uni',
      currency: 'GBP',
      ownership: 75,
      method: 'full',
      status: 'active',
      revenue: 8500000,
      assets: 15000000,
      consolidationDate: '2024-09-30'
    },
    {
      id: '3',
      name: 'Tech Solutions Inc.',
      country: 'États-Unis',
      currency: 'USD',
      ownership: 35,
      method: 'equity',
      status: 'active',
      revenue: 12000000,
      assets: 22000000,
      consolidationDate: '2024-09-30'
    }
  ];

  // Filter reports based on search and filters
  const filteredReports = useMemo(() => {
    return mockReports.filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          report.standards.some(std => std.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = filterStatus === 'all' || report.status === filterStatus;
      const matchesType = filterType === 'all' || report.reportType === filterType;
      const matchesPeriod = filterPeriod === 'all' || report.period.includes(filterPeriod);

      return matchesSearch && matchesStatus && matchesType && matchesPeriod;
    });
  }, [searchTerm, filterStatus, filterType, filterPeriod, mockReports]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalReports = filteredReports.length;
    const approvedReports = filteredReports.filter(r => r.status === 'approved').length;
    const draftReports = filteredReports.filter(r => r.status === 'draft').length;
    const reviewReports = filteredReports.filter(r => r.status === 'review').length;

    const compliantStandards = mockStandards.filter(s => s.compliance === 'compliant').length;
    const totalStandards = mockStandards.length;
    const complianceRate = compliantStandards / totalStandards;

    const consolidatedEntities = mockEntities.filter(e => e.status === 'active').length;
    const totalRevenue = mockEntities.reduce((sum, e) => sum + e.revenue, 0);

    return {
      totalReports,
      approvedReports,
      draftReports,
      reviewReports,
      complianceRate,
      consolidatedEntities,
      totalRevenue
    };
  }, [filteredReports, mockStandards, mockEntities]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-[#6A8A82] bg-[#6A8A82]/5';
      case 'published': return 'text-[#B87333] bg-[#B87333]/5';
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
    balance_sheet: 'Bilan',
    income_statement: 'Compte de Résultat',
    cash_flow: 'Flux de Trésorerie',
    equity_changes: 'Variation Capitaux',
    notes: 'Notes'
  };

  const chartData = [
    { label: 'Approuvés', value: aggregatedData.approvedReports, color: 'bg-green-500' },
    { label: 'En révision', value: aggregatedData.reviewReports, color: 'bg-yellow-500' },
    { label: 'Brouillons', value: aggregatedData.draftReports, color: 'bg-[#6A8A82]' }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Reporting IFRS"
          subtitle="États financiers conformes aux normes internationales d'information financière"
          icon={FileText}
          action={
            <div className="flex gap-3">
              <ElegantButton variant="outline" icon={RefreshCw}>
                Actualiser
              </ElegantButton>
              <ElegantButton variant="outline" icon={Download}>
                Package Complet
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
            title="Rapports IFRS"
            value={aggregatedData.totalReports.toString()}
            subtitle={`${aggregatedData.approvedReports} approuvés`}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Conformité Normes"
            value={formatPercentage(aggregatedData.complianceRate)}
            subtitle={`${mockStandards.filter(s => s.compliance === 'compliant').length}/${mockStandards.length} normes`}
            icon={Shield}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Entités Consolidées"
            value={aggregatedData.consolidatedEntities.toString()}
            subtitle="Périmètre de consolidation"
            icon={Building}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="CA Consolidé"
            value={`${(aggregatedData.totalRevenue / 1000000).toFixed(0)}M €`}
            subtitle="Chiffre d'affaires groupe"
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
              {(['reports', 'standards', 'consolidation'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[#6A8A82] text-white shadow-md'
                      : 'text-neutral-600 hover:text-[#6A8A82]'
                  }`}
                >
                  {mode === 'reports' ? 'Rapports' :
                   mode === 'standards' ? 'Normes IFRS' : 'Consolidation'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-neutral-700">Période:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
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
                title="État des Rapports IFRS"
                subtitle="Répartition par statut de validation"
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
                      className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="draft">Brouillon</option>
                    <option value="review">En révision</option>
                    <option value="approved">Approuvé</option>
                    <option value="published">Publié</option>
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Tous les types</option>
                    <option value="balance_sheet">Bilan</option>
                    <option value="income_statement">Compte de Résultat</option>
                    <option value="cash_flow">Flux de Trésorerie</option>
                    <option value="equity_changes">Variation Capitaux</option>
                    <option value="notes">Notes</option>
                  </select>

                  <select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Toutes les périodes</option>
                    <option value="2024-Q3">2024-Q3</option>
                    <option value="2024-Q2">2024-Q2</option>
                    <option value="2024-Q1">2024-Q1</option>
                  </select>
                </div>
              </div>
            </UnifiedCard>

            {/* Reports List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Rapports IFRS ({filteredReports.length})
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
                            <div className="p-3 bg-[#6A8A82]/10 rounded-lg">
                              <FileText className="h-6 w-6 text-[#6A8A82]" />
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
                                    className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]"
                                  >
                                    {standard}
                                  </span>
                                ))}
                                {report.consolidation && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                                    Consolidé
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center space-x-1 ${getStatusColor(report.status)}`}>
                              {getStatusIcon(report.status)}
                              <span>
                                {report.status === 'draft' ? 'Brouillon' :
                                 report.status === 'review' ? 'En révision' :
                                 report.status === 'approved' ? 'Approuvé' : 'Publié'}
                              </span>
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setReportModal({ isOpen: true, mode: 'view', report })}
                                className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-neutral-400 hover:text-green-600 transition-colors">
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
                Conformité aux Normes IFRS
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Norme</th>
                      <th className="text-left py-3 px-4 font-medium text-neutral-600">Titre</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Catégorie</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Conformité</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Impact</th>
                      <th className="text-center py-3 px-4 font-medium text-neutral-600">Dernière Révision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockStandards.map((standard, index) => (
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
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                            {standard.category === 'measurement' ? 'Évaluation' :
                             standard.category === 'presentation' ? 'Présentation' :
                             standard.category === 'disclosure' ? 'Information' : 'Consolidation'}
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
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Périmètre de Consolidation
                </h3>
                <ElegantButton variant="primary" icon={Plus}>
                  Ajouter Entité
                </ElegantButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockEntities.map((entity, index) => (
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
                          <div className="p-2 bg-[#6A8A82]/10 rounded-lg">
                            <Building className="h-5 w-5 text-[#6A8A82]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800">{entity.name}</h4>
                            <p className="text-sm text-neutral-500">{entity.country}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          entity.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600'
                        }`}>
                          {entity.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Participation:</span>
                          <span className="font-semibold text-neutral-800">{entity.ownership}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Méthode:</span>
                          <span className="font-medium text-neutral-700">
                            {entity.method === 'full' ? 'Intégration globale' :
                             entity.method === 'proportional' ? 'Intégration proportionnelle' :
                             'Mise en équivalence'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">CA:</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(entity.revenue, entity.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-500">Actifs:</span>
                          <span className="font-medium text-neutral-700">
                            {formatCurrency(entity.assets, entity.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-neutral-100">
                        <p className="text-xs text-neutral-500">
                          Consolidé au: {formatDate(entity.consolidationDate)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </UnifiedCard>
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
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {reportModal.mode === 'create' ? 'Nouveau Rapport IFRS' :
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
                          Période
                        </label>
                        <p className="text-neutral-800">{reportModal.report.period}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Normes IFRS Appliquées
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {reportModal.report.standards.map(standard => (
                            <span
                              key={standard}
                              className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]"
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
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(reportModal.report.status)}`}>
                          {reportModal.report.status === 'draft' ? 'Brouillon' :
                           reportModal.report.status === 'review' ? 'En révision' :
                           reportModal.report.status === 'approved' ? 'Approuvé' : 'Publié'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Version
                        </label>
                        <p className="text-neutral-800">{reportModal.report.version}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Créé par
                        </label>
                        <p className="text-neutral-800">{reportModal.report.createdBy}</p>
                      </div>

                      {reportModal.report.approvedBy && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Approuvé par
                          </label>
                          <p className="text-neutral-800">{reportModal.report.approvedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>Formulaire de création de rapport...</p>
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

export default ReportingIFRS;