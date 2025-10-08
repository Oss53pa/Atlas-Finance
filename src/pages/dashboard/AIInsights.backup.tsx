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
      description: 'Baisse anormale des ventes région Nord',
      severity: 'warning',
      detectedAt: new Date(),
      pattern: 'Déclin de 35% vs moyenne historique',
      affectedMetric: 'sales_north',
      deviation: -35,
      suggestion: 'Vérifier la disponibilité des stocks et l\'activité commerciale'
    },
    {
      id: '2',
      category: 'Dépenses',
      description: 'Augmentation inhabituelle des frais marketing',
      severity: 'info',
      detectedAt: new Date(Date.now() - 3600000),
      pattern: 'Augmentation de 45% vs mois précédent',
      affectedMetric: 'marketing_expenses',
      deviation: 45,
      suggestion: 'Analyser le ROI des campagnes en cours'
    },
    {
      id: '3',
      category: 'Clients',
      description: 'Taux de churn anormalement élevé',
      severity: 'critical',
      detectedAt: new Date(Date.now() - 7200000),
      pattern: 'Augmentation de 25% du taux d\'attrition',
      affectedMetric: 'customer_churn',
      deviation: 25,
      suggestion: 'Lancer une enquête de satisfaction urgente'
    }
  ]);

  // Insights générés
  const [insights] = useState<Insight[]>([
    {
      id: '1',
      category: 'opportunity',
      title: 'Opportunité de Cross-selling',
      description: 'Potentiel de vente croisée identifié pour 234 clients',
      actionableSteps: [
        'Segmenter les clients par profil d\'achat',
        'Créer des bundles personnalisés',
        'Lancer une campagne ciblée'
      ],
      potentialGain: 450000,
      confidence: 82,
      priority: 'high'
    },
    {
      id: '2',
      category: 'optimization',
      title: 'Optimisation des Coûts Logistiques',
      description: 'Réduction possible de 15% des coûts de transport',
      actionableSteps: [
        'Consolider les livraisons par zone',
        'Négocier avec les transporteurs',
        'Optimiser les tournées de livraison'
      ],
      potentialGain: 120000,
      confidence: 78,
      priority: 'medium'
    },
    {
      id: '3',
      category: 'risk',
      title: 'Risque de Rupture Stock',
      description: '5 produits critiques en dessous du seuil de sécurité',
      actionableSteps: [
        'Commander en urgence les produits concernés',
        'Réviser les seuils de réapprovisionnement',
        'Mettre en place des alertes automatiques'
      ],
      potentialGain: -200000,
      confidence: 94,
      priority: 'urgent'
    }
  ]);

  // Données pour les graphiques de prédiction
  const forecastData = Array.from({ length: 90 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const base = 80000;
    const trend = i * 500;
    const seasonality = Math.sin(i / 30 * Math.PI) * 10000;
    const noise = (Math.random() - 0.5) * 5000;
    return {
      date: date.toISOString().split('T')[0],
      actual: i < 30 ? base + trend + seasonality + noise : null,
      predicted: base + trend + seasonality,
      lower: base + trend + seasonality - 15000,
      upper: base + trend + seasonality + 15000
    };
  });

  // Données pour le modèle de scoring
  const scoringData = [
    { metric: 'Rentabilité', score: 85, benchmark: 75 },
    { metric: 'Croissance', score: 92, benchmark: 80 },
    { metric: 'Efficacité', score: 78, benchmark: 85 },
    { metric: 'Innovation', score: 70, benchmark: 60 },
    { metric: 'Satisfaction', score: 88, benchmark: 82 },
    { metric: 'Durabilité', score: 75, benchmark: 70 }
  ];

  // Corrélations détectées
  const correlationData = [
    { x: 10, y: 20, z: 5, category: 'A' },
    { x: 15, y: 25, z: 8, category: 'B' },
    { x: 20, y: 30, z: 12, category: 'A' },
    { x: 25, y: 28, z: 15, category: 'C' },
    { x: 30, y: 35, z: 18, category: 'B' },
    { x: 35, y: 40, z: 22, category: 'A' },
    { x: 40, y: 38, z: 25, category: 'C' },
    { x: 45, y: 45, z: 28, category: 'B' }
  ];

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
    if (confidence >= 60) return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
    return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] border-[var(--color-error-light)]';
      case 'warning': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)] border-[var(--color-warning-light)]';
      case 'info': return 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)] border-[var(--color-primary-light)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)] border-[var(--color-border)]';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Brain className="w-8 h-8 text-[var(--color-primary)]" />
            IA Insights & Analyses Prédictives
          </h1>
          <p className="text-[var(--color-text-primary)] mt-1">Intelligence artificielle au service de vos décisions</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1month">1 mois</option>
            <option value="3months">3 mois</option>
            <option value="6months">6 mois</option>
            <option value="1year">1 an</option>
          </select>

          <button
            onClick={handleRefresh}
            className={cn(
              "p-2 rounded-lg border hover:bg-[var(--color-background-secondary)] transition-all",
              refreshing && "animate-spin"
            )}
            disabled={refreshing} aria-label="Actualiser">
            <RefreshCw className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
            <Settings className="w-4 h-4" />
            Configurer Modèles
          </button>
        </div>
      </div>

      {/* AI Score Overview */}
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-info)] rounded-lg p-6 text-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5" />
              <span className="text-sm opacity-90">Score IA Global</span>
            </div>
            <p className="text-3xl font-bold">87/100</p>
            <p className="text-sm opacity-75 mt-1">+5 pts vs mois dernier</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm opacity-90">Précision Prédictions</span>
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

      {/* Predictions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {predictions.map((prediction) => (
          <div key={prediction.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">{prediction.title}</h3>
                <p className="text-sm text-[var(--color-text-primary)] mt-1">{prediction.description}</p>
              </div>
              <Bot className="w-5 h-5 text-[var(--color-primary)]" />
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {prediction.type === 'revenue' || prediction.type === 'cashflow'
                    ? `${prediction.value.toLocaleString()} DH`
                    : `${prediction.value} unités`}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">{prediction.timeframe}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--color-text-primary)]">Confiance</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", getConfidenceColor(prediction.confidence))}>
                  {prediction.confidence}%
                </span>
              </div>
              <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    prediction.confidence >= 80 ? "bg-[var(--color-success)]" :
                    prediction.confidence >= 60 ? "bg-[var(--color-warning)]" : "bg-[var(--color-error)]"
                  )}
                  style={{ width: `${prediction.confidence}%` }}
                />
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Facteurs clés:</p>
              <div className="flex flex-wrap gap-1">
                {prediction.factors.map((factor, i) => (
                  <span key={i} className="px-2 py-1 bg-[var(--color-background-hover)] text-xs rounded">
                    {factor}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[var(--color-primary-lightest)] rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-[var(--color-primary)] mt-0.5" />
                <p className="text-sm text-[var(--color-primary-darker)]">{prediction.recommendation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Prévisions avec Intervalles de Confiance</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={forecastData}>
            <defs>
              <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
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
            <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Prédiction" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Anomalies Detection */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Détection d'Anomalies</h2>
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="space-y-3">
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

      {/* Insights & Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Insights Actionnables</h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-4 border rounded-lg hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {insight.category === 'opportunity' && <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />}
                    {insight.category === 'risk' && <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />}
                    {insight.category === 'optimization' && <Zap className="w-5 h-5 text-[var(--color-primary)]" />}
                    {insight.category === 'trend' && <Activity className="w-5 h-5 text-[var(--color-info)]" />}
                    <h4 className="font-medium text-[var(--color-text-primary)]">{insight.title}</h4>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 text-xs rounded-full font-medium",
                    insight.priority === 'urgent' && "bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]",
                    insight.priority === 'high' && "bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]",
                    insight.priority === 'medium' && "bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]",
                    insight.priority === 'low' && "bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]"
                  )}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-primary)] mb-2">{insight.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    {insight.potentialGain > 0 ? '+' : ''}{insight.potentialGain.toLocaleString()} DH
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Confiance: {insight.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Score de Performance IA</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={scoringData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="metric" stroke="#6B7280" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6B7280" />
              <Radar name="Votre Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Radar name="Benchmark" dataKey="benchmark" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Correlation Analysis */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Analyse de Corrélations</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="x" name="Ventes" unit="k€" stroke="#6B7280" />
            <YAxis dataKey="y" name="Marge" unit="%" stroke="#6B7280" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Produits A" data={correlationData.filter(d => d.category === 'A')} fill="#3B82F6" />
            <Scatter name="Produits B" data={correlationData.filter(d => d.category === 'B')} fill="#10B981" />
            <Scatter name="Produits C" data={correlationData.filter(d => d.category === 'C')} fill="#F59E0B" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AIInsights;