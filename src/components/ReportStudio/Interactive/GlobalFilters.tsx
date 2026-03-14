/**
 * GlobalFilters - Filtres dynamiques globaux pour les rapports
 * Permet de filtrer tout le rapport par période, zone géographique, segment, etc.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import {
  Filter,
  Calendar,
  MapPin,
  Tag,
  Building2,
  Users,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  RotateCcw,
  Save,
  Clock,
  Search,
  Bookmark,
  BookmarkCheck,
  Sliders
} from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  type: 'single' | 'multi' | 'range' | 'date-range';
  options?: FilterOption[];
  range?: { min: number; max: number; step?: number; unit?: string };
}

export interface ActiveFilter {
  categoryId: string;
  values: string[];
  rangeValues?: { min: number; max: number };
  dateRange?: { start: string; end: string };
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: ActiveFilter[];
  createdAt: string;
  isDefault?: boolean;
}

interface GlobalFiltersProps {
  categories: FilterCategory[];
  activeFilters: ActiveFilter[];
  savedPresets?: SavedFilterPreset[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  onSavePreset?: (name: string, filters: ActiveFilter[]) => void;
  onLoadPreset?: (preset: SavedFilterPreset) => void;
  onDeletePreset?: (presetId: string) => void;
  compact?: boolean;
  className?: string;
}

// Default filter categories for reports
export const defaultFilterCategories: FilterCategory[] = [
  {
    id: 'period',
    name: 'Période',
    icon: <Calendar className="w-4 h-4" />,
    type: 'date-range',
  },
  {
    id: 'geography',
    name: 'Zone géographique',
    icon: <MapPin className="w-4 h-4" />,
    type: 'multi',
    options: [
      { id: 'france', label: 'France', count: 45 },
      { id: 'europe', label: 'Europe (hors France)', count: 28 },
      { id: 'amerique-nord', label: 'Amérique du Nord', count: 15 },
      { id: 'asie', label: 'Asie-Pacifique', count: 12 },
      { id: 'afrique', label: 'Afrique', count: 8 },
      { id: 'amerique-sud', label: 'Amérique du Sud', count: 5 },
    ],
  },
  {
    id: 'segment',
    name: 'Segment',
    icon: <Tag className="w-4 h-4" />,
    type: 'multi',
    options: [
      { id: 'retail', label: 'Retail', count: 32 },
      { id: 'b2b', label: 'B2B', count: 28 },
      { id: 'e-commerce', label: 'E-commerce', count: 24 },
      { id: 'wholesale', label: 'Wholesale', count: 18 },
      { id: 'services', label: 'Services', count: 11 },
    ],
  },
  {
    id: 'entity',
    name: 'Entité',
    icon: <Building2 className="w-4 h-4" />,
    type: 'multi',
    options: [
      { id: 'groupe', label: 'Groupe consolidé', count: 1 },
      { id: 'france-sas', label: 'France SAS', count: 1 },
      { id: 'europe-holding', label: 'Europe Holding', count: 1 },
      { id: 'us-inc', label: 'US Inc.', count: 1 },
      { id: 'asia-ltd', label: 'Asia Ltd.', count: 1 },
    ],
  },
  {
    id: 'client',
    name: 'Client',
    icon: <Users className="w-4 h-4" />,
    type: 'multi',
    options: [
      { id: 'carrefour', label: 'Carrefour', count: 156 },
      { id: 'leclerc', label: 'E.Leclerc', count: 142 },
      { id: 'auchan', label: 'Auchan', count: 98 },
      { id: 'casino', label: 'Casino', count: 87 },
      { id: 'intermarche', label: 'Intermarché', count: 76 },
    ],
  },
  {
    id: 'revenue',
    name: 'Chiffre d\'affaires',
    icon: <TrendingUp className="w-4 h-4" />,
    type: 'range',
    range: { min: 0, max: 10000000, step: 100000, unit: '€' },
  },
];

export const GlobalFilters: React.FC<GlobalFiltersProps> = ({
  categories,
  activeFilters,
  savedPresets = [],
  onFilterChange,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  compact = false,
  className,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showAllFilters, setShowAllFilters] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getActiveFilter = (categoryId: string): ActiveFilter | undefined => {
    return activeFilters.find(f => f.categoryId === categoryId);
  };

  const updateFilter = useCallback((categoryId: string, update: Partial<ActiveFilter>) => {
    const existing = activeFilters.find(f => f.categoryId === categoryId);
    let newFilters: ActiveFilter[];

    if (existing) {
      newFilters = activeFilters.map(f =>
        f.categoryId === categoryId ? { ...f, ...update } : f
      );
    } else {
      newFilters = [...activeFilters, { categoryId, values: [], ...update }];
    }

    // Remove empty filters
    newFilters = newFilters.filter(f =>
      f.values.length > 0 || f.rangeValues || f.dateRange
    );

    onFilterChange(newFilters);
  }, [activeFilters, onFilterChange]);

  const toggleOption = useCallback((categoryId: string, optionId: string, isMulti: boolean) => {
    const existing = getActiveFilter(categoryId);
    let newValues: string[];

    if (isMulti) {
      if (existing?.values.includes(optionId)) {
        newValues = existing.values.filter(v => v !== optionId);
      } else {
        newValues = [...(existing?.values || []), optionId];
      }
    } else {
      newValues = existing?.values.includes(optionId) ? [] : [optionId];
    }

    updateFilter(categoryId, { values: newValues });
  }, [getActiveFilter, updateFilter]);

  const clearFilter = useCallback((categoryId: string) => {
    onFilterChange(activeFilters.filter(f => f.categoryId !== categoryId));
  }, [activeFilters, onFilterChange]);

  const clearAllFilters = useCallback(() => {
    onFilterChange([]);
  }, [onFilterChange]);

  const handleSavePreset = useCallback(() => {
    if (presetName.trim() && onSavePreset) {
      onSavePreset(presetName.trim(), activeFilters);
      setPresetName('');
      setShowPresetModal(false);
    }
  }, [presetName, activeFilters, onSavePreset]);

  const activeFilterCount = activeFilters.length;

  const filteredOptions = (category: FilterCategory) => {
    const term = searchTerms[category.id]?.toLowerCase() || '';
    if (!term || !category.options) return category.options;
    return category.options.filter(o =>
      o.label.toLowerCase().includes(term)
    );
  };

  const formatRange = (value: number, unit?: string) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M${unit || ''}`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K${unit || ''}`;
    return `${value}${unit || ''}`;
  };

  const renderCategoryContent = (category: FilterCategory) => {
    const filter = getActiveFilter(category.id);

    switch (category.type) {
      case 'single':
      case 'multi':
        const options = filteredOptions(category) || [];
        return (
          <div className="p-3 space-y-2">
            {/* Search */}
            {(category.options?.length || 0) > 5 && (
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerms[category.id] || ''}
                  onChange={(e) => setSearchTerms(prev => ({ ...prev, [category.id]: e.target.value }))}
                  placeholder="Rechercher..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {/* Options */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {options.map(option => {
                const isSelected = filter?.values.includes(option.id);
                return (
                  <button
                    key={option.id}
                    onClick={() => toggleOption(category.id, option.id, category.type === 'multi')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                      isSelected
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {category.type === 'multi' && (
                        <div className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                      {option.label}
                    </span>
                    {option.count !== undefined && (
                      <span className="text-xs text-gray-400">{option.count}</span>
                    )}
                  </button>
                );
              })}
              {options.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-2">Aucun résultat</p>
              )}
            </div>
          </div>
        );

      case 'date-range':
        return (
          <div className="p-3 space-y-3">
            {/* Quick presets */}
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'today', label: 'Aujourd\'hui' },
                { id: 'week', label: 'Cette semaine' },
                { id: 'month', label: 'Ce mois' },
                { id: 'quarter', label: 'Ce trimestre' },
                { id: 'year', label: 'Cette année' },
                { id: 'last-year', label: 'Année dernière' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    // Calculate date range based on preset
                    const now = new Date();
                    let start: Date, end: Date = now;

                    switch (preset.id) {
                      case 'today':
                        start = now;
                        break;
                      case 'week':
                        start = new Date(now.setDate(now.getDate() - now.getDay()));
                        break;
                      case 'month':
                        start = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                      case 'quarter':
                        const quarter = Math.floor(now.getMonth() / 3);
                        start = new Date(now.getFullYear(), quarter * 3, 1);
                        break;
                      case 'year':
                        start = new Date(now.getFullYear(), 0, 1);
                        break;
                      case 'last-year':
                        start = new Date(now.getFullYear() - 1, 0, 1);
                        end = new Date(now.getFullYear() - 1, 11, 31);
                        break;
                      default:
                        start = now;
                    }

                    updateFilter(category.id, {
                      dateRange: {
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0],
                      },
                    });
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Du</label>
                <input
                  type="date"
                  value={filter?.dateRange?.start || ''}
                  onChange={(e) => updateFilter(category.id, {
                    dateRange: {
                      start: e.target.value,
                      end: filter?.dateRange?.end || e.target.value,
                    },
                  })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Au</label>
                <input
                  type="date"
                  value={filter?.dateRange?.end || ''}
                  onChange={(e) => updateFilter(category.id, {
                    dateRange: {
                      start: filter?.dateRange?.start || e.target.value,
                      end: e.target.value,
                    },
                  })}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'range':
        const range = category.range!;
        const currentMin = filter?.rangeValues?.min ?? range.min;
        const currentMax = filter?.rangeValues?.max ?? range.max;

        return (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{formatRange(currentMin, range.unit)}</span>
              <span className="text-gray-600">{formatRange(currentMax, range.unit)}</span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step || 1}
                value={currentMin}
                onChange={(e) => updateFilter(category.id, {
                  rangeValues: { min: Number(e.target.value), max: currentMax },
                })}
                className="w-full"
              />
              <input
                type="range"
                min={range.min}
                max={range.max}
                step={range.step || 1}
                value={currentMax}
                onChange={(e) => updateFilter(category.id, {
                  rangeValues: { min: currentMin, max: Number(e.target.value) },
                })}
                className="w-full"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCategory = (category: FilterCategory) => {
    const isExpanded = expandedCategories.has(category.id);
    const filter = getActiveFilter(category.id);
    const hasActiveFilter = filter && (
      filter.values.length > 0 ||
      filter.rangeValues ||
      filter.dateRange
    );

    return (
      <div key={category.id} className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleCategory(category.id)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors',
            isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'
          )}
        >
          <span className="flex items-center gap-2">
            <span className={hasActiveFilter ? 'text-primary' : 'text-gray-500'}>
              {category.icon}
            </span>
            <span className={cn(
              'text-sm font-medium',
              hasActiveFilter ? 'text-primary' : 'text-gray-700'
            )}>
              {category.name}
            </span>
            {hasActiveFilter && (
              <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {filter.values.length || 1}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {hasActiveFilter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFilter(category.id);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </button>

        {isExpanded && renderCategoryContent(category)}
      </div>
    );
  };

  // Compact mode - just show active filters as chips
  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <button
          onClick={() => setShowAllFilters(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors"
        >
          <Filter className="w-4 h-4 text-gray-600" />
          Filtres
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilters.map(filter => {
          const category = categories.find(c => c.id === filter.categoryId);
          if (!category) return null;

          let label = '';
          if (filter.values.length > 0) {
            const options = category.options?.filter(o => filter.values.includes(o.id));
            label = options?.map(o => o.label).join(', ') || '';
          } else if (filter.dateRange) {
            label = `${filter.dateRange.start} - ${filter.dateRange.end}`;
          } else if (filter.rangeValues) {
            label = `${formatRange(filter.rangeValues.min, category.range?.unit)} - ${formatRange(filter.rangeValues.max, category.range?.unit)}`;
          }

          return (
            <div
              key={filter.categoryId}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm"
            >
              {category.icon}
              <span className="max-w-[150px] truncate">{label}</span>
              <button
                onClick={() => clearFilter(filter.categoryId)}
                className="p-0.5 hover:bg-primary/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Effacer tout
          </button>
        )}

        {/* Full filters modal */}
        {showAllFilters && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Filtres
                </h3>
                <button onClick={() => setShowAllFilters(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {categories.map(renderCategory)}
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex justify-between">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => setShowAllFilters(false)}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-primary" />
            Filtres
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {activeFilterCount} actif(s)
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {onSavePreset && activeFilterCount > 0 && (
              <button
                onClick={() => setShowPresetModal(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                title="Sauvegarder ce filtre"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            )}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        {/* Saved presets */}
        {savedPresets.length > 0 && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {savedPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => onLoadPreset?.(preset)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs whitespace-nowrap transition-colors"
              >
                {preset.isDefault && <BookmarkCheck className="w-3 h-3 text-primary" />}
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter categories */}
      <div className="p-4 space-y-2">
        {categories.map(renderCategory)}
      </div>

      {/* Active filters summary */}
      {activeFilters.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Filtres actifs:</p>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map(filter => {
              const category = categories.find(c => c.id === filter.categoryId);
              if (!category) return null;

              let label = '';
              if (filter.values.length > 0) {
                const count = filter.values.length;
                const firstOption = category.options?.find(o => o.id === filter.values[0]);
                label = count > 1
                  ? `${firstOption?.label} +${count - 1}`
                  : firstOption?.label || '';
              } else if (filter.dateRange) {
                label = `${filter.dateRange.start} → ${filter.dateRange.end}`;
              } else if (filter.rangeValues) {
                const unit = category.range?.unit || '';
                label = `${formatRange(filter.rangeValues.min, unit)} - ${formatRange(filter.rangeValues.max, unit)}`;
              }

              return (
                <div
                  key={filter.categoryId}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs"
                >
                  <span className="text-primary">{category.icon}</span>
                  <span className="text-gray-700">{category.name}:</span>
                  <span className="font-medium text-gray-900">{label}</span>
                  <button
                    onClick={() => clearFilter(filter.categoryId)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save preset modal */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Sauvegarder le filtre
            </h3>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Nom du preset..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
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

export default GlobalFilters;
