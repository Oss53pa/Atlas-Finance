import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Wrench,
  Package,
  Truck,
  Monitor,
  Sofa,
  Home,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  FileText,
  Filter,
  Search,
  RefreshCw,
  Eye,
  Activity,
  Zap,
  Target,
  Users,
  Clock,
  Shield,
  Globe,
  BarChart as BarChartIcon,
  Map,
  Settings
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Types et interfaces
interface AssetKPI {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'stable';
  description?: string;
}

interface AssetCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  value: number;
  percentage: number;
  color: string;
  subCategories?: { name: string; count: number; value: number }[];
}

interface GeographicData {
  location: string;
  count: number;
  value: number;
  percentage: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface MaintenanceItem {
  id: string;
  assetName: string;
  type: 'preventive' | 'corrective' | 'urgent';
  status: 'upcoming' | 'overdue' | 'completed';
  dueDate: string;
  cost: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface DepreciationData {
  month: string;
  acquisition: number;
  depreciation: number;
  netValue: number;
  disposal: number;
}

// Données mockées
const mockKPIs: AssetKPI[] = [
  {
    id: 'total_value',
    title: 'Valeur Totale des Actifs',
    value: '12,450,000 €',
    change: 8.5,
    changeLabel: 'vs année précédente',
    icon: <DollarSign className="w-6 h-6" />,
    color: '[#6A8A82]',
    trend: 'up',
    description: 'Valeur brute de tous les actifs immobilisés'
  },
  {
    id: 'net_book_value',
    title: 'Valeur Nette Comptable',
    value: '8,890,000 €',
    change: 3.2,
    changeLabel: 'vs année précédente',
    icon: <Building2 className="w-6 h-6" />,
    color: 'green',
    trend: 'up',
    description: 'Valeur après amortissements'
  },
  {
    id: 'depreciation_rate',
    title: 'Taux d\'Amortissement',
    value: '28.6%',
    change: -2.1,
    changeLabel: 'vs année précédente',
    icon: <TrendingDown className="w-6 h-6" />,
    color: 'orange',
    trend: 'down',
    description: 'Pourcentage d\'amortissement cumulé'
  },
  {
    id: 'maintenance_cost',
    title: 'Coûts de Maintenance',
    value: '234,500 €',
    change: -5.8,
    changeLabel: 'vs année précédente',
    icon: <Wrench className="w-6 h-6" />,
    color: '[#B87333]',
    trend: 'down',
    description: 'Dépenses totales de maintenance'
  },
  {
    id: 'asset_count',
    title: 'Nombre d\'Actifs',
    value: '1,247',
    change: 12.3,
    changeLabel: 'vs année précédente',
    icon: <Package className="w-6 h-6" />,
    color: '[#6A8A82]',
    trend: 'up',
    description: 'Total des actifs enregistrés'
  },
  {
    id: 'utilization_rate',
    title: 'Taux d\'Utilisation',
    value: '87.4%',
    change: 4.1,
    changeLabel: 'vs trimestre précédent',
    icon: <Activity className="w-6 h-6" />,
    color: '[#6A8A82]',
    trend: 'up',
    description: 'Pourcentage d\'actifs en utilisation'
  }
];

const mockCategories: AssetCategory[] = [
  {
    id: 'it',
    name: 'Matériel Informatique',
    icon: <Monitor className="w-6 h-6" />,
    count: 456,
    value: 2850000,
    percentage: 22.9,
    color: '#6A8A82',
    subCategories: [
      { name: 'Ordinateurs', count: 245, value: 1200000 },
      { name: 'Serveurs', count: 45, value: 890000 },
      { name: 'Périphériques', count: 166, value: 760000 }
    ]
  },
  {
    id: 'vehicles',
    name: 'Véhicules',
    icon: <Truck className="w-6 h-6" />,
    count: 123,
    value: 3240000,
    percentage: 26.0,
    color: '#10B981',
    subCategories: [
      { name: 'Véhicules légers', count: 78, value: 1560000 },
      { name: 'Utilitaires', count: 32, value: 1280000 },
      { name: 'Poids lourds', count: 13, value: 400000 }
    ]
  },
  {
    id: 'furniture',
    name: 'Mobilier & Aménagement',
    icon: <Sofa className="w-6 h-6" />,
    count: 234,
    value: 890000,
    percentage: 7.1,
    color: '#F59E0B',
    subCategories: [
      { name: 'Mobilier bureau', count: 156, value: 520000 },
      { name: 'Aménagements', count: 45, value: 250000 },
      { name: 'Équipements', count: 33, value: 120000 }
    ]
  },
  {
    id: 'equipment',
    name: 'Équipements & Machines',
    icon: <Package className="w-6 h-6" />,
    count: 189,
    value: 4200000,
    percentage: 33.7,
    color: '#B87333',
    subCategories: [
      { name: 'Machines industrielles', count: 67, value: 2800000 },
      { name: 'Équipements bureau', count: 89, value: 980000 },
      { name: 'Outillage', count: 33, value: 420000 }
    ]
  },
  {
    id: 'real_estate',
    name: 'Immobilier',
    icon: <Home className="w-6 h-6" />,
    count: 12,
    value: 1270000,
    percentage: 10.2,
    color: '#EF4444',
    subCategories: [
      { name: 'Bureaux', count: 8, value: 890000 },
      { name: 'Entrepôts', count: 3, value: 280000 },
      { name: 'Terrains', count: 1, value: 100000 }
    ]
  }
];

const mockGeographicData: GeographicData[] = [
  { location: 'Paris - Siège', count: 445, value: 4200000, percentage: 33.7, riskLevel: 'low' },
  { location: 'Lyon - Succursale', count: 234, value: 2800000, percentage: 22.5, riskLevel: 'medium' },
  { location: 'Marseille - Bureau', count: 189, value: 1890000, percentage: 15.2, riskLevel: 'low' },
  { location: 'Toulouse - Antenne', count: 156, value: 1560000, percentage: 12.5, riskLevel: 'medium' },
  { location: 'Lille - Dépôt', count: 123, value: 1240000, percentage: 10.0, riskLevel: 'high' },
  { location: 'Bordeaux - Agence', count: 100, value: 760000, percentage: 6.1, riskLevel: 'low' }
];

const mockMaintenanceData: MaintenanceItem[] = [
  {
    id: '1',
    assetName: 'Serveur Principal - Paris',
    type: 'preventive',
    status: 'upcoming',
    dueDate: '2024-10-15',
    cost: 2500,
    priority: 'high'
  },
  {
    id: '2',
    assetName: 'Véhicule Commercial VP-001',
    type: 'corrective',
    status: 'overdue',
    dueDate: '2024-09-28',
    cost: 1800,
    priority: 'critical'
  },
  {
    id: '3',
    assetName: 'Machine Production M-15',
    type: 'urgent',
    status: 'overdue',
    dueDate: '2024-10-02',
    cost: 5600,
    priority: 'critical'
  },
  {
    id: '4',
    assetName: 'Climatisation Bureau Lyon',
    type: 'preventive',
    status: 'upcoming',
    dueDate: '2024-10-20',
    cost: 450,
    priority: 'medium'
  },
  {
    id: '5',
    assetName: 'Imprimante Réseau - Marseille',
    type: 'corrective',
    status: 'upcoming',
    dueDate: '2024-10-18',
    cost: 320,
    priority: 'low'
  }
];

const mockDepreciationData: DepreciationData[] = [
  { month: 'Jan', acquisition: 1200000, depreciation: 850000, netValue: 8950000, disposal: 50000 },
  { month: 'Fév', acquisition: 800000, depreciation: 920000, netValue: 8830000, disposal: 0 },
  { month: 'Mar', acquisition: 1500000, depreciation: 980000, netValue: 9350000, disposal: 120000 },
  { month: 'Avr', acquisition: 600000, depreciation: 1050000, netValue: 8900000, disposal: 80000 },
  { month: 'Mai', acquisition: 2200000, depreciation: 1120000, netValue: 9980000, disposal: 0 },
  { month: 'Jun', acquisition: 400000, depreciation: 1180000, netValue: 9200000, disposal: 200000 },
  { month: 'Jul', acquisition: 1800000, depreciation: 1250000, netValue: 9750000, disposal: 150000 },
  { month: 'Aoû', acquisition: 900000, depreciation: 1320000, netValue: 9330000, disposal: 90000 },
  { month: 'Sep', acquisition: 1100000, depreciation: 1380000, netValue: 9050000, disposal: 110000 },
  { month: 'Oct', acquisition: 1600000, depreciation: 1450000, netValue: 9200000, disposal: 70000 }
];

const COLORS = ['#6A8A82', '#10B981', '#F59E0B', '#B87333', '#EF4444', '#7A99AC', '#F97316', '#84CC16'];

// Tab type definition
type TabType = 'overview' | 'categories' | 'financial' | 'geographic' | 'maintenance';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const AssetsSummary: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Tab configuration
  const tabs: Tab[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <Eye className="w-4 h-4" /> },
    { id: 'categories', label: 'Catégories', icon: <BarChartIcon className="w-4 h-4" /> },
    { id: 'financial', label: 'Financier', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'geographic', label: 'Géographique', icon: <Map className="w-4 h-4" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Settings className="w-4 h-4" /> }
  ];

