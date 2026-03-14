import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { ChartBlock as ChartBlockType } from '@/types/reportStudio';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartBlockProps {
  block: ChartBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<ChartBlockType>) => void;
}

const COLORS = ['#1C3163', '#D6B585', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const ChartBlock: React.FC<ChartBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { data, config, chartType } = block;

  // Transform data for Recharts
  const chartData = data.labels?.map((label, index) => {
    const point: Record<string, any> = { name: label };
    data.datasets.forEach((dataset) => {
      point[dataset.label] = dataset.data[index];
    });
    return point;
  }) || [];

  const handleDoubleClick = () => {
    if (isEditable) {
      setIsEditorOpen(true);
    }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={chartData}>
            {config.gridLines && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            {config.tooltips && <Tooltip />}
            {config.legend?.show && <Legend />}
            {data.datasets.map((dataset, index) => (
              <Line
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
      case 'horizontal_bar':
        return (
          <BarChart
            data={chartData}
            layout={chartType === 'horizontal_bar' ? 'vertical' : 'horizontal'}
          >
            {config.gridLines && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            {config.tooltips && <Tooltip />}
            {config.legend?.show && <Legend />}
            {data.datasets.map((dataset, index) => (
              <Bar
                key={dataset.label}
                dataKey={dataset.label}
                fill={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            {config.gridLines && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            {config.tooltips && <Tooltip />}
            {config.legend?.show && <Legend />}
            {data.datasets.map((dataset, index) => (
              <Area
                key={dataset.label}
                type="monotone"
                dataKey={dataset.label}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.3}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
      case 'donut':
        const pieData = data.labels?.map((label, index) => ({
          name: label,
          value: data.datasets[0]?.data[index] || 0,
        })) || [];
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 60 : 0}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            {config.tooltips && <Tooltip />}
            {config.legend?.show && <Legend />}
          </PieChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Type de graphique non supporté: {chartType}
          </div>
        );
    }
  };

  return (
    <div className="my-4" onDoubleClick={handleDoubleClick}>
      {/* Chart title */}
      {config.title && (
        <h4 className="text-sm font-semibold text-gray-700 mb-1 text-center">
          {config.title}
        </h4>
      )}
      {config.subtitle && (
        <p className="text-xs text-gray-500 mb-2 text-center">{config.subtitle}</p>
      )}

      {/* Chart container */}
      <div
        className={cn(
          'bg-white rounded-lg border border-gray-200 p-4',
          isEditable && 'cursor-pointer hover:border-primary hover:shadow-md transition-all'
        )}
        style={{
          height: config.height || 300,
          width: config.width || '100%',
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Source */}
      {config.source && (
        <p className="text-xs text-gray-400 mt-1 text-right">
          Source: {config.source}
        </p>
      )}

      {/* Edit hint */}
      {isEditable && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Double-cliquez pour modifier le graphique
        </p>
      )}

      {/* Chart Editor Modal - TODO: Implement full editor */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Éditeur de graphique</h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <p className="text-gray-500 text-center py-8">
                Éditeur de graphique en cours de développement...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
