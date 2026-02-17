import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { ClosurePeriod, ClosurePeriodStatus, ClosurePeriodType } from '../types/periodic-closures.types';
import { formatDate } from '@/shared/utils/formatters';

interface PeriodsTableProps {
  periods: ClosurePeriod[];
  loading?: boolean;
  onPeriodClick?: (period: ClosurePeriod) => void;
}

export const PeriodsTable: React.FC<PeriodsTableProps> = ({
  periods,
  loading,
  onPeriodClick
}) => {
  const getStatusBadge = (status: ClosurePeriodStatus) => {
    const styles = {
      'open': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'in_progress': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'closed': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'locked': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'approval_pending': 'bg-[var(--color-warning-lighter)] text-orange-800'
    };
    return styles[status];
  };

  const getTypeBadge = (type: ClosurePeriodType) => {
    const styles = {
      'monthly': 'bg-[var(--color-primary-lightest)] text-[var(--color-primary-dark)]',
      'quarterly': 'bg-purple-50 text-purple-700',
      'annual': 'bg-[var(--color-error-lightest)] text-[var(--color-error-dark)]'
    };
    const labels = {
      'monthly': 'Mensuelle',
      'quarterly': 'Trimestrielle',
      'annual': 'Annuelle'
    };
    return { style: styles[type], label: labels[type] };
  };

  const columns = [
    {
      key: 'period',
      label: 'Période',
      sortable: true,
      render: (row: ClosurePeriod) => (
        <div>
          <div className="font-medium text-[#191919]">{row.period}</div>
          <div className="text-sm text-[#767676]">Exercice {row.fiscal_year}</div>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row: ClosurePeriod) => {
        const { style, label } = getTypeBadge(row.type);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${style}`}>
            {label}
          </span>
        );
      }
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (row: ClosurePeriod) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
          {row.status.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'compliance',
      label: 'Conformité',
      sortable: true,
      render: (row: ClosurePeriod) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-[#ECECEC] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                row.syscohada_compliance_score >= 90 ? 'bg-[var(--color-success)]' :
                row.syscohada_compliance_score >= 75 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
              }`}
              style={{ width: `${row.syscohada_compliance_score}%` }}
            />
          </div>
          <span className="text-sm text-[#767676]">{row.syscohada_compliance_score}%</span>
        </div>
      )
    },
    {
      key: 'deadline',
      label: 'Échéance',
      sortable: true,
      render: (row: ClosurePeriod) => {
        if (!row.closure_deadline) return '-';
        const isOverdue = row.status !== 'closed' && new Date(row.closure_deadline) < new Date();
        return (
          <span className={isOverdue ? 'text-[var(--color-error)] font-semibold' : ''}>
            {formatDate(row.closure_deadline)}
          </span>
        );
      }
    },
    {
      key: 'approvals',
      label: 'Validations',
      render: (row: ClosurePeriod) => (
        <span className="text-sm">
          {row.approvals_received.length} / {row.approvals_required.length}
        </span>
      )
    },
    {
      key: 'duration',
      label: 'Durée',
      render: (row: ClosurePeriod) => row.total_duration || '-'
    }
  ];

  return (
    <DataTable
      data={periods}
      columns={columns}
      loading={loading}
      onRowClick={onPeriodClick}
      searchable
      searchPlaceholder="Rechercher une période..."
    />
  );
};