import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: Record<string, unknown>[];
  xAxisKey: string;
  bars: Array<{ key: string; name: string; color: string }>;
  height: number;
  stacked?: boolean;
  horizontal?: boolean;
  showLegend?: boolean;
  currency?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey,
  bars,
  height,
  stacked = false,
  horizontal = false,
  showLegend = true,
  currency = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="flex items-center justify-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg"
      >
        <p className="text-[var(--color-text-secondary)] text-sm">Aucune donnee disponible</p>
      </div>
    );
  }

  const chartData = {
    labels: data.map((d) => String(d[xAxisKey] ?? '')),
    datasets: bars.map((bar) => ({
      label: bar.name,
      data: data.map((d) => Number(d[bar.key] ?? 0)),
      backgroundColor: bar.color,
      borderRadius: 4,
      borderSkipped: false as const,
      maxBarThickness: 40,
    })),
  };

  const formatVal = currency
    ? (v: number | string) =>
        new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(v))
    : undefined;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: (horizontal ? 'y' : 'x') as 'x' | 'y',
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        stacked,
        grid: { display: horizontal },
        ticks: { font: { size: 11 }, color: '#737373', callback: horizontal ? formatVal : undefined },
      },
      y: {
        stacked,
        grid: { display: !horizontal, color: '#f5f5f5' },
        ticks: { font: { size: 11 }, color: '#737373', callback: !horizontal ? formatVal : undefined },
      },
    },
    plugins: {
      legend: {
        display: showLegend && bars.length > 1,
        position: 'bottom' as const,
        labels: { padding: 15, usePointStyle: true, font: { size: 12 } },
      },
      tooltip: {
        backgroundColor: '#171717',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: currency
          ? {
              label: (ctx: any) =>
                `${ctx.dataset.label}: ${new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XAF',
                  maximumFractionDigits: 0,
                }).format(ctx.raw)}`,
            }
          : undefined,
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default BarChart;
