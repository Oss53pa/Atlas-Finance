import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { AssetData } from '../types/assets-list.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';

interface AssetsTableProps {
  assets: AssetData[];
  loading?: boolean;
  onRowClick?: (asset: AssetData) => void;
}

export const AssetsTable: React.FC<AssetsTableProps> = ({ assets, loading, onRowClick }) => {
  const columns: Column<AssetData>[] = [
    {
      key: 'numeroActif',
      header: 'N° Actif',
      render: (_value, row) => <span className="font-medium">{row.numeroActif}</span>,
    },
    {
      key: 'identifiantActif',
      header: 'Identifiant',
    },
    {
      key: 'description',
      header: 'Description',
      render: (_value, row) => (
        <span className="max-w-xs truncate block" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      key: 'typeActif',
      header: 'Type',
    },
    {
      key: 'categorie',
      header: 'Catégorie',
    },
    {
      key: 'classe',
      header: 'Classe',
    },
    {
      key: 'dateAcquisition',
      header: 'Date Acquisition',
      render: (_value, row) => formatDate(row.dateAcquisition),
    },
    {
      key: 'coutHistorique',
      header: 'Coût Historique',
      render: (_value, row) => `${formatNumber(row.coutHistorique)} FCFA`,
    },
    {
      key: 'valeurNetteComptableCloture',
      header: 'VNC',
      render: (_value, row) => `${formatNumber(row.valeurNetteComptableCloture)} FCFA`,
    },
    {
      key: 'amortissementTotal',
      header: 'Amortissement',
      render: (_value, row) => `${formatNumber(row.amortissementTotal)} FCFA`,
    },
    {
      key: 'dureeVieActif',
      header: 'Durée Vie',
      render: (_value, row) => `${row.dureeVieActif} ans`,
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
