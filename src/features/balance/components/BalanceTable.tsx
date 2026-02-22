import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { BalanceAccount, ColumnVisibility } from '../types/balance.types';
import { formatNumber } from '@/shared/utils/formatters';

interface BalanceTableProps {
  accounts: BalanceAccount[];
  visibleColumns: ColumnVisibility;
  onToggleAccount: (code: string) => void;
  loading?: boolean;
}

export const BalanceTable: React.FC<BalanceTableProps> = ({
  accounts,
  visibleColumns,
  onToggleAccount,
  loading
}) => {
  const formatAmount = (amount: number) => formatNumber(amount);

  const renderAccounts = (accounts: BalanceAccount[], level: number = 0): React.ReactNode => {
    return accounts.map((account) => (
      <React.Fragment key={account.code}>
        <tr className={`hover:bg-[#f5f5f5]/50 transition-colors ${
          level === 0 ? 'bg-[#171717]/5 font-semibold' : ''
        }`}>
          {visibleColumns.compte && (
            <td className="px-4 py-2 whitespace-nowrap">
              <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                {account.children && account.children.length > 0 && (
                  <button
                    onClick={() => onToggleAccount(account.code)}
                    className="mr-2 text-[#171717] hover:text-[#171717]"
                  >
                    {account.isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
                <span className="font-mono">{account.code}</span>
              </div>
            </td>
          )}
          {visibleColumns.libelle && (
            <td className="px-4 py-2">
              {account.libelle}
            </td>
          )}
          {visibleColumns.soldeDebiteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeDebiteurAN > 0 ? formatAmount(account.soldeDebiteurAN) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteurAN && (
            <td className="px-4 py-2 text-right">
              {account.soldeCrediteurAN > 0 ? formatAmount(account.soldeCrediteurAN) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsDebit && (
            <td className="px-4 py-2 text-right text-red-600">
              {account.mouvementsDebit > 0 ? formatAmount(account.mouvementsDebit) : '-'}
            </td>
          )}
          {visibleColumns.mouvementsCredit && (
            <td className="px-4 py-2 text-right text-green-600">
              {account.mouvementsCredit > 0 ? formatAmount(account.mouvementsCredit) : '-'}
            </td>
          )}
          {visibleColumns.soldeDebiteur && (
            <td className="px-4 py-2 text-right font-semibold text-red-600">
              {account.soldeDebiteur > 0 ? formatAmount(account.soldeDebiteur) : '-'}
            </td>
          )}
          {visibleColumns.soldeCrediteur && (
            <td className="px-4 py-2 text-right font-semibold text-green-600">
              {account.soldeCrediteur > 0 ? formatAmount(account.soldeCrediteur) : '-'}
            </td>
          )}
        </tr>
        {account.isExpanded && account.children && renderAccounts(account.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <tbody>
      {renderAccounts(accounts)}
    </tbody>
  );
};