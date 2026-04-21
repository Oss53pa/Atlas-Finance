import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Brain, TrendingUp, TrendingDown, Target, Zap, LineChart,
  AlertTriangle, CheckCircle, Info, DollarSign, Users, Package,
  Calendar, Clock, BarChart3, PieChart, Activity, Shield,
  Cpu, Eye, RefreshCw, Download, Settings, ChevronRight,
  ArrowUpRight, ArrowDownRight, Sparkles, Bot, Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Prediction {
  id: string;
  type: 'revenue' | 'expense' | 'cashflow' | 'demand' | 'risk';
  title: string;
  description: string;
  value: number;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
  factors: string[];
  recommendation: string;
  probability: number;
}

interface Anomaly {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  detectedAt: Date;
  pattern: string;
  affectedMetric: string;
  deviation: number;
  suggestion: string;
}

interface Insight {
  id: string;
  category: 'opportunity' | 'risk' | 'optimization' | 'trend';
  title: string;
  description: string;
  actionableSteps: string[];
  potentialGain: number;
  confidence: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

const AIInsights: React.FC = () => {
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedModel, setSelectedModel] = useState('revenue_forecast');
  const [timeHorizon, setTimeHorizon] = useState('3months');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [scoringData, setScoringData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [aiServiceAvailable] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);

