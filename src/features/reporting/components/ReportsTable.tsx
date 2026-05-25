
import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { Report } from '../types/reporting.types';
import { formatDate } from '@/shared/utils/formatters';
import { Column } from '@/shared/components/data-display/DataTable/DataTable.types';

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
  const columns: Column<Report>[] = [
    {
      key: 'name',
      header: 'Nom',
      render: (_value, row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (_value, row) => typeLabels[row.type],
    },
    {
      key: 'category',
      header: 'Catégorie',
      accessor: 'category',
    },
    {
      key: 'lastGenerated',
      header: 'Dernière Génération',
      render: (_value, row) => formatDate(row.lastGenerated),
    },
    {
      key: 'generatedBy',
      header: 'Généré Par',
      accessor: 'generatedBy',
    },
    {
      key: 'views',
      header: 'Vues',
      render: (_value, row) => row.views.toString(),
    },
    {
      key: 'format',
      header: 'Format',
      render: (_value, row) => row.format.toUpperCase(),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (_value, row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[row.status]
          }`}
        >
          {statusLabels[row.status]}
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
      emptyMessage="Aucun rapport trouvé"
    />
  );
};