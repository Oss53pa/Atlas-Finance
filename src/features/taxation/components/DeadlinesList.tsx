import React from 'react';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { Echeance } from '../types/taxation.types';
import { formatDate } from '@/shared/utils/formatters';

interface DeadlinesListProps {
  deadlines: Echeance[];
  loading?: boolean;
}

export const DeadlinesList: React.FC<DeadlinesListProps> = ({ deadlines, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  if (deadlines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-700">
        <Calendar className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>Aucune échéance à venir</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deadlines.map((deadline) => {
        const isUrgent = deadline.jours_restants <= 3;
        const isWarning = deadline.jours_restants > 3 && deadline.jours_restants <= 7;

        return (
          <div
            key={deadline.obligation_id}
            className={`p-4 rounded-lg border ${
              isUrgent
                ? 'border-red-200 bg-red-50'
                : isWarning
                ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isUrgent && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <h3 className="font-medium text-gray-900">
                    {deadline.type_declaration}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(deadline.date_echeance)}
                  </span>
                  {deadline.responsable && (
                    <span className="text-gray-700">• {deadline.responsable}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-lg font-bold ${
                    isUrgent
                      ? 'text-red-600'
                      : isWarning
                      ? 'text-amber-600'
                      : 'text-gray-900'
                  }`}
                >
                  {deadline.jours_restants}
                </div>
                <div className="text-xs text-gray-700">
                  {deadline.jours_restants === 1 ? 'jour' : 'jours'}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};