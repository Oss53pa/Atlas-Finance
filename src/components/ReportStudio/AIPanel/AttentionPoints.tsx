import React from 'react';
import { cn } from '@/utils/cn';
import { AttentionPoint } from '@/types/reportStudio';
import {
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface AttentionPointsProps {
  points: AttentionPoint[];
  onAction: (point: AttentionPoint) => void;
}

export const AttentionPoints: React.FC<AttentionPointsProps> = ({ points, onAction }) => {
  if (points.length === 0) {
    return (
      <p className="text-sm text-primary-500 italic">Aucun point d&apos;attention</p>
    );
  }

  const severityConfig: Record<string, { bg: string; border: string; icon: React.ElementType; text: string }> = {
    critical: {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      icon: AlertCircle,
      text: 'text-gray-800',
    },
    warning: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: AlertTriangle,
      text: 'text-gray-700',
    },
    info: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: Info,
      text: 'text-gray-600',
    },
  };

  return (
    <div className="space-y-2">
      {points.map((point) => {
        const config = severityConfig[point.severity] || severityConfig.info;
        const IconComponent = config.icon;
        return (
          <button
            key={point.id}
            onClick={() => onAction(point)}
            className={cn(
              'w-full p-3 rounded-lg text-left border transition-colors hover:shadow-sm',
              config.bg,
              config.border
            )}
          >
            <div className="flex items-start gap-2">
              <IconComponent className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', config.text)}>
                  {point.title}
                </p>
                <p className="text-xs text-primary-600 mt-0.5 line-clamp-2">
                  {point.description}
                </p>
                {point.relatedSection && (
                  <p className="text-xs text-primary-400 mt-1">
                    Section: {point.relatedSection}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
