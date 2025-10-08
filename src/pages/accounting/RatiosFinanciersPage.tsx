import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  PieChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  FileText,
  Clock
} from 'lucide-react';

interface Ratio {
  id: string;
  name: string;
  name_en?: string;
  value: number;
  benchmark: number;
  benchmark_cemac?: number;
  benchmark_uemoa?: number;
  trend: 'up' | 'down' | 'stable';
  category: 'structure' | 'liquidite' | 'activite' | 'rentabilite' | 'syscohada_specific';
  interpretation: string;
  interpretation_en?: string;
  formula: string;
  formula_detail: string;
  syscohada_reference?: string;
  sector_benchmark?: Record<string, number>;
  region: 'CEMAC' | 'UEMOA' | 'both';
  is_syscohada_required: boolean;
  calculation_method: 'standard' | 'syscohada' | 'ifrs';
  historical_data?: { period: string; value: number }[];
  alert_thresholds: { min: number; max: number; severity: 'info' | 'warning' | 'critical' };
}

interface RatioCategory {
  id: string;
  name: string;
  color: string;
  icon: React.ElementType;
  ratios: Ratio[];
}

const RatiosFinanciersPage: React.FC = () => {
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [categories, setCategories] = useState<RatioCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('structure');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRatios();
  }, []);

  const loadRatios = async () => {
    // Simulation de données
    const mockCategories: RatioCategory[] = [
      {
        id: 'structure',
        name: 'Ratios de Structure',
        color: 'blue',
        icon: BarChart3,
        ratios: [
          {
            id: 'autonomie_financiere',
            name: 'Ratio d\'Autonomie Financière',
            name_en: 'Financial Autonomy Ratio',
            value: 65.5,
            benchmark: 50,
            benchmark_cemac: 45,
            benchmark_uemoa: 55,
            trend: 'up',
            category: 'structure',
            interpretation: 'Excellente autonomie financière conforme aux standards SYSCOHADA',
            interpretation_en: 'Excellent financial autonomy compliant with SYSCOHADA standards',
            formula: '(CP / TB) × 100',
            formula_detail: '(Capitaux Propres / Total Bilan) × 100',
            syscohada_reference: 'SYSCOHADA Art. 75 - Analyse financière',
            sector_benchmark: {
              'commercial': 55,
              'industrial': 60,
              'services': 50,
              'banking': 15,
              'insurance': 25
            },
            region: 'both',
            is_syscohada_required: true,
            calculation_method: 'syscohada',
            historical_data: [
              { period: '2023', value: 62.1 },
              { period: '2022', value: 58.7 },
              { period: '2021', value: 55.3 }
            ],
            alert_thresholds: { min: 30, max: 80, severity: 'warning' }
          },
          {
            id: 'endettement_global',
            name: 'Ratio d\'Endettement Global',
            name_en: 'Global Debt Ratio',
            value: 34.5,
            benchmark: 50,
            benchmark_cemac: 55,
            benchmark_uemoa: 45,
            trend: 'down',
            category: 'structure',
            interpretation: 'Endettement maîtrisé, structure financière saine',
            interpretation_en: 'Controlled debt, healthy financial structure',
            formula: '(DT / TB) × 100',
            formula_detail: '(Dettes Totales / Total Bilan) × 100',
            syscohada_reference: 'SYSCOHADA Art. 76 - Structure financière',
            sector_benchmark: {
              'commercial': 45,
              'industrial': 40,
              'services': 50,
              'banking': 85,
              'insurance': 75
            },
            region: 'both',
            is_syscohada_required: true,
            calculation_method: 'syscohada',
            historical_data: [
              { period: '2023', value: 37.9 },
              { period: '2022', value: 41.3 },
              { period: '2021', value: 44.7 }
            ],
            alert_thresholds: { min: 20, max: 70, severity: 'warning' }
          }
        ]
      },
      {
        id: 'liquidite',
        name: 'Ratios de Liquidité',
        color: 'green',
        icon: DollarSign,
        ratios: [
          {
            id: 'liquidite_generale',
            name: 'Liquidité Générale',
            value: 2.3,
            benchmark: 1.5,
            trend: 'up',
            category: 'liquidite',
            interpretation: 'Excellente liquidité',
            formula: 'Actif Circulant / Passif Circulant'
          },
          {
            id: 'liquidite_reduite',
            name: 'Liquidité Réduite',
            value: 1.8,
            benchmark: 1.0,
            trend: 'stable',
            category: 'liquidite',
            interpretation: 'Bonne capacité de paiement',
            formula: '(Créances + Trésorerie) / Passif Circulant'
          }
        ]
      },
      {
        id: 'activite',
        name: 'Ratios d\'Activité',
        color: 'purple',
        icon: Target,
        ratios: [
          {
            id: 'rotation_stocks',
            name: 'Rotation des Stocks',
            value: 8.5,
            benchmark: 6,
            trend: 'up',
            category: 'activite',
            interpretation: 'Bonne rotation',
            formula: 'CAMV / Stock Moyen'
          },
          {
            id: 'dso',
            name: 'DSO (jours)',
            value: 45,
            benchmark: 60,
            trend: 'down',
            category: 'activite',
            interpretation: 'Délai client acceptable',
            formula: 'Créances Clients x 360 / CA TTC'
          }
        ]
      },
      {
        id: 'rentabilite',
        name: 'Ratios de Rentabilité',
        color: 'orange',
        icon: TrendingUp,
        ratios: [
          {
            id: 'roe',
            name: 'ROE (%)',
            value: 15.2,
            benchmark: 12,
            trend: 'up',
            category: 'rentabilite',
            interpretation: 'Excellente rentabilité',
            formula: 'Résultat Net / Capitaux Propres'
          },
          {
            id: 'marge_operationnelle',
            name: 'Marge Opérationnelle (%)',
            value: 18.7,
            benchmark: 15,
            trend: 'up',
            category: 'rentabilite',
            interpretation: 'Très bonne marge',
            formula: 'Résultat Opérationnel / CA'
          }
        ]
      }
    ];
    
    setCategories(mockCategories);
    setLoading(false);
  };

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
  
  // SYSCOHADA Analysis Functions
  const calculateSYSCOHADACompliance = () => {
    const totalRatios = categories.reduce((sum, cat) => sum + cat.ratios.length, 0);
    const syscohadaRatios = categories.reduce((sum, cat) => 
      sum + cat.ratios.filter(r => r.is_syscohada_required).length, 0);
    const compliantRatios = categories.reduce((sum, cat) => 
      sum + cat.ratios.filter(r => r.is_syscohada_required && isRatioCompliant(r)).length, 0);
    
    return {
      total: totalRatios,
      syscohada_required: syscohadaRatios,
      compliant: compliantRatios,
      compliance_rate: Math.round((compliantRatios / syscohadaRatios) * 100)
    };
  };
  
  const isRatioCompliant = (ratio: Ratio): boolean => {
    if (ratio.alert_thresholds) {
      return ratio.value >= ratio.alert_thresholds.min && ratio.value <= ratio.alert_thresholds.max;
    }
    return ratio.value >= ratio.benchmark * 0.8; // 80% of benchmark as minimum
  };
  
  const generateSYSCOHADAReport = () => {
    const compliance = calculateSYSCOHADACompliance();
    const alerts = categories.flatMap(cat => 
      cat.ratios.filter(r => !isRatioCompliant(r))
    );
    
    return {
      compliance,
      alerts,
      recommendations: generateRecommendations(alerts)
    };
  };
  
  const generateRecommendations = (problematicRatios: Ratio[]): string[] => {
    const recommendations: string[] = [];
    
    problematicRatios.forEach(ratio => {
      if (ratio.category === 'liquidite' && ratio.value < ratio.benchmark) {
        recommendations.push(`Améliorer la liquidité en optimisant la gestion de trésorerie (${ratio.name})`);
      }
      if (ratio.category === 'structure' && ratio.id === 'endettement_global' && ratio.value > ratio.benchmark) {
        recommendations.push('Réduire l\'endettement pour respecter les normes SYSCOHADA');
      }
      if (ratio.category === 'rentabilite' && ratio.value < ratio.benchmark) {
        recommendations.push(`Optimiser la rentabilité opérationnelle (${ratio.name})`);
      }
    });
    
    return recommendations;
  };
  
  const syscohadaReport = generateSYSCOHADAReport();

  const getRatioStatus = (ratio: Ratio) => {
    if (ratio.category === 'structure' || ratio.category === 'liquidite') {
      return ratio.value >= ratio.benchmark ? 'good' : 'warning';
    } else {
      return ratio.value >= ratio.benchmark ? 'good' : 'warning';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <span className="h-4 w-4 text-gray-700">→</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <PieChart className="h-8 w-8 text-blue-600 mr-3" />
            Ratios Financiers SYSCOHADA
          </h1>
          <p className="text-gray-600">
            Bibliothèque complète de ratios avec benchmarks sectoriels
          </p>
        </div>

        {/* Onglets des catégories */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedCategory === category.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-700 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Ratios de la catégorie sélectionnée */}
        {selectedCategoryData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedCategoryData.ratios.map((ratio, index) => {
              const status = getRatioStatus(ratio);
              return (
                <motion.div
                  key={ratio.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{ratio.name}</h3>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(ratio.trend)}
                      {status === 'good' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {typeof ratio.value === 'number' ? ratio.value.toLocaleString() : ratio.value}
                        {ratio.category === 'rentabilite' || ratio.formula.includes('%') ? '%' : ''}
                      </span>
                      <div className="text-right">
                        <span className="text-sm text-gray-600 block">
                          Benchmark: {ratio.benchmark}
                          {ratio.category === 'rentabilite' || ratio.formula.includes('%') ? '%' : ''}
                        </span>
                        {ratio.benchmark_cemac && ratio.benchmark_uemoa && (
                          <div className="text-xs text-gray-700">
                            CEMAC: {ratio.benchmark_cemac} | UEMOA: {ratio.benchmark_uemoa}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          status === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        style={{ 
                          width: `${Math.min((ratio.value / (ratio.benchmark * 1.5)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className={`p-3 rounded-lg ${
                      status === 'good' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        status === 'good' ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {ratio.interpretation}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Info className="h-4 w-4 text-gray-700 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Formule SYSCOHADA</span>
                      </div>
                      <p className="text-sm text-gray-600 font-mono mb-1">
                        {ratio.formula}
                      </p>
                      <p className="text-xs text-gray-700">
                        {ratio.formula_detail}
                      </p>
                      {ratio.syscohada_reference && (
                        <p className="text-xs text-blue-600 mt-1">
                          Réf: {ratio.syscohada_reference}
                        </p>
                      )}
                    </div>
                    
                    {ratio.historical_data && ratio.historical_data.length > 0 && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-2">
                        <div className="flex items-center mb-2">
                          <Calendar className="h-4 w-4 text-blue-500 mr-2" />
                          <span className="text-sm font-medium text-blue-700">Évolution</span>
                        </div>
                        <div className="flex space-x-3">
                          {ratio.historical_data.map(data => (
                            <div key={data.period} className="text-center">
                              <div className="text-xs text-blue-600">{data.period}</div>
                              <div className="text-sm font-medium text-blue-700">
                                {data.value.toLocaleString()}{ratio.formula.includes('%') ? '%' : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
      </div>
    </div>
  );
};

export default RatiosFinanciersPage;
