import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Button } from '@/shared/components/ui/Button';
import { Eye, MessageSquare } from 'lucide-react';
import { LedgerEntry } from '../types/generalLedger.types';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';

interface LedgerEntriesTableProps {
  entries: LedgerEntry[];
  loading?: boolean;
  onViewEntry?: (entry: LedgerEntry) => void;
  onAddNote?: (entry: LedgerEntry) => void;
  showSolde?: boolean;
}

export const LedgerEntriesTable: React.FC<LedgerEntriesTableProps> = ({
  entries,
  loading,
  onViewEntry,
  onAddNote,
  showSolde = true,
}) => {
  const columns: Column<LedgerEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (value) => formatDate(value as string, 'short'),
      width: '120px',
    },
    {
      key: 'piece',
      header: 'Pièce',
      sortable: true,
      width: '120px',
      render: (value) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      key: 'libelle',
      header: 'Libellé',
      sortable: true,
    },
    {
      key: 'debit',
      header: 'Débit',
      sortable: true,
      render: (value) => {
        const amount = value as number;
        return amount > 0 ? (
          <span className="font-semibold">{formatCurrency(amount)}</span>
        ) : (
          '-'
        );
      },
      align: 'right',
    },
    {
      key: 'credit',
      header: 'Crédit',
      sortable: true,
      render: (value) => {
        const amount = value as number;
        return amount > 0 ? (
          <span className="font-semibold">{formatCurrency(amount)}</span>
        ) : (
          '-'
        );
      },
      align: 'right',
    },
  ];

  if (showSolde) {
    columns.push({
      key: 'solde',
      header: 'Solde',
      render: (value) => {
        const amount = value as number;
        return (
          <span
            className={`font-semibold ${
              amount < 0 ? 'text-[#ef4444]' : amount > 0 ? 'text-[#171717]' : ''
            }`}
          >
            {formatCurrency(Math.abs(amount))} {amount < 0 ? 'C' : amount > 0 ? 'D' : ''}
          </span>
        );
      },
      align: 'right',
    });
  }

  columns.push(
    {
      key: 'centreCout',
      header: 'Centre de Coût',
      render: (value) => value || '-',
      width: '120px',
    },
    {
      key: 'tiers',
      header: 'Tiers',
      render: (value) => value || '-',
    }
  );

  return (
    <DataTable
      data={entries}
      columns={columns}
      loading={loading}
      onRowClick={onViewEntry}
      actions={
        onViewEntry || onAddNote
          ? (entry) => (
              <>
                {onViewEntry && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewEntry(entry);
                    }}
                  >
                    Détails
                  </Button>
                )}
                {onAddNote && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={MessageSquare}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNote(entry);
                    }}
                  >
                    Note
                  </Button>
                )}
              </>
            )
          : undefined
      }
      striped
      hoverable
    />
  );
};