import React from 'react';

interface Filters {
  account_classes: string[];
  date_from: string;
  date_to: string;
  amount_min: string;
  amount_max: string;
  journal_codes: string[];
  tags: string[];
}

interface AdvancedFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onApply: () => void;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ filters, onChange, onApply }) => {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtres Avancés</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date de début */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de début
          </label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Date de fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date de fin
          </label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Montant min */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant minimum
          </label>
          <input
            type="number"
            value={filters.amount_min}
            onChange={(e) => onChange({ ...filters, amount_min: e.target.value })}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Montant max */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Montant maximum
          </label>
          <input
            type="number"
            value={filters.amount_max}
            onChange={(e) => onChange({ ...filters, amount_max: e.target.value })}
            placeholder="∞"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end space-x-3">
        <button
          onClick={() => onChange({
            account_classes: [],
            date_from: '',
            date_to: '',
            amount_min: '',
            amount_max: '',
            journal_codes: [],
            tags: []
          })}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          Réinitialiser
        </button>
        <button
          onClick={onApply}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Appliquer
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilters;