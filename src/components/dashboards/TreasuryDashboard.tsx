/**
 * Dashboard Trésorerie Temps Réel
 * Position multi-banques, appels de fonds et prévisions selon EXF-TR-003
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Shield,
  BarChart3,
  LineChart as LineChartIcon,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Eye,
  Settings,
  Download,
  Phone,
  Mail,
  FileText,
  Calendar
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
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui';
import { LineChart, BarChart, PieChart } from '../charts';
import { treasuryService } from '../../services/treasury.service';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface TreasuryDashboardProps {
  companyId: string;
  fiscalYearId?: string;
  className?: string;
}

const TreasuryDashboard: React.FC<TreasuryDashboardProps> = ({
  companyId,
  fiscalYearId,
  className = ''
}) => {
  const { t } = useLanguage();
  // États
  const [forecastPeriod, setForecastPeriod] = useState('30');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedView, setSelectedView] = useState<'position' | 'flows' | 'fund_calls' | 'analytics'>('position');
  
  // Queries principales avec auto-refresh
  const { data: treasuryPosition, isLoading: positionLoading, refetch: refetchPosition } = useQuery({
    queryKey: ['treasury-position', companyId],
    queryFn: () => treasuryService.getRealtimeTreasuryPosition({ companyId }),
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute pour temps réel
  });

  const { data: cashFlowForecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['cash-flow-forecast', companyId, forecastPeriod],
    queryFn: () => treasuryService.getCashFlowForecast({ 
      companyId, 
      forecastDays: parseInt(forecastPeriod) 
    }),
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
  });

  const { data: fundCallsDashboard, isLoading: fundCallsLoading } = useQuery({
    queryKey: ['fund-calls-dashboard', companyId],
    queryFn: () => treasuryService.getFundCallsDashboard({ companyId }),
    refetchInterval: autoRefresh ? 120000 : false, // 2 minutes
  });

  const { data: performanceMetrics } = useQuery({
    queryKey: ['treasury-performance', companyId],
    queryFn: () => treasuryService.getPerformanceMetrics({ companyId }),
  });

  const { data: bankConnections } = useQuery({
    queryKey: ['bank-connections', companyId],
    queryFn: () => treasuryService.getBankConnections({ companyId }),
  });

  // Mutation pour actions de trésorerie
  const executeFundCallMutation = useMutation({
    mutationFn: treasuryService.executeFundCall,
    onSuccess: () => {
      toast.success('Appel de fonds envoyé aux contributeurs');
      refetchPosition();
    }
  });

  // KPIs position temps réel
  const positionKPIs = useMemo(() => {
    if (!treasuryPosition) return [];

    const summary = treasuryPosition.summary;
    
    return [
      {
        title: 'Position Actuelle',
        value: formatCurrency(summary.current_position),
        subValue: `${summary.accounts_count} compte(s)`,
        icon: Wallet,
        color: summary.current_position >= 0 ? 'green' : 'red',
        trend: summary.net_change_today >= 0 ? 'up' : 'down',
        change: summary.net_change_today,
      },
      {
        title: 'Disponible Total',
        value: formatCurrency(summary.total_available),
        subValue: 'Incluant découverts',
        icon: CreditCard,
        color: 'blue',
        trend: 'neutral',
        change: 0,
      },
      {
        title: 'Flux du Jour',
        value: formatCurrency(Math.abs(summary.net_change_today)),
        subValue: summary.net_change_today >= 0 ? 'Entrée nette' : 'Sortie nette',
        icon: summary.net_change_today >= 0 ? ArrowUpCircle : ArrowDownCircle,
        color: summary.net_change_today >= 0 ? 'green' : 'red',
        trend: summary.net_change_today >= 0 ? 'up' : 'down',
        change: 0,
      },
      {
        title: 'Position 7 Jours',
        value: formatCurrency(summary.forecast_7d_position),
        subValue: 'Prévision rolling',
        icon: Target,
        color: summary.forecast_7d_position >= 0 ? 'green' : 'red',
        trend: summary.forecast_7d_position > summary.current_position ? 'up' : 'down',
        change: 0,
      }
    ];
  }, [treasuryPosition]);

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)] border-red-300';
      case 'WARNING': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)] border-orange-300';
      case 'INFO': return 'bg-[#ECECEC] text-[#6A8A82] border-[#ECECEC]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)] border-[var(--color-border-dark)]';
    }
  };

  const handleExecuteFundCall = (fundCallId: string) => {
    executeFundCallMutation.mutate({ fundCallId, companyId });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec statut temps réel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-lg font-bold text-[#191919]">
              Dashboard Trésorerie
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-[#191919]/70">Temps réel</span>
              </div>
              <span className="text-[var(--color-text-secondary)]">•</span>
              <span className="text-sm text-[#191919]/50">
                Dernière maj: {treasuryPosition?.last_update && formatDate(new Date(treasuryPosition.last_update))}
              </span>
              {treasuryPosition?.performance_ms && (
                <>
                  <span className="text-[var(--color-text-secondary)]">•</span>
                  <span className="text-sm text-[#191919]/50">
                    {treasuryPosition.performance_ms}ms
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-[#F0F3F2] border-[#6A8A82]' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Manuel'}
          </Button>
          
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {treasuryPosition?.alerts?.length > 0 && (
        <Card className="border-[var(--color-error-light)] bg-[var(--color-error-lightest)]">
          <CardHeader>
            <CardTitle className="flex items-center text-[var(--color-error-darker)]">
              <AlertTriangle className="h-5 w-5 mr-2 animate-pulse" />
              Alertes Trésorerie ({treasuryPosition.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {treasuryPosition.alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded border ${getAlertSeverityColor(alert.severity)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      {alert.account && (
                        <p className="text-sm opacity-75">Compte: {alert.account}</p>
                      )}
                    </div>
                    <Button size="sm" variant="outline">
                      Traiter
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation des vues */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="position">Position Temps Réel</TabsTrigger>
          <TabsTrigger value="flows">Flux & Prévisions</TabsTrigger>
          <TabsTrigger value="fund_calls">Appels de Fonds</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Vue Position Temps Réel */}
        <TabsContent value="position" className="space-y-6">
          {/* KPIs Position */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {positionLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <LoadingSpinner size="sm" text="Position..." />
                  </CardContent>
                </Card>
              ))
            ) : (
              positionKPIs.map((kpi, index) => {
                const Icon = kpi.icon;
                const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Target;
                
                return (
                  <Card key={index} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full bg-[#ECECEC]`}>
                            <Icon className={`h-6 w-6 text-[#6A8A82]`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#191919]/70">{kpi.title}</p>
                            <p className="text-lg font-bold text-[#191919]">{kpi.value}</p>
                            <p className="text-xs text-[#191919]/50">{kpi.subValue}</p>
                          </div>
                        </div>
                        {kpi.trend !== 'neutral' && (
                          <div className="text-right">
                            <TrendIcon className={`h-4 w-4 ${kpi.color === 'green' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`} />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Détail des comptes bancaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Banknote className="h-5 w-5 mr-2" />
                  Comptes Bancaires ({treasuryPosition?.accounts_detail?.length || 0})
                </span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {treasuryPosition?.summary?.currencies_count || 0} devise(s)
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Gérer
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accounting.account')}</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead className="text-right">Solde Actuel</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">Entrées Jour</TableHead>
                      <TableHead className="text-right">Sorties Jour</TableHead>
                      <TableHead className="text-right">Prév. 7j</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treasuryPosition?.accounts_detail?.map((account, index) => (
                      <TableRow key={index} className="hover:bg-[var(--color-background-secondary)]">
                        <TableCell>
                          <div>
                            <p className="font-medium">{account.label}</p>
                            <p className="text-sm text-[#191919]/50 font-mono">{account.account_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{account.bank_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {account.currency}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          account.current_balance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                        }`}>
                          {formatCurrency(account.current_balance)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[#6A8A82]">
                          {formatCurrency(account.available_balance)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[var(--color-success)]">
                          +{formatCurrency(account.inflows_today)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[var(--color-error)]">
                          -{formatCurrency(account.outflows_today)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          account.forecast_7d_inflows - account.forecast_7d_outflows >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                        }`}>
                          {account.forecast_7d_inflows - account.forecast_7d_outflows >= 0 ? '+' : ''}
                          {formatCurrency(account.forecast_7d_inflows - account.forecast_7d_outflows)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${account.balance_status === 'OK' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' : 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'}
                          `}>
                            {account.balance_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <BarChart3 className="h-3 w-3" />
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
        </TabsContent>

        {/* Vue Flux & Prévisions */}
        <TabsContent value="flows" className="space-y-6">
          {/* Graphique évolution position */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChartIcon className="h-5 w-5 mr-2" />
                Évolution Position de Trésorerie ({forecastPeriod} jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {forecastLoading ? (
                <LoadingSpinner text="Génération prévisions..." />
              ) : (
                <LineChart
                  data={cashFlowForecast?.detailed_forecast?.daily_breakdown || []}
                  xAxisKey="date"
                  lines={[
                    { key: 'receivables_inflow', name: 'Encaissements', color: "var(--color-success)" },
                    { key: 'payables_outflow', name: 'Décaissements', color: "var(--color-error)" },
                    { key: 'cumulative_balance', name: 'Position cumulative', color: "var(--color-primary)" }
                  ]}
                  height={400}
                />
              )}
            </CardContent>
          </Card>

          {/* Répartition des flux */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[var(--color-success-dark)]">
                  <ArrowUpCircle className="h-5 w-5 mr-2" />
                  Encaissements Prévus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <span className="font-medium">Paiements clients</span>
                    <span className="font-bold text-[var(--color-success)]">
                      {formatCurrency(cashFlowForecast?.expected_receivables || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <span className="font-medium">Appels de fonds</span>
                    <span className="font-bold text-[var(--color-success)]">
                      {formatCurrency(fundCallsDashboard?.summary?.total_amount_called - fundCallsDashboard?.summary?.total_amount_received || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <span className="font-medium">Autres entrées</span>
                    <span className="font-bold text-[var(--color-success)]">
                      {formatCurrency(cashFlowForecast?.other_inflows || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-[var(--color-error-dark)]">
                  <ArrowDownCircle className="h-5 w-5 mr-2" />
                  Décaissements Prévus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <span className="font-medium">Paiements fournisseurs</span>
                    <span className="font-bold text-[var(--color-error)]">
                      {formatCurrency(cashFlowForecast?.expected_payables || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <span className="font-medium">Salaires & charges</span>
                    <span className="font-bold text-[var(--color-error)]">
                      {formatCurrency(cashFlowForecast?.other_outflows || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <span className="font-medium">Taxes & impôts</span>
                    <span className="font-bold text-[var(--color-error)]">
                      {formatCurrency(0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vue Appels de Fonds */}
        <TabsContent value="fund_calls" className="space-y-6">
          {/* Résumé appels de fonds */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-lg font-bold text-[#6A8A82]">
                  {fundCallsDashboard?.summary?.active_calls || 0}
                </div>
                <p className="text-sm text-[#191919]/70">Appels actifs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-lg font-bold text-[#6A8A82]">
                  {formatCurrency(fundCallsDashboard?.summary?.total_amount_called || 0)}
                </div>
                <p className="text-sm text-[#191919]/70">Montant total appelé</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-lg font-bold text-[var(--color-success)]">
                  {formatCurrency(fundCallsDashboard?.summary?.total_amount_received || 0)}
                </div>
                <p className="text-sm text-[#191919]/70">Montant reçu</p>
                <Progress 
                  value={
                    fundCallsDashboard?.summary?.total_amount_called > 0 
                      ? (fundCallsDashboard.summary.total_amount_received / fundCallsDashboard.summary.total_amount_called * 100)
                      : 0
                  } 
                  className="mt-2"
                />
              </CardContent>
            </Card>
          </div>

          {/* Liste des appels de fonds actifs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Appels de Fonds en Cours</span>
                <Button className="bg-[#B87333] hover:bg-[#A66B2A] text-white">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Nouvel Appel
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fundCallsLoading ? (
                <LoadingSpinner text="Chargement appels de fonds..." />
              ) : (
                <div className="space-y-4">
                  {fundCallsDashboard?.calls_detail?.map((call, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-[var(--color-background-secondary)]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={`
                            ${call.urgency_level === 'CRITICAL' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]' :
                              call.urgency_level === 'HIGH' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]' :
                              'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'}
                          `}>
                            {call.urgency_level}
                          </Badge>
                          <div>
                            <p className="font-bold text-lg">{call.title}</p>
                            <p className="text-sm text-[#191919]/70">
                              Réf: {call.call_reference} •
                              Échéance: {call.days_until_deadline}j
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#6A8A82]">
                            {formatCurrency(call.amount_needed)}
                          </p>
                          <p className="text-sm text-[var(--color-success)]">
                            Reçu: {formatCurrency(call.amount_received)} ({call.funding_rate}%)
                          </p>
                        </div>
                      </div>

                      {/* Détail contributeurs */}
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {call.contributors.map((contributor, idx) => (
                          <div key={idx} className="p-2 border rounded bg-white">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{contributor.name}</p>
                                <p className="text-xs text-[#191919]/50">
                                  {contributor.percentage}% • {formatCurrency(contributor.allocated)}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={`text-xs ${
                                  contributor.status === 'FULLY_PAID' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                                  contributor.status === 'PARTIALLY_PAID' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                                  contributor.status === 'OVERDUE' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]' :
                                  'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                                }`}>
                                  {contributor.rate}%
                                </Badge>
                              </div>
                            </div>
                            <Progress value={contributor.rate} className="mt-1 h-1" />
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end space-x-2 mt-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Détail
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Relancer
                        </Button>
                        {call.status === 'APPROVED' && (
                          <Button 
                            size="sm" 
                            className="bg-[var(--color-success)] hover:bg-[var(--color-success-dark)] text-white"
                            onClick={() => handleExecuteFundCall(call.call_reference)}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Envoyer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Performance vs Objectifs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Performance vs Objectifs Cahier des Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {performanceMetrics?.metrics_detail && Object.entries(performanceMetrics.metrics_detail).map(([key, metric]) => (
                  <div key={key} className="p-4 border rounded-lg">
                    <h4 className="font-medium text-[#191919] mb-2">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Actuel:</span>
                        <span className="font-mono">{metric.current}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Objectif:</span>
                        <span className="font-mono">{metric.target}</span>
                      </div>
                      <Progress value={Math.min(100, metric.score)} className="h-2" />
                      <div className="text-center">
                        <Badge className={`
                          ${metric.status === 'EXCELLENT' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                            metric.status === 'GOOD' ? 'bg-[#ECECEC] text-[#6A8A82]' :
                            'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]'}
                        `}>
                          {metric.status} ({metric.score.toFixed(0)}%)
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-[#ECECEC] border border-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-[#6A8A82]">Score Global de Performance</h3>
                    <p className="text-sm text-[#6A8A82]">
                      {performanceMetrics?.targets_met || 0} objectifs atteints sur {performanceMetrics?.total_metrics || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#6A8A82]">
                      {(performanceMetrics?.overall_performance_score || 0).toFixed(1)}%
                    </div>
                    <Badge className={`
                      ${performanceMetrics?.overall_status === 'EXCELLENT' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                        performanceMetrics?.overall_status === 'GOOD' ? 'bg-[#ECECEC] text-[#6A8A82]' :
                        'bg-[var(--color-warning-lighter)] text-[var(--color-warning-darker)]'}
                    `}>
                      {performanceMetrics?.overall_status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Connexions bancaires */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                État des Connexions Bancaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {bankConnections?.connections?.map((connection, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{connection.bank_name}</h4>
                      <Badge className={`
                        ${connection.status === 'ACTIVE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          connection.status === 'ERROR' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]' :
                          'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]'}
                      `}>
                        {connection.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Protocole:</span>
                        <span className="font-mono">{connection.protocol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dernière sync:</span>
                        <span>{formatDate(connection.last_sync)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taux succès:</span>
                        <span className="font-bold text-[var(--color-success)]">
                          {formatPercent(connection.success_rate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TreasuryDashboard;