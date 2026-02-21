import React from 'react';
import { Filter, Search, Eye, EyeOff } from 'lucide-react';
import { Input, Select } from '@/shared/components/ui/Form';
import { Button } from '@/shared/components/ui/Button';
import { BalanceFilters as Filters } from '../types/balance.types';

interface BalanceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export const BalanceFilters: React.FC<BalanceFiltersProps> = ({
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          icon={Filter}
          onClick={onToggleFilters}
        >
          {showFilters ? 'Masquer' : 'Afficher'} Filtres
        </Button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-[#D9D9D9] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={filters.period.from}
              onChange={(e) => onFiltersChange({
                period: { ...filters.period, from: e.target.value }
              })}
            />
            <Input
              label="Date de fin"
              type="date"
              value={filters.period.to}
              onChange={(e) => onFiltersChange({
                period: { ...filters.period, to: e.target.value }
              })}
            />
            <Select
              label="Type de balance"
              value={filters.balanceType}
              onChange={(e) => onFiltersChange({
                balanceType: e.target.value as typeof filters.balanceType
              })}
              options={[
                { value: 'generale', label: 'Balance Générale' },
                { value: 'auxiliaire', label: 'Balance Auxiliaire' },
                { value: 'agee', label: 'Balance Âgée' },
                { value: 'cloture', label: 'Balance de Clôture' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Rechercher un compte"
              placeholder="Code ou libellé..."
              value={filters.searchAccount}
              onChange={(e) => onFiltersChange({ searchAccount: e.target.value })}
              icon={Search}
            />
            <Select
              label="Niveau d'affichage"
              value={filters.displayLevel.toString()}
              onChange={(e) => onFiltersChange({
                displayLevel: parseInt(e.target.value) as 1 | 2 | 3
              })}
              options={[
                { value: '1', label: 'Niveau 1 - Classes' },
                { value: '2', label: 'Niveau 2 - Comptes Principaux' },
                { value: '3', label: 'Niveau 3 - Tous les comptes' }
              ]}
            />
            <div className="flex items-end">
              <Button
                variant={filters.showZeroBalance ? 'primary' : 'outline'}
                icon={filters.showZeroBalance ? Eye : EyeOff}
                onClick={() => onFiltersChange({
                  showZeroBalance: !filters.showZeroBalance
                })}
                fullWidth
              >
                {filters.showZeroBalance ? 'Masquer' : 'Afficher'} Soldes Nuls
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};