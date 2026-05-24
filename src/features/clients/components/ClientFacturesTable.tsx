import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Facture } from '../types/client.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';

interface ClientFacturesTableProps {
  factures: Facture[];
  loading?: boolean;
}

export const ClientFacturesTable: React.FC<ClientFacturesTableProps> = ({
  factures,
  loading
}) => {
  const { t } = useLanguage();
  const getStatutBadge = (statut: string) => {
    const styles = {
      EN_ATTENTE: 'bg-blue-100 text-blue-800',
      PAYEE_PARTIELLEMENT: 'bg-yellow-100 text-yellow-800',
      PAYEE: 'bg-green-100 text-green-800',
      EN_RETARD: 'bg-red-100 text-red-800'
    };
    return styles[statut as keyof typeof styles] || styles.EN_ATTENTE;
  };

  const columns: Column<Facture>[] = [
    {
      key: 'numero',
      header: 'N° Facture',
      sortable: true
    },
    {
      key: 'date',
      header: t('common.date'),
      sortable: true,
      render: (_value, row) => formatDate(row.date)
    },
    {
      key: 'echeance',
      header: 'Échéance',
      sortable: true,
      render: (_value, row) => formatDate(row.echeance)
    },
    {
      key: 'montantTTC',
      header: 'Montant TTC',
      sortable: true,
      render: (_value, row) => `${formatNumber(row.montantTTC)} €`
    },
    {
      key: 'solde',
      header: t('accounting.balance'),
      sortable: true,
      render: (_value, row) => (
        <span className={row.solde > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
          {formatNumber(row.solde)} €
        </span>
      )
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (_value, row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadge(row.statut)}`}>
          {row.statut.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'retardJours',
      header: 'Retard',
      render: (_value, row) => row.retardJours ? `${row.retardJours} jours` : '-'
    }
  ];

  return (
    <DataTable
      data={factures}
      columns={columns}
      loading={loading}
    />
  );
};
