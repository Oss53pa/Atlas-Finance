import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { DeclarationFiscale } from '../types/taxation.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';
import { ColumnDef } from '@tanstack/react-table';

interface DeclarationsTableProps {
  declarations: DeclarationFiscale[];
  loading?: boolean;
  onRowClick?: (declaration: DeclarationFiscale) => void;
}

const statusColors: Record<string, string> = {
  BROUILLON: 'text-gray-600 bg-gray-100',
  EN_COURS: 'text-blue-600 bg-blue-100',
  VALIDEE: 'text-green-600 bg-green-100',
  TRANSMISE: 'text-purple-600 bg-purple-100',
  ACCEPTEE: 'text-emerald-600 bg-emerald-100',
  REJETEE: 'text-red-600 bg-red-100',
  PAYEE: 'text-teal-600 bg-teal-100',
};

const statusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  VALIDEE: 'Validée',
  TRANSMISE: 'Transmise',
  ACCEPTEE: 'Acceptée',
  REJETEE: 'Rejetée',
  PAYEE: 'Payée',
};

export const DeclarationsTable: React.FC<DeclarationsTableProps> = ({
  declarations,
  loading,
  onRowClick,
}) => {
  const columns: ColumnDef<DeclarationFiscale>[] = [
    {
      accessorKey: 'numero_declaration',
      header: 'N° Déclaration',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.numero_declaration}</span>
      ),
    },
    {
      accessorKey: 'type_declaration_detail.libelle',
      header: 'Type',
      cell: ({ row }) => row.original.type_declaration_detail.libelle,
    },
    {
      accessorKey: 'periode',
      header: 'Période',
      cell: ({ row }) => (
        <span>
          {formatDate(row.original.periode_debut)} - {formatDate(row.original.periode_fin)}
        </span>
      ),
    },
    {
      accessorKey: 'date_limite_depot',
      header: 'Date Limite',
      cell: ({ row }) => formatDate(row.original.date_limite_depot),
    },
    {
      accessorKey: 'montant_impot',
      header: 'Montant Impôt',
      cell: ({ row }) => `${formatNumber(row.original.montant_impot)} FCFA`,
    },
    {
      accessorKey: 'montant_du',
      header: 'Montant Dû',
      cell: ({ row }) => `${formatNumber(row.original.montant_du)} FCFA`,
    },
    {
      accessorKey: 'statut',
      header: 'Statut',
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[row.original.statut]
          }`}
        >
          {statusLabels[row.original.statut]}
        </span>
      ),
    },
    {
      accessorKey: 'is_en_retard',
      header: 'Retard',
      cell: ({ row }) =>
        row.original.is_en_retard ? (
          <span className="text-red-600 font-medium">
            {row.original.jours_retard} jours
          </span>
        ) : (
          <span className="text-green-600">-</span>
        ),
    },
  ];

  return (
    <DataTable
      data={declarations}
      columns={columns}
      loading={loading}
      onRowClick={onRowClick}
      searchPlaceholder="Rechercher une déclaration..."
      emptyMessage="Aucune déclaration trouvée"
    />
  );
};