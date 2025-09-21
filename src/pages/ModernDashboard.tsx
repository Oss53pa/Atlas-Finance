/**
 * Dashboard Moderne WiseBook
 * Interface optimisée sans problèmes UX + Palette professionnelle
 */
import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  PieChart,
  Target,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '../components/ui';

const ModernDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Données KPIs temps réel
  const kpis = [
    {
      title: 'Chiffre d\'Affaires',
      value: '12 450 000',
      unit: 'XAF',
      change: '+12.5%',
      trend: 'up',
      icon: TrendingUp,
      color: 'emerald',
      bgColor: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'Position Trésorerie',
      value: '3 850 000',
      unit: 'XAF',
      change: '+420K',
      trend: 'up', 
      icon: DollarSign,
      color: 'blue',
      bgColor: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Créances Clients',
      value: '2 240 000',
      unit: 'XAF',
      change: 'DSO: 42j',
      trend: 'stable',
      icon: Users,
      color: 'amber',
      bgColor: 'from-amber-500 to-amber-600'
    },
    {
      title: 'Dettes Fournisseurs',
      value: '1 680 000', 
      unit: 'XAF',
      change: 'DPO: 38j',
      trend: 'down',
      icon: CreditCard,
      color: 'purple',
      bgColor: 'from-purple-500 to-purple-600'
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'entry',
      title: 'Écriture VTE-2024-001 validée',
      description: 'Vente marchandises Client ABC SARL',
      amount: 850000,
      time: 'Il y a 15 min',
      icon: FileText,
      iconColor: 'text-emerald-600'
    },
    {
      id: 2,
      type: 'payment',
      title: 'Paiement fournisseur exécuté',
      description: 'Virement SEPA Fournisseur XYZ',
      amount: -420000,
      time: 'Il y a 1h',
      icon: CreditCard,
      iconColor: 'text-blue-600'
    },
    {
      id: 3,
      type: 'reconciliation',
      title: 'Lettrage automatique terminé',
      description: '47 lignes lettrées avec IA (98% succès)',
      amount: null,
      time: 'Il y a 2h',
      icon: CheckCircle,
      iconColor: 'text-green-600'
    },
    {
      id: 4,
      type: 'alert',
      title: 'Alerte DSO Client DEF',
      description: 'Dépassement délai crédit (52 jours)',
      amount: 125000,
      time: 'Il y a 3h',
      icon: AlertTriangle,
      iconColor: 'text-orange-600'
    }
  ];

  const quickActions = [
    { 
      title: 'Nouvelle Écriture', 
      description: 'Saisie comptable guidée',
      icon: FileText, 
      color: 'blue',
      path: '/accounting/entries/new' 
    },
    { 
      title: 'Lettrage IA', 
      description: 'Rapprochement automatique',
      icon: Zap, 
      color: 'emerald',
      path: '/accounting/reconciliation' 
    },
    { 
      title: 'Position Trésorerie', 
      description: 'Vue temps réel multi-banques',
      icon: DollarSign, 
      color: 'purple',
      path: '/treasury-advanced' 
    },
    { 
      title: 'Balance Âgée', 
      description: 'Analyse créances clients',
      icon: BarChart3, 
      color: 'amber',
      path: '/customers-advanced' 
    },
    { 
      title: 'TAFIRE SYSCOHADA', 
      description: 'États financiers automatiques',
      icon: PieChart, 
      color: 'indigo',
      path: '/financial-analysis-advanced' 
    },
    { 
      title: 'Appel de Fonds', 
      description: 'Financement opérationnel',
      icon: Target, 
      color: 'rose',
      path: '/treasury/fund-calls' 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 overflow-hidden">
      {/* Header avec titre et refresh */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Executive</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble temps réel • {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <button 
          onClick={() => setRefreshing(true)}
          className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium text-gray-700">Actualiser</span>
        </button>
      </div>

      {/* Grid principal sans scroll */}
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* KPIs - 2/3 largeur */}
        <div className="col-span-8 space-y-6">
          {/* KPIs Cards */}
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Target;
              
              return (
                <Card key={index} className="hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <div className={`h-2 bg-gradient-to-r ${kpi.bgColor}`}></div>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-xl bg-${kpi.color}-100`}>
                          <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                          <div className="flex items-baseline space-x-2">
                            <p className="text-2xl font-bold text-gray-900">
                              {kpi.value}
                            </p>
                            <span className="text-sm text-gray-500">{kpi.unit}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`flex items-center space-x-1 ${
                          kpi.trend === 'up' ? 'text-emerald-600' : 
                          kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-sm font-semibold">{kpi.change}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Actions Rapides - Grid horizontal sans scroll */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Actions Rapides</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      className={`
                        group p-4 rounded-xl border-2 border-dashed border-gray-200
                        hover:border-${action.color}-300 hover:bg-${action.color}-50
                        transition-all duration-200 text-left
                      `}
                      onClick={() => window.location.href = action.path}
                    >
                      <Icon className={`h-8 w-8 text-${action.color}-500 mb-3 group-hover:scale-110 transition-transform`} />
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar droite - Activités récentes */}
        <div className="col-span-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Activité Récente</h2>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                  {recentActivities.length} nouvelles
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-96">
              {recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg bg-gray-100`}>
                      <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{activity.time}</span>
                        {activity.amount && (
                          <span className={`text-sm font-semibold ${
                            activity.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {activity.amount > 0 ? '+' : ''}{activity.amount.toLocaleString('fr-FR')} XAF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;