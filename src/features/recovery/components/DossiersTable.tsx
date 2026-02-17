import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Eye, Edit, Send } from 'lucide-react';
import { DossierRecouvrement } from '../types/recovery.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

interface DossiersTableProps {
  dossiers: DossierRecouvrement[];
  loading?: boolean;
  onView: (dossier: DossierRecouvrement) => void;
  onEdit: (dossier: DossierRecouvrement) => void;
  onSendReminder: (dossier: DossierRecouvrement) => void;
}

const getStatusBadge = (statut: string) => {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    actif: 'success',
    suspendu: 'warning',
    cloture: 'neutral',
    juridique: 'error',
  };

  const labels: Record<string, string> = {
    actif: 'Actif',
    suspendu: 'Suspendu',
    cloture: 'Clôturé',
    juridique: 'Juridique',
  };

  return (
    <Badge variant={variants[statut] || 'neutral'}>
      {labels[statut] || statut}
    </Badge>
  );
};

export const DossiersTable: React.FC<DossiersTableProps> = ({
  dossiers,
  loading,
  onView,
  onEdit,
  onSendReminder,
}) => {
  const columns: Column<DossierRecouvrement>[] = [
    {
      key: 'numeroRef',
      header: 'Référence',
      sortable: true,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'montantTotal',
      header: 'Montant Total',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'montantRestant',
      header: 'Montant Restant',
      sortable: true,
      render: (_, row) => formatCurrency(row.montantTotal - row.montantPaye),
      align: 'right',
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
    },
    {
      key: 'nombreFactures',
      header: 'Factures',
      align: 'center',
    },
    {
      key: 'dateOuverture',
      header: 'Date Ouverture',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'responsable',
      header: 'Responsable',
    },
  ];

  return (
    <DataTable
      data={dossiers}
      columns={columns}
      loading={loading}
      onRowClick={onView}
      actions={(dossier) => (
        <>
          <Button
            size="sm"
            variant="ghost"
            icon={Eye}
            onClick={(e) => {
              e.stopPropagation();
              onView(dossier);
            }}
          >
            Voir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Edit}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(dossier);
            }}
          >
            Éditer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={Send}
            onClick={(e) => {
              e.stopPropagation();
              onSendReminder(dossier);
            }}
          >
            Relancer
          </Button>
        </>
      )}
      striped
      hoverable
    />
  );
};