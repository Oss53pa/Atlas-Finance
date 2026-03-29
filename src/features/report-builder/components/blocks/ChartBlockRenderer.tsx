/**
 * Chart Block Renderer — Connected to live Atlas F&A data via useChartData
 */
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useChartData } from '../../hooks/useBlockData';
import type { ChartBlock } from '../../types';

const COLORS = ['#171717', '#525252', '#737373', '#a3a3a3', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

const ChartBlockRenderer: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const { data: liveData, loading } = useChartData(block.source, block.periodOverride);

  // Use live data if available, otherwise fall back to block's stored data
  const data = liveData?.data ?? block.data;
  const xAxisKey = liveData?.xAxisKey ?? block.xAxisKey;
  const series = liveData?.series ?? block.series;
  const { chartType, showLegend, legendPosition, height, showGrid, title } = block;

  const isEmpty = data.length === 0 && !loading;

  const renderChart = () => {
    if (isEmpty) {
      return (
        <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
          {block.source ? 'Aucune donnée pour cette période' : 'Connectez une source de données'}
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
      case 'grouped-bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {showLegend && <Legend />}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color || COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'stacked-bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {showLegend && <Legend />}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color || COLORS[i % COLORS.length]} stackId="a" />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {showLegend && <Legend />}
            {series.map((s, i) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />}
            <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {showLegend && <Legend />}
            {series.map((s, i) => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label}
                stroke={s.color || COLORS[i % COLORS.length]}
                fill={s.color || COLORS[i % COLORS.length]}
                fillOpacity={0.15} strokeWidth={2} />
            ))}
          </AreaChart>
        );
      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Tooltip />
            {showLegend && <Legend />}
            <Pie
              data={data}
              dataKey={series[0]?.key || 'value'}
              nameKey={xAxisKey}
              innerRadius={chartType === 'donut' ? '50%' : 0}
              outerRadius="80%"
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
            Type de graphique non supporté : {chartType}
          </div>
        );
    }
  };

  return (
    <div>
      {(title || loading) && (
        <div className="flex items-center justify-between mb-2">
          {title && <div className="text-xs font-semibold text-neutral-800">{title}</div>}
          {loading && <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height || 250}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartBlockRenderer;