  // Calculs dynamiques
  const totalMaintenanceCost = useMemo(() =>
    mockMaintenanceData.reduce((sum, item) => sum + item.cost, 0),
    [mockMaintenanceData]
  );

  const overdueMaintenanceCount = useMemo(() =>
    mockMaintenanceData.filter(item => item.status === 'overdue').length,
    [mockMaintenanceData]
  );

  const criticalMaintenanceCount = useMemo(() =>
    mockMaintenanceData.filter(item => item.priority === 'critical').length,
    [mockMaintenanceData]
  );

  // Fonction d'export Excel
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // KPIs Sheet
    const kpiData = mockKPIs.map(kpi => ({
      'Indicateur': kpi.title,
      'Valeur': kpi.value,
      'Évolution': `${kpi.change}%`,
      'Période': kpi.changeLabel,
      'Description': kpi.description
    }));
    const kpiSheet = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');

    // Categories Sheet
    const categoryData = mockCategories.map(cat => ({
      'Catégorie': cat.name,
      'Nombre': cat.count,
      'Valeur': `${cat.value.toLocaleString()} €`,
      'Pourcentage': `${cat.percentage}%`
    }));
    const categorySheet = XLSX.utils.json_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Catégories');

    // Geographic Sheet
    const geoData = mockGeographicData.map(geo => ({
      'Localisation': geo.location,
      'Nombre': geo.count,
      'Valeur': `${geo.value.toLocaleString()} €`,
      'Pourcentage': `${geo.percentage}%`,
      'Niveau de Risque': geo.riskLevel
    }));
    const geoSheet = XLSX.utils.json_to_sheet(geoData);
    XLSX.utils.book_append_sheet(wb, geoSheet, 'Répartition Géographique');

