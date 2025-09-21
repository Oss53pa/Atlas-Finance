/**
 * Dashboard Comptabilité Fournisseur Avancé
 * Optimisation des paiements et gestion des dettes selon spécifications 3.0
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Truck,
  CreditCard,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Target,
  BarChart3,
  Settings,
  Zap,
  Shield,
  Award,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Phone,
  Mail,
  FileCheck,
  Banknote,
  Timer
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
  TableCell,
  Progress
} from '../ui';
import { BarChart, LineChart, PieChart } from '../charts';
import { supplierService } from '../../services/supplier.service';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface SupplierDashboardProps {
  className?: string;
  companyId: string;
  fiscalYearId?: string;
}

interface DashboardFilters {
  period: string;
  supplierType: string;
  paymentStatus: string;
  performanceLevel: string;
}

interface SupplierKPIData {
  totalOutstanding: number;
  dpo: number;
  discountCaptured: number;
  overdueAmount: number;
  disputesAmount: number;
  paymentTerms: any;
  purchaseCost: number;
  supplierPerformance: number;
  supplierConcentration: number;
  conformityRate: number;
  processingTime: number;
  automationRate: number;
  contractCompliance: number;
}

const SupplierDashboard: React.FC<SupplierDashboardProps> = ({
  className = '',
  companyId,
  fiscalYearId
}) => {
  // États du dashboard
  const [filters, setFilters] = useState<DashboardFilters>({
    period: 'current_month',
    supplierType: 'all',
    paymentStatus: 'all',
    performanceLevel: 'all'
  });

  const [selectedView, setSelectedView] = useState<'overview' | 'payments' | 'performance' | 'optimization'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Queries principales
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPIs } = useQuery({
    queryKey: ['supplier-kpis', companyId, fiscalYearId, filters],
    queryFn: () => supplierService.getKPIData({ companyId, fiscalYearId, filters }),
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
  });

  const { data: paymentOptimization, isLoading: paymentLoading } = useQuery({
    queryKey: ['payment-optimization', companyId, filters],
    queryFn: () => supplierService.getPaymentOptimization({ companyId, filters }),
    refetchInterval: autoRefresh ? 300000 : false,
  });

  const { data: supplierAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['supplier-analytics', companyId, filters],
    queryFn: () => supplierService.getSupplierAnalytics({ companyId, filters }),
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['supplier-performance', companyId, fiscalYearId],
    queryFn: () => supplierService.getPerformanceData({ companyId, fiscalYearId }),
  });

  // Mutation pour actions de paiement
  const executePaymentMutation = useMutation({
    mutationFn: supplierService.executePaymentProposal,
    onSuccess: () => {
      refetchKPIs();
    }
  });

  // KPI Cards principales - 3.1.1 Indicateurs de gestion des dettes
  const kpiCards = useMemo(() => {
    if (!kpiData) return [];

    return [
      {
        title: 'Encours Fournisseurs Total',
        value: formatCurrency(kpiData.totalOutstanding),
        change: kpiData.outstandingTrend,
        icon: Truck,
        color: 'purple',
        trend: kpiData.outstandingTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'DPO Moyen',
        value: `${kpiData.dpo} j`,
        change: kpiData.dpoTrend,
        icon: Timer,
        color: kpiData.dpo > 45 ? 'green' : kpiData.dpo > 30 ? 'yellow' : 'red',
        trend: kpiData.dpoTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Escomptes Capturés',
        value: formatCurrency(kpiData.discountCaptured),
        change: kpiData.discountTrend,
        icon: Zap,
        color: 'green',
        trend: kpiData.discountTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Dettes Échues',
        value: formatCurrency(kpiData.overdueAmount),
        change: kpiData.overdueTrend,
        icon: AlertCircle,
        color: 'red',
        trend: kpiData.overdueTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Taux Conformité',
        value: formatPercent(kpiData.conformityRate),
        change: kpiData.conformityTrend,
        icon: Shield,
        color: kpiData.conformityRate > 95 ? 'green' : kpiData.conformityRate > 85 ? 'yellow' : 'red',
        trend: kpiData.conformityTrend > 0 ? 'up' : 'down'
      },
      {
        title: 'Performance Globale',
        value: `${kpiData.supplierPerformance}/100`,
        change: kpiData.performanceTrend,
        icon: Award,
        color: 'blue',
        trend: kpiData.performanceTrend > 0 ? 'up' : 'down'
      }
    ];
  }, [kpiData]);

  const handleFilterChange = (key: keyof DashboardFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleExecutePayment = (proposalId: string) => {
    executePaymentMutation.mutate({ proposalId, companyId });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Comptabilité Fournisseur
          </h1>
          <p className="text-gray-600 mt-1">
            Optimisation des paiements et gestion des dettes
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
              <SelectItem value="payments">Gestion Paiements</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="optimization">Optimisation</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Select value={filters.period} onValueChange={(value) => handleFilterChange('period', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mois en cours</SelectItem>
                <SelectItem value="current_quarter">Trimestre</SelectItem>
                <SelectItem value="current_year">Année</SelectItem>
                <SelectItem value="last_12_months">12 mois</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.supplierType} onValueChange={(value) => handleFilterChange('supplierType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Type fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="goods">Biens</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="subcontractor">Sous-traitance</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.paymentStatus} onValueChange={(value) => handleFilterChange('paymentStatus', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Statut paiement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.performanceLevel} onValueChange={(value) => handleFilterChange('performanceLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous niveaux</SelectItem>
                <SelectItem value="excellent">Excellent (A)</SelectItem>
                <SelectItem value="good">Bon (B)</SelectItem>
                <SelectItem value="average">Moyen (C)</SelectItem>
                <SelectItem value="poor">Faible (D+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vue d'ensemble */}
      {selectedView === 'overview' && (
        <>
          {/* KPIs Principales */}
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

          {/* 3.2.1 Tableaux de bord opérationnels */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Planning des échéances */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Planning des Échéances (30 jours)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <LoadingSpinner text="Chargement échéances..." />
                ) : (
                  <div className="space-y-3">
                    {paymentOptimization?.upcomingPayments?.map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Badge className={`
                            ${payment.urgency === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                              payment.urgency === 'DUE_TODAY' ? 'bg-orange-100 text-orange-800' :
                              payment.urgency === 'DUE_SOON' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'}
                          `}>
                            {payment.urgency}
                          </Badge>
                          <div>
                            <p className="font-medium">{payment.supplierName}</p>
                            <p className="text-sm text-gray-500">
                              {payment.invoiceCount} facture(s) • Échéance: {formatDate(payment.dueDate)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">
                            {formatCurrency(payment.amount)}
                          </p>
                          {payment.discountAmount > 0 && (
                            <p className="text-sm text-green-600">
                              Escompte: -{formatCurrency(payment.discountAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Évolution coût des achats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Évolution Coût des Achats
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <LoadingSpinner text="Chargement analytics..." />
                ) : (
                  <LineChart
                    data={supplierAnalytics?.purchaseTrends || []}
                    xAxisKey="month"
                    lines={[
                      { key: 'totalCost', name: 'Coût total', color: '#8B5CF6' },
                      { key: 'savedAmount', name: 'Économies', color: '#10B981' }
                    ]}
                    height={300}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Vue Gestion des Paiements */}
      {selectedView === 'payments' && (
        <div className="space-y-6">
          {/* 3.2.2 Proposition automatique de paiements optimisés */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Banknote className="h-5 w-5 mr-2" />
                  Propositions de Paiement Intelligentes
                </span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {paymentOptimization?.smartProposals?.length || 0} proposition(s)
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurer
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentLoading ? (
                <LoadingSpinner text="Calcul optimisations..." />
              ) : (
                <div className="space-y-4">
                  {/* Résumé des économies possibles */}
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800">Économies Potentielles</p>
                      <p className="text-xl font-bold text-green-900">
                        {formatCurrency(paymentOptimization?.totalPotentialSavings || 0)}
                      </p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-blue-800">Montant à Payer</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(paymentOptimization?.totalPaymentAmount || 0)}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm font-medium text-purple-800">ROI Optimisation</p>
                      <p className="text-xl font-bold text-purple-900">
                        {formatPercent(paymentOptimization?.optimizationROI || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Liste des propositions */}
                  <div className="space-y-3">
                    {paymentOptimization?.smartProposals?.map((proposal, index) => (
                      <div key={index} className={`
                        p-4 border rounded-lg 
                        ${proposal.priority === 'HIGH' ? 'border-green-300 bg-green-50' :
                          proposal.priority === 'MEDIUM' ? 'border-blue-300 bg-blue-50' :
                          'border-gray-300 bg-gray-50'}
                      `}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Badge className={`
                              ${proposal.type === 'EARLY_PAYMENT' ? 'bg-green-100 text-green-800' :
                                proposal.type === 'GROUPED_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                                'bg-purple-100 text-purple-800'}
                            `}>
                              {proposal.type === 'EARLY_PAYMENT' ? 'Escompte' :
                               proposal.type === 'GROUPED_PAYMENT' ? 'Groupé' : 'Optimisé'}
                            </Badge>
                            <div>
                              <p className="font-medium">{proposal.supplierName}</p>
                              <p className="text-sm text-gray-600">{proposal.optimization}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600">
                              {formatCurrency(proposal.totalAmount)}
                            </p>
                            {proposal.discountAmount && (
                              <p className="text-sm text-green-600 font-medium">
                                Économie: {formatCurrency(proposal.discountAmount)}
                              </p>
                            )}
                            <div className="flex space-x-2 mt-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleExecutePayment(proposal.id)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Exécuter
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3.2.2 Simulation d'impact trésorerie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Impact Trésorerie - Simulation 30 Jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={paymentOptimization?.cashFlowSimulation || []}
                xAxisKey="date"
                lines={[
                  { key: 'plannedOutflow', name: 'Sorties planifiées', color: '#EF4444' },
                  { key: 'optimizedOutflow', name: 'Sorties optimisées', color: '#10B981' },
                  { key: 'cashPosition', name: 'Position trésorerie', color: '#3B82F6' }
                ]}
                height={300}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Performance Fournisseurs */}
      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* 3.2.3 Scoring et évaluation continue */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribution des Performances</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart
                  data={performanceData?.ratingDistribution || []}
                  dataKey="count"
                  nameKey="rating"
                  height={300}
                  colors={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performers vs Attention Requise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Top Performers */}
                  <div>
                    <h4 className="font-medium text-green-800 mb-3 flex items-center">
                      <Award className="h-4 w-4 mr-2" />
                      Top Performers
                    </h4>
                    <div className="space-y-2">
                      {performanceData?.topPerformers?.map((supplier, index) => (
                        <div key={supplier.code} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="font-medium">{supplier.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-green-700">
                              {supplier.score}/100
                            </span>
                            <Badge className="bg-green-100 text-green-800">A</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Attention Requise */}
                  <div>
                    <h4 className="font-medium text-red-800 mb-3 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Attention Requise
                    </h4>
                    <div className="space-y-2">
                      {performanceData?.requiresAttention?.map((supplier, index) => (
                        <div key={supplier.code} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="font-medium">{supplier.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-red-700">
                              {supplier.score}/100
                            </span>
                            <Badge className="bg-red-100 text-red-800">
                              {supplier.rating}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Métriques de conformité détaillées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileCheck className="h-5 w-5 mr-2" />
                Conformité et Traitement des Factures
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatPercent(kpiData?.conformityRate || 0)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Factures Conformes</p>
                  <Progress value={kpiData?.conformityRate || 0} className="mt-2" />
                </div>
                
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {kpiData?.processingTime || 0}h
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Délai Moyen</p>
                  <Progress value={Math.min(100, (24 - kpiData?.processingTime) / 24 * 100)} className="mt-2" />
                </div>
                
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercent(kpiData?.automationRate || 0)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Automatisation</p>
                  <Progress value={kpiData?.automationRate || 0} className="mt-2" />
                </div>
                
                <div className="text-center p-4">
                  <div className="text-2xl font-bold text-indigo-600">
                    {formatPercent(kpiData?.contractCompliance || 0)}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Respect Contrats</p>
                  <Progress value={kpiData?.contractCompliance || 0} className="mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue Optimisation */}
      {selectedView === 'optimization' && (
        <div className="space-y-6">
          {/* Opportunités d'escompte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Opportunités d'Escompte
                </span>
                <Badge variant="outline">
                  {paymentOptimization?.discountOpportunities?.length || 0} opportunité(s)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Taux Escompte</TableHead>
                      <TableHead>Économie</TableHead>
                      <TableHead>Recommandation</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentOptimization?.discountOpportunities?.map((opportunity, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {opportunity.supplierName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {opportunity.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <span className={`
                            ${opportunity.daysUntilDue <= 3 ? 'text-red-600' :
                              opportunity.daysUntilDue <= 7 ? 'text-yellow-600' :
                              'text-green-600'}
                          `}>
                            {formatDate(opportunity.dueDate)}
                          </span>
                          <p className="text-xs text-gray-500">
                            {opportunity.daysUntilDue}j restants
                          </p>
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatCurrency(opportunity.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">
                            {opportunity.discountRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          {formatCurrency(opportunity.potentialSavings)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${opportunity.recommendation === 'PAY_EARLY' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'}
                          `}>
                            {opportunity.recommendation === 'PAY_EARLY' ? 'Payer maintenant' : 'Évaluer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              disabled={opportunity.recommendation !== 'PAY_EARLY'}
                            >
                              <Zap className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Concentration fournisseurs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Concentration Fournisseurs (Dépendance)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <BarChart
                    data={supplierAnalytics?.concentrationData || []}
                    xAxisKey="supplierName"
                    bars={[
                      { key: 'percentage', name: 'Part des achats (%)', color: '#8B5CF6' }
                    ]}
                    height={250}
                  />
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Analyse de Risque</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Top 3: {formatPercent(supplierAnalytics?.top3Concentration || 0)} des achats</li>
                      <li>• Top 10: {formatPercent(supplierAnalytics?.top10Concentration || 0)} des achats</li>
                      <li>• Niveau de risque: {supplierAnalytics?.concentrationRisk || 'Modéré'}</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Recommandations</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {supplierAnalytics?.recommendations?.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertes système */}
      {(kpiData?.alerts?.contractExpiringSoon > 0 || 
        kpiData?.alerts?.blockedSuppliers > 0 ||
        kpiData?.alerts?.overdueEvaluations > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-800">
              <AlertCircle className="h-5 w-5 mr-2" />
              Alertes Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {kpiData.alerts.contractExpiringSoon > 0 && (
                <div className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded">
                  <span className="text-sm">Contrats expirant</span>
                  <Badge className="bg-orange-100 text-orange-800">
                    {kpiData.alerts.contractExpiringSoon}
                  </Badge>
                </div>
              )}
              
              {kpiData.alerts.blockedSuppliers > 0 && (
                <div className="flex items-center justify-between p-3 bg-white border border-red-200 rounded">
                  <span className="text-sm">Fournisseurs bloqués</span>
                  <Badge className="bg-red-100 text-red-800">
                    {kpiData.alerts.blockedSuppliers}
                  </Badge>
                </div>
              )}
              
              {kpiData.alerts.overdueEvaluations > 0 && (
                <div className="flex items-center justify-between p-3 bg-white border border-yellow-200 rounded">
                  <span className="text-sm">Évaluations en retard</span>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {kpiData.alerts.overdueEvaluations}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer statistiques */}
      <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
        <div className="flex items-center space-x-4">
          <span>Dernière maj: {formatDate(new Date())}</span>
          <span>•</span>
          <span>{kpiData?.totalSuppliers || 0} fournisseurs actifs</span>
          <span>•</span>
          <span>DPO global: {kpiData?.dpo || 0} jours</span>
          {autoRefresh && (
            <>
              <span>•</span>
              <span className="text-green-600">Mise à jour auto</span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Système opérationnel</span>
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;