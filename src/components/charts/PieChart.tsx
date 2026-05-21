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
  '#235A6E', '#E89A2E', '#15803D', '#4E7E8D', '#C77E2C',
  '#7FA3AF', '#9E6322', '#5C5347', '#1B4856', '#C0322B',
  '#2C6E86', '#F2A93B',
];

// Plugin : total au centre du donut (style premium)
const centerTextPlugin = {
  id: 'atlasCenterText',
  afterDraw(chart: any) {
    const cutout = chart.config?.options?.cutout;
    if (!cutout || cutout === 0) return;
    const area = chart.chartArea;
    if (!area) return;
    const total = (chart.data.datasets[0]?.data || []).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(total);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const ctx = chart.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#261E15';
    ctx.font = '700 21px Dosis, Inter, sans-serif';
    ctx.fillText(compact, cx, cy - 5);
    ctx.fillStyle = '#8A8170';
    ctx.font = '600 9px Inter, sans-serif';
    ctx.fillText('TOTAL', cx, cy + 13);
    ctx.restore();
  },
};

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
        borderWidth: 0,
        borderRadius: 8,
        spacing: 3,
        hoverOffset: 10,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: doughnut ? '68%' : 0,
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
        backgroundColor: '#13323D',
        titleColor: '#F7F5EF',
        bodyColor: '#E6DFD2',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 10,
        boxPadding: 6,
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
      <ChartComponent data={chartData} options={options} plugins={doughnut ? [centerTextPlugin] : []} />
    </div>
  );
};

export default PieChart;
