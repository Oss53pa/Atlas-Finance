import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, Edit, Wrench, History } from 'lucide-react';
import { Asset } from '../types/assets.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

interface AssetsTableProps {
  assets: Asset[];
  loading?: boolean;
  onView?: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onMaintenance?: (asset: Asset) => void;
  onHistory?: (asset: Asset) => void;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    disposed: 'neutral',
    under_maintenance: 'warning',
    retired: 'error',
  };

  const labels: Record<string, string> = {
    active: 'Actif',
    disposed: 'Cédé',
    under_maintenance: 'Maintenance',
    retired: 'Retiré',
  };

  return (
    <Badge variant={variants[status] || 'neutral'}>
      {labels[status] || status}
    </Badge>
  );
};

const getConditionBadge = (condition?: string) => {
  if (!condition) return null;

  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    excellent: 'success',
    good: 'success',
    fair: 'warning',
    poor: 'error',
  };

  const labels: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Bon',
    fair: 'Moyen',
    poor: 'Mauvais',
  };

  return (
    <Badge variant={variants[condition] || 'neutral'}>
      {labels[condition] || condition}
    </Badge>
  );
};

export const AssetsTable: React.FC<AssetsTableProps> = ({
  assets,
  loading,
  onView,
  onEdit,
  onMaintenance,
  onHistory,
}) => {
  const columns: Column<Asset>[] = [
    {
      key: 'assetNumber',
      header: 'N° Actif',
      sortable: true,
      width: '150px',
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'assetCategory',
      header: 'Catégorie',
      sortable: true,
    },
    {
      key: 'location',
      header: 'Localisation',
      sortable: true,
    },
    {
      key: 'acquisitionCost',
      header: 'Coût d\'Acquisition',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'netBookValue',
      header: 'Valeur Nette',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'acquisitionDate',
      header: 'Date Acquisition',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'status',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
      align: 'center',
    },
    {
      key: 'condition',
      header: 'État',
      render: (value) => getConditionBadge(value as string),
      align: 'center',
    },
  ];

  return (
    <DataTable
      data={assets}
      columns={columns}
      loading={loading}
      onRowClick={onView}
      actions={
        onView || onEdit || onMaintenance || onHistory
          ? (asset) => (
              <>
                {onView && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(asset);
                    }}
                  >
                    Voir
                  </Button>
                )}
                {onEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Edit}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(asset);
                    }}
                  >
                    Éditer
                  </Button>
                )}
                {onMaintenance && asset.status === 'active' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Wrench}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMaintenance(asset);
                    }}
                  >
                    Maintenance
                  </Button>
                )}
                {onHistory && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={History}
                    onClick={(e) => {
                      e.stopPropagation();
                      onHistory(asset);
                    }}
                  >
                    Historique
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