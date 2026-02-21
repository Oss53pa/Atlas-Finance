/**
 * Widget Interactif Configurable Atlas Finance
 * Widgets drag & drop avec personnalisation selon cahier des charges
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MoreVertical,
  Settings,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Activity
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  LoadingSpinner,
  Progress,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui';
import { LineChart, BarChart, PieChart } from '../charts';
import { formatCurrency, formatDate, formatPercent } from '../../lib/utils';

interface WidgetConfig {
  refreshInterval?: number;
  showSubMetrics?: boolean;
  chartType?: 'line' | 'bar' | 'pie';
  xAxisKey?: string;
  lines?: Array<{ dataKey: string; color: string }>;
  bars?: Array<{ dataKey: string; color: string }>;
  realtime?: boolean;
  [key: string]: unknown;
}

interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WidgetProps {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'alert' | 'metric';
  size: 'small' | 'medium' | 'large';
  dataSource: string;
  config: WidgetConfig;
  position?: WidgetPosition;
  onResize?: (id: string, size: WidgetPosition) => void;
  onMove?: (id: string, position: WidgetPosition) => void;
  onConfigure?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

const InteractiveWidget: React.FC<WidgetProps> = ({
  id,
  title,
  type,
  size,
  dataSource,
  config,
  onResize,
  onMove,
  onConfigure,
  onRemove,
  className = ''
}) => {
  // États du widget
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(config.refreshInterval || 300000);

  // Query des données selon le type de widget
  const { data: widgetData, isLoading, refetch } = useQuery({
    queryKey: ['widget-data', id, dataSource],
    queryFn: async () => {
      // Simulation de récupération de données selon le type
      switch (dataSource) {
        case 'treasury-position':
          return {
            value: 3850000,
            change: 5.2,
            trend: 'up',
            submetrics: {
              available: 4200000,
              inflows_today: 350000,
              outflows_today: 280000
            }
          };
          
        case 'customer-aging':
          return {
            total: 2400000,
            breakdown: {
              current: 1800000,
              days_30_60: 400000,
              days_60_90: 150000,
              over_90: 50000
            },
            percentages: {
              current: 75,
              days_30_60: 16.7,
              days_60_90: 6.2,
              over_90: 2.1
            }
          };
          
        case 'supplier-performance':
          return {
            averageScore: 85.4,
            distribution: {
              excellent: 15,
              good: 25,
              average: 35,
              poor: 25
            },
            topPerformers: [
              { name: 'Fournisseur A', score: 95 },
              { name: 'Fournisseur B', score: 92 }
            ]
          };
          
        case 'financial-ratios':
          return {
            ratios: [
              { name: 'Liquidité générale', value: 1.8, benchmark: 1.5, status: 'GOOD' },
              { name: 'Autonomie financière', value: 45.2, benchmark: 30, status: 'EXCELLENT' },
              { name: 'Rotation stocks', value: 8.5, benchmark: 6, status: 'GOOD' }
            ]
          };
          
        default:
          return null;
      }
    },
    refetchInterval: refreshInterval
  });

  // Dimensions selon la taille
  const widgetDimensions = useMemo(() => {
    const dimensions = {
      small: { width: 'w-64', height: 'h-32' },
      medium: { width: 'w-80', height: 'h-48' },
      large: { width: 'w-96', height: 'h-64' }
    };
    return dimensions[size] || dimensions.medium;
  }, [size]);

  // Rendu selon le type de widget
  const renderWidgetContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="sm" text="Chargement..." />
        </div>
      );
    }

    switch (type) {
      case 'kpi':
        return renderKPIWidget();
      case 'chart':
        return renderChartWidget();
      case 'table':
        return renderTableWidget();
      case 'alert':
        return renderAlertWidget();
      case 'metric':
        return renderMetricWidget();
      default:
        return <p className="text-gray-700 text-center">Type de widget non supporté</p>;
    }
  };

  const renderKPIWidget = () => {
    if (!widgetData) return null;

    const TrendIcon = widgetData.trend === 'up' ? TrendingUp : TrendingDown;
    const trendColor = widgetData.trend === 'up' ? 'text-green-600' : 'text-red-600';

    return (
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900">
              {dataSource.includes('treasury') || dataSource.includes('customer') || dataSource.includes('supplier') 
                ? formatCurrency(widgetData.value)
                : widgetData.value}
            </div>
            <div className={`flex items-center mt-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4 mr-1" />
              <span className="text-sm font-medium">
                {widgetData.change > 0 ? '+' : ''}{widgetData.change}%
              </span>
            </div>
          </div>
          
          {config.showSubMetrics && widgetData.submetrics && (
            <div className="text-right text-sm text-gray-600">
              {Object.entries(widgetData.submetrics).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="font-mono ml-2">{formatCurrency(value as number)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderChartWidget = () => {
    if (!widgetData) return null;

    // Chart selon configuration
    if (config.chartType === 'line') {
      return (
        <div className="p-2">
          <LineChart
            data={widgetData.chartData || []}
            xAxisKey={config.xAxisKey || 'date'}
            lines={config.lines || []}
            height={size === 'large' ? 200 : size === 'medium' ? 150 : 100}
          />
        </div>
      );
    }

    if (config.chartType === 'pie') {
      return (
        <div className="p-2">
          <PieChart
            data={widgetData.breakdown ? Object.entries(widgetData.breakdown).map(([key, value]) => ({
              name: key,
              value: value
            })) : []}
            dataKey="value"
            nameKey="name"
            height={size === 'large' ? 200 : 150}
          />
        </div>
      );
    }

    return (
      <div className="p-2">
        <BarChart
          data={widgetData.chartData || []}
          xAxisKey={config.xAxisKey || 'category'}
          bars={config.bars || []}
          height={size === 'large' ? 200 : 150}
        />
      </div>
    );
  };

  const renderTableWidget = () => {
    if (!widgetData?.ratios) return null;

    return (
      <div className="p-3">
        <div className="space-y-2">
          {widgetData.ratios.slice(0, size === 'large' ? 6 : 3).map((ratio, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm font-medium">{ratio.name}</span>
              <div className="text-right">
                <span className={`font-bold ${
                  ratio.status === 'EXCELLENT' ? 'text-green-600' :
                  ratio.status === 'GOOD' ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {ratio.value}
                </span>
                <p className="text-xs text-gray-700">vs {ratio.benchmark}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAlertWidget = () => {
    return (
      <div className="p-3">
        <div className="text-center">
          <div className="text-lg font-bold text-orange-600">5</div>
          <p className="text-sm text-gray-600">Alertes actives</p>
          <div className="mt-2 space-y-1">
            <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">2 Critiques</div>
            <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">3 Moyennes</div>
          </div>
        </div>
      </div>
    );
  };

  const renderMetricWidget = () => {
    return (
      <div className="p-4 text-center">
        <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
        <div className="text-lg font-bold text-blue-600">98.5%</div>
        <p className="text-sm text-gray-600">Performance Système</p>
        <Progress value={98.5} className="mt-2 h-1" />
      </div>
    );
  };

  return (
    <Card className={`${widgetDimensions.width} ${widgetDimensions.height} ${className} hover:shadow-lg transition-all duration-200 ${isExpanded ? 'z-10 absolute' : 'relative'}`}>
      <CardHeader className="pb-2 px-3 py-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-800 truncate">
            {title}
          </CardTitle>
          
          <div className="flex items-center space-x-1">
            {/* Badge du module */}
            <Badge variant="outline" className="text-xs">
              {dataSource.split('-')[0]}
            </Badge>
            
            {/* Menu actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => refetch()}>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Actualiser
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <Minimize2 className="h-3 w-3 mr-2" /> : <Maximize2 className="h-3 w-3 mr-2" />}
                  {isExpanded ? 'Réduire' : 'Agrandir'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConfigure?.(id)}>
                  <Settings className="h-3 w-3 mr-2" />
                  Configurer
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-3 w-3 mr-2" />
                  Exporter
                </DropdownMenuItem>
                {onRemove && (
                  <DropdownMenuItem onClick={() => onRemove(id)} className="text-red-600">
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-full">
        <div className={`${isExpanded ? 'h-96' : 'h-full'} overflow-hidden`}>
          {renderWidgetContent()}
        </div>
        
        {/* Footer avec métadonnées */}
        <div className="px-3 py-1 border-t bg-gray-50 text-xs text-gray-700 flex items-center justify-between">
          <span>
            Maj: {formatDate(new Date(), 'HH:mm')}
          </span>
          <div className="flex items-center space-x-2">
            {config.realtime && (
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
            )}
            <span>{config.realtime ? 'Live' : 'Static'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Widget Factory pour création dynamique
export const WidgetFactory = {
  createKPIWidget: (config: Record<string, unknown>) => ({
    type: 'kpi' as const,
    component: InteractiveWidget,
    defaultSize: 'medium' as const,
    configurable: true,
    realtime: true,
    ...config
  }),

  createChartWidget: (config: Record<string, unknown>) => ({
    type: 'chart' as const,
    component: InteractiveWidget,
    defaultSize: 'large' as const,
    configurable: true,
    realtime: false,
    ...config
  }),

  createTableWidget: (config: Record<string, unknown>) => ({
    type: 'table' as const,
    component: InteractiveWidget,
    defaultSize: 'large' as const,
    configurable: true,
    realtime: false,
    ...config
  })
};

// Widgets prédéfinis Atlas Finance
export const AtlasFinanceWidgets = {
  treasury: {
    position: WidgetFactory.createKPIWidget({
      id: 'treasury-position',
      title: 'Position Trésorerie',
      dataSource: 'treasury-position',
      icon: 'DollarSign',
      config: { showSubMetrics: true, realtime: true }
    }),
    
    cashFlow: WidgetFactory.createChartWidget({
      id: 'treasury-cash-flow',
      title: 'Cash Flow Prévisionnel',
      dataSource: 'treasury-forecast',
      config: { chartType: 'line', period: 30 }
    }),

    fundCalls: WidgetFactory.createTableWidget({
      id: 'fund-calls-status',
      title: 'Appels de Fonds Actifs',
      dataSource: 'fund-calls',
      config: { maxItems: 5 }
    })
  },

  customers: {
    aging: WidgetFactory.createChartWidget({
      id: 'customer-aging',
      title: 'Balance Âgée Clients',
      dataSource: 'customer-aging',
      config: { chartType: 'pie' }
    }),

    dso: WidgetFactory.createKPIWidget({
      id: 'customer-dso',
      title: 'DSO Moyen',
      dataSource: 'customer-dso',
      config: { format: 'days', benchmark: 30 }
    }),

    topRisk: WidgetFactory.createTableWidget({
      id: 'top-risk-customers',
      title: 'Clients à Risque',
      dataSource: 'customer-risk',
      config: { maxItems: 10, sortBy: 'risk_score' }
    })
  },

  suppliers: {
    dpo: WidgetFactory.createKPIWidget({
      id: 'supplier-dpo',
      title: 'DPO Moyen',
      dataSource: 'supplier-dpo',
      config: { format: 'days', benchmark: 45 }
    }),

    performance: WidgetFactory.createChartWidget({
      id: 'supplier-performance',
      title: 'Répartition Performance',
      dataSource: 'supplier-performance',
      config: { chartType: 'bar' }
    }),

    paymentOptimization: WidgetFactory.createTableWidget({
      id: 'payment-optimization',
      title: 'Opportunités Escompte',
      dataSource: 'payment-optimization',
      config: { maxItems: 8 }
    })
  },

  accounting: {
    balanceSheet: WidgetFactory.createChartWidget({
      id: 'balance-sheet',
      title: 'Structure Bilancielle',
      dataSource: 'balance-sheet',
      config: { chartType: 'pie' }
    }),

    profitLoss: WidgetFactory.createChartWidget({
      id: 'profit-loss',
      title: 'Évolution Résultat',
      dataSource: 'profit-loss-trends',
      config: { chartType: 'line', period: 12 }
    }),

    keyRatios: WidgetFactory.createTableWidget({
      id: 'financial-ratios',
      title: 'Ratios Financiers',
      dataSource: 'financial-ratios',
      config: { maxItems: 6 }
    })
  }
};

export default InteractiveWidget;