    // Maintenance Sheet
    const maintenanceData = mockMaintenanceData.map(item => ({
      'Actif': item.assetName,
      'Type': item.type,
      'Statut': item.status,
      'Date d\'échéance': item.dueDate,
      'Coût': `${item.cost} €`,
      'Priorité': item.priority
    }));
    const maintenanceSheet = XLSX.utils.json_to_sheet(maintenanceData);
    XLSX.utils.book_append_sheet(wb, maintenanceSheet, 'Maintenance');

    XLSX.writeFile(wb, `Assets_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Fonction d'export PDF
  const exportToPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.width;
    let yPos = 20;

    // Titre
    pdf.setFontSize(20);
    pdf.text('Synthèse des Actifs - Atlas Finance', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;

    // Date
    pdf.setFontSize(12);
    pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 30;

    // KPIs principaux
    pdf.setFontSize(16);
    pdf.text('Indicateurs Clés de Performance', 20, yPos);
    yPos += 15;

    pdf.setFontSize(10);
    mockKPIs.slice(0, 4).forEach(kpi => {
      pdf.text(`${kpi.title}: ${kpi.value} (${kpi.change > 0 ? '+' : ''}${kpi.change}%)`, 20, yPos);
      yPos += 8;
    });

    yPos += 20;

    // Répartition par catégories
    pdf.setFontSize(16);
    pdf.text('Répartition par Catégories', 20, yPos);
    yPos += 15;

    pdf.setFontSize(10);
    mockCategories.forEach(cat => {
      pdf.text(`${cat.name}: ${cat.count} actifs - ${cat.value.toLocaleString()} € (${cat.percentage}%)`, 20, yPos);
      yPos += 8;
    });

    pdf.save(`Assets_Summary_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Fonction de rafraîchissement
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulation d'un appel API
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  // Render functions for each tab
  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* KPIs Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {mockKPIs.map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={kpi.color.startsWith('[') ? `p-3 rounded-lg bg-${kpi.color}/10` : `p-3 rounded-lg bg-${kpi.color}-100`}>
                <div className={kpi.color.startsWith('[') ? `text-${kpi.color}` : `text-${kpi.color}-600`}>
                  {kpi.icon}
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                kpi.trend === 'up'
                  ? 'bg-green-100 text-green-800'
                  : kpi.trend === 'down'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-600">{kpi.title}</h3>
              <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500">{kpi.changeLabel}</p>
              {kpi.description && (
                <p className="text-xs text-slate-400 mt-2">{kpi.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Barre d'analyse rapide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-xl shadow-lg p-6 text-white"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Analyse Rapide</h2>
            <p className="text-white/70">
              Points clés à retenir sur votre patrimoine d'actifs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6A8A82] rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-white/70">Croissance</p>
                <p className="font-semibold">+8.5% cette année</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6A8A82] rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-white/70">Conformité</p>
                <p className="font-semibold">98.7% conforme</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#6A8A82] rounded-lg">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-white/70">Performance</p>
                <p className="font-semibold">87.4% utilisation</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderCategoriesTab = () => (
    <div className="space-y-8">
      {/* Vue d'ensemble des catégories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Répartition par catégories - Graphique */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Répartition par Catégories
            </h2>
            <PieChart className="w-5 h-5 text-slate-500" />
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={mockCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {mockCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString()} €`, 'Valeur']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Liste détaillée des catégories */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              Détail par Catégorie
            </h2>
            <BarChart3 className="w-5 h-5 text-slate-500" />
          </div>

          <div className="space-y-4">
            {mockCategories.map((category) => (
              <motion.div
                key={category.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${category.color}20` }}>
                      <div style={{ color: category.color }}>
                        {category.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{category.name}</h3>
                      <p className="text-sm text-slate-500">{category.count} actifs</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {category.value.toLocaleString()} €
                    </p>
                    <p className="text-sm text-slate-500">{category.percentage}%</p>
                  </div>
                </div>

                {selectedCategory === category.id && category.subCategories && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-slate-200"
                  >
                    <div className="space-y-2">
                      {category.subCategories.map((sub, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">{sub.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-500">{sub.count} actifs</span>
                            <span className="font-medium text-slate-700">
                              {sub.value.toLocaleString()} €
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderFinancialTab = () => (
    <div className="space-y-8">
      {/* Financial KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {mockKPIs.filter(kpi => ['total_value', 'net_book_value', 'depreciation_rate', 'maintenance_cost'].includes(kpi.id)).map((kpi, index) => (
          <motion.div
            key={kpi.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={kpi.color.startsWith('[') ? `p-3 rounded-lg bg-${kpi.color}/10` : `p-3 rounded-lg bg-${kpi.color}-100`}>
                <div className={kpi.color.startsWith('[') ? `text-${kpi.color}` : `text-${kpi.color}-600`}>
                  {kpi.icon}
                </div>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                kpi.trend === 'up'
                  ? 'bg-green-100 text-green-800'
                  : kpi.trend === 'down'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : kpi.trend === 'down' ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Activity className="w-3 h-3" />
                )}
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-600">{kpi.title}</h3>
              <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500">{kpi.changeLabel}</p>
              {kpi.description && (
                <p className="text-xs text-slate-400 mt-2">{kpi.description}</p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Évolution financière */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Évolution Financière des Actifs
          </h2>
          <LineChart className="w-5 h-5 text-slate-500" />
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={mockDepreciationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} €`, '']}
                labelFormatter={(label) => `Mois: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="acquisition"
                stroke="#6A8A82"
                strokeWidth={2}
                name="Acquisitions"
              />
              <Line
                type="monotone"
                dataKey="depreciation"
                stroke="#EF4444"
                strokeWidth={2}
                name="Amortissements"
              />
              <Line
                type="monotone"
                dataKey="netValue"
                stroke="#10B981"
                strokeWidth={2}
                name="Valeur nette"
              />
              <Line
                type="monotone"
                dataKey="disposal"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Cessions"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );

  const renderGeographicTab = () => (
    <div className="space-y-8">
      {/* Répartition géographique */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Répartition Géographique
          </h2>
          <MapPin className="w-5 h-5 text-slate-500" />
        </div>

        <div className="space-y-4">
          {mockGeographicData.map((location, index) => (
            <motion.div
              key={location.location}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  location.riskLevel === 'low' ? 'bg-green-500' :
                  location.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <div>
                  <h3 className="font-medium text-slate-900">{location.location}</h3>
                  <p className="text-sm text-slate-500">{location.count} actifs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">
                  {location.value.toLocaleString()} €
                </p>
                <p className="text-sm text-slate-500">{location.percentage}%</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-600">Faible risque</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-slate-600">Risque moyen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">Risque élevé</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Geographic Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Distribution par Valeur
          </h2>
          <BarChart3 className="w-5 h-5 text-slate-500" />
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockGeographicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="location" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} €`, 'Valeur']}
              />
              <Bar dataKey="value" fill="#6A8A82" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );

  const renderMaintenanceTab = () => (
    <div className="space-y-8">
      {/* Vue d'ensemble maintenance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Maintenance - Vue d'ensemble
          </h2>
          <Wrench className="w-5 h-5 text-slate-500" />
        </div>

        {/* Indicateurs maintenance */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="text-lg font-bold text-red-600">{overdueMaintenanceCount}</div>
            <div className="text-sm text-red-600">En retard</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
            <div className="text-lg font-bold text-orange-600">{criticalMaintenanceCount}</div>
            <div className="text-sm text-orange-600">Critique</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-[#6A8A82]/10 border border-[#6A8A82]/20">
            <div className="text-lg font-bold text-[#6A8A82]">
              {totalMaintenanceCost.toLocaleString()} €
            </div>
            <div className="text-sm text-[#6A8A82]">Coût total</div>
          </div>
        </div>

        {/* Liste des maintenances prioritaires */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900 mb-3">Maintenances Prioritaires</h3>
          {mockMaintenanceData
            .filter(item => item.priority === 'critical' || item.status === 'overdue')
            .slice(0, 4)
            .map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  item.status === 'overdue' ? 'bg-red-500' :
                  item.priority === 'critical' ? 'bg-orange-500' : 'bg-yellow-500'
                }`}></div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900">{item.assetName}</h4>
                  <p className="text-xs text-slate-500">
                    {item.type} - {item.dueDate}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{item.cost} €</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.priority}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Detailed maintenance list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-lg p-6 border border-slate-200"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Toutes les Maintenances
          </h2>
          <Calendar className="w-5 h-5 text-slate-500" />
        </div>

        <div className="space-y-3">
          {mockMaintenanceData.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  item.status === 'overdue' ? 'bg-red-500' :
                  item.status === 'upcoming' ? 'bg-orange-500' : 'bg-green-500'
                }`}></div>
                <div>
                  <h4 className="font-medium text-slate-900">{item.assetName}</h4>
                  <p className="text-sm text-slate-500">
                    {item.type} - Échéance: {item.dueDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                  item.status === 'upcoming' ? 'bg-orange-100 text-orange-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  item.priority === 'critical' ? 'bg-red-100 text-red-800' :
                  item.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-[#6A8A82]/10 text-[#6A8A82]'
                }`}>
                  {item.priority}
                </span>
                <div className="text-right">
                  <p className="font-medium text-slate-900">{item.cost} €</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-[#6A8A82]/10 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-8 border border-slate-200"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-lg font-bold text-slate-900 mb-2">
                Synthèse des Actifs
              </h1>
              <p className="text-slate-600">
                Vue d'ensemble complète du patrimoine de l'entreprise
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualiser
                </button>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Excel
                </button>

                <button
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
              </div>

              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              >
                <option value="month">Ce mois</option>
                <option value="quarter">Ce trimestre</option>
                <option value="year">Cette année</option>
                <option value="all">Tout</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Horizontal Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg border border-slate-200"
        >
          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#6A8A82] text-[#6A8A82]'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'categories' && renderCategoriesTab()}
              {activeTab === 'financial' && renderFinancialTab()}
              {activeTab === 'geographic' && renderGeographicTab()}
              {activeTab === 'maintenance' && renderMaintenanceTab()}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AssetsSummary;