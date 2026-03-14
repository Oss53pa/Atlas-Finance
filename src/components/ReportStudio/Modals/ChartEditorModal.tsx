/**
 * ChartEditorModal - Interactive chart editor with catalog integration
 * Allows selecting from catalog, editing chart type, data, and styling
 */

import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Circle,
  ClipboardList,
  Palette,
  LayoutGrid,
  Search,
  Star,
  ChevronRight,
  LineChart as LineChartIcon,
  Map,
  Gauge,
  Table,
  Box,
  Activity,
  GitBranch,
  Sparkles,
  DollarSign,
  Radar,
} from 'lucide-react';
import ChartPreview from '@/components/catalog/ChartPreview';

interface ChartEditorModalProps {
  isOpen: boolean;
  chartData?: ChartData;
  onClose: () => void;
  onSave: (data: ChartData) => void;
}

interface ChartData {
  chartType: string;
  chartCode?: string;
  title: string;
  data: { label: string; value: number; color?: string }[];
  config: {
    colorScheme: string;
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
  };
}

const COLORS = ['#1C3163', '#D6B585', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Basic chart types for quick selection
const basicChartTypes: { id: string; label: string; icon: React.ElementType }[] = [
  { id: 'bar', label: 'Barres', icon: BarChart3 },
  { id: 'line', label: 'Lignes', icon: TrendingUp },
  { id: 'pie', label: 'Camembert', icon: PieChartIcon },
  { id: 'area', label: 'Aire', icon: AreaChartIcon },
  { id: 'donut', label: 'Donut', icon: Circle },
];

// Chart catalog categories
const chartCategories = [
  { code: 'COMPARISON', name: 'Comparaison', icon: BarChart3, color: '#3B82F6' },
  { code: 'TREND', name: 'Tendance', icon: LineChartIcon, color: '#10B981' },
  { code: 'DISTRIBUTION', name: 'Distribution', icon: PieChartIcon, color: '#8B5CF6' },
  { code: 'RELATIONSHIP', name: 'Relation', icon: Circle, color: '#F59E0B' },
  { code: 'HIERARCHICAL', name: 'Hiérarchique', icon: GitBranch, color: '#EC4899' },
  { code: 'GEOGRAPHIC', name: 'Géographique', icon: Map, color: '#06B6D4' },
  { code: 'KPI', name: 'Indicateurs', icon: Gauge, color: '#EF4444' },
  { code: 'TABLE', name: 'Tableaux', icon: Table, color: '#6366F1' },
  { code: '3D_IMMERSIVE', name: '3D & Immersif', icon: Box, color: '#7C3AED' },
  { code: 'ANIMATED', name: 'Animé', icon: Activity, color: '#F97316' },
  { code: 'STATISTICAL', name: 'Statistique', icon: TrendingUp, color: '#0EA5E9' },
  { code: 'NETWORK', name: 'Réseau', icon: GitBranch, color: '#84CC16' },
  { code: 'ARTISTIC', name: 'Artistique', icon: Sparkles, color: '#D946EF' },
  { code: 'FINANCIAL', name: 'Finance', icon: DollarSign, color: '#22C55E' },
  { code: 'SCIENTIFIC', name: 'Scientifique', icon: Radar, color: '#14B8A6' },
];

// Full chart catalog
const chartCatalog = [
  // COMPARISON
  { code: 'BAR_CHART', name: 'Graphique en barres', category: 'COMPARISON', popular: true },
  { code: 'COLUMN_CHART', name: 'Histogramme', category: 'COMPARISON', popular: true },
  { code: 'STACKED_BAR', name: 'Barres empilées', category: 'COMPARISON', popular: true },
  { code: 'GROUPED_BAR', name: 'Barres groupées', category: 'COMPARISON' },
  { code: 'BULLET_CHART', name: 'Graphique à puces', category: 'COMPARISON', new: true },
  { code: 'LOLLIPOP_CHART', name: 'Graphique sucette', category: 'COMPARISON', new: true },
  { code: 'RADAR_CHART', name: 'Graphique radar', category: 'COMPARISON' },
  { code: 'WATERFALL_CHART', name: 'Graphique en cascade', category: 'COMPARISON', popular: true },
  // TREND
  { code: 'LINE_CHART', name: 'Graphique linéaire', category: 'TREND', popular: true },
  { code: 'AREA_CHART', name: 'Graphique en aires', category: 'TREND', popular: true },
  { code: 'SPARKLINE', name: 'Sparkline', category: 'TREND', popular: true },
  { code: 'STEP_CHART', name: 'Graphique en escalier', category: 'TREND' },
  { code: 'COMBO_CHART', name: 'Graphique combiné', category: 'TREND', popular: true },
  { code: 'SLOPE_CHART', name: 'Graphique de pente', category: 'TREND', new: true },
  // DISTRIBUTION
  { code: 'PIE_CHART', name: 'Camembert', category: 'DISTRIBUTION', popular: true },
  { code: 'DONUT_CHART', name: 'Donut', category: 'DISTRIBUTION', popular: true },
  { code: 'HISTOGRAM', name: 'Histogramme', category: 'DISTRIBUTION' },
  { code: 'BOX_PLOT', name: 'Boîte à moustaches', category: 'DISTRIBUTION' },
  { code: 'FUNNEL_CHART', name: 'Entonnoir', category: 'DISTRIBUTION', popular: true },
  // RELATIONSHIP
  { code: 'SCATTER_PLOT', name: 'Nuage de points', category: 'RELATIONSHIP', popular: true },
  { code: 'BUBBLE_CHART', name: 'Graphique à bulles', category: 'RELATIONSHIP' },
  { code: 'HEATMAP', name: 'Carte de chaleur', category: 'RELATIONSHIP', popular: true },
  { code: 'CORRELATION_MATRIX', name: 'Matrice de corrélation', category: 'RELATIONSHIP' },
  // HIERARCHICAL
  { code: 'TREEMAP', name: 'Treemap', category: 'HIERARCHICAL', popular: true },
  { code: 'SUNBURST', name: 'Sunburst', category: 'HIERARCHICAL' },
  { code: 'SANKEY_DIAGRAM', name: 'Diagramme Sankey', category: 'HIERARCHICAL' },
  { code: 'ORG_CHART', name: 'Organigramme', category: 'HIERARCHICAL' },
  // GEOGRAPHIC
  { code: 'CHOROPLETH_MAP', name: 'Carte choroplèthe', category: 'GEOGRAPHIC', popular: true },
  { code: 'BUBBLE_MAP', name: 'Carte à bulles', category: 'GEOGRAPHIC' },
  { code: 'FLOW_MAP', name: 'Carte de flux', category: 'GEOGRAPHIC' },
  { code: '3D_GLOBE', name: 'Globe 3D', category: 'GEOGRAPHIC', new: true },
  // KPI
  { code: 'GAUGE_CHART', name: 'Jauge', category: 'KPI', popular: true },
  { code: 'KPI_CARD', name: 'Carte KPI', category: 'KPI', popular: true },
  { code: 'PROGRESS_BAR', name: 'Barre de progression', category: 'KPI' },
  { code: 'TRAFFIC_LIGHT', name: 'Feu tricolore', category: 'KPI' },
  { code: 'METRIC_TILE', name: 'Tuile métrique', category: 'KPI' },
  // TABLE
  { code: 'DATA_TABLE', name: 'Tableau de données', category: 'TABLE', popular: true },
  { code: 'PIVOT_TABLE', name: 'Tableau croisé', category: 'TABLE' },
  { code: 'MATRIX', name: 'Matrice', category: 'TABLE' },
  { code: 'CROSSTAB', name: 'Tableau croisé dynamique', category: 'TABLE' },
  // 3D_IMMERSIVE
  { code: '3D_BAR_CHART', name: 'Barres 3D', category: '3D_IMMERSIVE', new: true },
  { code: '3D_PIE_CHART', name: 'Camembert 3D', category: '3D_IMMERSIVE' },
  { code: '3D_SURFACE', name: 'Surface 3D', category: '3D_IMMERSIVE', new: true },
  { code: 'HOLOGRAPHIC', name: 'Holographique', category: '3D_IMMERSIVE', new: true },
  { code: 'VR_IMMERSIVE', name: 'VR Immersif', category: '3D_IMMERSIVE', new: true },
  { code: 'ISOMETRIC_CHART', name: 'Isométrique', category: '3D_IMMERSIVE' },
  // ANIMATED
  { code: 'ANIMATED_BAR_RACE', name: 'Course de barres', category: 'ANIMATED', popular: true, new: true },
  { code: 'PARTICLE_FLOW', name: 'Flux de particules', category: 'ANIMATED', new: true },
  { code: 'HEARTBEAT', name: 'Battement cardiaque', category: 'ANIMATED' },
  { code: 'LIVE_STREAM', name: 'Flux en direct', category: 'ANIMATED', new: true },
  { code: 'OSCILLOSCOPE', name: 'Oscilloscope', category: 'ANIMATED' },
  // STATISTICAL
  { code: 'VIOLIN_PLOT', name: 'Graphique en violon', category: 'STATISTICAL' },
  { code: 'RIDGELINE', name: 'Ridgeline', category: 'STATISTICAL', new: true },
  { code: 'PARALLEL_COORDINATES', name: 'Coordonnées parallèles', category: 'STATISTICAL' },
  { code: 'REGRESSION_PLOT', name: 'Régression', category: 'STATISTICAL' },
  { code: 'DENSITY_PLOT', name: 'Densité', category: 'STATISTICAL' },
  // NETWORK
  { code: 'FORCE_DIRECTED', name: 'Force dirigée', category: 'NETWORK', popular: true },
  { code: 'CHORD_DIAGRAM', name: 'Diagramme de cordes', category: 'NETWORK' },
  { code: 'ARC_DIAGRAM', name: 'Diagramme en arc', category: 'NETWORK' },
  { code: 'TREE_LAYOUT', name: 'Arborescence', category: 'NETWORK' },
  { code: 'CLUSTER_DENDROGRAM', name: 'Dendrogramme', category: 'NETWORK' },
  // ARTISTIC
  { code: 'WORD_CLOUD', name: 'Nuage de mots', category: 'ARTISTIC', popular: true },
  { code: 'WAFFLE_CHART', name: 'Graphique gaufre', category: 'ARTISTIC' },
  { code: 'LIQUID_FILL', name: 'Remplissage liquide', category: 'ARTISTIC', new: true },
  { code: 'NEON_GLOW', name: 'Néon lumineux', category: 'ARTISTIC', new: true },
  { code: 'GLASSMORPHISM', name: 'Glassmorphism', category: 'ARTISTIC', new: true },
  { code: 'RADIAL_PROGRESS', name: 'Progression radiale', category: 'ARTISTIC' },
  // FINANCIAL
  { code: 'CANDLESTICK', name: 'Chandelier japonais', category: 'FINANCIAL', popular: true },
  { code: 'OHLC_CHART', name: 'OHLC', category: 'FINANCIAL' },
  { code: 'ICHIMOKU', name: 'Ichimoku', category: 'FINANCIAL' },
  { code: 'VOLUME_PROFILE', name: 'Profil de volume', category: 'FINANCIAL' },
  { code: 'MARKET_DEPTH', name: 'Profondeur de marché', category: 'FINANCIAL' },
  // SCIENTIFIC
  { code: 'SPECTROGRAM', name: 'Spectrogramme', category: 'SCIENTIFIC' },
  { code: 'VECTOR_FIELD', name: 'Champ vectoriel', category: 'SCIENTIFIC' },
  { code: 'TERNARY_PLOT', name: 'Diagramme ternaire', category: 'SCIENTIFIC' },
  { code: 'MOLECULAR_STRUCTURE', name: 'Structure moléculaire', category: 'SCIENTIFIC', new: true },
  { code: 'PHYLOGENETIC_TREE', name: 'Arbre phylogénétique', category: 'SCIENTIFIC' },
];

const defaultData: ChartData = {
  chartType: 'bar',
  title: 'Nouveau graphique',
  data: [
    { label: 'Jan', value: 400 },
    { label: 'Fév', value: 300 },
    { label: 'Mar', value: 600 },
    { label: 'Avr', value: 800 },
    { label: 'Mai', value: 500 },
  ],
  config: {
    colorScheme: 'corporate',
    showLegend: true,
    showGrid: true,
    showLabels: true,
  },
};

export const ChartEditorModal: React.FC<ChartEditorModalProps> = ({
  isOpen,
  chartData = defaultData,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'type' | 'data' | 'style'>('catalogue');
  const [data, setData] = useState<ChartData>(chartData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Filter charts based on search and category
  const filteredCharts = useMemo(() => {
    return chartCatalog.filter((chart) => {
      const matchesSearch = chart.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chart.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || chart.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const popularCharts = chartCatalog.filter((c) => c.popular);

  const handleSelectChartFromCatalog = (chartCode: string) => {
    // Complete mapping: catalog chart codes -> report template chart types
    // These mappings ensure synchronization with reportTemplatesConfig.ts
    const chartMapping: Record<string, string> = {
      // COMPARISON
      BAR_CHART: 'bar',
      COLUMN_CHART: 'bar',
      STACKED_BAR: 'bar',
      GROUPED_BAR: 'bar',
      BULLET_CHART: 'bar',
      LOLLIPOP_CHART: 'bar',
      RADAR_CHART: 'radar',
      WATERFALL_CHART: 'waterfall',
      // TREND
      LINE_CHART: 'line',
      AREA_CHART: 'area',
      SPARKLINE: 'line',
      STEP_CHART: 'line',
      COMBO_CHART: 'combo',
      SLOPE_CHART: 'line',
      // DISTRIBUTION
      PIE_CHART: 'pie',
      DONUT_CHART: 'donut',
      HISTOGRAM: 'bar',
      BOX_PLOT: 'bar',
      FUNNEL_CHART: 'funnel',
      // RELATIONSHIP
      SCATTER_PLOT: 'scatter',
      BUBBLE_CHART: 'scatter',
      HEATMAP: 'heatmap',
      CORRELATION_MATRIX: 'heatmap',
      // HIERARCHICAL
      TREEMAP: 'treemap',
      SUNBURST: 'pie',
      SANKEY_DIAGRAM: 'bar',
      ORG_CHART: 'treemap',
      // GEOGRAPHIC
      CHOROPLETH_MAP: 'bar',
      BUBBLE_MAP: 'scatter',
      FLOW_MAP: 'line',
      '3D_GLOBE': 'pie',
      // KPI
      GAUGE_CHART: 'gauge',
      KPI_CARD: 'bar',
      PROGRESS_BAR: 'bar',
      TRAFFIC_LIGHT: 'gauge',
      METRIC_TILE: 'bar',
      // TABLE
      DATA_TABLE: 'bar',
      PIVOT_TABLE: 'bar',
      MATRIX: 'heatmap',
      CROSSTAB: 'bar',
      // 3D_IMMERSIVE
      '3D_BAR_CHART': 'bar',
      '3D_PIE_CHART': 'pie',
      '3D_SURFACE': 'area',
      HOLOGRAPHIC: 'bar',
      VR_IMMERSIVE: 'bar',
      ISOMETRIC_CHART: 'bar',
      // ANIMATED
      ANIMATED_BAR_RACE: 'bar',
      PARTICLE_FLOW: 'line',
      HEARTBEAT: 'line',
      LIVE_STREAM: 'line',
      OSCILLOSCOPE: 'line',
      // STATISTICAL
      VIOLIN_PLOT: 'bar',
      RIDGELINE: 'area',
      PARALLEL_COORDINATES: 'line',
      REGRESSION_PLOT: 'scatter',
      DENSITY_PLOT: 'area',
      // NETWORK
      FORCE_DIRECTED: 'scatter',
      CHORD_DIAGRAM: 'pie',
      ARC_DIAGRAM: 'line',
      TREE_LAYOUT: 'treemap',
      CLUSTER_DENDROGRAM: 'treemap',
      // ARTISTIC
      WORD_CLOUD: 'pie',
      WAFFLE_CHART: 'bar',
      LIQUID_FILL: 'gauge',
      NEON_GLOW: 'bar',
      GLASSMORPHISM: 'bar',
      RADIAL_PROGRESS: 'gauge',
      // FINANCIAL
      CANDLESTICK: 'bar',
      OHLC_CHART: 'bar',
      ICHIMOKU: 'line',
      VOLUME_PROFILE: 'bar',
      MARKET_DEPTH: 'area',
      // SCIENTIFIC
      SPECTROGRAM: 'heatmap',
      VECTOR_FIELD: 'scatter',
      TERNARY_PLOT: 'scatter',
      MOLECULAR_STRUCTURE: 'scatter',
      PHYLOGENETIC_TREE: 'treemap',
    };

    const chartType = chartMapping[chartCode] || 'bar';
    const chartInfo = chartCatalog.find((c) => c.code === chartCode);

    setData({
      ...data,
      chartType,
      chartCode,
      title: chartInfo?.name || 'Nouveau graphique',
    });

    // Move to data tab after selecting a chart
    setActiveTab('data');
  };

  const updateDataPoint = (index: number, field: 'label' | 'value', value: string | number) => {
    const newData = [...data.data];
    newData[index] = { ...newData[index], [field]: field === 'value' ? Number(value) : value };
    setData({ ...data, data: newData });
  };

  const addDataPoint = () => {
    setData({
      ...data,
      data: [...data.data, { label: `Point ${data.data.length + 1}`, value: 0 }],
    });
  };

  const removeDataPoint = (index: number) => {
    setData({
      ...data,
      data: data.data.filter((_, i) => i !== index),
    });
  };

  const renderChart = () => {
    const chartProps = {
      data: data.data.map((d, i) => ({ name: d.label, value: d.value, fill: COLORS[i % COLORS.length] })),
    };

    switch (data.chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartProps.data}>
              {data.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {data.config.showLegend && <Legend />}
              <Bar dataKey="value" fill="#1C3163">
                {chartProps.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartProps.data}>
              {data.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {data.config.showLegend && <Legend />}
              <Line type="monotone" dataKey="value" stroke="#1C3163" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
      case 'donut':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartProps.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={data.chartType === 'donut' ? 60 : 0}
                label={data.config.showLabels}
              >
                {chartProps.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              {data.config.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartProps.data}>
              {data.config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              {data.config.showLegend && <Legend />}
              <Area type="monotone" dataKey="value" stroke="#1C3163" fill="#1C3163" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-gray-500" />
            <div>
              <input
                type="text"
                value={data.title}
                onChange={(e) => setData({ ...data, title: e.target.value })}
                className="text-xl font-semibold text-gray-900 bg-transparent border-none focus:ring-0 focus:outline-none"
                placeholder="Titre du graphique"
              />
              {data.chartCode && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Type: {chartCatalog.find((c) => c.code === data.chartCode)?.name}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex">
          {/* Sidebar - Tabs */}
          <div className="w-52 border-r border-gray-200 p-4">
            <nav className="space-y-1">
              {[
                { id: 'catalogue', label: 'Catalogue', icon: LayoutGrid },
                { id: 'type', label: 'Type rapide', icon: BarChart3 },
                { id: 'data', label: 'Données', icon: ClipboardList },
                { id: 'style', label: 'Style', icon: Palette },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[60vh]">
            {/* Catalogue Tab */}
            {activeTab === 'catalogue' && (
              <div>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un graphique..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      !selectedCategory
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    Tous
                  </button>
                  {chartCategories.slice(0, 8).map((cat) => (
                    <button
                      key={cat.code}
                      onClick={() => setSelectedCategory(cat.code)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1',
                        selectedCategory === cat.code
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      )}
                      style={selectedCategory === cat.code ? { backgroundColor: cat.color } : {}}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Popular Charts */}
                {!searchQuery && !selectedCategory && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-warning" />
                      Populaires
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {popularCharts.slice(0, 8).map((chart) => {
                        const category = chartCategories.find((c) => c.code === chart.category);
                        return (
                          <button
                            key={chart.code}
                            onClick={() => handleSelectChartFromCatalog(chart.code)}
                            className={cn(
                              'p-3 rounded-xl border-2 transition-all hover:shadow-md',
                              data.chartCode === chart.code
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <div
                              className="rounded-lg overflow-hidden mb-2"
                              style={{ backgroundColor: (category?.color || '#6B7280') + '10' }}
                            >
                              <ChartPreview chartCode={chart.code} className="w-full h-16" />
                            </div>
                            <p className="text-xs font-medium text-gray-700 truncate">{chart.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filtered Charts */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    {selectedCategory
                      ? chartCategories.find((c) => c.code === selectedCategory)?.name
                      : searchQuery
                        ? 'Résultats'
                        : 'Tous les graphiques'}
                    <span className="ml-2 text-gray-400">({filteredCharts.length})</span>
                  </h3>
                  <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                    {filteredCharts.map((chart) => {
                      const category = chartCategories.find((c) => c.code === chart.category);
                      return (
                        <button
                          key={chart.code}
                          onClick={() => handleSelectChartFromCatalog(chart.code)}
                          className={cn(
                            'p-3 rounded-xl border-2 transition-all hover:shadow-md group',
                            data.chartCode === chart.code
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className="relative">
                            <div
                              className="rounded-lg overflow-hidden mb-2"
                              style={{ backgroundColor: (category?.color || '#6B7280') + '10' }}
                            >
                              <ChartPreview chartCode={chart.code} className="w-full h-16" />
                            </div>
                            {chart.new && (
                              <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-success text-white text-[10px] font-medium rounded">
                                Nouveau
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-gray-700 truncate group-hover:text-primary">
                            {chart.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Type Tab - Quick selection */}
            {activeTab === 'type' && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Sélection rapide</h3>
                <div className="grid grid-cols-5 gap-3">
                  {basicChartTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setData({ ...data, chartType: type.id as any, chartCode: undefined })}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                          data.chartType === type.id && !data.chartCode
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        <Icon className="w-8 h-8 text-gray-500" />
                        <span className="text-sm font-medium">{type.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Aperçu</h4>
                  {renderChart()}
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Données du graphique</h3>
                  <button
                    onClick={addDataPoint}
                    className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-2">
                    <div className="col-span-5">Libellé</div>
                    <div className="col-span-5">Valeur</div>
                    <div className="col-span-2"></div>
                  </div>
                  {data.data.map((point, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={point.label}
                        onChange={(e) => updateDataPoint(index, 'label', e.target.value)}
                        className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={point.value}
                        onChange={(e) => updateDataPoint(index, 'value', e.target.value)}
                        className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <button
                        onClick={() => removeDataPoint(index)}
                        className="col-span-2 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Aperçu</h4>
                  {renderChart()}
                </div>
              </div>
            )}

            {/* Style Tab */}
            {activeTab === 'style' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Options d'affichage</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.config.showLegend}
                        onChange={(e) => setData({
                          ...data,
                          config: { ...data.config, showLegend: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Afficher la légende</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.config.showGrid}
                        onChange={(e) => setData({
                          ...data,
                          config: { ...data.config, showGrid: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Afficher la grille</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.config.showLabels}
                        onChange={(e) => setData({
                          ...data,
                          config: { ...data.config, showLabels: e.target.checked }
                        })}
                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">Afficher les étiquettes</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Palette de couleurs</h3>
                  <div className="flex gap-2">
                    {['corporate', 'vibrant', 'pastel', 'monochrome'].map((scheme) => (
                      <button
                        key={scheme}
                        onClick={() => setData({
                          ...data,
                          config: { ...data.config, colorScheme: scheme }
                        })}
                        className={cn(
                          'px-4 py-2 rounded-lg border-2 capitalize transition-colors',
                          data.config.colorScheme === scheme
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {scheme}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Aperçu</h4>
                  {renderChart()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onSave(data)}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChartEditorModal;
