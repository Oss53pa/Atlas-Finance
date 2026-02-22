import React from 'react';
import { Action } from '../types/recovery.types';
import { formatDate } from '@/shared/utils/formatters';
import { Mail, MessageSquare, Phone, FileText, User, Clock } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';

interface ActionsHistoryProps {
  actions: Action[];
  loading?: boolean;
}

const getActionIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    email: <Mail className="w-4 h-4" />,
    sms: <MessageSquare className="w-4 h-4" />,
    appel: <Phone className="w-4 h-4" />,
    courrier: <FileText className="w-4 h-4" />,
    visite: <User className="w-4 h-4" />,
  };

  return icons[type] || <Clock className="w-4 h-4" />;
};

const getActionColor = (type: string) => {
  const colors: Record<string, string> = {
    email: '#737373',
    sms: '#525252',
    appel: '#171717',
    courrier: '#737373',
    visite: '#171717',
  };

  return colors[type] || '#737373';
};

const getActionLabel = (type: string) => {
  const labels: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    appel: 'Appel',
    courrier: 'Courrier',
    visite: 'Visite',
  };

  return labels[type] || type;
};

export const ActionsHistory: React.FC<ActionsHistoryProps> = ({ actions, loading }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-[#F5F5F5] rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#F5F5F5] rounded w-1/4" />
                <div className="h-3 bg-[#F5F5F5] rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!actions || actions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-[#d4d4d4] mx-auto mb-3" />
        <p className="text-[#737373]">Aucune action enregistrée</p>
      </div>
    );
  }

  const sortedActions = [...actions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-1">
      {sortedActions.map((action, index) => {
        const isLast = index === sortedActions.length - 1;
        const color = getActionColor(action.type);

        return (
          <div key={action.id} className="flex gap-4 relative">
            {!isLast && (
              <div
                className="absolute left-5 top-10 bottom-0 w-0.5"
                style={{ backgroundColor: '#E5E5E5' }}
              />
            )}

            <div
              className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {getActionIcon(action.type)}
            </div>

            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="neutral">{getActionLabel(action.type)}</Badge>
                    <span className="text-sm font-medium text-[#171717]">
                      {action.auteur}
                    </span>
                  </div>
                  <p className="text-xs text-[#737373]">
                    {formatDate(action.date, 'long')}
                  </p>
                </div>
              </div>

              {action.description && (
                <div className="bg-[#F5F5F5] border border-[#d4d4d4] rounded-lg p-3 mt-2">
                  <p className="text-sm text-[#171717] whitespace-pre-wrap">
                    {action.description}
                  </p>
                </div>
              )}

              {action.resultat && (
                <div className="mt-2">
                  <span className="text-xs font-medium text-[#737373]">Résultat: </span>
                  <span className="text-xs text-[#171717]">{action.resultat}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};