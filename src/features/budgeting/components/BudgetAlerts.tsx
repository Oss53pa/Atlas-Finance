// @ts-nocheck

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
            className="h-20 bg-[var(--color-surface-hover)] rounded-lg animate-pulse"
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
                <span className="text-xs font-normal text-[var(--color-text-tertiary)]">
                  {formatDate(alert.date, 'short')}
                </span>
              </div>
            }
          >
            <div className="space-y-2">
              <p className="text-sm">{alert.message}</p>

              <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)] pt-2 border-t border-[var(--color-border)]">
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
                <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--color-text-tertiary)]">Seuil: {formatCurrency(alert.threshold)}</span>
                    <span className={alert.currentValue > alert.threshold ? 'text-[#ef4444] font-semibold' : 'text-[var(--color-primary)]'}>
                      Actuel: {formatCurrency(alert.currentValue)}
                    </span>
                  </div>
                  <div className="mt-2 bg-[var(--color-surface-hover)] rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        alert.currentValue > alert.threshold
                          ? 'bg-[#ef4444]'
                          : 'bg-[var(--color-primary)]'
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
        <p className="text-sm text-center text-[var(--color-text-tertiary)]">
          +{alerts.length - maxDisplay} autres alertes
        </p>
      )}
    </div>
  );
};