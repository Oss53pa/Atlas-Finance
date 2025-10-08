import React from 'react';
import { Alert } from '@/shared/components/ui/Alert';
import { BudgetAlert } from '../types/budgeting.types';
import { formatDate, formatCurrency } from '@/shared/utils/formatters';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  loading?: boolean;
  maxDisplay?: number;
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({
  alerts,
  loading,
  maxDisplay,
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-[#F5F5F5] rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Alert variant="info" title="Aucune alerte">
        Tous les budgets sont conformes aux prévisions.
      </Alert>
    );
  }

  const displayedAlerts = maxDisplay ? alerts.slice(0, maxDisplay) : alerts;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'danger':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  return (
    <div className="space-y-3">
      {displayedAlerts.map((alert) => {
        const Icon = getAlertIcon(alert.type);

        return (
          <Alert
            key={alert.id}
            variant={alert.type === 'danger' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
            title={
              <div className="flex items-center justify-between">
                <span>{alert.title}</span>
                <span className="text-xs font-normal text-[#767676]">
                  {formatDate(alert.date, 'short')}
                </span>
              </div>
            }
          >
            <div className="space-y-2">
              <p className="text-sm">{alert.message}</p>

              <div className="flex items-center gap-4 text-xs text-[#767676] pt-2 border-t border-[#D9D9D9]">
                <span>
                  <strong>Département:</strong> {alert.department}
                </span>
                {alert.accountCode && (
                  <span>
                    <strong>Compte:</strong> {alert.accountCode}
                  </span>
                )}
              </div>

              {alert.threshold && alert.currentValue && (
                <div className="mt-2 pt-2 border-t border-[#D9D9D9]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#767676]">Seuil: {formatCurrency(alert.threshold)}</span>
                    <span className={alert.currentValue > alert.threshold ? 'text-[#B85450] font-semibold' : 'text-[#6A8A82]'}>
                      Actuel: {formatCurrency(alert.currentValue)}
                    </span>
                  </div>
                  <div className="mt-2 bg-[#F5F5F5] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        alert.currentValue > alert.threshold
                          ? 'bg-[#B85450]'
                          : 'bg-[#6A8A82]'
                      }`}
                      style={{
                        width: `${Math.min((alert.currentValue / alert.threshold) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </Alert>
        );
      })}

      {maxDisplay && alerts.length > maxDisplay && (
        <p className="text-sm text-center text-[#767676]">
          +{alerts.length - maxDisplay} autres alertes
        </p>
      )}
    </div>
  );
};