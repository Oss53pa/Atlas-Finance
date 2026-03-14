import React from 'react';
import { cn } from '@/utils/cn';
import { Insight } from '@/types/reportStudio';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Lightbulb,
} from 'lucide-react';

interface InsightsListProps {
  insights: Insight[];
  onAction: (insight: Insight) => void;
}

export const InsightsList: React.FC<InsightsListProps> = ({ insights, onAction }) => {
  if (insights.length === 0) {
    return (
      <p className="text-sm text-primary-500 italic">Aucun insight détecté</p>
    );
  }

  const typeIcons: Record<string, React.ElementType> = {
    positive: TrendingUp,
    negative: TrendingDown,
    warning: AlertTriangle,
    info: Info,
    opportunity: Lightbulb,
  };

  const priorityColors = {
    high: 'border-l-gray-500',
    medium: 'border-l-gray-400',
    low: 'border-l-gray-300',
  };

  return (
    <div className="space-y-2">
      {insights.map((insight) => {
        const IconComponent = typeIcons[insight.type] || Info;
        return (
          <button
            key={insight.id}
            onClick={() => onAction(insight)}
            className={cn(
              'w-full p-3 bg-primary-50 rounded-lg text-left hover:bg-primary-100 transition-colors border-l-4',
              priorityColors[insight.priority]
            )}
          >
            <div className="flex items-start gap-2">
              <IconComponent className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-900 truncate">
                  {insight.title}
                </p>
                <p className="text-xs text-primary-500 mt-0.5 line-clamp-2">
                  {insight.description}
                </p>
                {insight.value && (
                  <p className="text-xs font-semibold text-primary mt-1">
                    {insight.value}
                    {insight.change !== undefined && (
                      <span className={cn(
                        'ml-2',
                        insight.change > 0 ? 'text-gray-600' : 'text-gray-500'
                      )}>
                        ({insight.change > 0 ? '+' : ''}{insight.change}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <span className="text-xs text-primary-400">
                {Math.round(insight.confidence * 100)}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
