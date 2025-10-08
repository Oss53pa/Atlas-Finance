import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { Report } from '../types/reporting.types';
import { formatDate } from '@/shared/utils/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface ReportsTableProps {
  reports: Report[];
  loading?: boolean;
  onRowClick?: (report: Report) => void;
}

const statusColors: Record<string, string> = {
  active: 'text-green-600 bg-green-100',
  draft: 'text-yellow-600 bg-yellow-100',
  archived: 'text-gray-600 bg-gray-100',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  draft: 'Brouillon',
  archived: 'Archivé',
};

const typeLabels: Record<string, string> = {
  financial: 'Financier',
  analytical: 'Analytique',
  management: 'Gestion',
  regulatory: 'Réglementaire',
};

export const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  loading,
  onRowClick,
}) => {
  const columns: ColumnDef<Report>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => typeLabels[row.original.type],
    },
    {
      accessorKey: 'category',
      header: 'Catégorie',
    },
    {
      accessorKey: 'lastGenerated',
      header: 'Dernière Génération',
      cell: ({ row }) => formatDate(row.original.lastGenerated),
    },
    {
      accessorKey: 'generatedBy',
      header: 'Généré Par',
    },
    {
      accessorKey: 'views',
      header: 'Vues',
      cell: ({ row }) => row.original.views.toString(),
    },
    {
      accessorKey: 'format',
      header: 'Format',
      cell: ({ row }) => row.original.format.toUpperCase(),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[row.original.status]
          }`}
        >
          {statusLabels[row.original.status]}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      data={reports}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
      searchPlaceholder="Rechercher un rapport..."
      emptyMessage="Aucun rapport trouvé"
    />
  );
};