import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Badge } from '@/shared/components/ui/Badge';
import { PlanRemboursement } from '../types/recovery.types';
import { formatCurrency, formatDate, isOverdue } from '@/shared/utils/formatters';
import { CheckCircle, Clock, XCircle } from 'lucide-react';

interface PlanRemboursementTableProps {
  plan: PlanRemboursement;
  loading?: boolean;
}

const getStatutBadge = (statut: string, dateEcheance: string) => {
  if (statut === 'paye') {
    return (
      <Badge variant="success">
        <CheckCircle className="w-3 h-3 mr-1" />
        Payé
      </Badge>
    );
  }

  if (statut === 'en_attente') {
    const overdue = isOverdue(dateEcheance);
    if (overdue) {
      return (
        <Badge variant="error">
          <XCircle className="w-3 h-3 mr-1" />
          En retard
        </Badge>
      );
    }
    return (
      <Badge variant="warning">
        <Clock className="w-3 h-3 mr-1" />
        En attente
      </Badge>
    );
  }

  if (statut === 'retard') {
    return (
      <Badge variant="error">
        <XCircle className="w-3 h-3 mr-1" />
        En retard
      </Badge>
    );
  }

  return <Badge variant="neutral">{statut}</Badge>;
};

export const PlanRemboursementTable: React.FC<PlanRemboursementTableProps> = ({
  plan,
  loading,
}) => {
  const columns: Column[] = [
    {
      key: 'numeroEcheance',
      header: '#',
      width: '60px',
      align: 'center',
    },
    {
      key: 'dateEcheance',
      header: 'Date Échéance',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
    },
    {
      key: 'montant',
      header: 'Montant',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'datePaiement',
      header: 'Date Paiement',
      render: (value) => (value ? formatDate(value as string, 'short') : '-'),
    },
    {
      key: 'statut',
      header: 'Statut',
      sortable: true,
      render: (value, row) => getStatutBadge(value as string, row.dateEcheance),
    },
  ];

  const totalPaye = plan.echeances
    .filter((e) => e.statut === 'paye')
    .reduce((sum, e) => sum + e.montant, 0);

  const totalRestant = plan.montantTotal - totalPaye;
  const pourcentagePaye = (totalPaye / plan.montantTotal) * 100;

  return (
    <div className="space-y-4">
      <div className="bg-[#F5F5F5] border border-[#D9D9D9] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-[#767676]">Montant Total</p>
            <p className="text-lg font-semibold text-[#191919]">
              {formatCurrency(plan.montantTotal)}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#767676]">Montant Payé</p>
            <p className="text-lg font-semibold text-[#6A8A82]">
              {formatCurrency(totalPaye)}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#767676]">Montant Restant</p>
            <p className="text-lg font-semibold text-[#B85450]">
              {formatCurrency(totalRestant)}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#767676]">Progression</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-white rounded-full h-2 border border-[#D9D9D9]">
                <div
                  className="bg-[#6A8A82] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(pourcentagePaye, 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-[#191919]">
                {pourcentagePaye.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#D9D9D9]">
          <div>
            <p className="text-sm text-[#767676]">Date Début</p>
            <p className="font-medium text-[#191919]">
              {formatDate(plan.dateDebut, 'short')}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#767676]">Date Fin</p>
            <p className="font-medium text-[#191919]">
              {formatDate(plan.dateFin, 'short')}
            </p>
          </div>

          <div>
            <p className="text-sm text-[#767676]">Nombre d'Échéances</p>
            <p className="font-medium text-[#191919]">{plan.nombreEcheances}</p>
          </div>
        </div>
      </div>

      <DataTable
        data={plan.echeances}
        columns={columns}
        loading={loading}
        striped
        hoverable
      />
    </div>
  );
};