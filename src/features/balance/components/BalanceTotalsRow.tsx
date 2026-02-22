import React from 'react';
import { BalanceTotals, ColumnVisibility } from '../types/balance.types';
import { formatNumber } from '@/shared/utils/formatters';

interface BalanceTotalsRowProps {
  totals: BalanceTotals;
  visibleColumns: ColumnVisibility;
}

export const BalanceTotalsRow: React.FC<BalanceTotalsRowProps> = ({
  totals,
  visibleColumns
}) => {
  const formatAmount = (amount: number) => formatNumber(amount);

  return (
    <tfoot className="bg-[#171717] text-white font-bold">
      <tr>
        {visibleColumns.compte && (
          <td className="px-4 py-3" colSpan={visibleColumns.libelle ? 2 : 1}>
            TOTAUX
          </td>
        )}
        {!visibleColumns.compte && visibleColumns.libelle && (
          <td className="px-4 py-3">TOTAUX</td>
        )}
        {visibleColumns.soldeDebiteurAN && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.soldeDebiteurAN)}
          </td>
        )}
        {visibleColumns.soldeCrediteurAN && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.soldeCrediteurAN)}
          </td>
        )}
        {visibleColumns.mouvementsDebit && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.mouvementsDebit)}
          </td>
        )}
        {visibleColumns.mouvementsCredit && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.mouvementsCredit)}
          </td>
        )}
        {visibleColumns.soldeDebiteur && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.soldeDebiteur)}
          </td>
        )}
        {visibleColumns.soldeCrediteur && (
          <td className="px-4 py-3 text-right">
            {formatAmount(totals.soldeCrediteur)}
          </td>
        )}
      </tr>
      <tr className="bg-[#171717]/90">
        <td className="px-4 py-2 text-sm" colSpan={8}>
          <div className="flex items-center justify-between">
            <span>Équilibre de la balance</span>
            <span className={
              totals.soldeDebiteur === totals.soldeCrediteur
                ? 'text-green-300'
                : 'text-red-300'
            }>
              {totals.soldeDebiteur === totals.soldeCrediteur
                ? '✓ Balance équilibrée'
                : '⚠ Balance non équilibrée'
              }
            </span>
          </div>
        </td>
      </tr>
    </tfoot>
  );
};