/**
 * WhatIfSimulator - Simulateur de scénarios What-If
 * Permet de modifier des variables et voir l'impact sur les KPIs
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  Play,
  RotateCcw,
  Save,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Sliders,
  Calculator,
  History,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

export interface SimulationVariable {
  id: string;
  name: string;
  description?: string;
  category: string;
  currentValue: number;
  unit: string;
  unitPosition?: 'before' | 'after';
  min?: number;
  max?: number;
  step?: number;
  impact: 'direct' | 'inverse' | 'complex';
}

export interface SimulationResult {
  kpiId: string;
  kpiName: string;
  baseValue: number;
  simulatedValue: number;
  unit: string;
  change: number;
  changePercent: number;
  status: 'positive' | 'negative' | 'neutral';
  trend: { period: string; base: number; simulated: number }[];
}

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, number>;
  createdAt: string;
  results?: SimulationResult[];
}

interface WhatIfSimulatorProps {
  variables: SimulationVariable[];
  baseKpis: {
    id: string;
    name: string;
    value: number;
    unit: string;
    trend: { period: string; value: number }[];
  }[];
  onSimulate: (variables: Record<string, number>) => SimulationResult[];
  savedScenarios?: SavedScenario[];
  onSaveScenario?: (scenario: Omit<SavedScenario, 'id' | 'createdAt'>) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  className?: string;
}

const defaultVariables: SimulationVariable[] = [
  {
    id: 'growth-rate',
    name: 'Taux de croissance',
    description: 'Taux de croissance annuel du chiffre d\'affaires',
    category: 'Revenue',
    currentValue: 8.2,
    unit: '%',
    unitPosition: 'after',
    min: -20,
    max: 50,
    step: 0.1,
    impact: 'direct',
  },
  {
    id: 'market-share',
    name: 'Part de marché',
    description: 'Part de marché cible',
    category: 'Revenue',
    currentValue: 18.5,
    unit: '%',
    unitPosition: 'after',
    min: 0,
    max: 100,
    step: 0.5,
    impact: 'direct',
  },
  {
    id: 'cost-reduction',
    name: 'Réduction des coûts',
    description: 'Économies sur les coûts opérationnels',
    category: 'Costs',
    currentValue: 0,
    unit: '%',
    unitPosition: 'after',
    min: -10,
    max: 30,
    step: 0.5,
    impact: 'inverse',
  },
  {
    id: 'price-increase',
    name: 'Augmentation des prix',
    description: 'Variation des prix de vente moyens',
    category: 'Revenue',
    currentValue: 0,
    unit: '%',
    unitPosition: 'after',
    min: -20,
    max: 20,
    step: 0.5,
    impact: 'complex',
  },
  {
    id: 'volume-change',
    name: 'Variation des volumes',
    description: 'Changement dans les volumes de vente',
    category: 'Operations',
    currentValue: 0,
    unit: '%',
    unitPosition: 'after',
    min: -30,
    max: 50,
    step: 1,
    impact: 'direct',
  },
];

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  variables = defaultVariables,
  baseKpis,
  onSimulate,
  savedScenarios = [],
  onSaveScenario,
  onDeleteScenario,
  className,
}) => {
  const [simulatedValues, setSimulatedValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Revenue']));
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [selectedScenario, setSelectedScenario] = useState<SavedScenario | null>(null);
  const [compareWithBase, setCompareWithBase] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  // Group variables by category
  const variablesByCategory = useMemo(() => {
    return variables.reduce((acc, variable) => {
      if (!acc[variable.category]) {
        acc[variable.category] = [];
      }
      acc[variable.category].push(variable);
      return acc;
    }, {} as Record<string, SimulationVariable[]>);
  }, [variables]);

  const getValue = (variableId: string) => {
    const variable = variables.find(v => v.id === variableId);
    return simulatedValues[variableId] ?? variable?.currentValue ?? 0;
  };

  const hasChanges = useMemo(() => {
    return Object.keys(simulatedValues).some(id => {
      const variable = variables.find(v => v.id === id);
      return variable && simulatedValues[id] !== variable.currentValue;
    });
  }, [simulatedValues, variables]);

  const handleValueChange = useCallback((variableId: string, value: number) => {
    setSimulatedValues(prev => ({
      ...prev,
      [variableId]: value,
    }));
    setResults(null); // Clear results when values change
  }, []);

  const handleReset = useCallback(() => {
    setSimulatedValues({});
    setResults(null);
    setSelectedScenario(null);
  }, []);

  const handleSimulate = useCallback(() => {
    const allValues = variables.reduce((acc, v) => ({
      ...acc,
      [v.id]: getValue(v.id),
    }), {} as Record<string, number>);

    const simulationResults = onSimulate(allValues);
    setResults(simulationResults);
  }, [variables, simulatedValues, onSimulate]);

  const handleSaveScenario = useCallback(() => {
    if (!scenarioName.trim() || !onSaveScenario) return;

    const allValues = variables.reduce((acc, v) => ({
      ...acc,
      [v.id]: getValue(v.id),
    }), {} as Record<string, number>);

    onSaveScenario({
      name: scenarioName.trim(),
      description: scenarioDescription.trim() || undefined,
      variables: allValues,
      results: results || undefined,
    });

    setScenarioName('');
    setScenarioDescription('');
    setShowSaveModal(false);
  }, [scenarioName, scenarioDescription, variables, simulatedValues, results, onSaveScenario]);

  const handleLoadScenario = useCallback((scenario: SavedScenario) => {
    setSimulatedValues(scenario.variables);
    setSelectedScenario(scenario);
    if (scenario.results) {
      setResults(scenario.results);
    } else {
      setResults(null);
    }
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const formatValue = (value: number, unit: string, position?: 'before' | 'after') => {
    const formatted = value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    if (position === 'before') return `${unit}${formatted}`;
    return `${formatted}${unit}`;
  };

  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}%`;
  };

  const renderVariable = (variable: SimulationVariable) => {
    const value = getValue(variable.id);
    const hasChanged = simulatedValues[variable.id] !== undefined &&
      simulatedValues[variable.id] !== variable.currentValue;

    return (
      <div
        key={variable.id}
        className={cn(
          'p-3 rounded-lg border transition-colors',
          hasChanged ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <label className="text-sm font-medium text-gray-900">{variable.name}</label>
            {variable.description && (
              <p className="text-xs text-gray-500 mt-0.5">{variable.description}</p>
            )}
          </div>
          <div className="text-right">
            <span className={cn(
              'text-lg font-bold',
              hasChanged ? 'text-primary' : 'text-gray-900'
            )}>
              {formatValue(value, variable.unit, variable.unitPosition)}
            </span>
            {hasChanged && (
              <p className="text-xs text-gray-500">
                Base: {formatValue(variable.currentValue, variable.unit, variable.unitPosition)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-12 text-right">
            {variable.min ?? 0}{variable.unit}
          </span>
          <input
            type="range"
            min={variable.min ?? 0}
            max={variable.max ?? 100}
            step={variable.step ?? 1}
            value={value}
            onChange={(e) => handleValueChange(variable.id, parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-12">
            {variable.max ?? 100}{variable.unit}
          </span>
        </div>

        {/* Quick adjustment buttons */}
        <div className="flex items-center justify-center gap-1 mt-2">
          {[-10, -5, -1, 0, 1, 5, 10].map(delta => (
            <button
              key={delta}
              onClick={() => {
                const newValue = Math.max(
                  variable.min ?? -Infinity,
                  Math.min(variable.max ?? Infinity, value + delta)
                );
                handleValueChange(variable.id, newValue);
              }}
              className={cn(
                'px-2 py-0.5 text-xs rounded transition-colors',
                delta === 0
                  ? 'bg-gray-200 text-gray-700'
                  : delta > 0
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
              )}
            >
              {delta === 0 ? 'Base' : delta > 0 ? `+${delta}` : delta}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderResultCard = (result: SimulationResult) => {
    const Icon = result.status === 'positive' ? TrendingUp :
      result.status === 'negative' ? TrendingDown : Minus;

    const statusColors = {
      positive: 'text-green-600 bg-green-50 border-green-200',
      negative: 'text-red-600 bg-red-50 border-red-200',
      neutral: 'text-gray-600 bg-gray-50 border-gray-200',
    };

    return (
      <div
        key={result.kpiId}
        className={cn('p-4 rounded-lg border', statusColors[result.status])}
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">{result.kpiName}</span>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {result.simulatedValue.toLocaleString('fr-FR')}{result.unit}
          </span>
          <span className={cn(
            'text-sm font-medium',
            result.change >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {formatChange(result.changePercent)}
          </span>
        </div>

        {compareWithBase && (
          <p className="text-xs text-gray-500 mt-1">
            Base: {result.baseValue.toLocaleString('fr-FR')}{result.unit}
          </p>
        )}

        {/* Mini trend chart */}
        {result.trend && result.trend.length > 0 && (
          <div className="h-16 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.trend}>
                <Line
                  type="monotone"
                  dataKey="base"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="simulated"
                  stroke={result.status === 'positive' ? '#10b981' : result.status === 'negative' ? '#ef4444' : '#6b7280'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Simulateur What-If
            {selectedScenario && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {selectedScenario.name}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {savedScenarios.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-500'
                )}
                title="Scénarios sauvegardés"
              >
                <History className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setCompareWithBase(!compareWithBase)}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                compareWithBase ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-500'
              )}
              title={compareWithBase ? 'Masquer la comparaison' : 'Afficher la comparaison'}
            >
              {compareWithBase ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scenario history dropdown */}
        {showHistory && savedScenarios.length > 0 && (
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Scénarios sauvegardés</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {savedScenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className={cn(
                    'flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                    selectedScenario?.id === scenario.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-gray-100'
                  )}
                  onClick={() => handleLoadScenario(scenario)}
                >
                  <div>
                    <span className="text-sm font-medium">{scenario.name}</span>
                    <span className="text-xs text-gray-400 ml-2">{scenario.createdAt}</span>
                  </div>
                  {onDeleteScenario && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteScenario(scenario.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-200">
        {/* Variables panel */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Variables
            </h4>
            {hasChanges && (
              <button
                onClick={handleReset}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>

          <div className="space-y-3">
            {Object.entries(variablesByCategory).map(([category, vars]) => (
              <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-left"
                >
                  <span className="text-sm font-medium text-gray-700">{category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{vars.length} variable(s)</span>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedCategories.has(category) && (
                  <div className="p-3 space-y-3">
                    {vars.map(renderVariable)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSimulate}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Play className="w-4 h-4" />
              Simuler
            </button>
            {onSaveScenario && hasChanges && (
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            )}
          </div>
        </div>

        {/* Results panel */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4" />
            Résultats de simulation
          </h4>

          {results ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {results.filter(r => r.status === 'positive').length} améliorations
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {results.filter(r => r.status === 'negative').length} dégradations
                  </span>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {results.map(renderResultCard)}
              </div>

              {/* Detailed chart */}
              {results.length > 0 && results[0].trend && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    Évolution comparative - {results[0].kpiName}
                  </h5>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results[0].trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="base"
                          name="Scénario de base"
                          stroke="#9ca3af"
                          strokeWidth={2}
                          dot={{ fill: '#9ca3af' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="simulated"
                          name="Scénario simulé"
                          stroke="#1C3163"
                          strokeWidth={2}
                          dot={{ fill: '#1C3163' }}
                        />
                        <ReferenceLine y={0} stroke="#e5e7eb" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Export actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  Exporter
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                Ajustez les variables et cliquez sur "Simuler"<br />
                pour voir l'impact sur vos KPIs
              </p>
              {!hasChanges && (
                <p className="text-xs text-gray-400 mt-2">
                  Modifiez au moins une variable pour commencer
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save scenario modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Sauvegarder le scénario
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du scénario
                </label>
                <input
                  type="text"
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="ex: Croissance optimiste Q1 2025"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnelle)
                </label>
                <textarea
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Notes sur ce scénario..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveScenario}
                disabled={!scenarioName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatIfSimulator;
