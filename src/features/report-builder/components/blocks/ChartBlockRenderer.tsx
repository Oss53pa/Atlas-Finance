/**
 * Chart Block Renderer — Connected to live Atlas FnA data via useChartData
 * Rendu par le kit charts Atlas (ECharts « Daylight Pro »).
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { AtlasBar, AtlasDonut, AtlasLine, AtlasPie } from '../../../../components/charts';
import { useChartData } from '../../hooks/useBlockData';
import type { ChartBlock } from '../../types';

const COLORS = ['#171717', '#525252', '#737373', '#a3a3a3', '#15803D', '#235A6E', '#E89A2E', '#C0322B'];

const ChartBlockRenderer: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const { data: liveData, loading } = useChartData(block.source, block.periodOverride);

  // Use live data if available, otherwise fall back to block's stored data
  const data = liveData?.data ?? block.data;
  const xAxisKey = liveData?.xAxisKey ?? block.xAxisKey;
  const series = liveData?.series ?? block.series;
  const { chartType, showLegend, showGrid, height, title } = block;

  const isEmpty = data.length === 0 && !loading;
  const h = height || 250;

  // Le kit prend des séries colonne par colonne ; les blocs stockent des lignes.
  const categories = data.map((row) => String((row as Record<string, unknown>)[xAxisKey] ?? ''));
  const toSeries = () =>
    series.map((s, i) => ({
      name: s.label,
      data: data.map((row) => Number((row as Record<string, unknown>)[s.key] ?? 0)),
      color: s.color || COLORS[i % COLORS.length],
    }));
  const sliceData = () => {
    const key = series[0]?.key || 'value';
    return data.map((row) => ({
      name: String((row as Record<string, unknown>)[xAxisKey] ?? ''),
      value: Number((row as Record<string, unknown>)[key] ?? 0),
    }));
  };

  const renderChart = () => {
    if (isEmpty) {
      return (
        <div className="flex items-center justify-center text-neutral-400 text-xs" style={{ height: h }}>
          {block.source ? 'Aucune donnée pour cette période' : 'Connectez une source de données'}
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
      case 'grouped-bar':
        return <AtlasBar categories={categories} series={toSeries()} showValues={series.length === 1} showGrid={showGrid !== false} height={h} />;
      case 'stacked-bar':
        return <AtlasBar categories={categories} series={toSeries()} stacked showGrid={showGrid !== false} height={h} />;
      case 'line':
        return <AtlasLine categories={categories} series={toSeries()} showGrid={showGrid !== false} height={h} />;
      case 'area':
        return <AtlasLine categories={categories} series={toSeries().map((s) => ({ ...s, area: true }))} showGrid={showGrid !== false} height={h} />;
      case 'pie':
        return <AtlasPie data={sliceData()} colors={COLORS} height={h} />;
      case 'donut':
        return <AtlasDonut data={sliceData()} colors={COLORS} showLegend={showLegend !== false} centerPrimary={undefined} height={h} />;
      default:
        return (
          <div className="flex items-center justify-center text-neutral-400 text-sm" style={{ height: h }}>
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
      {renderChart()}
    </div>
  );
};

export default ChartBlockRenderer;
