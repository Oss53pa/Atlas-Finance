import React from 'react';
import { cn } from '@/utils/cn';
import { Recommendation } from '@/types/reportStudio';

interface RecommendationsListProps {
  recommendations: Recommendation[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onModify: (id: string) => void;
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  onAccept,
  onReject,
  onModify,
}) => {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">Aucune recommandation</p>
    );
  }

  const priorityConfig = {
    critical: { color: 'text-red-600', bg: 'bg-red-50' },
    high: { color: 'text-orange-600', bg: 'bg-orange-50' },
    medium: { color: 'text-blue-600', bg: 'bg-blue-50' },
    low: { color: 'text-gray-600', bg: 'bg-gray-50' },
  };

  const statusConfig = {
    pending: { icon: '○', label: 'En attente' },
    accepted: { icon: '✓', label: 'Acceptée' },
    rejected: { icon: '✗', label: 'Rejetée' },
    modified: { icon: '✎', label: 'Modifiée' },
  };

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => {
        const priority = priorityConfig[rec.priority];
        const status = statusConfig[rec.status];

        return (
          <div
            key={rec.id}
            className={cn(
              'p-3 rounded-lg border',
              rec.status === 'accepted' && 'bg-green-50 border-green-200',
              rec.status === 'rejected' && 'bg-gray-100 border-gray-200 opacity-60',
              rec.status === 'pending' && 'bg-white border-gray-200',
              rec.status === 'modified' && 'bg-blue-50 border-blue-200'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', priority.bg, priority.color)}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <span className="text-xs text-gray-400">
                    {status.icon} {status.label}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mt-1">
                  {rec.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {rec.description}
                </p>

                {/* Impact & Effort indicators */}
                <div className="flex gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Impact:</span>
                    <ImpactDots level={rec.impact} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">Effort:</span>
                    <ImpactDots level={rec.effort} color="orange" />
                  </div>
                </div>

                {rec.timeline && (
                  <p className="text-xs text-gray-400 mt-1">
                    Timeline: {rec.timeline}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            {rec.status === 'pending' && (
              <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => onAccept(rec.id)}
                  className="flex-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                >
                  Accepter
                </button>
                <button
                  onClick={() => onModify(rec.id)}
                  className="flex-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                >
                  Modifier
                </button>
                <button
                  onClick={() => onReject(rec.id)}
                  className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                >
                  Rejeter
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Helper component for impact/effort visualization
const ImpactDots: React.FC<{ level: 'high' | 'medium' | 'low'; color?: string }> = ({
  level,
  color = 'green',
}) => {
  const levels = { high: 3, medium: 2, low: 1 };
  const count = levels[level];
  const colors = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i <= count ? colors[color as keyof typeof colors] : 'bg-gray-200'
          )}
        />
      ))}
    </div>
  );
};
