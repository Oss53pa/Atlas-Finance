import React, { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Scale, Printer, Download, Columns, TreePine, List } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { useBalance } from '../hooks/useBalance';
import { BalanceTable } from '../components/BalanceTable';
import { BalanceFilters } from '../components/BalanceFilters';
import { BalanceTotalsRow } from '../components/BalanceTotalsRow';
import { BalanceFilters as Filters, ColumnVisibility, ViewMode } from '../types/balance.types';

const BalancePage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<Filters>({
    period: { from: '2024-01-01', to: '2024-12-31' },
    searchAccount: '',
    showZeroBalance: false,
    balanceType: 'generale',
    displayLevel: 3
  });

  const [showFilters, setShowFilters] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    compte: true,
    libelle: true,
    soldeDebiteurAN: true,
    soldeCrediteurAN: true,
    mouvementsDebit: true,
    mouvementsCredit: true,
    soldeDebiteur: true,
    soldeCrediteur: true
  });

  const { accounts, totals, loading, toggleAccount } = useBalance(filters);

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    console.log('Export balance');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Scale className="w-8 h-8 text-[#6A8A82]" />
          <div>
            <h1 className="text-3xl font-bold text-[#191919]">Balance Comptable</h1>
            <p className="text-[#767676] mt-1">
              Vue synthétique des comptes - Période du {filters.period.from} au {filters.period.to}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[#ECECEC] rounded-lg p-1">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'tree'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-[#767676] hover:bg-[#D9D9D9]'
              }`}
            >
              <TreePine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#6A8A82] text-white'
                  : 'text-[#767676] hover:bg-[#D9D9D9]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <Button variant="outline" icon={Columns} onClick={() => {}}>
            Colonnes
          </Button>
          <Button variant="outline" icon={Printer} onClick={handlePrint}>
            Imprimer
          </Button>
          <Button icon={Download} onClick={handleExport}>
            Exporter
          </Button>
        </div>
      </div>

      <BalanceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      <div className="bg-white rounded-lg border border-[#D9D9D9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[#6A8A82] text-white">
              <tr>
                {visibleColumns.compte && (
                  <th className="px-4 py-3 text-left font-semibold">{t('accounting.account')}</th>
                )}
                {visibleColumns.libelle && (
                  <th className="px-4 py-3 text-left font-semibold">{t('accounting.label')}</th>
                )}
                {visibleColumns.soldeDebiteurAN && (
                  <th className="px-4 py-3 text-right font-semibold">Débit AN</th>
                )}
                {visibleColumns.soldeCrediteurAN && (
                  <th className="px-4 py-3 text-right font-semibold">Crédit AN</th>
                )}
                {visibleColumns.mouvementsDebit && (
                  <th className="px-4 py-3 text-right font-semibold">Mvt Débit</th>
                )}
                {visibleColumns.mouvementsCredit && (
                  <th className="px-4 py-3 text-right font-semibold">Mvt Crédit</th>
                )}
                {visibleColumns.soldeDebiteur && (
                  <th className="px-4 py-3 text-right font-semibold">Solde Débiteur</th>
                )}
                {visibleColumns.soldeCrediteur && (
                  <th className="px-4 py-3 text-right font-semibold">Solde Créditeur</th>
                )}
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#767676]">
                    Chargement de la balance...
                  </td>
                </tr>
              </tbody>
            ) : (
              <BalanceTable
                accounts={accounts}
                visibleColumns={visibleColumns}
                onToggleAccount={toggleAccount}
              />
            )}
            {totals && !loading && (
              <BalanceTotalsRow totals={totals} visibleColumns={visibleColumns} />
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BalancePage;