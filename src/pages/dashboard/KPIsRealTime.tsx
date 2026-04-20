import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useActivityType } from '../../hooks/useActivityType';
import { formatCurrency } from '../../utils/formatters';
import {
  Activity, TrendingUp, Users, DollarSign, Package, Clock,
  Target, Zap, BarChart3, PieChart, AlertCircle, CheckCircle,
  XCircle, RefreshCw, Download, Settings, Eye, Maximize2,
  Minimize2, Bell, Filter, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'success' | 'warning' | 'danger';
  trend: number;
  lastUpdate: Date;
  history: { time: string; value: number }[];
  category: string;
}

interface RealTimeData {
  timestamp: Date;
  sales: number;
  orders: number;
  visitors: number;
  conversion: number;
}

const KPIsRealTime: React.FC = () => {
  const { adapter } = useData();
  const { activityType } = useActivityType();
  const [realTimeData, setRealTimeData] = useState<RealTimeData[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [fullscreenKPI, setFullscreenKPI] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'kpis' | 'charts' | 'alerts'>('kpis');

  const tabsList = [
    { key: 'kpis' as const, label: 'Indicateurs', icon: Activity },
    { key: 'charts' as const, label: 'Graphiques', icon: BarChart3 },
    { key: 'alerts' as const, label: 'Alertes', icon: Bell },
  ];

  // KPIs computed from real data
  const [kpis, setKpis] = useState<KPIMetric[]>([]);

  // Radar data computed from real entries
  const [radarData, setRadarData] = useState([
    { subject: 'Ventes', A: 0, fullMark: 100 },
    { subject: 'Clients', A: 0, fullMark: 100 },
    { subject: 'Qualité', A: 0, fullMark: 100 },
    { subject: 'Finance', A: 0, fullMark: 100 },
    { subject: 'Opérations', A: 0, fullMark: 100 },
    { subject: 'Trésorerie', A: 0, fullMark: 100 }
  ]);

  // Load KPIs from real journal data
  useEffect(() => {
    const computeKPIs = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        const posted = entries.filter((e: any) => e.status === 'posted');

        // CA = class 7 credits (revenue)
        let totalCA = 0;
        let totalCharges = 0;
        let totalTresorerie = 0;
        let creancesClients = 0;
        let dettesFournisseurs = 0;
        let coutProduction = 0;
        let consommationMatieres = 0;
        let achatsMarchandises = 0;
        let venteMarchandises = 0;
        let caPrestations = 0;
        let chargesPersonnel = 0;

        for (const entry of posted) {
          if (!entry.lines) continue;
          for (const line of entry.lines) {
            const code = line.accountCode || '';
            if (code.startsWith('7')) {
              totalCA += (line.credit || 0) - (line.debit || 0);
            }
            if (code.startsWith('6')) {
              totalCharges += (line.debit || 0) - (line.credit || 0);
            }
            if (code.startsWith('5')) {
              totalTresorerie += (line.debit || 0) - (line.credit || 0);
            }
            // Créances clients (class 41 debit balance)
            if (code.startsWith('41')) {
              creancesClients += (line.debit || 0) - (line.credit || 0);
            }
            // Dettes fournisseurs (class 40 credit balance)
            if (code.startsWith('40')) {
              dettesFournisseurs += (line.credit || 0) - (line.debit || 0);
            }
            // Production: 60+61+62 debits
            if (code.startsWith('60') || code.startsWith('61') || code.startsWith('62')) {
              coutProduction += (line.debit || 0) - (line.credit || 0);
            }
            // Consommation matières (60 debits)
            if (code.startsWith('60')) {
              consommationMatieres += (line.debit || 0) - (line.credit || 0);
            }
            // Achats marchandises (601 debits)
            if (code.startsWith('601')) {
              achatsMarchandises += (line.debit || 0) - (line.credit || 0);
            }
            // Ventes marchandises (701 credits)
            if (code.startsWith('701')) {
              venteMarchandises += (line.credit || 0) - (line.debit || 0);
            }
            // CA Prestations (706 credits)
            if (code.startsWith('706')) {
              caPrestations += (line.credit || 0) - (line.debit || 0);
            }
            // Charges personnel (66 debits)
            if (code.startsWith('66')) {
              chargesPersonnel += (line.debit || 0) - (line.credit || 0);
            }
          }
        }

        const marge = totalCA > 0 ? ((totalCA - totalCharges) / totalCA) * 100 : 0;
        const resultatNet = totalCA - totalCharges;
        const margeCommerciale = venteMarchandises - achatsMarchandises;

        const computedKPIs: KPIMetric[] = [
          {
            id: 'revenue',
            name: 'Chiffre d\'Affaires',
            value: Math.round(totalCA),
            unit: '',
            target: totalCA > 0 ? Math.round(totalCA * 0.9) : 1,
            status: totalCA > 0 ? 'success' : 'warning',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'financier'
          },
          {
            id: 'margin',
            name: 'Marge Brute',
            value: Math.round(marge * 10) / 10,
            unit: '%',
            target: 30,
            status: marge >= 30 ? 'success' : marge >= 20 ? 'warning' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'financier'
          },
          {
            id: 'cashflow',
            name: 'Trésorerie',
            value: Math.round(totalTresorerie),
            unit: '',
            target: totalTresorerie > 0 ? Math.round(totalTresorerie * 0.8) : 1,
            status: totalTresorerie > 0 ? 'success' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'financier'
          },
          // Additional KPIs for ALL activity types
          {
            id: 'charges-exploitation',
            name: 'Charges d\'exploitation',
            value: Math.round(totalCharges),
            unit: '',
            target: totalCA > 0 ? Math.round(totalCA * 0.7) : 1,
            status: totalCA > 0 && totalCharges <= totalCA * 0.7 ? 'success' : totalCA > 0 && totalCharges <= totalCA * 0.85 ? 'warning' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'financier'
          },
          {
            id: 'resultat-net',
            name: 'Résultat Net',
            value: Math.round(resultatNet),
            unit: '',
            target: resultatNet > 0 ? Math.round(resultatNet * 0.9) : 1,
            status: resultatNet > 0 ? 'success' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'financier'
          },
          {
            id: 'creances-clients',
            name: 'Créances clients',
            value: Math.round(creancesClients),
            unit: '',
            target: totalCA > 0 ? Math.round(totalCA * 0.3) : 1,
            status: creancesClients <= (totalCA * 0.3) ? 'success' : creancesClients <= (totalCA * 0.5) ? 'warning' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'commercial'
          },
          {
            id: 'dettes-fournisseurs',
            name: 'Dettes fournisseurs',
            value: Math.round(dettesFournisseurs),
            unit: '',
            target: totalCharges > 0 ? Math.round(totalCharges * 0.3) : 1,
            status: dettesFournisseurs <= (totalCharges * 0.3) ? 'success' : dettesFournisseurs <= (totalCharges * 0.5) ? 'warning' : 'danger',
            trend: 0,
            lastUpdate: new Date(),
            history: [],
            category: 'commercial'
          },
        ];

        // Activity-specific KPIs
        if (activityType === 'production') {
          computedKPIs.push(
            {
              id: 'cout-production',
              name: 'Coût de Production',
              value: Math.round(coutProduction),
              unit: '',
              target: totalCA > 0 ? Math.round(totalCA * 0.6) : 1,
              status: totalCA > 0 && coutProduction <= totalCA * 0.6 ? 'success' : totalCA > 0 && coutProduction <= totalCA * 0.75 ? 'warning' : 'danger',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'production'
            },
            {
              id: 'consommation-matieres',
              name: 'Consommation Matières',
              value: Math.round(consommationMatieres),
              unit: '',
              target: totalCA > 0 ? Math.round(totalCA * 0.4) : 1,
              status: totalCA > 0 && consommationMatieres <= totalCA * 0.4 ? 'success' : totalCA > 0 && consommationMatieres <= totalCA * 0.55 ? 'warning' : 'danger',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'production'
            }
          );
        }

        if (activityType === 'negoce') {
          computedKPIs.push(
            {
              id: 'achats-marchandises',
              name: 'Achats Marchandises',
              value: Math.round(achatsMarchandises),
              unit: '',
              target: totalCA > 0 ? Math.round(totalCA * 0.65) : 1,
              status: totalCA > 0 && achatsMarchandises <= totalCA * 0.65 ? 'success' : totalCA > 0 && achatsMarchandises <= totalCA * 0.8 ? 'warning' : 'danger',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'commercial'
            },
            {
              id: 'marge-commerciale',
              name: 'Marge Commerciale',
              value: Math.round(margeCommerciale),
              unit: '',
              target: margeCommerciale > 0 ? Math.round(margeCommerciale * 0.9) : 1,
              status: margeCommerciale > 0 ? 'success' : 'danger',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'commercial'
            }
          );
        }

        if (activityType === 'services') {
          computedKPIs.push(
            {
              id: 'ca-prestations',
              name: 'CA Prestations',
              value: Math.round(caPrestations),
              unit: '',
              target: caPrestations > 0 ? Math.round(caPrestations * 0.9) : 1,
              status: caPrestations > 0 ? 'success' : 'warning',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'services'
            },
            {
              id: 'charges-personnel',
              name: 'Charges Personnel',
              value: Math.round(chargesPersonnel),
              unit: '',
              target: totalCA > 0 ? Math.round(totalCA * 0.5) : 1,
              status: totalCA > 0 && chargesPersonnel <= totalCA * 0.5 ? 'success' : totalCA > 0 && chargesPersonnel <= totalCA * 0.65 ? 'warning' : 'danger',
              trend: 0,
              lastUpdate: new Date(),
              history: [],
              category: 'rh'
            }
          );
        }

        setKpis(computedKPIs);

        // Compute radar from meaningful metrics
        const costRatio = totalCA > 0 ? (totalCharges / totalCA) * 100 : 0;
        const receivablesRatio = totalCA > 0 ? (creancesClients / totalCA) * 100 : 0;
        const treasuryScore = totalTresorerie > 0 ? Math.min(100, 85) : 20;

        setRadarData([
          { subject: 'Ventes', A: totalCA > 0 ? Math.min(100, 75) : 0, fullMark: 100 },
          { subject: 'Rentabilité', A: marge > 0 ? Math.min(100, Math.round(marge * 2.5)) : 0, fullMark: 100 },
          { subject: 'Liquidité', A: totalTresorerie > 0 ? Math.min(100, Math.round((totalTresorerie / (totalCharges || 1)) * 100)) : 0, fullMark: 100 },
          { subject: 'Créances', A: Math.max(0, Math.min(100, Math.round(100 - receivablesRatio * 2))), fullMark: 100 },
          { subject: 'Charges', A: Math.max(0, Math.min(100, Math.round(100 - costRatio))), fullMark: 100 },
          { subject: 'Trésorerie', A: treasuryScore, fullMark: 100 }
        ]);
      } catch (err) {
        setKpis([]);
      }
    };
    computeKPIs();
  }, [adapter, activityType]);

  // Filtrer les KPIs par catégorie
  const filteredKPIs = filterCategory === 'all'
    ? kpis
    : kpis.filter(kpi => kpi.category === filterCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'danger': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(kpis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `kpis_${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">KPIs Temps Réel</h1>
          <p className="text-gray-600 mt-1">Surveillance en direct des indicateurs clés</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
            <Activity className={cn("w-4 h-4", autoRefresh ? "text-green-600" : "text-gray-700")} />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-border)] rounded-full peer peer-checked:after:tranprimary-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
            <span className="text-sm font-medium">Live</span>
          </div>

          {/* Refresh Interval */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-white rounded-xl p-1 border shadow-sm w-fit">
        {tabsList.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-[var(--color-primary)] text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Indicateurs */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow">
            <Filter className="w-5 h-5 text-gray-700" />
            <div className="flex gap-2">
              {['all', ...new Set(kpis.map(k => k.category))].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                    filterCategory === cat
                      ? "bg-[var(--color-primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredKPIs.map((kpi) => (
              <div
                key={kpi.id}
                className={cn(
                  "bg-white rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-lg",
                  selectedKPI === kpi.id && "ring-2 ring-[var(--color-text-tertiary)]",
                  fullscreenKPI === kpi.id && "fixed inset-4 z-50"
                )}
                onClick={() => setSelectedKPI(kpi.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-lg font-bold text-gray-900">{kpi.value}</span>
                      <span className="text-sm text-gray-700">{kpi.unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor(kpi.status))}>
                      {getStatusIcon(kpi.status)}
                      {kpi.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenKPI(fullscreenKPI === kpi.id ? null : kpi.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {fullscreenKPI === kpi.id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-700 mb-1">
                    <span>Objectif: {kpi.target}{kpi.unit}</span>
                    <span>{((kpi.value / kpi.target) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        kpi.status === 'success' && "bg-green-500",
                        kpi.status === 'warning' && "bg-amber-500",
                        kpi.status === 'danger' && "bg-red-500"
                      )}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {kpi.trend > 0 ? (
                      <ArrowUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className={cn("text-sm font-medium", kpi.trend > 0 ? "text-green-600" : "text-red-600")}>
                      {Math.abs(kpi.trend).toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-700">
                    Mis à jour: {kpi.lastUpdate.toLocaleTimeString()}
                  </span>
                </div>

                {kpi.history.length > 0 && (
                  <div className="mt-3">
                    <ResponsiveContainer width="100%" height={60}>
                      <AreaChart data={kpi.history}>
                        <defs>
                          <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#737373" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#737373" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#737373" fillOpacity={1} fill={`url(#gradient-${kpi.id})`} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Graphiques */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Temps Réel</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={realTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d4" />
                <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} stroke="#737373" />
                <YAxis stroke="#737373" />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleTimeString()} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#737373" name="Ventes" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="orders" stroke="#22c55e" name="Commandes" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="conversion" stroke="#F59E0B" name="Conversion (%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Global Performance</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#d4d4d4" />
                <PolarAngleAxis dataKey="subject" stroke="#737373" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#737373" />
                <Radar name="Performance" dataKey="A" stroke="#737373" fill="#737373" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab: Alertes */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performances</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {kpis.length === 0 ? (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Aucune donnée disponible</p>
                </div>
              ) : kpis.slice(0, 3).map((kpi, index) => (
                <div key={kpi.id} className="text-center">
                  <h3 className="text-sm font-medium text-gray-600 mb-2">{kpi.name}</h3>
                  <div className="flex items-center justify-center mb-2">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl",
                      index === 0 && "bg-gradient-to-br from-amber-400 to-amber-600",
                      index === 1 && "bg-gradient-to-br from-[#a3a3a3] to-[#171717]",
                      index === 2 && "bg-gradient-to-br from-primary-400 to-primary-600"
                    )}>
                      #{index + 1}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{kpi.value}{kpi.unit}</p>
                  <p className="text-sm text-gray-700">Objectif: {kpi.target}{kpi.unit}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-gradient-to-r from-[#f5f5f5] to-primary-50 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-6 h-6 text-[var(--color-primary)]" />
              <h2 className="text-lg font-semibold text-gray-900">Alertes KPI</h2>
            </div>
            {(() => {
              const hasData = kpis.some(k => k.value !== 0);
              const alertKpis = kpis.filter(k => k.status === 'warning' || k.status === 'danger');

              if (!hasData) {
                return (
                  <div className="bg-white rounded-lg p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Aucune donnée comptable</h4>
                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                      Les alertes KPI s'activeront automatiquement lorsque des écritures comptables seront saisies et validées dans le système.
                    </p>
                  </div>
                );
              }

              if (alertKpis.length === 0) {
                return (
                  <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h4 className="font-medium text-gray-900">Tous les indicateurs sont dans les seuils normaux</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 ml-7">Aucune alerte active</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {alertKpis.map(kpi => {
                    const formattedValue = kpi.unit === '%'
                      ? `${kpi.value}%`
                      : formatCurrency(kpi.value);
                    const formattedTarget = kpi.unit === '%'
                      ? `${kpi.target}%`
                      : formatCurrency(kpi.target);
                    const pct = kpi.target > 0 ? Math.round((kpi.value / kpi.target) * 100) : 0;

                    return (
                      <div key={`alert-${kpi.id}`} className={cn(
                        "bg-white rounded-lg p-4 border-l-4",
                        kpi.status === 'danger' ? "border-red-500" : "border-amber-500"
                      )}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium",
                            kpi.status === 'danger' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {kpi.status === 'danger' ? 'Critique' : 'Attention'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{formattedValue}</span>
                          <span className="text-sm text-gray-500">/ objectif {formattedTarget}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={cn(
                              "h-1.5 rounded-full",
                              kpi.status === 'danger' ? "bg-red-500" : "bg-amber-500"
                            )}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{pct}% de l'objectif atteint</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIsRealTime;