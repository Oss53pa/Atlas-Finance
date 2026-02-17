import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Button } from '@/shared/components/ui/Button';
import { Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { AccountLedger } from '../types/generalLedger.types';
import { formatCurrency, formatNumber } from '@/shared/utils/formatters';

interface LedgerAccountsTableProps {
  accounts: AccountLedger[];
  loading?: boolean;
  onViewAccount?: (account: AccountLedger) => void;
  expandable?: boolean;
  expandedAccounts?: string[];
  onToggleExpand?: (accountNumber: string) => void;
}

export const LedgerAccountsTable: React.FC<LedgerAccountsTableProps> = ({
  accounts,
  loading,
  onViewAccount,
  expandable = false,
  expandedAccounts = [],
  onToggleExpand,
}) => {
  const columns: Column<AccountLedger>[] = [
    {
      key: 'compte',
      header: 'Compte',
      sortable: true,
      width: '120px',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {expandable && onToggleExpand && row.nombreEcritures > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(row.compte);
              }}
              className="text-[#767676] hover:text-[#191919] transition-colors"
            >
              {expandedAccounts.includes(row.compte) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          <span className="font-mono font-semibold">{value}</span>
        </div>
      ),
    },
    {
      key: 'libelle',
      header: 'Libellé',
      sortable: true,
    },
    {
      key: 'soldeOuverture',
      header: 'Solde Ouverture',
      sortable: true,
      render: (value) => {
        const amount = value as number;
        return (
          <span className={amount < 0 ? 'text-[#B85450]' : amount > 0 ? 'text-[#6A8A82]' : ''}>
            {formatCurrency(Math.abs(amount))} {amount < 0 ? 'C' : amount > 0 ? 'D' : ''}
          </span>
        );
      },
      align: 'right',
    },
    {
      key: 'totalDebit',
      header: 'Total Débits',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'totalCredit',
      header: 'Total Crédits',
      sortable: true,
      render: (value) => formatCurrency(value as number),
      align: 'right',
    },
    {
      key: 'soldeFermeture',
      header: 'Solde Clôture',
      sortable: true,
      render: (value) => {
        const amount = value as number;
        return (
          <span
            className={`font-semibold ${
              amount < 0 ? 'text-[#B85450]' : amount > 0 ? 'text-[#6A8A82]' : ''
            }`}
          >
            {formatCurrency(Math.abs(amount))} {amount < 0 ? 'C' : amount > 0 ? 'D' : ''}
          </span>
        );
      },
      align: 'right',
    },
    {
      key: 'nombreEcritures',
      header: 'Écritures',
      sortable: true,
      render: (value) => formatNumber(value as number),
      align: 'center',
    },
  ];

  return (
    <DataTable
      data={accounts}
      columns={columns}
      loading={loading}
      onRowClick={onViewAccount}
      actions={
        onViewAccount
          ? (account) => (
              <Button
                size="sm"
                variant="ghost"
                icon={Eye}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAccount(account);
                }}
              >
                Consulter
              </Button>
            )
          : undefined
      }
      striped
      hoverable
    />
  );
};