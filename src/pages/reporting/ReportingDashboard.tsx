import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [selectedView, setSelectedView] = useState<'overview' | 'reports' | 'dashboards'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const mockReports: Report[] = [
        {
          id: '1',
          name: 'Bilan Comptable Mensuel',
          type: 'financial',
          category: 'Comptabilité',
          description: 'Bilan comptable détaillé avec comparaison période précédente',
          lastGenerated: '2024-08-25T10:30:00Z',
          generatedBy: 'Marie Dubois',
          views: 245,
          status: 'active',
          frequency: 'monthly',
          format: 'pdf',
          isPublic: true,
          tags: ['bilan', 'comptabilité', 'syscohada']
        },
        {
          id: '2',
          name: 'Tableau de Bord Commercial',
          type: 'management',
          category: 'Commercial',
          description: 'Indicateurs de performance commerciale en temps réel',
          lastGenerated: '2024-08-25T08:15:00Z',
          generatedBy: 'Jean Kouassi',
          views: 189,
          status: 'active',
          frequency: 'daily',
          format: 'dashboard',
          isPublic: false,
          tags: ['commercial', 'kpi', 'ventes']
        },
        {
          id: '3',
          name: 'Analyse de Rentabilité',
          type: 'analytical',
          category: 'Analyse',
          description: 'Analyse détaillée de la rentabilité par produit et service',
          lastGenerated: '2024-08-24T16:45:00Z',
          generatedBy: 'Fatou Traoré',
          views: 127,
          status: 'active',
          frequency: 'weekly',
          format: 'excel',
          isPublic: true,
          tags: ['rentabilité', 'analyse', 'produits']
        }
      ];
      return mockReports;
    }
  });

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      case 'analytical': return 'bg-[#B87333]/10 text-[#B87333]';
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
            <div className="w-20 h-20 border-4 border-[#6A8A82]/20 border-t-[#6A8A82] rounded-full animate-spin"></div>
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
            title="Générations"
            value="247"
            subtitle="Cette semaine"
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
                { label: 'Financier', value: reports.filter(r => r.type === 'financial').length, color: 'bg-[#6A8A82]' },
                { label: 'Analytique', value: reports.filter(r => r.type === 'analytical').length, color: 'bg-[#B87333]' },
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
                  <FileText className="h-6 w-6 text-[#6A8A82]" />
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
                  className="group flex items-start justify-between p-6 border border-neutral-200 rounded-2xl hover:border-[#6A8A82]/30 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-[#6A8A82]/10 rounded-2xl text-[#6A8A82]">
                      {getReportTypeIcon(report.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 group-hover:text-[#6A8A82] transition-colors">
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
                className="p-6 rounded-2xl border bg-[#6A8A82]/5 border-[#6A8A82]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[#6A8A82]">Rapports Automatiques</span>
                  <span className="font-bold text-xl text-[#6A8A82]">
                    {reports.filter(r => r.frequency !== 'on_demand').length}
                  </span>
                </div>
                <p className="text-sm text-[#6A8A82]/80">Générés automatiquement</p>
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
                className="p-6 rounded-2xl border bg-[#B87333]/5 border-[#B87333]/20"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-[#B87333]">Fréquence Moyenne</span>
                  <span className="font-bold text-xl text-[#B87333]">5.2</span>
                </div>
                <p className="text-sm text-[#B87333]/80">Générations par semaine</p>
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
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[#6A8A82]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#6A8A82]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <PlusIcon className="h-6 w-6 text-[#6A8A82]" />
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
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-[#B87333]/30 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#B87333]/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <ChartBarIcon className="h-6 w-6 text-[#B87333]" />
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