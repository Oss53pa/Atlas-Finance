import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, CheckCircle, Clock } from 'lucide-react';
import { ClotureSession } from '../types/closures.types';
import { formatDate } from '@/shared/utils/formatters';

interface ClotureSessionsTableProps {
  sessions: ClotureSession[];
  loading?: boolean;
  onViewSession?: (session: ClotureSession) => void;
}

const getStatusBadge = (statut: string) => {
  const variants: Record<
    string,
    { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string; icon?: React.ReactNode }
  > = {
    EN_COURS: {
      variant: 'warning',
      label: t('status.inProgress'),
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    VALIDEE: {
      variant: 'success',
      label: 'Validée',
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    },
    CLOTUREE: {
      variant: 'neutral',
      label: 'Clôturée',
    },
    ANNULEE: {
      variant: 'error',
      label: 'Annulée',
    },
  };

  const config = variants[statut] || { variant: 'neutral' as const, label: statut };

  return (
    <Badge variant={config.variant}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

const getTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    MENSUELLE: 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
    TRIMESTRIELLE: 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
    SEMESTRIELLE: 'bg-[var(--color-warning-lighter)] text-yellow-800',
    ANNUELLE: 'bg-purple-100 text-purple-800',
    SPECIALE: 'bg-[var(--color-warning-lighter)] text-orange-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[type] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'}`}>
      {type}
    </span>
  );
};

export const ClotureSessionsTable: React.FC<ClotureSessionsTableProps> = ({
  const { t } = useLanguage();
  sessions,
  loading,
  onViewSession,
}) => {
  const columns: Column<ClotureSession>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => getTypeBadge(value as string),
      width: '150px',
    },
    {
      key: 'periode',
      header: 'Période',
      sortable: true,
    },
    {
      key: 'exercice',
      header: 'Exercice',
      sortable: true,
      width: '100px',
    },
    {
      key: 'dateDebut',
      header: 'Date Début',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'dateFin',
      header: 'Date Fin',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'progression',
      header: 'Progression',
      render: (value) => {
        const progress = value as number;
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#F5F5F5] rounded-full h-2 min-w-[80px]">
              <div
                className="bg-[#6A8A82] h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[#191919] w-10 text-right">
              {progress}%
            </span>
          </div>
        );
      },
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
      align: 'center',
    },
    {
      key: 'creePar',
      header: 'Créé par',
      sortable: true,
    },
  ];

  return (
    <DataTable
      data={sessions}
      columns={columns}
      loading={loading}
      onRowClick={onViewSession}
      actions={
        onViewSession
          ? (session) => (
              <Button
                size="sm"
                variant="ghost"
                icon={Eye}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSession(session);
                }}
              >
                Consulter
              </Button>
            )
          : undefined
      }
      striped
      hoverable
    />
  );
};