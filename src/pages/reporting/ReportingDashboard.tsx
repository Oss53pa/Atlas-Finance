import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
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

const ReportingDashboard: React.FC = () => {
  const { adapter } = useData();
  const [selectedView, setSelectedView] = useState<'overview' | 'reports' | 'dashboards'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  // Load fiscal years and journal entries from Dexie
  const { data: fiscalYears = [], isLoading: fyLoading } = useQuery({
    queryKey: ['dashboard-fiscal-years'],
    queryFn: () => adapter.getAll('fiscalYears'),
  });

  const { data: journalEntries = [], isLoading: jeLoading } = useQuery({
    queryKey: ['dashboard-journal-entries'],
    queryFn: () => adapter.getAll('journalEntries'),
  });

  // Build report list from real data
  const reports: Report[] = useMemo(() => {
    const result: Report[] = [];

    // Financial report per fiscal year
    for (const fy of fiscalYears) {
      result.push({
        id: `fy-${fy.id}`,
        name: `Bilan Comptable — ${fy.name || fy.code}`,
        type: 'financial',
        category: 'Comptabilité',
        description: `États financiers pour l'exercice ${fy.startDate?.substring(0, 4) || ''}`,
        lastGenerated: fy.endDate || new Date().toISOString(),
        generatedBy: 'system',
        views: 0,
        status: fy.isClosed ? 'active' : 'draft',
        frequency: 'annual',
        format: 'pdf',
        isPublic: true,
        tags: ['bilan', 'comptabilité', 'syscohada'],
      });
    }

    // Analytical report if entries exist
    if (journalEntries.length > 0) {
      const latestEntry = journalEntries.reduce((latest, e) => e.date > latest.date ? e : latest, journalEntries[0]);
      result.push({
        id: 'analytical-current',
        name: 'Analyse de Rentabilité',
        type: 'analytical',
        category: 'Analyse',
        description: `Analyse basée sur ${journalEntries.length} écritures comptables`,
        lastGenerated: latestEntry.date,
        generatedBy: 'system',
        views: 0,
        status: 'active',
        frequency: 'monthly',
        format: 'excel',
        isPublic: true,
        tags: ['rentabilité', 'analyse'],
      });
    }

    return result;
  }, [fiscalYears, journalEntries]);

  const reportsLoading = fyLoading || jeLoading;

  // Compute total entry count for "Générations" KPI
  const totalGenerations = journalEntries.length.toString();

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-[#171717]/10 text-[#171717]';
      case 'analytical': return 'bg-[#525252]/10 text-[#525252]';
      case 'management': return 'bg-emerald-100 text-emerald-700';
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
            <div className="w-20 h-20 border-4 border-[#171717]/20 border-t-[#171717] rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">Chargement du tableau de bord reporting...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Tableau de Bord Reporting"
          subtitle="Gestion des rapports et tableaux de bord"
          icon={ChartBarIcon}
          action={
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white border border-neutral-200 rounded-2xl px-4 py-2 text-sm font-medium"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
              </select>
              <ElegantButton icon={PlusIcon}>
                Nouveau Rapport
              </ElegantButton>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Rapports Actifs"
            value={reports.filter(r => r.status === 'active').length.toString()}
            subtitle="En production"
            icon={FileText}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Vues Totales"
            value={reports.reduce((sum, r) => sum + r.views, 0).toString()}
            subtitle="Ce mois"
            icon={Eye}
            color="success"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="Rapports Partagés"
            value={reports.filter(r => r.isPublic).length.toString()}
            subtitle="Publics"
            icon={Share}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Écritures"
            value={totalGenerations}
            subtitle="Total enregistré"
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
            title="Répartition des Rapports par Type"
            subtitle="Distribution des rapports selon leur catégorie"
            icon={PieChart}
          >
            <ColorfulBarChart
              data={[
                { label: 'Financier', value: reports.filter(r => r.type === 'financial').length, color: 'bg-[#171717]' },
                { label: 'Analytique', value: reports.filter(r => r.type === 'analytical').length, color: 'bg-[#525252]' },
                { label: 'Gestion', value: reports.filter(r => r.type === 'management').length, color: 'bg-emerald-400' },
                { label: 'Réglementaire', value: reports.filter(r => r.type === 'regulatory').length, color: 'bg-orange-400' }
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
                  <FileText className="h-6 w-6 text-[#171717]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Rapports Récents</h2>
                  <p className="text-neutral-600">Derniers rapports générés</p>
                </div>
              </div>
              <Link to="/reporting/reports">
                <ElegantButton variant="outline">
                  Voir tout
                </ElegantButton>
              </Link>
            </div>

            <div className="space-y-6">
              {reports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-start justify-between p-6 border border-neutral-200 rounded-2xl hover:border-[#171717]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#171717]/10 rounded-2xl text-[#171717]">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 group-hover:text-[#171717] transition-colors">
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
                          {report.views} vues
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
                      {report.type === 'financial' ? 'Financier' :
                       report.type === 'analytical' ? 'Analytique' :
                       report.type === 'management' ? 'Gestion' : 'Réglementaire'}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                      report.status === 'draft' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {report.status === 'active' ? 'Actif' :
                       report.status === 'draft' ? 'Brouillon' : 'Archivé'}
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
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Statistiques</h2>
                <p className="text-neutral-600">Performance reporting</p>
              </div>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 rounded-2xl border bg-[#171717]/5 border-[#171717]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[#171717]">Rapports Automatiques</span>
                  <span className="font-bold text-xl text-[#171717]">
                    {reports.filter(r => r.frequency !== 'on_demand').length}
                  </span>
                </div>
                <p className="text-sm text-[#171717]/80">Générés automatiquement</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl border bg-emerald-50/80 border-emerald-200/60"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-emerald-900">Formats Supportés</span>
                  <span className="font-bold text-xl text-emerald-900">3</span>
                </div>
                <p className="text-sm text-emerald-700">PDF, Excel, Dashboard</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl border bg-[#525252]/5 border-[#525252]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[#525252]">Exercices</span>
                  <span className="font-bold text-xl text-[#525252]">{fiscalYears.length}</span>
                </div>
                <p className="text-sm text-[#525252]/80">Exercices comptables</p>
              </motion.div>
            </div>
          </UnifiedCard>
        </div>

        {/* Quick Actions */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Actions Rapides</h2>
            <p className="text-neutral-600">Gestion des rapports et tableaux de bord</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/reporting/create">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[#171717]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#171717]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <PlusIcon className="h-6 w-6 text-[#171717]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Créer un Rapport</h3>
                <p className="text-sm text-neutral-600">Nouveau rapport personnalisé</p>
              </motion.div>
            </Link>

            <Link to="/reporting/templates">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <DocumentTextIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Modèles</h3>
                <p className="text-sm text-neutral-600">Bibliothèque de modèles</p>
              </motion.div>
            </Link>

            <Link to="/reporting/dashboards">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[#525252]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#525252]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-6 w-6 text-[#525252]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Tableaux de Bord</h3>
                <p className="text-sm text-neutral-600">Créer et gérer</p>
              </motion.div>
            </Link>

            <Link to="/reporting/schedule">
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
                <h3 className="font-bold text-neutral-900 mb-1">Planification</h3>
                <p className="text-sm text-neutral-600">Rapports automatiques</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>
      </div>
    </PageContainer>
  );
};

export default ReportingDashboard;