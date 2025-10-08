import React, { useState } from 'react';
import ModernButton from '../ui/ModernButton';

interface DateRange {
  start: string;
  end: string;
}

interface PeriodSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (dateRange: DateRange) => void;
  initialDateRange?: DateRange;
}

const PeriodSelectorModal: React.FC<PeriodSelectorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  initialDateRange = { start: '', end: '' }
}) => {
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);

  if (!isOpen) return null;

  const handleQuickPeriod = (type: 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'thisQuarter' | 'lastQuarter') => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        start = new Date(today.getFullYear() - 1, 0, 1);
        end = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case 'thisQuarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), currentQuarter * 3, 1);
        end = new Date(today.getFullYear(), currentQuarter * 3 + 3, 0);
        break;
      case 'lastQuarter':
        const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
        const year = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
        const quarter = lastQuarter < 0 ? 3 : lastQuarter;
        start = new Date(year, quarter * 3, 1);
        end = new Date(year, quarter * 3 + 3, 0);
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const handleApply = () => {
    onApply(dateRange);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Sélectionner une période
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82]"
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Périodes rapides :</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickPeriod('thisMonth')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#6A8A82]/5 hover:border-[#6A8A82] transition-colors"
              >
                Ce mois
              </button>
              <button
                onClick={() => handleQuickPeriod('lastMonth')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#6A8A82]/5 hover:border-[#6A8A82] transition-colors"
              >
                Mois dernier
              </button>
              <button
                onClick={() => handleQuickPeriod('thisQuarter')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#7A99AC]/5 hover:border-[#7A99AC] transition-colors"
              >
                Ce trimestre
              </button>
              <button
                onClick={() => handleQuickPeriod('lastQuarter')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#7A99AC]/5 hover:border-[#7A99AC] transition-colors"
              >
                Trimestre dernier
              </button>
              <button
                onClick={() => handleQuickPeriod('thisYear')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#B87333]/5 hover:border-[#B87333] transition-colors"
              >
                Cette année
              </button>
              <button
                onClick={() => handleQuickPeriod('lastYear')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-[#B87333]/5 hover:border-[#B87333] transition-colors"
              >
                Année dernière
              </button>
            </div>
          </div>

          {/* Affichage de la période sélectionnée */}
          {dateRange.start && dateRange.end && (
            <div className="bg-[#6A8A82]/5 border border-[#6A8A82]/20 rounded-lg p-3">
              <p className="text-sm text-gray-600">Période sélectionnée :</p>
              <p className="text-sm font-medium text-[#6A8A82]">
                Du {new Date(dateRange.start).toLocaleDateString('fr-FR')} au {new Date(dateRange.end).toLocaleDateString('fr-FR')}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <ModernButton
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Annuler
          </ModernButton>
          <ModernButton
            variant="primary"
            size="sm"
            onClick={handleApply}
            disabled={!dateRange.start || !dateRange.end}
          >
            Appliquer
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

export default PeriodSelectorModal;