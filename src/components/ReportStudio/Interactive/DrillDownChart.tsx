/**
 * DrillDownChart - Graphique interactif avec drill-down
 * Permet de cliquer sur les éléments pour voir le détail
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell
} from 'recharts';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Filter,
  RefreshCw,
  Layers,
  X
} from 'lucide-react';

interface DrillDownData {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
  children?: DrillDownData[];
  metadata?: Record<string, any>;
}

interface DrillDownLevel {
  title: string;
  data: DrillDownData[];
  parentLabel?: string;
}

interface DrillDownChartProps {
  title: string;
  data: DrillDownData[];
  chartType: 'bar' | 'pie' | 'line';
  onDrillDown?: (item: DrillDownData, path: string[]) => DrillDownData[] | null;
  onExport?: () => void;
  className?: string;
}

const COLORS = ['#1C3163', '#D6B585', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const DrillDownChart: React.FC<DrillDownChartProps> = ({
  title,
  data,
  chartType,
  onDrillDown,
  onExport,
  className,
}) => {
  const [drillPath, setDrillPath] = useState<DrillDownLevel[]>([
    { title, data }
  ]);
  const [selectedItem, setSelectedItem] = useState<DrillDownData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const currentLevel = drillPath[drillPath.length - 1];
  const canGoBack = drillPath.length > 1;

  const handleDrillDown = useCallback((item: DrillDownData) => {
    // Check if item has children or if onDrillDown callback provides data
    let childData: DrillDownData[] | null = null;

    if (item.children && item.children.length > 0) {
      childData = item.children;
    } else if (onDrillDown) {
      const path = drillPath.map(l => l.parentLabel).filter(Boolean) as string[];
      childData = onDrillDown(item, [...path, item.label]);
    }

    if (childData && childData.length > 0) {
      setDrillPath([...drillPath, {
        title: `${item.label} - Détails`,
        data: childData,
        parentLabel: item.label,
      }]);
      setSelectedItem(null);
    } else {
      // No children, show item details
      setSelectedItem(item);
      setShowDetails(true);
    }
  }, [drillPath, onDrillDown]);

  const handleGoBack = useCallback(() => {
    if (drillPath.length > 1) {
      setDrillPath(drillPath.slice(0, -1));
      setSelectedItem(null);
    }
  }, [drillPath]);

  const handleReset = useCallback(() => {
    setDrillPath([{ title, data }]);
    setSelectedItem(null);
  }, [title, data]);

  const formatValue = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}Mds`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString('fr-FR');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const item = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">{item.label || label}</p>
        <p className="text-lg font-bold text-primary">{formatValue(item.value)}</p>
        {item.percentage && (
          <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}% du total</p>
        )}
        {item.children && item.children.length > 0 && (
          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <ZoomIn className="w-3 h-3" />
            Cliquer pour voir le détail
          </p>
        )}
      </div>
    );
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={currentLevel.data}
        onClick={(data) => data && data.activePayload && handleDrillDown(data.activePayload[0].payload)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="value"
          cursor="pointer"
          radius={[4, 4, 0, 0]}
        >
          {currentLevel.data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS[index % COLORS.length]}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={currentLevel.data}
          dataKey="value"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={120}
          innerRadius={60}
          label={({ label, percentage }) => `${label} (${percentage?.toFixed(1)}%)`}
          onClick={(data) => handleDrillDown(data)}
          cursor="pointer"
        >
          {currentLevel.data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.color || COLORS[index % COLORS.length]}
              className="hover:opacity-80 transition-opacity"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={currentLevel.data}
        onClick={(data) => data && data.activePayload && handleDrillDown(data.activePayload[0].payload)}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={formatValue} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#1C3163"
          strokeWidth={2}
          dot={{ cursor: 'pointer', fill: '#1C3163' }}
          activeDot={{ r: 8 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const content = (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden',
      isFullscreen && 'fixed inset-4 z-50',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                onClick={handleGoBack}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Retour"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{currentLevel.title}</h3>
              {drillPath.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Layers className="w-3 h-3" />
                  Niveau {drillPath.length} •
                  <button onClick={handleReset} className="text-blue-600 hover:underline">
                    Retour au début
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Réinitialiser"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title={isFullscreen ? 'Réduire' : 'Plein écran'}
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </button>
            {onExport && (
              <button
                onClick={onExport}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Exporter"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Breadcrumb */}
        {drillPath.length > 1 && (
          <div className="flex items-center gap-1 mt-2 text-sm">
            {drillPath.map((level, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                <button
                  onClick={() => setDrillPath(drillPath.slice(0, index + 1))}
                  className={cn(
                    'px-2 py-0.5 rounded',
                    index === drillPath.length - 1
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {level.parentLabel || 'Accueil'}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4">
        {chartType === 'bar' && renderBarChart()}
        {chartType === 'pie' && renderPieChart()}
        {chartType === 'line' && renderLineChart()}
      </div>

      {/* Data Table */}
      <div className="px-4 pb-4">
        <div className="text-xs text-gray-500 mb-2">Cliquez sur un élément pour voir le détail</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {currentLevel.data.map((item, index) => (
            <button
              key={index}
              onClick={() => handleDrillDown(item)}
              className={cn(
                'p-3 rounded-lg border text-left transition-all hover:shadow-md',
                item.children && item.children.length > 0
                  ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                  : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                />
                <span className="text-xs font-medium text-gray-700 truncate">{item.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatValue(item.value)}</p>
              {item.percentage && (
                <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
              )}
              {item.children && item.children.length > 0 && (
                <div className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                  <ZoomIn className="w-3 h-3" />
                  {item.children.length} éléments
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Item Details Modal */}
      {showDetails && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">{selectedItem.label}</h3>
              <button onClick={() => setShowDetails(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-primary">{formatValue(selectedItem.value)}</p>
                {selectedItem.percentage && (
                  <p className="text-gray-500">{selectedItem.percentage.toFixed(2)}% du total</p>
                )}
              </div>

              {selectedItem.metadata && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">Détails</h4>
                  {Object.entries(selectedItem.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{key}</span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Fullscreen backdrop
  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setIsFullscreen(false)} />
        {content}
      </>
    );
  }

  return content;
};

export default DrillDownChart;
