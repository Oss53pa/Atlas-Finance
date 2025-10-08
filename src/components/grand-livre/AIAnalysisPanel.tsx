import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface SearchResult {
  entries: any[];
  total_count: number;
  confidence_score: number;
  aggregations: Record<string, any>;
}

interface AIAnalysisPanelProps {
  searchResults: SearchResult;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ searchResults }) => {
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <SparklesIcon className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-gray-900">Analyse IA</h3>
      </div>

      <div className="space-y-4">
        {/* Score de confiance */}
        <div className="p-3 bg-purple-50 rounded-lg">
          <div className="text-xs text-purple-700 mb-1">Score de confiance</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-purple-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${searchResults.confidence_score * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-purple-900">
              {(searchResults.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Insights */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Insights</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Solde débiteur détecté</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">ℹ</span>
              <span>{searchResults.total_count} écritures analysées</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">⚡</span>
              <span>Recherche optimisée par IA</span>
            </li>
          </ul>
        </div>

        {/* Totaux */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2">Totaux</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Débits:</span>
              <span className="font-medium text-green-600">
                {formatAmount(searchResults.aggregations.total_debit || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Crédits:</span>
              <span className="font-medium text-red-600">
                {formatAmount(searchResults.aggregations.total_credit || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisPanel;