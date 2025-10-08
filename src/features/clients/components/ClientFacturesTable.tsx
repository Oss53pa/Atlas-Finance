import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { DataTable } from '@/shared/components/data-display/DataTable';
import { Facture } from '../types/client.types';
import { formatNumber, formatDate } from '@/shared/utils/formatters';

interface ClientFacturesTableProps {
  factures: Facture[];
  loading?: boolean;
}

export const ClientFacturesTable: React.FC<ClientFacturesTableProps> = ({
  const { t } = useLanguage();
  factures,
  loading
}) => {
  const getStatutBadge = (statut: string) => {
    const styles = {
      EN_ATTENTE: 'bg-blue-100 text-blue-800',
      PAYEE_PARTIELLEMENT: 'bg-yellow-100 text-yellow-800',
      PAYEE: 'bg-green-100 text-green-800',
      EN_RETARD: 'bg-red-100 text-red-800'
    };
    return styles[statut as keyof typeof styles] || styles.EN_ATTENTE;
  };

  const columns = [
    {
      key: 'numero',
      label: 'N° Facture',
      sortable: true
    },
    {
      key: 'date',
      label: t('common.date'),
      sortable: true,
      render: (row: Facture) => formatDate(row.date)
    },
    {
      key: 'echeance',
      label: 'Échéance',
      sortable: true,
      render: (row: Facture) => formatDate(row.echeance)
    },
    {
      key: 'montantTTC',
      label: 'Montant TTC',
      sortable: true,
      render: (row: Facture) => `${formatNumber(row.montantTTC)} €`
    },
    {
      key: 'solde',
      label: t('accounting.balance'),
      sortable: true,
      render: (row: Facture) => (
        <span className={row.solde > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
          {formatNumber(row.solde)} €
        </span>
      )
    },
    {
      key: 'statut',
      label: 'Statut',
      sortable: true,
      render: (row: Facture) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutBadge(row.statut)}`}>
          {row.statut.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'retard',
      label: 'Retard',
      render: (row: Facture) => row.retardJours ? `${row.retardJours} jours` : '-'
    }
  ];

  return (
    <DataTable
      data={factures}
      columns={columns}
      loading={loading}
      searchable
      searchPlaceholder="Rechercher une facture..."
    />
  );
};