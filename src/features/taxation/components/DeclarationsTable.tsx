
import React from 'react';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { DeclarationFiscale } from '../types/taxation.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';
import { Column } from '@/shared/components/data-display/DataTable/DataTable.types';

interface DeclarationsTableProps {
  declarations: DeclarationFiscale[];
  loading?: boolean;
  onRowClick?: (declaration: DeclarationFiscale) => void;
}

const statusColors: Record<string, string> = {
  BROUILLON: 'text-gray-600 bg-gray-100',
  EN_COURS: 'text-blue-600 bg-blue-100',
  VALIDEE: 'text-green-600 bg-green-100',
  TRANSMISE: 'text-primary-600 bg-primary-100',
  ACCEPTEE: 'text-primary-600 bg-primary-100',
  REJETEE: 'text-red-600 bg-red-100',
  PAYEE: 'text-primary-600 bg-primary-100',
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
  const columns: Column<DeclarationFiscale>[] = [
    {
      key: 'numero_declaration',
      header: 'N° Déclaration',
      render: (_value, row) => (
        <span className="font-medium">{row.numero_declaration}</span>
      ),
    },
    {
      key: 'type_declaration_detail',
      header: 'Type',
      render: (_value, row) => row.type_declaration_detail.libelle,
    },
    {
      key: 'periode',
      header: 'Période',
      render: (_value, row) => (
        <span>
          {formatDate(row.periode_debut)} - {formatDate(row.periode_fin)}
        </span>
      ),
    },
    {
      key: 'date_limite_depot',
      header: 'Date Limite',
      render: (_value, row) => formatDate(row.date_limite_depot),
    },
    {
      key: 'montant_impot',
      header: 'Montant Impôt',
      render: (_value, row) => `${formatNumber(row.montant_impot)} FCFA`,
    },
    {
      key: 'montant_du',
      header: 'Montant Dû',
      render: (_value, row) => `${formatNumber(row.montant_du)} FCFA`,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (_value, row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            statusColors[row.statut]
          }`}
        >
          {statusLabels[row.statut]}
        </span>
      ),
    },
    {
      key: 'is_en_retard',
      header: 'Retard',
      render: (_value, row) =>
        row.is_en_retard ? (
          <span className="text-red-600 font-medium">
            {row.jours_retard} jours
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
      emptyMessage="Aucune déclaration trouvée"
    />
  );
};