  // Load and compute insights from real journal data
  useEffect(() => {
    const analyzeData = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        setTotalEntries(entries.length);
        const posted = entries.filter((e: any) => e.status === 'posted');

        // Compute monthly revenue for trend analysis
        const monthlyRevenue: Record<string, number> = {};
        const monthlyCharges: Record<string, number> = {};
        let totalCA = 0;
        let totalCharges = 0;
        let totalTresorerie = 0;

        for (const entry of posted) {
          if (!entry.lines) continue;
          const month = entry.date ? entry.date.substring(0, 7) : 'inconnu';
          for (const line of entry.lines) {
            const code = line.accountCode || '';
            if (code.startsWith('7')) {
              const val = (line.credit || 0) - (line.debit || 0);
              totalCA += val;
              monthlyRevenue[month] = (monthlyRevenue[month] || 0) + val;
            }
            if (code.startsWith('6')) {
              const val = (line.debit || 0) - (line.credit || 0);
              totalCharges += val;
              monthlyCharges[month] = (monthlyCharges[month] || 0) + val;
            }
            if (code.startsWith('5')) {
              totalTresorerie += (line.debit || 0) - (line.credit || 0);
            }
          }
        }

        // Build predictions from real data
        const builtPredictions: Prediction[] = [];
        if (totalCA > 0) {
          builtPredictions.push({
            id: '1',
            type: 'revenue',
            title: 'Chiffre d\'Affaires actuel',
            description: `CA total comptabilisé: ${formatCurrency(totalCA)}`,
            value: Math.round(totalCA),
            confidence: 100,
            impact: 'high',
            timeframe: 'Cumulé',
            factors: ['Données comptables réelles'],
            recommendation: 'Analyse en cours...',
            probability: 1
          });
        }
        if (totalTresorerie !== 0) {
          builtPredictions.push({
            id: '2',
            type: 'cashflow',
            title: 'Situation Trésorerie',
            description: totalTresorerie < 0
              ? `Trésorerie négative: ${formatCurrency(totalTresorerie)}`
              : `Trésorerie positive: ${formatCurrency(totalTresorerie)}`,
            value: Math.round(totalTresorerie),
            confidence: 100,
            impact: totalTresorerie < 0 ? 'high' : 'medium',
            timeframe: 'Actuel',
            factors: ['Soldes comptes classe 5'],
            recommendation: totalTresorerie < 0
              ? 'Accélérer le recouvrement ou négocier un découvert'
              : 'Analyse en cours...',
            probability: 1
          });
        }
        if (builtPredictions.length === 0) {
          builtPredictions.push({
            id: '0',
            type: 'revenue',
            title: 'Analyse en cours...',
            description: 'Aucune écriture comptabilisée pour générer des prévisions',
            value: 0,
            confidence: 0,
            impact: 'low',
            timeframe: '-',
            factors: ['Données insuffisantes'],
            recommendation: 'Saisir et comptabiliser des écritures pour activer l\'analyse',
            probability: 0
          });
        }
        setPredictions(builtPredictions);

        // Detect real anomalies
        const builtAnomalies: Anomaly[] = [];
        let anomalyId = 0;
        for (const entry of entries) {
          if (entry.lines) {
            const d = entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
            const c = entry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
            if (Math.abs(d - c) > 0.01) {
              anomalyId++;
              builtAnomalies.push({
                id: String(anomalyId),
                category: 'Comptabilité',
                description: `Écriture ${entry.entryNumber || entry.id} déséquilibrée`,
                severity: 'critical',
                detectedAt: new Date(entry.createdAt || Date.now()),
                pattern: `Écart D/C: ${formatCurrency(Math.abs(d - c))}`,
                affectedMetric: 'Équilibre comptable',
                deviation: Math.round(Math.abs(d - c)),
                suggestion: 'Corriger l\'écriture pour rétablir l\'équilibre débit/crédit'
              });
            }
            // Detect unusually large amounts (> 10x average)
            const avgAmount = posted.length > 0
              ? posted.reduce((s: number, e: any) => s + (e.totalDebit || 0), 0) / posted.length
              : 0;
            if (avgAmount > 0 && (entry.totalDebit || 0) > avgAmount * 10) {
              anomalyId++;
              builtAnomalies.push({
                id: String(anomalyId),
                category: 'Montant',
                description: `Montant inhabituel: ${entry.entryNumber || entry.id}`,
                severity: 'warning',
                detectedAt: new Date(entry.createdAt || Date.now()),
                pattern: `Montant ${formatCurrency(entry.totalDebit || 0)} vs moyenne ${formatCurrency(avgAmount)}`,
                affectedMetric: 'Montant écriture',
                deviation: Math.round(((entry.totalDebit || 0) / avgAmount - 1) * 100),
                suggestion: 'Vérifier que le montant est correct'
              });
            }
          }
        }
        setAnomalies(builtAnomalies);

        // Build insights from data analysis
        const builtInsights: Insight[] = [];
        const marge = totalCA > 0 ? ((totalCA - totalCharges) / totalCA) * 100 : 0;
        if (marge > 0 && marge < 25) {
          builtInsights.push({
            id: '1',
            category: 'risk',
            title: 'Marge brute faible',
            description: `La marge brute est de ${marge.toFixed(1)}%, en dessous du seuil recommandé de 25%`,
            actionableSteps: [
              'Analyser les postes de charges les plus élevés',
              'Identifier les opportunités de réduction de coûts',
              'Revoir la politique tarifaire'
            ],
            potentialGain: Math.round(totalCA * 0.05),
            confidence: 90,
            priority: 'high'
          });
        }
        const draftCount = entries.filter((e: any) => e.status === 'draft').length;
        if (draftCount > 5) {
          builtInsights.push({
            id: '2',
            category: 'optimization',
            title: 'Écritures en attente de validation',
            description: `${draftCount} écritures en brouillon ralentissent le processus comptable`,
            actionableSteps: [
              'Valider les écritures en attente',
              'Mettre en place un processus de validation régulier',
              'Automatiser la validation des écritures récurrentes'
            ],
            potentialGain: 0,
            confidence: 95,
            priority: 'medium'
          });
        }
        setInsights(builtInsights);

        // Build forecast data from monthly revenue
        const months = Object.keys(monthlyRevenue).sort();
        setForecastData(months.map(m => ({
          date: m,
          actual: Math.round(monthlyRevenue[m] || 0),
          predicted: null,
          upper: null,
          lower: null
        })));

        // Scoring based on data quality
        const balancedPct = posted.length > 0
          ? Math.round((posted.filter((e: any) => {
              if (!e.lines) return true;
              const dd = e.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
              const cc = e.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
              return Math.abs(dd - cc) < 0.01;
            }).length / posted.length) * 100)
          : 0;
        setScoringData([
          { metric: 'Équilibre D/C', score: balancedPct, benchmark: 100 },
          { metric: 'Couverture', score: entries.length > 0 ? Math.min(100, entries.length * 2) : 0, benchmark: 80 },
          { metric: 'Validation', score: posted.length > 0 ? Math.round((posted.length / entries.length) * 100) : 0, benchmark: 90 },
          { metric: 'Exhaustivité', score: totalCA > 0 && totalCharges > 0 ? 80 : 20, benchmark: 85 },
        ]);

        setCorrelationData([]);
      } catch (err) {
      }
    };
    analyzeData();
  }, [adapter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Replace with real AI service call when backend is ready
    // const data = await aiService.getPredictions({ model: selectedModel, horizon: timeHorizon });
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 60) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'info': return 'bg-[var(--color-surface-hover)] border-[var(--color-border)]';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const tabs = [
    { id: 'predictions', label: 'Prédictions IA', icon: Brain },
    { id: 'anomalies', label: 'Détection d\'Anomalies', icon: AlertTriangle },
    { id: 'insights', label: 'Insights Actionnables', icon: Lightbulb },
    { id: 'performance', label: 'Performance & Analyses', icon: BarChart3 }
  ];

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      {/* AI Performance Overview */}
      <div className="bg-gradient-to-r from-[#171717] to-[#525252] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-lg font-semibold text-white">Performance des Modèles IA</h2>
            <p className="text-white/80">Précision et fiabilité en temps réel</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">Écritures analysées</span>
            </div>
            <p className="text-lg font-bold text-white">{totalEntries}</p>
            <p className="text-sm text-white/75 mt-1">Total</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">Anomalies détectées</span>
            </div>
            <p className="text-lg font-bold text-white">{anomalies.length}</p>
            <p className="text-sm text-white/75 mt-1">À traiter</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-white" />
              <span className="text-sm text-white/90">Insights</span>
            </div>
            <p className="text-lg font-bold text-white">{insights.length}</p>
            <p className="text-sm text-white/75 mt-1">Recommandations</p>
          </div>
        </div>
      </div>

      {/* Predictions Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{prediction.title}</h3>
                <p className="text-sm text-gray-900 mt-1">{prediction.description}</p>
              </div>
              <Bot className="w-5 h-5 text-[var(--color-text-primary)]" />
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {prediction.type === 'revenue' || prediction.type === 'cashflow'
                    ? `${formatCurrency(prediction.value)}`
                    : `${prediction.value} unités`}
                </span>
                <span className="text-sm text-gray-600">{prediction.timeframe}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-900">Confiance</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getConfidenceColor(prediction.confidence))}>
                  {prediction.confidence}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    prediction.confidence >= 80 ? "bg-[#22c55e]" :
                    prediction.confidence >= 60 ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                  )}
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Facteurs clés:</p>
              <div className="flex flex-wrap gap-1">
                {prediction.factors.map((factor, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[var(--color-primary)]/10 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[var(--color-text-primary)] mt-0.5" />
                <p className="text-sm text-[var(--color-text-primary)]">{prediction.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Prévisions avec Intervalles de Confiance</h2>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#171717" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#171717" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="date" stroke="#737373" />
            <YAxis stroke="#737373" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="transparent" fill="#E0E7FF" name="Limite supérieure" />
            <Area type="monotone" dataKey="lower" stroke="transparent" fill="#FFFFFF" name="Limite inférieure" />
            <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} dot={false} name="Réel" />
            <Line type="monotone" dataKey="predicted" stroke="#171717" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prédiction" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderAnomaliesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Détection d'Anomalies en Temps Réel</h2>
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={cn(
                "p-4 rounded-lg border",
                getSeverityColor(anomaly.severity)
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{anomaly.description}</h4>
                    <span className="text-xs px-2 py-0.5 bg-white bg-opacity-50 rounded">
                      {anomaly.category}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{anomaly.pattern}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      {anomaly.deviation > 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {Math.abs(anomaly.deviation)}%
                    </span>
                    <span>{new Date(anomaly.detectedAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="mt-2 p-2 bg-white bg-opacity-50 rounded">
                    <p className="text-sm">{anomaly.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights Actionnables</h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 border rounded-lg hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {insight.category === 'opportunity' && <TrendingUp className="w-5 h-5 text-[#22c55e]" />}
                    {insight.category === 'risk' && <AlertTriangle className="w-5 h-5 text-[#EF4444]" />}
                    {insight.category === 'optimization' && <Zap className="w-5 h-5 text-[var(--color-text-primary)]" />}
                    {insight.category === 'trend' && <Activity className="w-5 h-5 text-[var(--color-text-secondary)]" />}
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    insight.priority === 'urgent' && "bg-red-100 text-red-700",
                    insight.priority === 'high' && "bg-amber-100 text-amber-700",
                    insight.priority === 'medium' && "bg-amber-100 text-amber-700",
                    insight.priority === 'low' && "bg-green-100 text-green-700"
                  )}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-900 mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {insight.potentialGain > 0 ? '+' : ''}{formatCurrency(insight.potentialGain)}
                  </span>
                  <span className="text-xs text-gray-600">
                    Confiance: {insight.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommandations Prioritaires</h2>
          <div className="space-y-4">
            {insights.filter(i => i.priority === 'urgent' || i.priority === 'high').map((insight) => (
              <div key={`priority-${insight.id}`} className="p-4 bg-gradient-to-r from-[#171717]/10 to-[#525252]/10 rounded-lg border border-[var(--color-primary)]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-[var(--color-text-primary)]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-900 mb-2">{insight.description}</p>
                    <div className="space-y-2">
                      {insight.actionableSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)] mt-0.5" />
                          <span className="text-sm text-gray-900">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Score de Performance IA</h2>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={scoringData}>
              <PolarGrid stroke="#e5e5e5" />
              <PolarAngleAxis dataKey="metric" stroke="#737373" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#737373" />
              <Radar name="Votre Score" dataKey="score" stroke="#171717" fill="#171717" fillOpacity={0.6} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyse de Corrélations</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="x" name="Ventes" unit="kâ‚¬" stroke="#737373" />
              <YAxis dataKey="y" name="Marge" unit="%" stroke="#737373" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Produits A" data={correlationData.filter(d => d.category === 'A')} fill="#171717" />
              <Scatter name="Produits B" data={correlationData.filter(d => d.category === 'B')} fill="#22c55e" />
              <Scatter name="Produits C" data={correlationData.filter(d => d.category === 'C')} fill="#525252" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métriques de Performance Détaillées</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-[#171717]/10 to-[#171717]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{totalEntries}</div>
            <div className="text-sm text-gray-900">Écritures analysées</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[#171717]/10 to-[#171717]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{predictions.length}</div>
            <div className="text-sm text-gray-900">Indicateurs suivis</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[#525252]/10 to-[#525252]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[#525252]/20 rounded-lg flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-[var(--color-text-secondary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{anomalies.length}</div>
            <div className="text-sm text-gray-900">Anomalies détectées</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[#171717]/10 to-[#171717]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center mb-2">
              <Lightbulb className="w-6 h-6 text-[var(--color-text-primary)]" />
            </div>
            <div className="text-lg font-bold text-gray-900">{insights.length}</div>
            <div className="text-sm text-gray-900">Recommandations</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Demo data info banner */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-primary)] font-medium">
            Module IA en cours de développement — Les données affichées sont des exemples de démonstration.
          </p>
        </div>
      </div>

      {/* AI Service Status Banner */}
      {!aiServiceAvailable && (
        <div className="mb-4 p-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl flex items-center space-x-3">
          <Info className="w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Données de démonstration</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Les insights IA affichent des données illustratives. Connectez un service IA pour des analyses réelles.</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">IA Insights & Analyses Prédictives</h1>
          <p className="text-gray-500 mt-2">Intelligence artificielle avancée pour la prise de décision stratégique</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="revenue_forecast">Prévision CA</option>
            <option value="demand_forecast">Prévision Demande</option>
            <option value="risk_analysis">Analyse Risques</option>
            <option value="optimization">Optimisation</option>
          </select>

          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="1month">1 mois</option>
            <option value="3months">3 mois</option>
            <option value="6months">6 mois</option>
            <option value="1year">1 an</option>
          </select>

          <button
            onClick={handleRefresh}
            className={cn(
              "p-2 rounded-lg border hover:bg-gray-50 transition-all",
              refreshing && "animate-spin"
            )}
            disabled={refreshing} aria-label="Actualiser">
            <RefreshCw className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              const report = {
                generatedAt: new Date().toISOString(),
                totalEntries,
                predictions,
                anomalies: anomalies.map(a => ({ ...a, detectedAt: new Date(a.detectedAt).toISOString() })),
                insights,
                scoringData,
              };
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `rapport-ia-${new Date().toISOString().slice(0, 10)}.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90"
          >
            <Download className="w-4 h-4" />
            Rapport IA
          </button>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-[var(--color-primary)] text-[var(--color-text-primary)]"
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'predictions' && renderPredictionsTab()}
        {activeTab === 'anomalies' && renderAnomaliesTab()}
        {activeTab === 'insights' && renderInsightsTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </div>
    </div>
  );
};

export default AIInsights;