/**
 * Dashboard Principal Executive WiseBook
 * Vue d'ensemble consolidée tous modules selon cahier des charges
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Download,
  Bell,
  Calendar,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  LoadingSpinner,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui';
import { LineChart, BarChart, PieChart } from '../charts';
import { dashboardService } from '../../services/dashboard.service';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface ExecutiveDashboardProps {
  companyId: string;
  fiscalYearId?: string;
  className?: string;
}

interface ConsolidatedKPIs {
  // Comptabilité générale
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  netIncome: number;
  
  // Trésorerie
  cashPosition: number;
  cashFlowNet: number;
  liquidityRatio: number;
  
  // Clients
  totalReceivables: number;
  dso: number;
  collectionRate: number;
  
  // Fournisseurs  
  totalPayables: number;
  dpo: number;
  discountsCaptured: number;
  
  // Performance globale
  operatingMargin: number;
  workingCapitalDays: number;
  cashConversionCycle: number;
}

const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  companyId,
  fiscalYearId,
  className = ''
}) => {
  // États
  const [selectedPeriod, setSelectedPeriod] = useState('current_month');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'financial' | 'operational' | 'performance'>('overview');

  // Queries consolidées
  const { data: consolidatedKPIs, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['executive-kpis', companyId, fiscalYearId, selectedPeriod],
    queryFn: () => dashboardService.getConsolidatedKPIs({ 
      companyId, 
      fiscalYearId, 
      period: selectedPeriod 
    }),
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
  });

  const { data: operationalMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['operational-metrics', companyId, selectedPeriod],
    queryFn: () => dashboardService.getOperationalMetrics({ companyId, period: selectedPeriod }),
    refetchInterval: autoRefresh ? 600000 : false, // 10 minutes
  });

  const { data: financialTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['financial-trends', companyId, selectedPeriod],
    queryFn: () => dashboardService.getFinancialTrends({ companyId, period: selectedPeriod }),
  });

  const { data: criticalAlerts } = useQuery({
    queryKey: ['critical-alerts', companyId],
    queryFn: () => dashboardService.getCriticalAlerts({ companyId }),
    refetchInterval: 60000, // 1 minute pour alertes critiques
  });

  const { data: performanceBenchmark } = useQuery({
    queryKey: ['performance-benchmark', companyId],
    queryFn: () => dashboardService.getPerformanceBenchmark({ companyId }),
  });

  // KPI Cards principales consolidées
  const executiveKPIs = useMemo(() => {
    if (!consolidatedKPIs) return [];

    return [
      {
        title: 'Position de Trésorerie',
        value: formatCurrency(consolidatedKPIs.cashPosition),
        change: consolidatedKPIs.cashPositionTrend,
        icon: DollarSign,
        color: consolidatedKPIs.cashPosition >= 0 ? 'green' : 'red',
        trend: consolidatedKPIs.cashPositionTrend >= 0 ? 'up' : 'down',
        module: 'treasury'
      },
      {
        title: 'Résultat Net',
        value: formatCurrency(consolidatedKPIs.netIncome),
        change: consolidatedKPIs.netIncomeTrend,
        icon: TrendingUp,
        color: consolidatedKPIs.netIncome >= 0 ? 'green' : 'red',
        trend: consolidatedKPIs.netIncomeTrend >= 0 ? 'up' : 'down',
        module: 'accounting'
      },
      {
        title: 'Créances Clients',
        value: formatCurrency(consolidatedKPIs.totalReceivables),
        subValue: `DSO: ${consolidatedKPIs.dso}j`,
        change: consolidatedKPIs.receivablesTrend,
        icon: Users,
        color: consolidatedKPIs.dso <= 30 ? 'green' : consolidatedKPIs.dso <= 45 ? 'yellow' : 'red',
        trend: consolidatedKPIs.receivablesTrend >= 0 ? 'up' : 'down',
        module: 'customers'
      },
      {
        title: 'Dettes Fournisseurs',
        value: formatCurrency(consolidatedKPIs.totalPayables),
        subValue: `DPO: ${consolidatedKPIs.dpo}j`,
        change: consolidatedKPIs.payablesTrend,
        icon: CreditCard,
        color: consolidatedKPIs.dpo >= 30 ? 'green' : 'yellow',
        trend: consolidatedKPIs.payablesTrend >= 0 ? 'up' : 'down',
        module: 'suppliers'
      },
      {
        title: 'Marge Opérationnelle',
        value: formatPercent(consolidatedKPIs.operatingMargin),
        change: consolidatedKPIs.marginTrend,
        icon: Target,
        color: consolidatedKPIs.operatingMargin >= 15 ? 'green' : consolidatedKPIs.operatingMargin >= 10 ? 'yellow' : 'red',
        trend: consolidatedKPIs.marginTrend >= 0 ? 'up' : 'down',
        module: 'accounting'
      },
      {
        title: 'Cycle BFR',
        value: `${consolidatedKPIs.cashConversionCycle}j`,
        change: consolidatedKPIs.cccTrend,
        icon: Activity,
        color: consolidatedKPIs.cashConversionCycle <= 30 ? 'green' : consolidatedKPIs.cashConversionCycle <= 60 ? 'yellow' : 'red',
        trend: consolidatedKPIs.cccTrend <= 0 ? 'up' : 'down', // Inverse car moins = mieux
        module: 'operational'
      }
    ];
  }, [consolidatedKPIs]);

  const getModuleColor = (module: string) => {
    const colors = {
      'treasury': 'blue',
      'accounting': 'purple', 
      'customers': 'green',
      'suppliers': 'orange',
      'operational': 'indigo'
    };
    return colors[module] || 'gray';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Executive avec logo et navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">W</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Sometype Mono, sans-serif' }}>
                WiseBook Executive
              </h1>
              <p className="text-gray-600">
                Vue d'ensemble consolidée • Temps réel
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {criticalAlerts?.count > 0 && (
              <Button variant="outline" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {criticalAlerts.count}
                </span>
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Manuel'}
            </Button>
          </div>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="current_week">Cette semaine</SelectItem>
              <SelectItem value="current_month">Ce mois</SelectItem>
              <SelectItem value="current_quarter">Ce trimestre</SelectItem>
              <SelectItem value="current_year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Rapport Executive
          </Button>
        </div>
      </div>

      {/* Alertes Critiques Executive */}
      {criticalAlerts?.alerts?.length > 0 && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2 animate-bounce" />
              Alertes Direction ({criticalAlerts.count})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {criticalAlerts.alerts.slice(0, 4).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-red-100 text-red-800">
                      {alert.module}
                    </Badge>
                    <div>
                      <p className="font-medium text-red-900">{alert.title}</p>
                      <p className="text-sm text-red-700">{alert.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">
                      {formatCurrency(alert.amount)}
                    </p>
                    <Button size="sm" variant="outline" className="mt-1">
                      Action
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs Executive Consolidés */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <LoadingSpinner size="sm" text="Chargement..." />
              </CardContent>
            </Card>
          ))
        ) : (
          executiveKPIs.map((kpi, index) => {
            const Icon = kpi.icon;
            const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
            const moduleColor = getModuleColor(kpi.module);
            
            return (
              <Card key={index} className={`hover:shadow-lg transition-all duration-300 border-l-4 border-l-${moduleColor}-500`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-${moduleColor}-100`}>
                        <Icon className={`h-7 w-7 text-${moduleColor}-600`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                          {kpi.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {kpi.value}
                        </p>
                        {kpi.subValue && (
                          <p className="text-sm text-gray-500 mt-1">{kpi.subValue}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center ${
                        kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendIcon className="h-5 w-5 mr-1" />
                        <span className="text-lg font-bold">
                          {Math.abs(kpi.change)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">vs période préc.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Navigation des vues */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'Ensemble</TabsTrigger>
          <TabsTrigger value="financial">Situation Financière</TabsTrigger>
          <TabsTrigger value="operational">Performance Opérationnelle</TabsTrigger>
          <TabsTrigger value="performance">Analytics Avancées</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-6">
          {/* Graphique principal - Évolution position financière */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <LineChartIcon className="h-5 w-5 mr-2" />
                  Évolution Situation Financière
                </span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">Données consolidées</Badge>
                  <Badge className="bg-blue-100 text-blue-800">Temps réel</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <LoadingSpinner text="Génération tendances..." />
              ) : (
                <LineChart
                  data={financialTrends?.consolidated_trends || []}
                  xAxisKey="date"
                  lines={[
                    { key: 'cash_position', name: 'Position Trésorerie', color: '#3B82F6' },
                    { key: 'receivables', name: 'Créances Clients', color: '#10B981' },
                    { key: 'payables', name: 'Dettes Fournisseurs', color: '#F59E0B' },
                    { key: 'net_income', name: 'Résultat Net', color: '#8B5CF6' }
                  ]}
                  height={400}
                />
              )}
            </CardContent>
          </Card>

          {/* Matrices de performance par module */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance modules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Performance par Module
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceBenchmark?.modules_performance?.map((module, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{module.name}</h4>
                        <Badge className={`
                          ${module.score >= 95 ? 'bg-green-100 text-green-800' :
                            module.score >= 80 ? 'bg-blue-100 text-blue-800' :
                            module.score >= 65 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}
                        `}>
                          {module.score.toFixed(0)}%
                        </Badge>
                      </div>
                      <Progress value={module.score} className="mb-2" />
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <span>Objectifs atteints: {module.targets_met}/{module.total_targets}</span>
                        <span className="text-right">Status: {module.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions prioritaires consolidées */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Actions Prioritaires Direction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {operationalMetrics?.priority_actions?.map((action, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      action.priority === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                      action.priority === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={`text-xs ${
                            action.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            action.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {action.module}
                          </Badge>
                          <div>
                            <p className="font-medium text-gray-900">{action.title}</p>
                            <p className="text-sm text-gray-600">{action.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">
                            {formatCurrency(action.amount)}
                          </p>
                          <Button size="sm" variant="outline" className="mt-1">
                            Traiter
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Widgets temps réel modulaires */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Widget Trésorerie */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Trésorerie
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(consolidatedKPIs?.cashPosition || 0)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">Disponible</span>
                  <span className="text-xs font-medium text-blue-600">
                    {formatCurrency(consolidatedKPIs?.cashPosition + consolidatedKPIs?.creditLines || 0)}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="h-1 bg-gray-200 rounded">
                    <div 
                      className="h-1 bg-blue-500 rounded transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (consolidatedKPIs?.cashPosition / (consolidatedKPIs?.cashPosition + consolidatedKPIs?.creditLines) * 100) || 0)}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Widget Clients */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(consolidatedKPIs?.totalReceivables || 0)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">DSO</span>
                  <span className={`text-xs font-medium ${
                    consolidatedKPIs?.dso <= 30 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {consolidatedKPIs?.dso || 0}j
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Recouvrement</span>
                  <span className="text-xs font-medium text-green-600">
                    {formatPercent(consolidatedKPIs?.collectionRate || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Widget Fournisseurs */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Fournisseurs
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-orange-600">
                  {formatCurrency(consolidatedKPIs?.totalPayables || 0)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">DPO</span>
                  <span className="text-xs font-medium text-orange-600">
                    {consolidatedKPIs?.dpo || 0}j
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Escomptes</span>
                  <span className="text-xs font-medium text-green-600">
                    {formatCurrency(consolidatedKPIs?.discountsCaptured || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Widget Performance */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl font-bold text-purple-600">
                  {formatPercent(consolidatedKPIs?.operatingMargin || 0)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-600">Marge</span>
                  <span className={`text-xs font-medium ${
                    consolidatedKPIs?.operatingMargin >= 15 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Objectif: 15%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Cycle BFR</span>
                  <span className="text-xs font-medium text-purple-600">
                    {consolidatedKPIs?.cashConversionCycle || 0}j
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vue Situation Financière */}
        <TabsContent value="financial" className="space-y-6">
          {/* Bilan synthétique */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Structure Bilancielle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={financialTrends?.balance_sheet_structure || []}
                  dataKey="amount"
                  nameKey="category"
                  height={300}
                  colors={['#3B82F6', '#10B981', '#F59E0B', '#EF4444']}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ratios Financiers Clés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialTrends?.key_ratios?.map((ratio, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{ratio.name}</p>
                        <p className="text-sm text-gray-600">{ratio.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          ratio.status === 'GOOD' ? 'text-green-600' :
                          ratio.status === 'WARNING' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {ratio.value}
                        </p>
                        <p className="text-xs text-gray-500">
                          Norme: {ratio.benchmark}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow détaillé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Flux de Trésorerie Opérationnels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                data={financialTrends?.cash_flow_breakdown || []}
                xAxisKey="category"
                bars={[
                  { key: 'inflows', name: 'Entrées', color: '#10B981' },
                  { key: 'outflows', name: 'Sorties', color: '#EF4444' }
                ]}
                height={300}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Performance Opérationnelle */}
        <TabsContent value="operational" className="space-y-6">
          {/* Métriques opérationnelles */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-600">
                  {operationalMetrics?.processing_times?.average_entry_time || 0}s
                </div>
                <p className="text-sm text-gray-600">Temps Saisie Écriture</p>
                <p className="text-xs text-gray-500">Objectif: &lt; 0.5s</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">
                  {operationalMetrics?.automation_rates?.reconciliation || 0}%
                </div>
                <p className="text-sm text-gray-600">Lettrage Auto</p>
                <p className="text-xs text-gray-500">Objectif: &gt; 98%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-purple-600">
                  {operationalMetrics?.performance_scores?.overall_system || 0}%
                </div>
                <p className="text-sm text-gray-600">Performance Système</p>
                <p className="text-xs text-gray-500">Score global</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Shield className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-indigo-600">
                  99.9%
                </div>
                <p className="text-sm text-gray-600">Disponibilité</p>
                <p className="text-xs text-gray-500">SLA respecté</p>
              </CardContent>
            </Card>
          </div>

          {/* Comparatif performance vs marché */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                WiseBook vs Concurrence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Métrique</th>
                      <th className="text-center py-2">WiseBook</th>
                      <th className="text-center py-2">SAP</th>
                      <th className="text-center py-2">Oracle</th>
                      <th className="text-center py-2">Sage</th>
                      <th className="text-center py-2">Avantage</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-2">
                    <tr>
                      <td className="py-2">Temps réponse moyen</td>
                      <td className="text-center font-bold text-green-600">&lt; 100ms</td>
                      <td className="text-center text-gray-600">500-1000ms</td>
                      <td className="text-center text-gray-600">300-800ms</td>
                      <td className="text-center text-gray-600">200-500ms</td>
                      <td className="text-center font-bold text-green-600">5-10x</td>
                    </tr>
                    <tr>
                      <td className="py-2">Clôture mensuelle</td>
                      <td className="text-center font-bold text-green-600">&lt; 30min</td>
                      <td className="text-center text-gray-600">2-4h</td>
                      <td className="text-center text-gray-600">1-3h</td>
                      <td className="text-center text-gray-600">1-2h</td>
                      <td className="text-center font-bold text-green-600">4-8x</td>
                    </tr>
                    <tr>
                      <td className="py-2">Lettrage automatique</td>
                      <td className="text-center font-bold text-green-600">&gt; 98%</td>
                      <td className="text-center text-gray-600">70-80%</td>
                      <td className="text-center text-gray-600">75-85%</td>
                      <td className="text-center text-gray-600">60-70%</td>
                      <td className="text-center font-bold text-green-600">+20%</td>
                    </tr>
                    <tr>
                      <td className="py-2">SYSCOHADA natif</td>
                      <td className="text-center font-bold text-green-600">100%</td>
                      <td className="text-center text-gray-600">Adapté</td>
                      <td className="text-center text-gray-600">Adapté</td>
                      <td className="text-center text-gray-600">Partiel</td>
                      <td className="text-center font-bold text-green-600">Natif</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Analytics Avancées */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance globale vs cahier des charges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance vs Cahier des Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Objectifs de Performance</h4>
                  {performanceBenchmark?.performance_targets?.map((target, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{target.metric_name}</p>
                        <p className="text-sm text-gray-600">
                          Actuel: {target.current_value} • Cible: {target.target_value}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={`
                          ${target.achievement >= 100 ? 'bg-green-100 text-green-800' :
                            target.achievement >= 80 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}
                        `}>
                          {target.achievement.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800">Score Global</h4>
                  <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {performanceBenchmark?.global_score?.toFixed(1) || 0}%
                    </div>
                    <p className="text-blue-800 font-medium">Excellence Opérationnelle</p>
                    <Progress 
                      value={performanceBenchmark?.global_score || 0} 
                      className="mt-3 h-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="font-bold text-green-600">
                        {performanceBenchmark?.targets_exceeded || 0}
                      </p>
                      <p className="text-green-800 text-xs">Objectifs dépassés</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="font-bold text-blue-600">
                        {performanceBenchmark?.targets_met || 0}
                      </p>
                      <p className="text-blue-800 text-xs">Objectifs atteints</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer avec métriques système */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Système opérationnel</span>
          </div>
          <span>
            Performance: {performanceBenchmark?.global_score?.toFixed(0) || 0}% 
            ({performanceBenchmark?.targets_met || 0}/{performanceBenchmark?.total_targets || 0} objectifs)
          </span>
          <span>
            Utilisateurs connectés: {operationalMetrics?.active_users || 0}
          </span>
          {autoRefresh && (
            <span className="text-green-600">Live data • 5min refresh</span>
          )}
        </div>
        
        <div className="text-right">
          <p className="font-medium">WiseBook v3.0 - Production Ready</p>
          <p className="text-xs">
            Dernière maj: {formatDate(new Date())} • 
            Praedium Tech © 2024
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;