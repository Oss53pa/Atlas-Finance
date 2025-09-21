// Données des graphiques pour le module Assets
export const evolutionData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
  datasets: [
    {
      label: 'Valeur Nette',
      data: [2450000, 2380000, 2310000, 2240000, 2170000, 2100000],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4
    },
    {
      label: 'Amortissement Cumulé',
      data: [250000, 320000, 390000, 460000, 530000, 600000],
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      tension: 0.4
    }
  ]
};

export const repartitionData = {
  labels: ['Immobilier', 'Matériel', 'Véhicules', 'Informatique', 'Mobilier'],
  datasets: [{
    data: [1260000, 362500, 144500, 72000, 61000],
    backgroundColor: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)'
    ]
  }]
};

export const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const
    }
  }
};