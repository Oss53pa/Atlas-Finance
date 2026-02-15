import React from 'react';
import { Settings, CheckCircle } from 'lucide-react';

interface CycleGestionSectionProps {
  periodId?: string;
  onComplete?: () => void;
}

const CycleGestionSection: React.FC<CycleGestionSectionProps> = ({ periodId, onComplete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Cycle de Gestion</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          <Settings className="w-4 h-4 inline mr-1" />
          En cours
        </span>
      </div>

      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
            <Settings className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Cycle de Gestion</h3>
            <p className="text-gray-600 mb-4">Gestion des cycles comptables et des périodes</p>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Validé: 0</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">En attente: 0</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Progression</h4>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: '0%' }} />
        </div>
        <p className="text-sm text-gray-500 mt-2">0% complété</p>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          Voir détails
        </button>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
        >
          Valider
        </button>
      </div>
    </div>
  );
};

export default CycleGestionSection;
