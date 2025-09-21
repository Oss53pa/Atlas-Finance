import React, { useState, useEffect } from 'react';
import {
  Brain, TrendingUp, TrendingDown, Target, Zap, LineChart,
  AlertTriangle, CheckCircle, Info, DollarSign, Users, Package,
  Calendar, Clock, BarChart3, PieChart, Activity, Shield,
  Cpu, Eye, RefreshCw, Download, Settings, ChevronRight,
  ArrowUpRight, ArrowDownRight, Sparkles, Bot, Lightbulb
} from 'lucide-react';
import { cn } from '../../lib/utils';
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
  const [activeTab, setActiveTab] = useState('predictions');
  const [selectedModel, setSelectedModel] = useState('revenue_forecast');
  const [timeHorizon, setTimeHorizon] = useState('3months');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);

  // Prédictions IA
  const [predictions] = useState<Prediction[]>([
    {
      id: '1',
      type: 'revenue',
      title: 'Prévision de Chiffre d\'Affaires',
      description: 'Augmentation prévue de 18% du CA au prochain trimestre',
      value: 2890000,
      confidence: 87,
      impact: 'high',
      timeframe: 'Q2 2024',
      factors: ['Saisonnalité', 'Tendance marché', 'Nouveaux clients', 'Expansion produits'],
      recommendation: 'Augmenter les stocks pour répondre à la demande prévue',
      probability: 0.87
    },
    {
      id: '2',
      type: 'cashflow',
      title: 'Prévision de Trésorerie',
      description: 'Risque de tension de trésorerie dans 45 jours',
      value: -150000,
      confidence: 72,
      impact: 'high',
      timeframe: '45 jours',
      factors: ['Délais paiement clients', 'Échéances fournisseurs', 'Investissements prévus'],
      recommendation: 'Négocier des délais de paiement ou accélérer le recouvrement',
      probability: 0.72
    },
    {
      id: '3',
      type: 'demand',
      title: 'Prévision de Demande',
      description: 'Pic de demande prévu pour 3 produits phares',
      value: 450,
      confidence: 91,
      impact: 'medium',
      timeframe: '2 semaines',
      factors: ['Historique ventes', 'Tendances marché', 'Campagne marketing'],
      recommendation: 'Commander 30% de stock supplémentaire',
      probability: 0.91
    }
  ]);

  // Anomalies détectées
  const [anomalies] = useState<Anomaly[]>([
    {
      id: '1',
      category: 'Ventes',
      description: 'Chute inhabituelle des ventes produit X',
      severity: 'critical',
      detectedAt: new Date(),
      pattern: 'Diminution de 35% par rapport à la moyenne mobile',
      affectedMetric: 'Chiffre d\'affaires',
      deviation: -35,
      suggestion: 'Vérifier la disponibilité des stocks et analyser la concurrence'
    },
    {
      id: '2',
      category: 'Trésorerie',
      description: 'Délais de paiement anormalement élevés',
      severity: 'warning',
      detectedAt: new Date(Date.now() - 3600000),
      pattern: 'DSO augmenté de 12 jours ce mois',
      affectedMetric: 'Délai de recouvrement',
      deviation: 28,
      suggestion: 'Relancer les clients en retard et revoir les conditions de paiement'
    }
  ]);

  // Insights actionnables
  const [insights] = useState<Insight[]>([
    {
      id: '1',
      category: 'opportunity',
      title: 'Optimisation des prix produit premium',
      description: 'Potentiel d\'augmentation de marge sur les produits haut de gamme',
      actionableSteps: [
        'Analyser l\'élasticité prix de la demande',
        'Tester une augmentation de 5% sur un échantillon',
        'Déployer si les résultats sont concluants'
      ],
      potentialGain: 125000,
      confidence: 82,
      priority: 'high'
    },
    {
      id: '2',
      category: 'optimization',
      title: 'Réduction des coûts logistiques',
      description: 'Optimisation des tournées de livraison',
      actionableSteps: [
        'Regrouper les livraisons par zone',
        'Optimiser les itinéraires avec IA',
        'Négocier de nouveaux contrats transport'
      ],
      potentialGain: 85000,
      confidence: 76,
      priority: 'medium'
    }
  ]);

  // Données pour les graphiques
  const forecastData = [
    { date: 'Jan', actual: 850000, predicted: 880000, upper: 950000, lower: 810000 },
    { date: 'Fév', actual: 920000, predicted: 940000, upper: 1020000, lower: 860000 },
    { date: 'Mar', actual: 1100000, predicted: 1080000, upper: 1180000, lower: 980000 },
    { date: 'Avr', actual: null, predicted: 1150000, upper: 1250000, lower: 1050000 },
    { date: 'Mai', actual: null, predicted: 1200000, upper: 1300000, lower: 1100000 },
    { date: 'Juin', actual: null, predicted: 1180000, upper: 1280000, lower: 1080000 }
  ];

  const scoringData = [
    { metric: 'Précision', score: 94, benchmark: 88 },
    { metric: 'Rapidité', score: 87, benchmark: 82 },
    { metric: 'Fiabilité', score: 92, benchmark: 85 },
    { metric: 'Couverture', score: 89, benchmark: 83 },
    { metric: 'Innovation', score: 91, benchmark: 78 }
  ];

  const correlationData = [
    { x: 250, y: 15, category: 'A' },
    { x: 180, y: 22, category: 'B' },
    { x: 320, y: 18, category: 'A' },
    { x: 140, y: 12, category: 'C' },
    { x: 290, y: 25, category: 'B' },
    { x: 210, y: 19, category: 'A' },
    { x: 160, y: 14, category: 'C' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-700';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
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
      <div className="bg-gradient-to-r from-[#6A8A82] to-[#B87333] text-white rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-semibold">Performance des Modèles IA</h2>
            <p className="text-white/80">Précision et fiabilité en temps réel</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm opacity-90">Précision Globale</span>
            </div>
            <p className="text-3xl font-bold">92%</p>
            <p className="text-sm opacity-75 mt-1">Sur 30 jours</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm opacity-90">Insights Générés</span>
            </div>
            <p className="text-3xl font-bold">156</p>
            <p className="text-sm opacity-75 mt-1">Ce mois</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm opacity-90">Valeur Créée</span>
            </div>
            <p className="text-3xl font-bold">1.2M DH</p>
            <p className="text-sm opacity-75 mt-1">Économies + Opportunités</p>
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
                <p className="text-sm text-gray-600 mt-1">{prediction.description}</p>
              </div>
              <Bot className="w-5 h-5 text-[#6A8A82]" />
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {prediction.type === 'revenue' || prediction.type === 'cashflow'
                    ? `${prediction.value.toLocaleString()} DH`
                    : `${prediction.value} unités`}
                </span>
                <span className="text-sm text-gray-500">{prediction.timeframe}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Confiance</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getConfidenceColor(prediction.confidence))}>
                  {prediction.confidence}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    prediction.confidence >= 80 ? "bg-green-500" :
                    prediction.confidence >= 60 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Facteurs clés:</p>
              <div className="flex flex-wrap gap-1">
                {prediction.factors.map((factor, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#6A8A82]/10 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[#6A8A82] mt-0.5" />
                <p className="text-sm text-[#6A8A82]">{prediction.recommendation}</p>
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
                <stop offset="5%" stopColor="#6A8A82" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6A8A82" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" stroke="#6B7280" />
            <YAxis stroke="#6B7280" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="transparent" fill="#E0E7FF" name="Limite supérieure" />
            <Area type="monotone" dataKey="lower" stroke="transparent" fill="#FFFFFF" name="Limite inférieure" />
            <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} dot={false} name="Réel" />
            <Line type="monotone" dataKey="predicted" stroke="#6A8A82" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prédiction" />
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
                    {insight.category === 'opportunity' && <TrendingUp className="w-5 h-5 text-green-600" />}
                    {insight.category === 'risk' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                    {insight.category === 'optimization' && <Zap className="w-5 h-5 text-[#6A8A82]" />}
                    {insight.category === 'trend' && <Activity className="w-5 h-5 text-[#B87333]" />}
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    insight.priority === 'urgent' && "bg-red-100 text-red-700",
                    insight.priority === 'high' && "bg-orange-100 text-orange-700",
                    insight.priority === 'medium' && "bg-yellow-100 text-yellow-700",
                    insight.priority === 'low' && "bg-green-100 text-green-700"
                  )}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {insight.potentialGain > 0 ? '+' : ''}{insight.potentialGain.toLocaleString()} DH
                  </span>
                  <span className="text-xs text-gray-500">
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
              <div key={`priority-${insight.id}`} className="p-4 bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10 rounded-lg border border-[#6A8A82]/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-[#6A8A82]/20 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-[#6A8A82]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <div className="space-y-2">
                      {insight.actionableSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-[#6A8A82] mt-0.5" />
                          <span className="text-sm text-gray-700">{step}</span>
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
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="metric" stroke="#6B7280" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6B7280" />
              <Radar name="Votre Score" dataKey="score" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Analyse de Corrélations</h2>
          <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="x" name="Ventes" unit="k€" stroke="#6B7280" />
              <YAxis dataKey="y" name="Marge" unit="%" stroke="#6B7280" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Produits A" data={correlationData.filter(d => d.category === 'A')} fill="#6A8A82" />
              <Scatter name="Produits B" data={correlationData.filter(d => d.category === 'B')} fill="#10B981" />
              <Scatter name="Produits C" data={correlationData.filter(d => d.category === 'C')} fill="#B87333" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Métriques de Performance Détaillées</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-[#6A8A82]/10 to-[#6A8A82]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[#6A8A82]/20 rounded-lg flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-[#6A8A82]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">94.2%</div>
            <div className="text-sm text-gray-600">Précision Prédictions</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-green-200 rounded-lg flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">98.1%</div>
            <div className="text-sm text-gray-600">Disponibilité Système</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-[#B87333]/10 to-[#B87333]/5 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-[#B87333]/20 rounded-lg flex items-center justify-center mb-2">
              <Clock className="w-6 h-6 text-[#B87333]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">1.2s</div>
            <div className="text-sm text-gray-600">Temps de Réponse</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-blue-200 rounded-lg flex items-center justify-center mb-2">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">24/7</div>
            <div className="text-sm text-gray-600">Surveillance Active</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-purple-200 rounded-lg flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">100%</div>
            <div className="text-sm text-gray-600">Sécurité Données</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg">
            <div className="w-12 h-12 mx-auto bg-orange-200 rounded-lg flex items-center justify-center mb-2">
              <Cpu className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">85%</div>
            <div className="text-sm text-gray-600">Efficacité CPU</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">IA Insights & Analyses Prédictives</h1>
          <p className="text-gray-600 mt-2">Intelligence artificielle avancée pour la prise de décision stratégique</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
          >
            <option value="revenue_forecast">Prévision CA</option>
            <option value="demand_forecast">Prévision Demande</option>
            <option value="risk_analysis">Analyse Risques</option>
            <option value="optimization">Optimisation</option>
          </select>

          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
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
            disabled={refreshing}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90">
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
                      ? "border-[#6A8A82] text-[#6A8A82]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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