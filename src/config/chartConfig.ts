import type { ChartOptions } from 'chart.js';

// Configuration globale pour tous les graphiques
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        font: {
          size: 12,
          family: 'inherit',
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)',
      },
    },
    tooltip: {
      backgroundColor: 'var(--color-card-bg)',
      titleColor: 'var(--color-text-primary)',
      bodyColor: 'var(--color-text-secondary)',
      borderColor: 'var(--color-border)',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      usePointStyle: true,
      callbacks: {
        labelTextColor: function () {
          return 'var(--color-text-primary)';
        },
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: 'rgba(38, 30, 21, 0.06)',
        // Note: drawBorder supprimé en Chart.js v4 → utiliser border.display
      },
      border: { display: false },
      ticks: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        display: true,
        color: 'rgba(38, 30, 21, 0.06)',
      },
      border: { display: false },
      ticks: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11,
        },
      },
    },
  },
};

// Options spécifiques pour les graphiques en ligne
export const lineChartOptions: ChartOptions<'line'> = {
  ...defaultChartOptions,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2,
    },
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
      backgroundColor: '#fff',
    },
  },
};

// Options spécifiques pour les graphiques en barres
export const barChartOptions: ChartOptions<'bar'> = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...(defaultChartOptions.plugins?.legend as object),
      display: true,
    },
  },
  scales: {
    ...(defaultChartOptions.scales as object),
    x: {
      ...(defaultChartOptions.scales?.x as object),
      grid: {
        display: false,
      },
    },
  },
};

// Options spécifiques pour les graphiques en donut/pie
export const doughnutChartOptions: ChartOptions<'doughnut'> = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      position: 'right' as const,
      labels: {
        padding: 15,
        font: {
          size: 12,
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)',
      },
    },
  },
  scales: undefined, // Pas d'axes pour les graphiques circulaires
};

// Options spécifiques pour les graphiques radar
export const radarChartOptions: ChartOptions<'radar'> = {
  ...defaultChartOptions,
  scales: {
    r: {
      angleLines: {
        color: 'rgba(38, 30, 21, 0.06)',
      },
      grid: {
        color: 'rgba(38, 30, 21, 0.06)',
      },
      pointLabels: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11,
        },
      },
      ticks: {
        color: 'var(--color-text-secondary)',
        backdropColor: 'transparent',
        font: {
          size: 10,
        },
      },
    },
  },
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        font: {
          size: 12,
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)',
      },
    },
  },
};

// Couleurs du thème pour les graphiques — Petrol Cream
export const chartColors = {
  primary: 'rgb(35, 90, 110)',          // pétrole
  primaryLight: 'rgba(35, 90, 110, 0.12)',
  secondary: 'rgb(232, 154, 46)',       // ambre
  secondaryLight: 'rgba(232, 154, 46, 0.12)',
  success: 'rgb(21, 128, 61)',
  successLight: 'rgba(21, 128, 61, 0.12)',
  danger: 'rgb(192, 50, 43)',
  dangerLight: 'rgba(192, 50, 43, 0.12)',
  warning: 'rgb(232, 154, 46)',
  warningLight: 'rgba(232, 154, 46, 0.12)',
  info: 'rgb(35, 90, 110)',
  infoLight: 'rgba(35, 90, 110, 0.12)',
  gray: 'rgb(138, 129, 112)',
  grayLight: 'rgba(138, 129, 112, 0.12)',
};

// Palette de séries multi-catégories (donut/pie/barres groupées) — ordre premium
export const chartSeriesPalette = [
  '#235A6E', // pétrole
  '#E89A2E', // ambre
  '#15803D', // vert
  '#4E7E8D', // pétrole clair
  '#C77E2C', // ambre profond
  '#7FA3AF', // pétrole pâle
  '#9E6322', // caramel
  '#5C5347', // taupe
];

// Re-export from central formatters
export { formatCurrency, formatPercent } from '../utils/formatters';
