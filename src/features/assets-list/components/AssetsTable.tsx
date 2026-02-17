import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { AssetData } from '../types/assets-list.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface AssetsTableProps {
  assets: AssetData[];
  loading?: boolean;
  onRowClick?: (asset: AssetData) => void;
}

export const AssetsTable: React.FC<AssetsTableProps> = ({ assets, loading, onRowClick }) => {
  const columns: ColumnDef<AssetData>[] = [
    {
      accessorKey: 'numeroActif',
      header: 'N° Actif',
      cell: ({ row }) => <span className="font-medium">{row.original.numeroActif}</span>,
    },
    {
      accessorKey: 'identifiantActif',
      header: 'Identifiant',
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="max-w-xs truncate block" title={row.original.description}>
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: 'typeActif',
      header: 'Type',
    },
    {
      accessorKey: 'categorie',
      header: 'Catégorie',
    },
    {
      accessorKey: 'classe',
      header: 'Classe',
    },
    {
      accessorKey: 'dateAcquisition',
      header: 'Date Acquisition',
      cell: ({ row }) => formatDate(row.original.dateAcquisition),
    },
    {
      accessorKey: 'coutHistorique',
      header: 'Coût Historique',
      cell: ({ row }) => `${formatNumber(row.original.coutHistorique)} FCFA`,
    },
    {
      accessorKey: 'valeurNetteComptableCloture',
      header: 'VNC',
      cell: ({ row }) => `${formatNumber(row.original.valeurNetteComptableCloture)} FCFA`,
    },
    {
      accessorKey: 'amortissementTotal',
      header: 'Amortissement',
      cell: ({ row }) => `${formatNumber(row.original.amortissementTotal)} FCFA`,
    },
    {
      accessorKey: 'dureeVieActif',
      header: 'Durée Vie',
      cell: ({ row }) => `${row.original.dureeVieActif} ans`,
    },
  ];

  return (
    <DataTable
      data={assets}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
      searchPlaceholder="Rechercher un actif..."
      emptyMessage="Aucune immobilisation trouvée"
    />
  );
};