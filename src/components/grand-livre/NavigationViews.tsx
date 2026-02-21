import React from 'react';

interface SearchResult {
  entries: Record<string, unknown>[];
  total_count: number;
  response_time_ms: number;
  suggestions: string[];
  aggregations: Record<string, unknown>;
  confidence_score: number;
  query_explanation?: string;
}

interface NavigationViewsProps {
  viewMode: string;
  searchResults: SearchResult;
}

const NavigationViews: React.FC<NavigationViewsProps> = ({ viewMode, searchResults }) => {
  return (
    <div className="bg-white rounded-lg border p-12 text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Vue {viewMode}
      </h3>
      <p className="text-gray-600">
        Cette vue est en cours de développement.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        {searchResults.total_count} résultats disponibles
      </p>
    </div>
  );
};

export default NavigationViews;