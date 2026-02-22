import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, Edit, Trash2, CheckCircle, Clock, FileText } from 'lucide-react';
import { BudgetSession } from '../types/budgeting.types';

interface SessionsTableProps {
  sessions: BudgetSession[];
  loading?: boolean;
  onView?: (session: BudgetSession) => void;
  onEdit?: (session: BudgetSession) => void;
  onDelete?: (session: BudgetSession) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string; icon?: React.ReactNode }> = {
    active: {
      variant: 'success',
      label: 'Active',
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    },
    closed: {
      variant: 'neutral',
      label: 'Clôturée',
      icon: <FileText className="w-3 h-3 mr-1" />,
    },
    draft: {
      variant: 'warning',
      label: t('accounting.draft'),
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    pending: {
      variant: 'warning',
      label: t('status.pending'),
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
  };

  const config = variants[status] || { variant: 'neutral' as const, label: status };

  return (
    <Badge variant={config.variant}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  loading,
  onView,
  onEdit,
  onDelete,
}) => {
  const { t } = useLanguage();
  const columns: Column<BudgetSession>[] = [
    {
      key: 'year',
      header: 'Année',
      sortable: true,
      width: '100px',
    },
    {
      key: 'department',
      header: 'Département',
      sortable: true,
    },
    {
      key: 'period',
      header: 'Période',
      sortable: true,
      width: '120px',
    },
    {
      key: 'startDate',
      header: 'Date Début',
      sortable: true,
    },
    {
      key: 'endDate',
      header: 'Date Fin',
      sortable: true,
    },
    {
      key: 'progress',
      header: 'Progression',
      render: (value) => {
        const progress = value as number;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#F5F5F5] rounded-full h-2 min-w-[80px]">
              <div
                className="bg-[#171717] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[#171717] w-10 text-right">
              {progress}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
      align: 'center',
    },
    {
      key: 'createdBy',
      header: 'Créé par',
      sortable: true,
    },
  ];

  return (
    <DataTable
      data={sessions}
      columns={columns}
      loading={loading}
      onRowClick={onView}
      actions={
        onView || onEdit || onDelete
          ? (session) => (
              <>
                {onView && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(session);
                    }}
                  >
                    Voir
                  </Button>
                )}
                {onEdit && session.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(session);
                    }}
                  >
                    Éditer
                  </Button>
                )}
                {onDelete && session.status !== 'closed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session);
                    }}
                  >
                    Supprimer
                  </Button>
                )}
              </>
            )
          : undefined
      }
      striped
      hoverable
    />
  );
};