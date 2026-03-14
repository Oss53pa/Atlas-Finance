/**
 * PeriodSelector - Component for selecting data/report period coverage
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils/cn';
import { Calendar, ChevronDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface PeriodValue {
  start?: string;
  end?: string;
  label?: string;
  preset?: string;
}

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  className?: string;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  showPresets?: boolean;
}

// ============================================================================
// Presets
// ============================================================================

const getPresets = (t: (key: string) => string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3);

  return [
    {
      id: 'current_month',
      label: t('period.presets.currentMonth'),
      getValue: () => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        };
      },
    },
    {
      id: 'last_month',
      label: t('period.presets.lastMonth'),
      getValue: () => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        };
      },
    },
    {
      id: 'current_quarter',
      label: t('period.presets.currentQuarter'),
      getValue: () => {
        const start = new Date(year, quarter * 3, 1);
        const end = new Date(year, quarter * 3 + 3, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: `Q${quarter + 1} ${year}`,
        };
      },
    },
    {
      id: 'last_quarter',
      label: t('period.presets.lastQuarter'),
      getValue: () => {
        const q = quarter === 0 ? 3 : quarter - 1;
        const y = quarter === 0 ? year - 1 : year;
        const start = new Date(y, q * 3, 1);
        const end = new Date(y, q * 3 + 3, 0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: `Q${q + 1} ${y}`,
        };
      },
    },
    {
      id: 'current_year',
      label: t('period.presets.currentYear'),
      getValue: () => ({
        start: `${year}-01-01`,
        end: `${year}-12-31`,
        label: `${year}`,
      }),
    },
    {
      id: 'last_year',
      label: t('period.presets.lastYear'),
      getValue: () => ({
        start: `${year - 1}-01-01`,
        end: `${year - 1}-12-31`,
        label: `${year - 1}`,
      }),
    },
    {
      id: 'last_6_months',
      label: t('period.presets.last6Months'),
      getValue: () => {
        const end = new Date(year, month + 1, 0);
        const start = new Date(year, month - 5, 1);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: t('period.presets.last6Months'),
        };
      },
    },
    {
      id: 'last_12_months',
      label: t('period.presets.last12Months'),
      getValue: () => {
        const end = new Date(year, month + 1, 0);
        const start = new Date(year - 1, month + 1, 1);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          label: t('period.presets.last12Months'),
        };
      },
    },
  ];
};

// ============================================================================
// Component
// ============================================================================

const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  value = {},
  onChange,
  className,
  disabled = false,
  error,
  required = false,
  showPresets = true,
}) => {
  const { t } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mode, setMode] = useState<'preset' | 'custom'>(value?.preset ? 'preset' : 'custom');

  const presets = getPresets(t);

  const handlePresetSelect = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      const presetValue = preset.getValue();
      onChange({
        ...presetValue,
        preset: presetId,
      });
    }
    setShowDropdown(false);
  };

  const handleDateChange = (field: 'start' | 'end', dateValue: string) => {
    const newValue = {
      ...value,
      [field]: dateValue,
      preset: undefined,
    };

    // Auto-generate label if both dates are set
    if (newValue.start && newValue.end) {
      const start = new Date(newValue.start);
      const end = new Date(newValue.end);
      newValue.label = `${start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
    }

    onChange(newValue);
  };

  const handleLabelChange = (label: string) => {
    onChange({ ...value, label });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Toggle */}
      {showPresets && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('preset')}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              mode === 'preset'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {t('period.presetMode')}
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              mode === 'custom'
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {t('period.customMode')}
          </button>
        </div>
      )}

      {/* Preset Selector */}
      {mode === 'preset' && showPresets && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2.5 border rounded-lg flex items-center justify-between',
              'bg-white text-left transition-colors',
              disabled
                ? 'bg-gray-50 cursor-not-allowed'
                : 'hover:border-primary-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-200',
              error ? 'border-error' : 'border-gray-300'
            )}
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className={value.label ? 'text-gray-900' : 'text-gray-400'}>
                {value.label || t('period.selectPeriod')}
              </span>
            </div>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform', showDropdown && 'rotate-180')}
            />
          </button>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  className={cn(
                    'w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors',
                    value.preset === preset.id && 'bg-primary-50 text-primary-700'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Date Range */}
      {mode === 'custom' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('period.startDate')} {required && <span className="text-error">*</span>}
              </label>
              <input
                type="date"
                value={value.start || ''}
                onChange={(e) => handleDateChange('start', e.target.value)}
                disabled={disabled}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500',
                  disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white',
                  error ? 'border-error' : 'border-gray-300'
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('period.endDate')} {required && <span className="text-error">*</span>}
              </label>
              <input
                type="date"
                value={value.end || ''}
                onChange={(e) => handleDateChange('end', e.target.value)}
                disabled={disabled}
                min={value.start}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500',
                  disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white',
                  error ? 'border-error' : 'border-gray-300'
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('period.label')}
            </label>
            <input
              type="text"
              value={value.label || ''}
              onChange={(e) => handleLabelChange(e.target.value)}
              disabled={disabled}
              placeholder={t('period.labelPlaceholder')}
              className={cn(
                'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500',
                disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white',
                'border-gray-300'
              )}
            />
            <p className="mt-1 text-xs text-gray-500">{t('period.labelHint')}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && <p className="text-sm text-error">{error}</p>}

      {/* Display Current Selection */}
      {value.start && value.end && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-sm">
          <Calendar className="w-4 h-4 text-primary-600" />
          <span className="text-primary-700">
            {t('period.selected')}: <strong>{value.label}</strong>
            <span className="text-primary-500 ml-2">
              ({new Date(value.start).toLocaleDateString('fr-FR')} - {new Date(value.end).toLocaleDateString('fr-FR')})
            </span>
          </span>
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
