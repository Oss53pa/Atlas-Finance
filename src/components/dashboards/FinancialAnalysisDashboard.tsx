/**
 * Dashboard Analyse Financière Avancée Atlas Finance
 * TAFIRE, SIG et ratios SYSCOHADA selon EXF-AF-001 à EXF-AF-007
 */
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Calculator,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Percent,
  Clock,
  Download,
  RefreshCw,
  Eye,
  Settings,
  Gauge
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
  TabsTrigger,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../ui';
import { LineChart, BarChart, PieChart } from '../charts';
import { dashboardService } from '../../services/dashboard.service';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface FinancialAnalysisDashboardProps {
  companyId: string;
  fiscalYearId?: string;
  className?: string;
}

const FinancialAnalysisDashboard: React.FC<FinancialAnalysisDashboardProps> = ({
  companyId,
  fiscalYearId,
  className = ''
}) => {
  const { t } = useLanguage();
  // États
  const [selectedView, setSelectedView] = useState<'tafire' | 'sig' | 'ratios' | 'comparative'>('tafire');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous_year');

  // Queries
  const { data: tafireData, isLoading: tafireLoading } = useQuery({
    queryKey: ['tafire-statement', companyId, fiscalYearId],
    queryFn: () => financialAnalysisService.getTAFIREStatement({ companyId, fiscalYearId }),
  });

  const { data: sigData, isLoading: sigLoading } = useQuery({
    queryKey: ['sig-statement', companyId, fiscalYearId],
    queryFn: () => financialAnalysisService.getSIGStatement({ companyId, fiscalYearId }),
  });

  const { data: ratiosData, isLoading: ratiosLoading } = useQuery({
    queryKey: ['financial-ratios', companyId, fiscalYearId],
    queryFn: () => financialAnalysisService.getFinancialRatios({ companyId, fiscalYearId }),
  });

  const { data: benchmarkData } = useQuery({
    queryKey: ['sector-benchmark', companyId],
    queryFn: () => financialAnalysisService.getSectorBenchmark({ companyId }),
  });

  // Données dérivées pour graphiques
  const waterfallData = useMemo(() => {
    if (!tafireData) return [];

    return [
      { name: 'Trésorerie Ouverture', value: tafireData.opening_cash_balance, type: 'start' },
      { name: 'Flux Exploitation', value: tafireData.operating_cash_surplus, type: 'flow' },
      { name: 'Flux Investissement', value: tafireData.investment_cash_flow, type: 'flow' },
      { name: 'Flux Financement', value: tafireData.financing_cash_flow, type: 'flow' },
      { name: 'Trésorerie Clôture', value: tafireData.closing_cash_balance, type: 'end' }
    ];
  }, [tafireData]);

  const sigCascadeData = useMemo(() => {
    if (!sigData) return [];

    return [
      { name: 'CA', value: sigData.revenue_base, color: "var(--color-primary)" },
      { name: 'Marge Commerciale', value: sigData.commercial_margin, color: "var(--color-success)" },
      { name: 'Production', value: sigData.period_production, color: "var(--color-info)" },
      { name: 'Valeur Ajoutée', value: sigData.added_value, color: "var(--color-warning)" },
      { name: 'EBE', value: sigData.gross_operating_surplus, color: "var(--color-error)" },
      { name: 'Résultat Exploitation', value: sigData.operating_result, color: '#06B6D4' },
      { name: 'Résultat Net', value: sigData.final_net_result, color: '#84CC16' }
    ];
  }, [sigData]);

  const getRatioStatusColor = (ratio: any) => {
    if (!ratio.benchmark_value) return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
    
    const performance = ratio.performance_vs_benchmark;
    if (performance >= 20) return 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]';
    if (performance >= 0) return 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]';
    if (performance >= -20) return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
    return 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#171717]">
            Analyse Financière Avancée
          </h1>
          <p className="text-[#171717]/70 mt-1">
            TAFIRE SYSCOHADA, SIG et ratios financiers
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_year">vs Exercice précédent</SelectItem>
              <SelectItem value="budget">vs Budget</SelectItem>
              <SelectItem value="sector">vs Secteur</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export TAFIRE
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tafire">TAFIRE</TabsTrigger>
          <TabsTrigger value="sig">Soldes Intermédiaires</TabsTrigger>
          <TabsTrigger value="ratios">Ratios Financiers</TabsTrigger>
          <TabsTrigger value="comparative">Analyse Comparative</TabsTrigger>
        </TabsList>

        {/* Vue TAFIRE */}
        <TabsContent value="tafire" className="space-y-6">
          {/* KPIs TAFIRE */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-[#171717] mx-auto mb-2" />
                <div className="text-lg font-bold text-[#171717]">
                  {formatCurrency(tafireData?.self_financing_capacity || 0)}
                </div>
                <p className="text-sm text-[#171717]/70">Capacité d'Autofinancement</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 text-[var(--color-success)] mx-auto mb-2" />
                <div className="text-lg font-bold text-[var(--color-success)]">
                  {formatCurrency(tafireData?.operating_cash_surplus || 0)}
                </div>
                <p className="text-sm text-[#171717]/70">Flux d'Exploitation (ETE)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-[#171717] mx-auto mb-2" />
                <div className="text-lg font-bold text-[#171717]">
                  {formatCurrency(tafireData?.free_cash_flow || 0)}
                </div>
                <p className="text-sm text-[#171717]/70">Free Cash Flow</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="h-8 w-8 text-[#171717] mx-auto mb-2" />
                <div className="text-lg font-bold text-[#171717]">
                  {formatCurrency(tafireData?.cash_variation || 0)}
                </div>
                <p className="text-sm text-[#171717]/70">Variation Trésorerie</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique Waterfall TAFIRE */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                TAFIRE - Flux de Trésorerie (Waterfall Chart)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tafireLoading ? (
                <LoadingSpinner text="Génération TAFIRE..." />
              ) : (
                <div className="h-80">
                  <BarChart
                    data={waterfallData}
                    xAxisKey="name"
                    bars={[
                      { key: 'value', name: 'Montant', color: "var(--color-primary)" }
                    ]}
                    height={320}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Détail des flux */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Flux d'Exploitation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[var(--color-success-dark)]">
                  Flux d'Exploitation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Capacité d'Autofinancement</span>
                    <span className="font-bold text-[var(--color-success)]">
                      {formatCurrency(tafireData?.self_financing_capacity || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Variation BFR</span>
                    <span className="font-bold text-[var(--color-error)]">
                      {formatCurrency(tafireData?.working_capital_variation || 0)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>= Flux Net Exploitation</span>
                    <span className={`${
                      (tafireData?.operating_cash_surplus || 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                    }`}>
                      {formatCurrency(tafireData?.operating_cash_surplus || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flux d'Investissement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[var(--color-info-dark)]">
                  Flux d'Investissement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>- Acquisitions</span>
                    <span className="font-bold text-[var(--color-error)]">
                      -{formatCurrency(tafireData?.fixed_assets_acquisitions || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Cessions</span>
                    <span className="font-bold text-[var(--color-success)]">
                      +{formatCurrency(tafireData?.fixed_assets_disposals || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Subventions</span>
                    <span className="font-bold text-[var(--color-success)]">
                      +{formatCurrency(tafireData?.investment_subsidies_received || 0)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>= Flux Net Investissement</span>
                    <span className={`${
                      (tafireData?.investment_cash_flow || 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                    }`}>
                      {formatCurrency(tafireData?.investment_cash_flow || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Flux de Financement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-[var(--color-primary-dark)]">
                  Flux de Financement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>+ Augmentation capital</span>
                    <span className="font-bold text-[var(--color-success)]">
                      +{formatCurrency(tafireData?.capital_increase || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ Nouveaux emprunts</span>
                    <span className="font-bold text-[var(--color-success)]">
                      +{formatCurrency(tafireData?.new_borrowings || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Remboursements</span>
                    <span className="font-bold text-[var(--color-error)]">
                      -{formatCurrency(tafireData?.loan_repayments || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>- Dividendes</span>
                    <span className="font-bold text-[var(--color-error)]">
                      -{formatCurrency(tafireData?.dividends_paid || 0)}
                    </span>
                  </div>
                  <hr />
                  <div className="flex justify-between font-bold">
                    <span>= Flux Net Financement</span>
                    <span className={`${
                      (tafireData?.financing_cash_flow || 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                    }`}>
                      {formatCurrency(tafireData?.financing_cash_flow || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vue Soldes Intermédiaires de Gestion */}
        <TabsContent value="sig" className="space-y-6">
          {/* Cascade des SIG */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Cascade des Soldes Intermédiaires de Gestion
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sigLoading ? (
                <LoadingSpinner text="Calcul des SIG..." />
              ) : (
                <BarChart
                  data={sigCascadeData}
                  xAxisKey="name"
                  bars={[{ key: 'value', name: 'Montant', color: "var(--color-info)" }]}
                  height={350}
                />
              )}
            </CardContent>
          </Card>

          {/* Tableau détaillé des SIG */}
          <Card>
            <CardHeader>
              <CardTitle>Détail des Soldes Intermédiaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accounting.balance')}</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead className="text-right">Taux/CA</TableHead>
                      <TableHead className="text-right">Évolution</TableHead>
                      <TableHead>Appréciation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { 
                        name: 'Marge Commerciale',
                        value: sigData?.commercial_margin || 0,
                        rate: sigData?.commercial_margin_rate || 0,
                        trend: 2.5
                      },
                      {
                        name: 'Valeur Ajoutée',
                        value: sigData?.added_value || 0,
                        rate: sigData?.added_value_rate || 0,
                        trend: 1.8
                      },
                      {
                        name: 'Excédent Brut Exploitation',
                        value: sigData?.gross_operating_surplus || 0,
                        rate: (sigData?.gross_operating_surplus || 0) / (sigData?.revenue_base || 1) * 100,
                        trend: -0.5
                      },
                      {
                        name: 'Résultat d\'Exploitation',
                        value: sigData?.operating_result || 0,
                        rate: sigData?.operating_margin_rate || 0,
                        trend: 3.2
                      },
                      {
                        name: 'Résultat Financier',
                        value: sigData?.financial_result || 0,
                        rate: (sigData?.financial_result || 0) / (sigData?.revenue_base || 1) * 100,
                        trend: -1.1
                      },
                      {
                        name: 'Résultat Net',
                        value: sigData?.final_net_result || 0,
                        rate: sigData?.net_margin_rate || 0,
                        trend: 4.7
                      }
                    ].map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(item.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(item.rate)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end ${
                            item.trend >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                          }`}>
                            {item.trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                            {Math.abs(item.trend)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.value > 0 ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' : 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'
                          }>
                            {item.value > 0 ? 'Positif' : 'Négatif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vue Ratios Financiers */}
        <TabsContent value="ratios" className="space-y-6">
          {/* Tableau de bord ratios avec jauges */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ratiosData?.structure_ratios?.map((ratio, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[#171717]">{ratio.name}</h4>
                    <Badge className={getRatioStatusColor(ratio)}>
                      {ratio.status}
                    </Badge>
                  </div>
                  
                  <div className="text-center mb-3">
                    <div className="text-lg font-bold text-[#171717]">
                      {ratio.value}{ratio.unit}
                    </div>
                    <p className="text-sm text-[#171717]/50">
                      Norme: {ratio.benchmark_value}{ratio.unit}
                    </p>
                  </div>
                  
                  {/* Gauge visuel */}
                  <div className="relative h-4 bg-[#e5e5e5] rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        ratio.performance_vs_benchmark >= 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (ratio.value / ratio.benchmark_value * 100)))}%` 
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-[#171717]/50 mt-1">
                    <span>0</span>
                    <span>{ratio.benchmark_value}</span>
                    <span>{(ratio.benchmark_value * 1.5).toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Radar chart performance globale */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Radar Performance Financière</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-lg font-bold text-[#171717] mb-2">
                    {ratiosData?.overall_score?.toFixed(0) || 0}%
                  </div>
                  <p className="text-[#171717]/70 mb-4">Score Global</p>
                  <Progress value={ratiosData?.overall_score || 0} className="mb-4" />
                  <Badge className={`
                    ${(ratiosData?.overall_score || 0) >= 85 ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                      (ratiosData?.overall_score || 0) >= 70 ? 'bg-[#e5e5e5] text-[#171717]' :
                      (ratiosData?.overall_score || 0) >= 50 ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                      'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'}
                  `}>
                    {(ratiosData?.overall_score || 0) >= 85 ? 'Excellent' :
                     (ratiosData?.overall_score || 0) >= 70 ? 'Bon' :
                     (ratiosData?.overall_score || 0) >= 50 ? 'Moyen' : 'Faible'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertes Financières</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ratiosData?.alerts?.map((alert, index) => (
                    <div key={index} className={`p-3 rounded border ${
                      alert.severity === 'CRITICAL' ? 'bg-[var(--color-error-lightest)] border-[var(--color-error-light)]' :
                      alert.severity === 'WARNING' ? 'bg-[var(--color-warning-lightest)] border-[var(--color-warning-light)]' :
                      'bg-[#e5e5e5] border-[#e5e5e5]'
                    }`}>
                      <div className="flex items-center space-x-2 mb-1">
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.severity === 'CRITICAL' ? 'text-[var(--color-error)]' :
                          alert.severity === 'WARNING' ? 'text-[var(--color-warning)]' : 'text-[#171717]'
                        }`} />
                        <p className="font-medium">{alert.title}</p>
                      </div>
                      <p className="text-sm text-[#171717]/70">{alert.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vue Analyse Comparative */}
        <TabsContent value="comparative" className="space-y-6">
          {/* Comparaison sectorielle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Benchmarking Sectoriel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicateur</TableHead>
                      <TableHead className="text-right">Entreprise</TableHead>
                      <TableHead className="text-right">Secteur</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {benchmarkData?.comparisons?.map((benchmark, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{benchmark.metric_name}</TableCell>
                        <TableCell className="text-right font-bold">
                          {benchmark.company_value}%
                        </TableCell>
                        <TableCell className="text-right">
                          {benchmark.sector_average}%
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          benchmark.difference >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                        }`}>
                          {benchmark.difference >= 0 ? '+' : ''}{benchmark.difference.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${benchmark.performance === 'ABOVE' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              benchmark.performance === 'EQUAL' ? 'bg-[#e5e5e5] text-[#171717]' :
                              'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]'}
                          `}>
                            {benchmark.performance === 'ABOVE' ? 'Au-dessus' :
                             benchmark.performance === 'EQUAL' ? 'Égal' : 'En-dessous'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Évolution temporelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChartIcon className="h-5 w-5 mr-2" />
                Évolution des Ratios Clés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                data={ratiosData?.historical_trends || []}
                xAxisKey="period"
                lines={[
                  { key: 'autonomy_ratio', name: 'Autonomie Financière (%)', color: "var(--color-primary)" },
                  { key: 'liquidity_ratio', name: 'Liquidité Générale', color: "var(--color-success)" },
                  { key: 'profitability_ratio', name: 'Marge Nette (%)', color: "var(--color-warning)" },
                  { key: 'activity_ratio', name: 'ROA (%)', color: "var(--color-error)" }
                ]}
                height={300}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalysisDashboard;