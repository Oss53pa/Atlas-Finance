/**
 * Panneau de Prévisions de Trésorerie Unifié
 * Consolidation créances/dettes selon section 4.2
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  LineChart as LineChartIcon,
  Target,
  Zap,
  Eye,
  Download,
  Settings,
  Lightbulb
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
import { LineChart, BarChart } from '../charts';
import { reconciliationService } from '../../services';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface TreasuryForecastPanelProps {
  companyId: string;
  fiscalYearId?: string;
  className?: string;
}

interface CashFlowData {
  date: string;
  receivables_inflow: number;
  payables_outflow: number;
  net_cash_flow: number;
  cumulative_position: number;
  confidence_level: number;
}

interface ScenarioData {
  name: string;
  probability: number;
  cash_position_30d: number;
  receivables_forecast: number;
  payables_forecast: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const TreasuryForecastPanel: React.FC<TreasuryForecastPanelProps> = ({
  companyId,
  fiscalYearId,
  className = ''
}) => {
  // États
  const [forecastPeriod, setForecastPeriod] = useState('30');
  const [selectedScenario, setSelectedScenario] = useState<'optimistic' | 'realistic' | 'pessimistic'>('realistic');
  const [showWhatIf, setShowWhatIf] = useState(false);

  // Queries
  const { data: cashFlowForecast, isLoading: forecastLoading, refetch } = useQuery({
    queryKey: ['cash-flow-forecast', companyId, forecastPeriod],
    queryFn: () => reconciliationService.getCashFlowForecast({
      companyId,
      forecastDays: parseInt(forecastPeriod),
      includeScenarios: true
    }),
    refetchInterval: 300000, // 5 minutes
  });

  const { data: whatIfScenarios, isLoading: scenariosLoading } = useQuery({
    queryKey: ['what-if-scenarios', companyId, selectedScenario],
    queryFn: () => reconciliationService.runWhatIfScenario({
      companyId,
      scenarioType: selectedScenario,
      assumptions: {
        customerCollectionRate: selectedScenario === 'optimistic' ? 95 : selectedScenario === 'realistic' ? 85 : 70,
        supplierPaymentDelay: selectedScenario === 'optimistic' ? 30 : selectedScenario === 'realistic' ? 45 : 60,
        newSalesGrowth: selectedScenario === 'optimistic' ? 10 : selectedScenario === 'realistic' ? 5 : 0
      }
    }),
    enabled: showWhatIf,
  });

  const { data: treasuryAlerts } = useQuery({
    queryKey: ['treasury-alerts', companyId],
    queryFn: () => reconciliationService.getTreasuryAlerts({ companyId }),
    refetchInterval: 60000, // 1 minute pour alertes
  });

  // Calculs dérivés
  const forecastSummary = useMemo(() => {
    if (!cashFlowForecast?.daily_forecast) return null;

    const data = cashFlowForecast.daily_forecast as CashFlowData[];
    
    const totalInflows = data.reduce((sum, day) => sum + day.receivables_inflow, 0);
    const totalOutflows = data.reduce((sum, day) => sum + day.payables_outflow, 0);
    const netCashFlow = totalInflows - totalOutflows;
    const finalPosition = data[data.length - 1]?.cumulative_position || 0;
    
    const criticalDays = data.filter(day => day.cumulative_position < 0).length;
    const averageConfidence = data.reduce((sum, day) => sum + day.confidence_level, 0) / data.length;

    return {
      totalInflows,
      totalOutflows,
      netCashFlow,
      finalPosition,
      criticalDays,
      averageConfidence,
      riskLevel: finalPosition < 0 ? 'HIGH' : criticalDays > 3 ? 'MEDIUM' : 'LOW'
    };
  }, [cashFlowForecast]);

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const handleExportForecast = (format: 'excel' | 'pdf') => {
    reconciliationService.exportData({
      companyId,
      dataType: 'treasury',
      format,
      filters: { forecastPeriod, scenario: selectedScenario }
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header avec contrôles */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Prévisions de Trésorerie Consolidées
          </h2>
          <p className="text-gray-600">
            Cash-flow prévisionnel avec analyse de scénarios
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 jours</SelectItem>
              <SelectItem value="30">30 jours</SelectItem>
              <SelectItem value="90">90 jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowWhatIf(!showWhatIf)}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Scénarios What-If
          </Button>
          
          <Button variant="outline" size="sm" onClick={() => handleExportForecast('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alertes de tension trésorerie */}
      {treasuryAlerts?.criticalAlerts?.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Alertes Trésorerie Critiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {treasuryAlerts.criticalAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-red-200 rounded">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-red-100 text-red-800">
                      {alert.severity}
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
                    <p className="text-xs text-red-500">
                      Échéance: {formatDate(alert.dueDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résumé consolidé */}
      {forecastSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Encaissements Prévus</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(forecastSummary.totalInflows)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingDown className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Décaissements Prévus</span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(forecastSummary.totalOutflows)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Cash Flow Net</span>
              </div>
              <div className={`text-xl font-bold ${forecastSummary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {forecastSummary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(forecastSummary.netCashFlow)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Position Finale</span>
              </div>
              <div className={`text-xl font-bold ${forecastSummary.finalPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(forecastSummary.finalPosition)}
              </div>
              <div className="mt-1">
                <Progress 
                  value={forecastSummary.averageConfidence} 
                  className="h-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Confiance: {forecastSummary.averageConfidence.toFixed(0)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graphique principal des flux de trésorerie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <LineChartIcon className="h-5 w-5 mr-2" />
              Évolution Position de Trésorerie ({forecastPeriod} jours)
            </span>
            <Badge className={`${getAlertColor(forecastSummary?.riskLevel || 'LOW')}`}>
              Risque: {forecastSummary?.riskLevel || 'LOW'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {forecastLoading ? (
            <LoadingSpinner text="Calcul prévisions..." />
          ) : (
            <LineChart
              data={cashFlowForecast?.daily_forecast || []}
              xAxisKey="date"
              lines={[
                { key: 'receivables_inflow', name: 'Encaissements clients', color: '#10B981' },
                { key: 'payables_outflow', name: 'Paiements fournisseurs', color: '#EF4444' },
                { key: 'cumulative_position', name: 'Position cumulative', color: '#3B82F6' }
              ]}
              height={350}
            />
          )}
        </CardContent>
      </Card>

      {/* Onglets d'analyse détaillée */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="breakdown">Décomposition</TabsTrigger>
          <TabsTrigger value="scenarios">Scénarios</TabsTrigger>
          <TabsTrigger value="risks">Analyse Risques</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Décomposition des flux */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Encaissements prévisionnels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Encaissements Clients Prévus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cashFlowForecast?.receivables_breakdown?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900">{item.customer_name}</p>
                        <p className="text-sm text-green-700">
                          {item.invoice_count} facture(s) • Échéance: {formatDate(item.expected_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">
                          {formatCurrency(item.amount)}
                        </p>
                        <div className="flex items-center space-x-1 mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            item.probability > 80 ? 'bg-green-400' :
                            item.probability > 60 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}></div>
                          <span className="text-xs text-gray-500">
                            {item.probability}% confiance
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Décaissements prévisionnels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <TrendingDown className="h-5 w-5 mr-2" />
                  Paiements Fournisseurs Prévus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cashFlowForecast?.payables_breakdown?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-red-900">{item.supplier_name}</p>
                        <p className="text-sm text-red-700">
                          {item.invoice_count} facture(s) • Échéance: {formatDate(item.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">
                          {formatCurrency(item.amount)}
                        </p>
                        {item.discount_available && (
                          <p className="text-xs text-green-600">
                            Escompte: -{formatCurrency(item.discount_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scénarios What-If */}
        <TabsContent value="scenarios" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Analyse de Scénarios</h3>
            <Select value={selectedScenario} onValueChange={(v: any) => setSelectedScenario(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="optimistic">Optimiste</SelectItem>
                <SelectItem value="realistic">Réaliste</SelectItem>
                <SelectItem value="pessimistic">Pessimiste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scenariosLoading ? (
            <LoadingSpinner text="Simulation des scénarios..." />
          ) : whatIfScenarios && (
            <div className="grid gap-4 md:grid-cols-3">
              {(['optimistic', 'realistic', 'pessimistic'] as const).map((scenario) => {
                const data = whatIfScenarios[scenario] as ScenarioData;
                const isSelected = selectedScenario === scenario;
                
                return (
                  <Card 
                    key={scenario}
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 capitalize mb-2">
                          {scenario === 'optimistic' ? 'Optimiste' : 
                           scenario === 'realistic' ? 'Réaliste' : 'Pessimiste'}
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Position 30j</p>
                            <p className={`text-lg font-bold ${
                              data?.cash_position_30d >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(data?.cash_position_30d || 0)}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            <p>Probabilité: {data?.probability || 0}%</p>
                          </div>
                        </div>
                        <Badge className={`mt-2 ${getAlertColor(data?.risk_level || 'LOW')}`}>
                          {data?.risk_level || 'LOW'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Analyse des risques */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Matrice des Risques Trésorerie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Risques clients */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Risques Encaissements</h4>
                  {cashFlowForecast?.receivables_risks?.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{risk.customer_name}</p>
                        <p className="text-sm text-gray-600">{risk.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getAlertColor(risk.risk_level)}>
                          {risk.risk_level}
                        </Badge>
                        <p className="text-sm font-bold text-red-600 mt-1">
                          {formatCurrency(risk.amount_at_risk)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Risques fournisseurs */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800">Risques Décaissements</h4>
                  {cashFlowForecast?.payables_risks?.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{risk.supplier_name}</p>
                        <p className="text-sm text-gray-600">{risk.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getAlertColor(risk.urgency_level)}>
                          {risk.urgency_level}
                        </Badge>
                        <p className="text-sm font-bold text-red-600 mt-1">
                          {formatCurrency(risk.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions recommandées */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Actions Recommandées pour Optimisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Actions côté clients */}
                <div>
                  <h4 className="font-medium text-green-800 mb-3">Accélération Encaissements</h4>
                  <div className="space-y-3">
                    {cashFlowForecast?.recommended_actions?.customer_actions?.map((action, index) => (
                      <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">{action.title}</p>
                            <p className="text-sm text-green-700">{action.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">
                              +{formatCurrency(action.potential_impact)}
                            </p>
                            <Button size="sm" variant="outline" className="mt-1">
                              Exécuter
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions côté fournisseurs */}
                <div>
                  <h4 className="font-medium text-blue-800 mb-3">Optimisation Décaissements</h4>
                  <div className="space-y-3">
                    {cashFlowForecast?.recommended_actions?.supplier_actions?.map((action, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-900">{action.title}</p>
                            <p className="text-sm text-blue-700">{action.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-blue-600">
                              Économie: {formatCurrency(action.savings_potential)}
                            </p>
                            <Button size="sm" variant="outline" className="mt-1">
                              Configurer
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Métriques de performance globales */}
      <Card>
        <CardHeader>
          <CardTitle>Performance vs. Objectifs Cahier des Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-600">Temps Génération Prévisions</p>
              <p className="text-xl font-bold text-blue-600">
                {cashFlowForecast?.performance_metrics?.generation_time_ms || 0}ms
              </p>
              <p className="text-xs text-gray-500">
                Objectif: &lt; 2000ms {(cashFlowForecast?.performance_metrics?.generation_time_ms || 0) < 2000 ? '✓' : '✗'}
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-600">Précision Prévisions</p>
              <p className="text-xl font-bold text-green-600">
                {formatPercent(cashFlowForecast?.performance_metrics?.forecast_accuracy || 0)}
              </p>
              <p className="text-xs text-gray-500">
                Objectif: &gt; 85% {(cashFlowForecast?.performance_metrics?.forecast_accuracy || 0) > 85 ? '✓' : '✗'}
              </p>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm font-medium text-gray-600">Couverture Données</p>
              <p className="text-xl font-bold text-purple-600">
                {formatPercent(cashFlowForecast?.performance_metrics?.data_coverage || 0)}
              </p>
              <p className="text-xs text-gray-500">
                Clients + Fournisseurs intégrés
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TreasuryForecastPanel;