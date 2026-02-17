import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, Edit, CheckCircle, Clock } from 'lucide-react';
import { AssetMaintenance } from '../types/assets.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

interface MaintenancesTableProps {
  maintenances: AssetMaintenance[];
  loading?: boolean;
  onView?: (maintenance: AssetMaintenance) => void;
  onEdit?: (maintenance: AssetMaintenance) => void;
  onComplete?: (maintenance: AssetMaintenance) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<
    string,
    { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string; icon?: React.ReactNode }
  > = {
    scheduled: {
      variant: 'warning',
      label: 'Planifiée',
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    in_progress: {
      variant: 'warning',
      label: t('status.inProgress'),
      icon: <Clock className="w-3 h-3 mr-1" />,
    },
    completed: {
      variant: 'success',
      label: 'Terminée',
      icon: <CheckCircle className="w-3 h-3 mr-1" />,
    },
    cancelled: {
      variant: 'neutral',
      label: 'Annulée',
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

const getTypeBadge = (type: string) => {
  const variants: Record<string, { variant: 'success' | 'warning' | 'error' | 'neutral'; label: string }> = {
    preventive: { variant: 'success', label: 'Préventive' },
    corrective: { variant: 'error', label: 'Corrective' },
    inspection: { variant: 'neutral', label: 'Inspection' },
  };

  const config = variants[type] || { variant: 'neutral' as const, label: type };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const MaintenancesTable: React.FC<MaintenancesTableProps> = ({
  maintenances,
  loading,
  onView,
  onEdit,
  onComplete,
}) => {
  const { t } = useLanguage();
  const columns: Column<AssetMaintenance>[] = [
    {
      key: 'assetNumber',
      header: 'N° Actif',
      sortable: true,
      width: '150px',
    },
    {
      key: 'maintenanceType',
      header: 'Type',
      sortable: true,
      render: (value) => getTypeBadge(value as string),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'scheduledDate',
      header: 'Date Planifiée',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'completedDate',
      header: 'Date Réalisée',
      render: (value) => (value ? formatDate(value as string, 'short') : '-'),
    },
    {
      key: 'technician',
      header: 'Technicien',
    },
    {
      key: 'cost',
      header: 'Coût',
      render: (value) => (value ? formatCurrency(value as number) : '-'),
      align: 'right',
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
      align: 'center',
    },
  ];

  return (
    <DataTable
      data={maintenances}
      columns={columns}
      loading={loading}
      onRowClick={onView}
      actions={
        onView || onEdit || onComplete
          ? (maintenance) => (
              <>
                {onView && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(maintenance);
                    }}
                  >
                    Voir
                  </Button>
                )}
                {onEdit && maintenance.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(maintenance);
                    }}
                  >
                    Éditer
                  </Button>
                )}
                {onComplete && maintenance.status === 'in_progress' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={CheckCircle}
                    onClick={(e) => {
                      e.stopPropagation();
                      onComplete(maintenance);
                    }}
                  >
                    Terminer
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