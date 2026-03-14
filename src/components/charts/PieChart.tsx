import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const DEFAULT_COLORS = [
  '#171717', '#525252', '#22c55e', '#f59e0b', '#3b82f6',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
  '#06b6d4', '#84cc16',
];

interface PieChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  nameKey: string;
  height: number;
  colors?: string[];
  doughnut?: boolean;
  showLegend?: boolean;
  currency?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
  data,
  dataKey,
  nameKey,
  height,
  colors,
  doughnut = true,
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

  const palette = colors || DEFAULT_COLORS;

  const chartData = {
    labels: data.map((d) => String(d[nameKey] ?? '')),
    datasets: [
      {
        data: data.map((d) => Number(d[dataKey] ?? 0)),
        backgroundColor: data.map((_, i) => palette[i % palette.length]),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: doughnut ? '55%' : 0,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right' as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          font: { size: 11 },
          generateLabels: (chart: any) => {
            const ds = chart.data.datasets[0];
            return chart.data.labels.map((label: string, i: number) => ({
              text: `${label} (${currency
                ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(ds.data[i])
                : ds.data[i].toLocaleString('fr-FR')})`,
              fillStyle: ds.backgroundColor[i],
              strokeStyle: '#fff',
              lineWidth: 1,
              pointStyle: 'circle',
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: '#171717',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
            const val = currency
              ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(ctx.raw)
              : ctx.raw.toLocaleString('fr-FR');
            return `${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  const ChartComponent = doughnut ? Doughnut : Pie;

  return (
    <div style={{ position: 'relative', height: `${height}px`, width: '100%' }}>
      <ChartComponent data={chartData} options={options} />
    </div>
  );
};

export default PieChart;
