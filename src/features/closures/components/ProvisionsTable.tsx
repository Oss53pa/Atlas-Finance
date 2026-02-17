import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { CheckCircle, X } from 'lucide-react';
import { Provision } from '../types/closures.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface ProvisionsTableProps {
  provisions: Provision[];
  loading?: boolean;
  onValider?: (provision: Provision) => void;
  onRejeter?: (provision: Provision) => void;
}

const getStatusBadge = (statut: string) => {
  const variants: Record<string, { variant: 'success' | 'warning' | 'error'; label: string }> = {
    PROPOSEE: { variant: 'warning', label: 'Proposée' },
    VALIDEE: { variant: 'success', label: 'Validée' },
    REJETEE: { variant: 'error', label: 'Rejetée' },
  };

  const config = variants[statut] || { variant: 'warning' as const, label: statut };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const ProvisionsTable: React.FC<ProvisionsTableProps> = ({
  provisions,
  loading,
  onValider,
  onRejeter,
}) => {
  const columns: Column<Provision>[] = [
    {
      key: 'compteClient',
      header: 'Compte',
      sortable: true,
      width: '120px',
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'solde',
      header: 'Solde Dû',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'anciennete',
      header: 'Ancienneté (j)',
      sortable: true,
      render: (value) => (
        <span
          className={
            (value as number) > 365
              ? 'text-[#B85450] font-semibold'
              : (value as number) > 180
              ? 'text-[#B87333]'
              : ''
          }
        >
          {value} jours
        </span>
      ),
      align: 'center',
    },
    {
      key: 'tauxProvision',
      header: 'Taux',
      sortable: true,
      render: (value) => `${value}%`,
      align: 'center',
    },
    {
      key: 'montantProvision',
      header: 'Montant Provision',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-[#B85450]">{formatCurrency(value as number)}</span>
      ),
      align: 'right',
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (value) => getStatusBadge(value as string),
      align: 'center',
    },
  ];

  return (
    <DataTable
      data={provisions}
      columns={columns}
      loading={loading}
      actions={
        onValider || onRejeter
          ? (provision) =>
              provision.statut === 'PROPOSEE' ? (
                <>
                  {onValider && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={CheckCircle}
                      onClick={(e) => {
                        e.stopPropagation();
                        onValider(provision);
                      }}
                    >
                      Valider
                    </Button>
                  )}
                  {onRejeter && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={X}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRejeter(provision);
                      }}
                    >
                      Rejeter
                    </Button>
                  )}
                </>
              ) : null
          : undefined
      }
      striped
      hoverable
    />
  );
};