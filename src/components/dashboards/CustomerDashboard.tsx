/**
 * Dashboard Comptabilité Client Avancé
 * KPIs temps réel et analytics selon spécifications détaillées
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertTriangle,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  Map,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  FileText,
  Clock
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../ui';
import { BarChart, LineChart, PieChart } from '../charts';
import { customerService } from '../../services/customer.service';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface CustomerDashboardProps {
  className?: string;
  companyId: string;
  fiscalYearId?: string;
}

interface DashboardFilters {
  period: string;
  zone: string;
  segment: string;
  commercial: string;
  paymentStatus: string;
}

interface KPIData {
  totalOutstanding: number;
  dso: number;
  collectionRate: number;
  overdueAmount: number;
  provisionAmount: number;
  revenue: number;
  growthRate: number;
  averageBasket: number;
  purchaseFrequency: number;
  topClientConcentration: number;
  averageRiskScore: number;
  creditLimitExceeded: number;
  unpaidHistory: number;
}

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  className = '',
  companyId,
  fiscalYearId
}) => {
  // États du dashboard
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'current_month',
    zone: 'all',
    segment: 'all', 
    commercial: 'all',
    paymentStatus: 'all'
  });

  const [selectedView, setSelectedView] = useState<'overview' | 'aging' | 'forecasts' | 'analysis'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Queries principales
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['customer-kpis', companyId, fiscalYearId, filters],
    queryFn: () => customerService.getKPIData({ companyId, fiscalYearId, filters }),
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes si auto-refresh
  });

  const { data: agingData, isLoading: agingLoading } = useQuery({
    queryKey: ['customer-aging', companyId, fiscalYearId, filters],
    queryFn: () => customerService.getAgingAnalysis({ companyId, fiscalYearId, filters }),
    refetchInterval: autoRefresh ? 300000 : false,
  });

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['customer-trends', companyId, filters],
    queryFn: () => customerService.getTrendsData({ companyId, filters }),
    refetchInterval: autoRefresh ? 600000 : false, // 10 minutes
  });

  const { data: riskAnalysis, isLoading: riskLoading } = useQuery({
    queryKey: ['customer-risk', companyId, fiscalYearId],
    queryFn: () => customerService.getRiskAnalysis({ companyId, fiscalYearId }),
  });

  const { data: priorityActions } = useQuery({
    queryKey: ['customer-actions', companyId],
    queryFn: () => customerService.getPriorityActions({ companyId }),
    refetchInterval: 60000, // 1 minute pour actions urgentes
  });

  // Calculs dérivés
  const kpiCards = useMemo(() => {
    if (!kpiData) return [];

    return [
      {
        title: 'Encours Clients Total',
        value: formatCurrency(kpiData.totalOutstanding),
        change: kpiData.outstandingTrend,
        icon: DollarSign,
        color: 'blue',
        trend: kpiData.outstandingTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'DSO Moyen',
        value: `${kpiData.dso} j`,
        change: kpiData.dsoTrend,
        icon: Clock,
        color: kpiData.dso > 45 ? 'red' : kpiData.dso > 30 ? 'yellow' : 'green',
        trend: kpiData.dsoTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Taux de Recouvrement',
        value: formatPercent(kpiData.collectionRate),
        change: kpiData.collectionRateTrend,
        icon: Target,
        color: kpiData.collectionRate > 95 ? 'green' : kpiData.collectionRate > 85 ? 'yellow' : 'red',
        trend: kpiData.collectionRateTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Créances Échues',
        value: formatCurrency(kpiData.overdueAmount),
        change: kpiData.overdueTrend,
        icon: AlertTriangle,
        color: 'red',
        trend: kpiData.overdueTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Chiffre d\'Affaires',
        value: formatCurrency(kpiData.revenue),
        change: kpiData.growthRate,
        icon: TrendingUp,
        color: 'green',
        trend: kpiData.growthRate > 0 ? 'up' : 'down'
      },
      {
        title: 'Score Risque Moyen',
        value: `${kpiData.averageRiskScore}/1000`,
        change: kpiData.riskTrend,
        icon: CreditCard,
        color: kpiData.averageRiskScore > 800 ? 'green' : kpiData.averageRiskScore > 600 ? 'yellow' : 'red',
        trend: kpiData.riskTrend > 0 ? 'up' : 'down'
      }
    ];
  }, [kpiData]);

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    customerService.exportDashboard({ 
      companyId, 
      fiscalYearId, 
      filters, 
      format,
      view: selectedView 
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'current': 'bg-green-100 text-green-800',
      'overdue': 'bg-red-100 text-red-800', 
      'disputed': 'bg-yellow-100 text-yellow-800',
      'critical': 'bg-red-200 text-red-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Comptabilité Client
          </h1>
          <p className="text-gray-600 mt-1">
            Suivi temps réel des créances et recouvrement
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          
          <Select value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Vue d'ensemble</SelectItem>
              <SelectItem value="aging">Balance âgée</SelectItem>
              <SelectItem value="forecasts">Prévisions</SelectItem>
              <SelectItem value="analysis">Analyse détaillée</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Filtres avancés */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mois en cours</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="current_quarter">Trimestre</SelectItem>
                <SelectItem value="current_year">Année</SelectItem>
                <SelectItem value="last_12_months">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.zone} onValueChange={(value) => handleFilterChange('zone', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Zone géographique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes zones</SelectItem>
                <SelectItem value="cameroun">Cameroun</SelectItem>
                <SelectItem value="gabon">Gabon</SelectItem>
                <SelectItem value="tchad">Tchad</SelectItem>
                <SelectItem value="export">Export</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.segment} onValueChange={(value) => handleFilterChange('segment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Segment client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous segments</SelectItem>
                <SelectItem value="large">Grandes entreprises</SelectItem>
                <SelectItem value="medium">PME</SelectItem>
                <SelectItem value="small">TPE</SelectItem>
                <SelectItem value="government">Administration</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.paymentStatus} onValueChange={(value) => handleFilterChange('paymentStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="current">À jour</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
                <SelectItem value="legal">Contentieux</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ period: 'current_month', zone: 'all', segment: 'all', commercial: 'all', paymentStatus: 'all' })}
            >
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vue d'ensemble */}
      {selectedView === 'overview' && (
        <>
          {/* KPIs Principales - 2.1.1 Indicateurs de suivi des créances */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {kpiLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <LoadingSpinner size="sm" text="Chargement KPI..." />
                  </CardContent>
                </Card>
              ))
            ) : (
              kpiCards.map((kpi, index) => {
                const Icon = kpi.icon;
                const isPositive = kpi.trend === 'up';
                const TrendIcon = isPositive ? TrendingUp : TrendingDown;
                
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full bg-${kpi.color}-100`}>
                            <Icon className={`h-6 w-6 text-${kpi.color}-600`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            <TrendIcon className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">
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

          {/* Graphiques principales tendances */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 2.2.1 Graphiques d'évolution temporelle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Évolution Encours vs CA
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendsLoading ? (
                  <LoadingSpinner text="Chargement tendances..." />
                ) : (
                  <LineChart
                    data={trendsData?.revenueVsOutstanding || []}
                    xAxisKey="date"
                    lines={[
                      { key: 'revenue', name: 'Chiffre d\'affaires', color: '#10B981' },
                      { key: 'outstanding', name: 'Encours', color: '#EF4444' }
                    ]}
                    height={300}
                  />
                )}
              </CardContent>
            </Card>

            {/* 2.2.1 Vue d'ensemble des créances par statut */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Répartition par Statut
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agingLoading ? (
                  <LoadingSpinner text="Chargement répartition..." />
                ) : (
                  <PieChart
                    data={agingData?.statusBreakdown || []}
                    dataKey="amount"
                    nameKey="status"
                    height={300}
                    colors={['#10B981', '#F59E0B', '#EF4444', '#8B5CF6']}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Actions prioritaires temps réel */}
          {priorityActions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                    Actions Prioritaires ({priorityActions.length})
                  </span>
                  <Badge variant="destructive" className="animate-pulse">
                    Urgent
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priorityActions.slice(0, 5).map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center space-x-3">
                        <Badge className={`
                          ${action.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                            action.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'}
                        `}>
                          {action.priority}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900">
                            {action.customerName} ({action.customerCode})
                          </p>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-red-600">
                          {formatCurrency(action.amount)}
                        </span>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          {action.action === 'PHONE_CALL' ? (
                            <Phone className="h-4 w-4" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Vue Balance Âgée Interactive */}
      {selectedView === 'aging' && (
        <div className="space-y-6">
          {/* 2.2.2 Aging balance interactive */}
          <Card>
            <CardHeader>
              <CardTitle>Balance Âgée Interactive</CardTitle>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <LoadingSpinner text="Génération balance âgée..." />
              ) : (
                <>
                  {/* Résumé par tranche d'ancienneté */}
                  <div className="grid gap-4 md:grid-cols-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800">Courant (0-30j)</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(agingData?.agingBreakdown?.current || 0)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {formatPercent(agingData?.agingPercentages?.current || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <p className="text-sm font-medium text-yellow-800">30-60 jours</p>
                      <p className="text-xl font-bold text-yellow-900">
                        {formatCurrency(agingData?.agingBreakdown?.days_30_60 || 0)}
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {formatPercent(agingData?.agingPercentages?.days_30_60 || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm font-medium text-orange-800">60-90 jours</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(agingData?.agingBreakdown?.days_60_90 || 0)}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        {formatPercent(agingData?.agingPercentages?.days_60_90 || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800">Plus de 90j</p>
                      <p className="text-xl font-bold text-red-900">
                        {formatCurrency(agingData?.agingBreakdown?.over_90 || 0)}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {formatPercent(agingData?.agingPercentages?.over_90 || 0)}
                      </p>
                    </div>
                  </div>

                  {/* 2.1.3 Top clients à risque */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Encours Total</TableHead>
                          <TableHead>0-30j</TableHead>
                          <TableHead>30-60j</TableHead>
                          <TableHead>60-90j</TableHead>
                          <TableHead>+90j</TableHead>
                          <TableHead>Risque</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agingData?.topRiskCustomers?.map((customer) => (
                          <TableRow key={customer.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.legal_name}</p>
                                <p className="text-sm text-gray-500">{customer.code}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-bold text-red-600">
                                {formatCurrency(customer.total_outstanding)}
                              </span>
                            </TableCell>
                            <TableCell>{formatCurrency(customer.current_amount)}</TableCell>
                            <TableCell className="text-yellow-600">
                              {formatCurrency(customer.days_30_60)}
                            </TableCell>
                            <TableCell className="text-orange-600">
                              {formatCurrency(customer.days_60_90)}
                            </TableCell>
                            <TableCell className="text-red-600 font-bold">
                              {formatCurrency(customer.over_90_days)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(customer.risk_level)}>
                                {customer.risk_level}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Phone className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Mail className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Prévisions */}
      {selectedView === 'forecasts' && (
        <div className="space-y-6">
          {/* 2.2.2 Prévisions de trésorerie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Prévisions d'Encaissement (90 jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <LoadingSpinner text="Calcul prévisions ML..." />
              ) : (
                <div className="space-y-4">
                  {/* Résumé prévisions */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Encaissement Attendu</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(trendsData?.forecast?.totalExpected || 0)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Confiance: {trendsData?.forecast?.confidence || 0}%
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Probabilité Recouvrement</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatPercent(trendsData?.forecast?.probabilityRate || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-orange-800">Risque d'Impayé</p>
                      <p className="text-xl font-bold text-orange-900">
                        {formatCurrency(trendsData?.forecast?.riskAmount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Graphique prévisions hebdomadaires */}
                  <LineChart
                    data={trendsData?.forecast?.weeklyBreakdown || []}
                    xAxisKey="week"
                    lines={[
                      { key: 'expectedAmount', name: 'Montant attendu', color: '#3B82F6' },
                      { key: 'confidence', name: 'Confiance (%)', color: '#10B981' }
                    ]}
                    height={300}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gestion des promesses de paiement */}
          <Card>
            <CardHeader>
              <CardTitle>Promesses de Paiement en Cours</CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Implémenter affichage promesses */}
              <p className="text-gray-500 text-center py-8">
                Promesses de paiement en cours de développement
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Analyse Détaillée */}
      {selectedView === 'analysis' && (
        <div className="space-y-6">
          {/* 2.1.2 Indicateurs de performance commerciale */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Commerciale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Panier Moyen</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(kpiData?.averageBasket || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Fréquence d'Achat</span>
                    <span className="font-bold text-green-600">
                      {(kpiData?.purchaseFrequency || 0).toFixed(1)} /mois
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">Taux de Croissance</span>
                    <span className={`font-bold ${kpiData?.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {kpiData?.growthRate > 0 ? '+' : ''}{formatPercent(kpiData?.growthRate || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2.1.3 Concentration clients */}
            <Card>
              <CardHeader>
                <CardTitle>Concentration Clients (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  data={trendsData?.topClientsConcentration || []}
                  xAxisKey="customerName"
                  bars={[
                    { key: 'percentage', name: 'Part du CA (%)', color: '#6366F1' }
                  ]}
                  height={300}
                />
              </CardContent>
            </Card>
          </div>

          {/* 2.2.2 Cartographie géographique */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Répartition Géographique des Créances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {trendsData?.geographicBreakdown?.map((zone) => (
                  <div key={zone.region} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-gray-900">{zone.region}</h4>
                    <p className="text-2xl font-bold text-blue-600 mt-2">
                      {formatCurrency(zone.amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {zone.customerCount} clients • {formatPercent(zone.percentage)} du total
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>À jour</span>
                        <span className="text-green-600">{formatPercent(zone.onTimeRate)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>En retard</span>
                        <span className="text-red-600">{formatPercent(100 - zone.onTimeRate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 2.3 Segmentation avancée */}
          <Card>
            <CardHeader>
              <CardTitle>Analyse par Segment de Clientèle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment</TableHead>
                      <TableHead>Clients</TableHead>
                      <TableHead>CA Total</TableHead>
                      <TableHead>Encours</TableHead>
                      <TableHead>DSO Moyen</TableHead>
                      <TableHead>Taux Réclamation</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trendsData?.segmentAnalysis?.map((segment) => (
                      <TableRow key={segment.name}>
                        <TableCell className="font-medium">{segment.name}</TableCell>
                        <TableCell>{segment.customerCount}</TableCell>
                        <TableCell>{formatCurrency(segment.revenue)}</TableCell>
                        <TableCell>{formatCurrency(segment.outstanding)}</TableCell>
                        <TableCell>
                          <span className={segment.dso > 45 ? 'text-red-600' : 'text-green-600'}>
                            {segment.dso} j
                          </span>
                        </TableCell>
                        <TableCell>{formatPercent(segment.complaintRate)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(segment.performance)}>
                            {segment.performance}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer avec dernière mise à jour */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
        <div className="flex items-center space-x-4">
          <span>Dernière maj: {formatDate(new Date())}</span>
          <span>•</span>
          <span>Données temps réel</span>
          {autoRefresh && (
            <>
              <span>•</span>
              <span className="text-green-600">Auto-refresh actif</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Connecté</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;