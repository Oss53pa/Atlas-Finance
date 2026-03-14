import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface LineChartProps {
  data: Record<string, unknown>[];
  xAxisKey: string;
  lines: Array<{ key: string; name: string; color: string }>;
  height: number;
  fill?: boolean;
  stacked?: boolean;
  showLegend?: boolean;
  currency?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisKey,
  lines,
  height,
  fill = false,
  stacked = false,
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
    datasets: lines.map((line) => ({
      label: line.name,
      data: data.map((d) => Number(d[line.key] ?? 0)),
      borderColor: line.color,
      backgroundColor: fill ? `${line.color}20` : 'transparent',
      tension: 0.4,
      fill,
      pointRadius: data.length > 30 ? 0 : 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        stacked,
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#737373' },
      },
      y: {
        stacked,
        grid: { color: '#f5f5f5' },
        ticks: {
          font: { size: 11 },
          color: '#737373',
          callback: currency
            ? (v: number | string) =>
                new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(v))
            : undefined,
        },
      },
    },
    plugins: {
      legend: {
        display: showLegend,
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
      <Line data={chartData} options={options} />
    </div>
  );
};

export default LineChart;
