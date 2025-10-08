import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  Archive,
  Printer,
  Mail,
  Share2,
  Lock,
  Users,
  Activity
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

interface FinancialStatement {
  id: string;
  statementType: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'equity_statement' | 'comprehensive_income';
  title: string;
  period: string;
  periodType: 'monthly' | 'quarterly' | 'annual';
  status: 'draft' | 'review' | 'approved' | 'published';
  lastModified: string;
  createdBy: string;
  reviewedBy?: string;
  approvedBy?: string;
  publishedDate?: string;
  version: string;
  format: 'ifrs' | 'gaap' | 'syscohada' | 'local';
  consolidation: boolean;
  currency: string;
  fileSize: string;
  accessLevel: 'public' | 'restricted' | 'confidential';
}

interface FinancialMetric {
  name: string;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: number;
  category: 'profitability' | 'liquidity' | 'efficiency' | 'leverage';
  benchmark?: number;
  target?: number;
}

interface StatementTemplate {
  id: string;
  name: string;
  type: string;
  format: string;
  description: string;
  sections: string[];
  lastUsed: string;
  frequency: number;
}

interface StatementModal {
  isOpen: boolean;
  mode: 'view' | 'create' | 'edit' | 'compare';
  statement?: FinancialStatement;
}

const FinancialStatements: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [viewMode, setViewMode] = useState<'statements' | 'metrics' | 'templates'>('statements');
  const [statementModal, setStatementModal] = useState<StatementModal>({ isOpen: false, mode: 'view' });
  const [selectedPeriod, setSelectedPeriod] = useState('2024-Q3');

  // Mock data for financial statements
  const mockStatements: FinancialStatement[] = [
    {
      id: '1',
      statementType: 'balance_sheet',
      title: 'Bilan Consolidé T3 2024',
      period: '2024-Q3',
      periodType: 'quarterly',
      status: 'approved',
      lastModified: '2024-09-15T14:30:00Z',
      createdBy: 'Marie Dubois',
      reviewedBy: 'Jean Martin',
      approvedBy: 'Sophie Laurent',
      publishedDate: '2024-09-16T09:00:00Z',
      version: '1.2',
      format: 'ifrs',
      consolidation: true,
      currency: 'EUR',
      fileSize: '3.8 MB',
      accessLevel: 'public'
    },
    {
      id: '2',
      statementType: 'income_statement',
      title: 'Compte de Résultat T3 2024',
      period: '2024-Q3',
      periodType: 'quarterly',
      status: 'review',
      lastModified: '2024-09-18T16:45:00Z',
      createdBy: 'Pierre Leroy',
      reviewedBy: 'Marie Dubois',
      version: '1.0',
      format: 'ifrs',
      consolidation: true,
      currency: 'EUR',
      fileSize: '2.4 MB',
      accessLevel: 'restricted'
    },
    {
      id: '3',
      statementType: 'cash_flow',
      title: 'Tableau des Flux de Trésorerie T3 2024',
      period: '2024-Q3',
      periodType: 'quarterly',
      status: 'draft',
      lastModified: '2024-09-19T11:20:00Z',
      createdBy: 'Antoine Rousseau',
      version: '0.5',
      format: 'ifrs',
      consolidation: true,
      currency: 'EUR',
      fileSize: '1.9 MB',
      accessLevel: 'confidential'
    },
    {
      id: '4',
      statementType: 'equity_statement',
      title: 'État des Variations des Capitaux Propres T3 2024',
      period: '2024-Q3',
      periodType: 'quarterly',
      status: 'approved',
      lastModified: '2024-09-14T13:15:00Z',
      createdBy: 'Isabelle Moreau',
      reviewedBy: 'Jean Martin',
      approvedBy: 'Sophie Laurent',
      publishedDate: '2024-09-16T09:00:00Z',
      version: '1.1',
      format: 'ifrs',
      consolidation: true,
      currency: 'EUR',
      fileSize: '1.2 MB',
      accessLevel: 'public'
    },
    {
      id: '5',
      statementType: 'comprehensive_income',
      title: 'État du Résultat Global T3 2024',
      period: '2024-Q3',
      periodType: 'quarterly',
      status: 'published',
      lastModified: '2024-09-19T09:30:00Z',
      createdBy: 'Thomas Bernard',
      reviewedBy: 'Sophie Laurent',
      approvedBy: 'Jean Martin',
      publishedDate: '2024-09-20T08:00:00Z',
      version: '1.0',
      format: 'ifrs',
      consolidation: true,
      currency: 'EUR',
      fileSize: '2.1 MB',
      accessLevel: 'public'
    }
  ];

  // Mock financial metrics
  const mockMetrics: FinancialMetric[] = [
    {
      name: 'Marge Brute',
      currentPeriod: 0.68,
      previousPeriod: 0.65,
      variance: 0.03,
      variancePercent: 4.6,
      category: 'profitability',
      benchmark: 0.70,
      target: 0.72
    },
    {
      name: 'Marge Opérationnelle',
      currentPeriod: 0.15,
      previousPeriod: 0.12,
      variance: 0.03,
      variancePercent: 25.0,
      category: 'profitability',
      benchmark: 0.18,
      target: 0.20
    },
    {
      name: 'ROE',
      currentPeriod: 0.14,
      previousPeriod: 0.11,
      variance: 0.03,
      variancePercent: 27.3,
      category: 'profitability',
      benchmark: 0.15,
      target: 0.16
    },
    {
      name: 'Ratio de Liquidité Générale',
      currentPeriod: 1.85,
      previousPeriod: 1.62,
      variance: 0.23,
      variancePercent: 14.2,
      category: 'liquidity',
      benchmark: 1.50,
      target: 1.80
    },
    {
      name: 'Ratio d\'Endettement',
      currentPeriod: 0.35,
      previousPeriod: 0.42,
      variance: -0.07,
      variancePercent: -16.7,
      category: 'leverage',
      benchmark: 0.40,
      target: 0.30
    },
    {
      name: 'Rotation des Stocks',
      currentPeriod: 8.5,
      previousPeriod: 7.2,
      variance: 1.3,
      variancePercent: 18.1,
      category: 'efficiency',
      benchmark: 9.0,
      target: 10.0
    }
  ];

  // Mock statement templates
  const mockTemplates: StatementTemplate[] = [
    {
      id: '1',
      name: 'Bilan IFRS Standard',
      type: 'balance_sheet',
      format: 'ifrs',
      description: 'Modèle de bilan conforme aux normes IFRS',
      sections: ['Actifs non courants', 'Actifs courants', 'Capitaux propres', 'Passifs non courants', 'Passifs courants'],
      lastUsed: '2024-09-15',
      frequency: 12
    },
    {
      id: '2',
      name: 'Compte de Résultat par Nature',
      type: 'income_statement',
      format: 'ifrs',
      description: 'Compte de résultat avec classification par nature',
      sections: ['Chiffre d\'affaires', 'Autres produits', 'Achats', 'Charges de personnel', 'Autres charges'],
      lastUsed: '2024-09-18',
      frequency: 8
    },
    {
      id: '3',
      name: 'Tableau de Flux SYSCOHADA',
      type: 'cash_flow',
      format: 'syscohada',
      description: 'Tableau des flux de trésorerie SYSCOHADA',
      sections: ['Flux opérationnels', 'Flux d\'investissement', 'Flux de financement'],
      lastUsed: '2024-09-10',
      frequency: 4
    }
  ];

  // Filter statements based on search and filters
  const filteredStatements = useMemo(() => {
    return mockStatements.filter(statement => {
      const matchesSearch = statement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          statement.format.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || statement.status === filterStatus;
      const matchesType = filterType === 'all' || statement.statementType === filterType;
      const matchesFormat = filterFormat === 'all' || statement.format === filterFormat;
      const matchesPeriod = filterPeriod === 'all' || statement.period.includes(filterPeriod);

      return matchesSearch && matchesStatus && matchesType && matchesFormat && matchesPeriod;
    });
  }, [searchTerm, filterStatus, filterType, filterFormat, filterPeriod, mockStatements]);

  // Calculate aggregated metrics
  const aggregatedData = useMemo(() => {
    const totalStatements = filteredStatements.length;
    const publishedStatements = filteredStatements.filter(s => s.status === 'published').length;
    const approvedStatements = filteredStatements.filter(s => s.status === 'approved').length;
    const draftStatements = filteredStatements.filter(s => s.status === 'draft').length;

    const consolidatedStatements = filteredStatements.filter(s => s.consolidation).length;
    const publicStatements = filteredStatements.filter(s => s.accessLevel === 'public').length;

    const avgMetricsImprovement = mockMetrics.reduce((sum, m) => sum + m.variancePercent, 0) / mockMetrics.length;

    return {
      totalStatements,
      publishedStatements,
      approvedStatements,
      draftStatements,
      consolidatedStatements,
      publicStatements,
      avgMetricsImprovement
    };
  }, [filteredStatements, mockMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-[#B87333] bg-[#B87333]/5';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'review': return 'text-yellow-600 bg-yellow-50';
      case 'draft': return 'text-[#6A8A82] bg-[#6A8A82]/5';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <FileCheck className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'review': return <Clock className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getAccessColor = (access: string) => {
    switch (access) {
      case 'public': return 'text-green-600 bg-green-50';
      case 'restricted': return 'text-yellow-600 bg-yellow-50';
      case 'confidential': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'profitability': return 'text-green-600 bg-green-50';
      case 'liquidity': return 'text-[#6A8A82] bg-[#6A8A82]/5';
      case 'efficiency': return 'text-[#B87333] bg-[#B87333]/5';
      case 'leverage': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const statementTypeLabels = {
    balance_sheet: 'Bilan',
    income_statement: 'Compte de Résultat',
    cash_flow: 'Flux de Trésorerie',
    equity_statement: 'Variation Capitaux',
    comprehensive_income: 'Résultat Global'
  };

  const chartData = [
    { label: 'Publiés', value: aggregatedData.publishedStatements, color: 'bg-[#B87333]' },
    { label: 'Approuvés', value: aggregatedData.approvedStatements, color: 'bg-green-500' },
    { label: 'Brouillons', value: aggregatedData.draftStatements, color: 'bg-[#6A8A82]' }
  ];

  const metricsChartData = mockMetrics.slice(0, 4).map(metric => ({
    label: metric.name.replace(' ', '\n'),
    value: metric.variancePercent,
    color: metric.variancePercent >= 0 ? 'bg-green-500' : 'bg-red-500'
  }));

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="États Financiers"
          subtitle="Génération, validation et publication des états financiers"
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
                onClick={() => setStatementModal({ isOpen: true, mode: 'create' })}
              >
                Nouvel État
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="États Financiers"
            value={aggregatedData.totalStatements.toString()}
            subtitle={`${aggregatedData.publishedStatements} publiés`}
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="États Consolidés"
            value={aggregatedData.consolidatedStatements.toString()}
            subtitle={`Sur ${aggregatedData.totalStatements} états total`}
            icon={Layers}
            color="success"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Accès Public"
            value={aggregatedData.publicStatements.toString()}
            subtitle="États publics disponibles"
            icon={Globe}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Performance Moyenne"
            value={`${aggregatedData.avgMetricsImprovement >= 0 ? '+' : ''}${aggregatedData.avgMetricsImprovement.toFixed(1)}%`}
            subtitle="Évolution des indicateurs"
            icon={TrendingUp}
            color={aggregatedData.avgMetricsImprovement >= 0 ? "success" : "error"}
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* View Mode Selector */}
        <UnifiedCard variant="elevated" size="md">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
              {(['statements', 'metrics', 'templates'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    viewMode === mode
                      ? 'bg-[#6A8A82] text-white shadow-md'
                      : 'text-neutral-600 hover:text-[#6A8A82]'
                  }`}
                >
                  {mode === 'statements' ? 'États Financiers' :
                   mode === 'metrics' ? 'Indicateurs' : 'Modèles'}
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
                <option value="2024-Q3">2024-Q3</option>
                <option value="2024-Q2">2024-Q2</option>
                <option value="2024-Q1">2024-Q1</option>
                <option value="2023-Q4">2023-Q4</option>
              </select>
            </div>
          </div>
        </UnifiedCard>

        {viewMode === 'statements' && (
          <>
            {/* Chart Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ModernChartCard
                title="État des Publications"
                subtitle="Répartition par statut de validation"
                icon={PieChart}
              >
                <ColorfulBarChart
                  data={chartData}
                  height={160}
                  showValues={true}
                  valueFormatter={(value) => `${value} état${value !== 1 ? 's' : ''}`}
                />
              </ModernChartCard>
            </motion.div>

            {/* Filters */}
            <UnifiedCard variant="elevated" size="md">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-neutral-800">Filtres et Recherche</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <option value="draft">{t('accounting.draft')}</option>
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
                    <option value="equity_statement">Variation Capitaux</option>
                    <option value="comprehensive_income">Résultat Global</option>
                  </select>

                  <select
                    value={filterFormat}
                    onChange={(e) => setFilterFormat(e.target.value)}
                    className="px-3 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  >
                    <option value="all">Tous les formats</option>
                    <option value="ifrs">IFRS</option>
                    <option value="gaap">US GAAP</option>
                    <option value="syscohada">SYSCOHADA</option>
                    <option value="local">Local</option>
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

            {/* Statements List */}
            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  États Financiers ({filteredStatements.length})
                </h3>

                <div className="space-y-4">
                  {filteredStatements.map((statement, index) => (
                    <motion.div
                      key={statement.id}
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
                              <h4 className="font-semibold text-neutral-800 text-lg">{statement.title}</h4>
                              <div className="flex items-center space-x-4 text-sm text-neutral-500">
                                <span>{statementTypeLabels[statement.statementType]}</span>
                                <span>•</span>
                                <span>{statement.period}</span>
                                <span>•</span>
                                <span>v{statement.version}</span>
                                <span>•</span>
                                <span>{statement.fileSize}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                                  {statement.format.toUpperCase()}
                                </span>
                                {statement.consolidation && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600">
                                    Consolidé
                                  </span>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAccessColor(statement.accessLevel)}`}>
                                  {statement.accessLevel === 'public' ? 'Public' :
                                   statement.accessLevel === 'restricted' ? 'Restreint' : 'Confidentiel'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center space-x-1 ${getStatusColor(statement.status)}`}>
                              {getStatusIcon(statement.status)}
                              <span>
                                {statement.status === 'draft' ? 'Brouillon' :
                                 statement.status === 'review' ? 'En révision' :
                                 statement.status === 'approved' ? 'Approuvé' : 'Publié'}
                              </span>
                            </span>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setStatementModal({ isOpen: true, mode: 'view', statement })}
                                className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-neutral-400 hover:text-green-600 transition-colors" aria-label="Télécharger">
                                <Download className="h-4 w-4" />
                              </button>
                              <button className="p-2 text-neutral-400 hover:text-[#B87333] transition-colors" aria-label="Partager">
                                <Share2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-neutral-100">
                          <div>
                            <p className="text-sm text-neutral-500">Créé par:</p>
                            <p className="font-medium text-neutral-800">{statement.createdBy}</p>
                          </div>
                          {statement.approvedBy && (
                            <div>
                              <p className="text-sm text-neutral-500">Approuvé par:</p>
                              <p className="font-medium text-neutral-800">{statement.approvedBy}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-neutral-500">Dernière modification:</p>
                            <p className="font-medium text-neutral-800">{formatDate(statement.lastModified)}</p>
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

        {viewMode === 'metrics' && (
          <>
            {/* Metrics Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ModernChartCard
                title="Évolution des Indicateurs Clés"
                subtitle="Variation par rapport à la période précédente (%)"
                icon={TrendingUp}
              >
                <ColorfulBarChart
                  data={metricsChartData}
                  height={160}
                  showValues={true}
                  valueFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`}
                />
              </ModernChartCard>
            </motion.div>

            <UnifiedCard variant="elevated" size="lg">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Indicateurs Financiers - {selectedPeriod}
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-3 px-4 font-medium text-neutral-600">Indicateur</th>
                        <th className="text-center py-3 px-4 font-medium text-neutral-600">Catégorie</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Période Actuelle</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Période Précédente</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Variation</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Objectif</th>
                        <th className="text-right py-3 px-4 font-medium text-neutral-600">Benchmark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMetrics.map((metric, index) => (
                        <motion.tr
                          key={metric.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-neutral-100 hover:bg-neutral-50"
                        >
                          <td className="py-4 px-4">
                            <span className="font-semibold text-neutral-800">{metric.name}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(metric.category)}`}>
                              {metric.category === 'profitability' ? 'Rentabilité' :
                               metric.category === 'liquidity' ? 'Liquidité' :
                               metric.category === 'efficiency' ? 'Efficacité' : 'Endettement'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-semibold text-neutral-800">
                              {metric.name.includes('Ratio') ?
                                metric.currentPeriod.toFixed(2) :
                                formatPercentage(metric.currentPeriod)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-neutral-600">
                              {metric.name.includes('Ratio') ?
                                metric.previousPeriod.toFixed(2) :
                                formatPercentage(metric.previousPeriod)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {metric.variancePercent > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={metric.variancePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {metric.variancePercent >= 0 ? '+' : ''}{metric.variancePercent.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {metric.target ? (
                              <span className="text-neutral-600">
                                {metric.name.includes('Ratio') ?
                                  metric.target.toFixed(2) :
                                  formatPercentage(metric.target)}
                              </span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {metric.benchmark ? (
                              <span className="text-neutral-600">
                                {metric.name.includes('Ratio') ?
                                  metric.benchmark.toFixed(2) :
                                  formatPercentage(metric.benchmark)}
                              </span>
                            ) : (
                              <span className="text-neutral-400">-</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </UnifiedCard>
          </>
        )}

        {viewMode === 'templates' && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-800">
                  Modèles d'États Financiers
                </h3>
                <ElegantButton variant="primary" icon={Plus}>
                  Nouveau Modèle
                </ElegantButton>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 bg-white border border-neutral-200 rounded-xl hover:shadow-md transition-all duration-200"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-[#6A8A82]/10 rounded-lg">
                            <BookOpen className="h-5 w-5 text-[#6A8A82]" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-neutral-800">{template.name}</h4>
                            <p className="text-sm text-neutral-500">{template.type}</p>
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                          {template.format.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-neutral-600">{template.description}</p>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-neutral-700">Sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.sections.map(section => (
                            <span
                              key={section}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                        <div className="text-sm text-neutral-500">
                          <p>Utilisé {template.frequency} fois</p>
                          <p>Dernier usage: {formatDate(template.lastUsed)}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-2 text-neutral-400 hover:text-[#6A8A82] transition-colors" aria-label="Voir les détails">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="p-2 text-neutral-400 hover:text-green-600 transition-colors" aria-label="Ajouter">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </UnifiedCard>
        )}

        {/* Statement Modal */}
        {statementModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-neutral-800">
                    {statementModal.mode === 'create' ? 'Nouvel État Financier' :
                     statementModal.mode === 'edit' ? 'Modifier l\'État' : 'Détails de l\'État Financier'}
                  </h3>
                  <button
                    onClick={() => setStatementModal({ isOpen: false, mode: 'view' })}
                    className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {statementModal.statement ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Titre
                        </label>
                        <p className="text-neutral-800 font-semibold">{statementModal.statement.title}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Type d'État
                        </label>
                        <p className="text-neutral-800">{statementTypeLabels[statementModal.statement.statementType]}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Format
                        </label>
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-[#6A8A82]/10 text-[#6A8A82]">
                          {statementModal.statement.format.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Niveau d'Accès
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getAccessColor(statementModal.statement.accessLevel)}`}>
                          {statementModal.statement.accessLevel === 'public' ? 'Public' :
                           statementModal.statement.accessLevel === 'restricted' ? 'Restreint' : 'Confidentiel'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Statut
                        </label>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(statementModal.statement.status)}`}>
                          {statementModal.statement.status === 'draft' ? 'Brouillon' :
                           statementModal.statement.status === 'review' ? 'En révision' :
                           statementModal.statement.status === 'approved' ? 'Approuvé' : 'Publié'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Période
                        </label>
                        <p className="text-neutral-800">{statementModal.statement.period}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Version
                        </label>
                        <p className="text-neutral-800">{statementModal.statement.version}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Taille du Fichier
                        </label>
                        <p className="text-neutral-800">{statementModal.statement.fileSize}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-neutral-600">
                    <p>Formulaire de création d'état financier...</p>
                    <p className="text-sm mt-2">Interface de création en développement</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
                  <ElegantButton
                    variant="outline"
                    onClick={() => setStatementModal({ isOpen: false, mode: 'view' })}
                  >
                    {statementModal.mode === 'view' ? 'Fermer' : 'Annuler'}
                  </ElegantButton>
                  {statementModal.mode !== 'view' && (
                    <ElegantButton variant="primary">
                      {statementModal.mode === 'create' ? 'Créer État' : 'Sauvegarder'}
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

export default FinancialStatements;