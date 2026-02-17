import { ChartOptions } from 'chart.js';

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
          family: 'inherit'
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)'
      }
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
        labelTextColor: function() {
          return 'var(--color-text-primary)';
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: 'rgba(156, 163, 175, 0.1)',
        drawBorder: false
      },
      ticks: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11
        }
      }
    },
    y: {
      grid: {
        display: true,
        color: 'rgba(156, 163, 175, 0.1)',
        drawBorder: false
      },
      ticks: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11
        }
      }
    }
  }
};

// Options spécifiques pour les graphiques en ligne
export const lineChartOptions: ChartOptions<'line'> = {
  ...defaultChartOptions,
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2
    },
    point: {
      radius: 4,
      hoverRadius: 6,
      borderWidth: 2,
      backgroundColor: '#fff'
    }
  }
};

// Options spécifiques pour les graphiques en barres
export const barChartOptions: ChartOptions<'bar'> = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...defaultChartOptions.plugins?.legend,
      display: true
    }
  },
  scales: {
    ...defaultChartOptions.scales,
    x: {
      ...defaultChartOptions.scales?.x,
      grid: {
        display: false
      }
    }
  }
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
          size: 12
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)'
      }
    }
  },
  scales: undefined // Pas d'axes pour les graphiques circulaires
};

// Options spécifiques pour les graphiques radar
export const radarChartOptions: ChartOptions<'radar'> = {
  ...defaultChartOptions,
  scales: {
    r: {
      angleLines: {
        color: 'rgba(156, 163, 175, 0.1)'
      },
      grid: {
        color: 'rgba(156, 163, 175, 0.1)'
      },
      pointLabels: {
        color: 'var(--color-text-secondary)',
        font: {
          size: 11
        }
      },
      ticks: {
        color: 'var(--color-text-secondary)',
        backdropColor: 'transparent',
        font: {
          size: 10
        }
      }
    }
  },
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 15,
        font: {
          size: 12
        },
        usePointStyle: true,
        color: 'var(--color-text-secondary)'
      }
    }
  }
};

// Couleurs du thème pour les graphiques
export const chartColors = {
  primary: 'rgb(106, 138, 130)',
  primaryLight: 'rgba(106, 138, 130, 0.1)',
  secondary: 'rgb(184, 115, 51)',
  secondaryLight: 'rgba(184, 115, 51, 0.1)',
  success: 'rgb(34, 197, 94)',
  successLight: 'rgba(34, 197, 94, 0.1)',
  danger: 'rgb(239, 68, 68)',
  dangerLight: 'rgba(239, 68, 68, 0.1)',
  warning: 'rgb(245, 158, 11)',
  warningLight: 'rgba(245, 158, 11, 0.1)',
  info: 'rgb(59, 130, 246)',
  infoLight: 'rgba(59, 130, 246, 0.1)',
  gray: 'rgb(156, 163, 175)',
  grayLight: 'rgba(156, 163, 175, 0.1)'
};

// Fonction pour formater les valeurs monétaires
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Fonction pour formater les pourcentages
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};