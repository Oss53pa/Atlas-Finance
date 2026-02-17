import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input, Select } from '@/shared/components/ui/Form';
import { Button } from '@/shared/components/ui/Button';

interface RecoveryFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  riskFilter: string;
  onRiskChange: (value: string) => void;
  onClearFilters: () => void;
}

export const RecoveryFilters: React.FC<RecoveryFiltersProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  riskFilter,
  onRiskChange,
  onClearFilters,
}) => {
  return (
    <div className="bg-white rounded-lg border border-[#D9D9D9] p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Input
          placeholder="Rechercher par client, référence..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          icon={Search}
          fullWidth
        />

        <Select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          options={[
            { value: 'tous', label: 'Tous les statuts' },
            { value: 'actif', label: 'Actif' },
            { value: 'suspendu', label: 'Suspendu' },
            { value: 'cloture', label: 'Clôturé' },
            { value: 'juridique', label: 'Juridique' },
          ]}
          fullWidth
        />

        <Select
          value={riskFilter}
          onChange={(e) => onRiskChange(e.target.value)}
          options={[
            { value: 'tous', label: 'Tous les risques' },
            { value: 'faible', label: 'Risque Faible' },
            { value: 'moyen', label: 'Risque Moyen' },
            { value: 'eleve', label: 'Risque Élevé' },
            { value: 'critique', label: 'Risque Critique' },
          ]}
          fullWidth
        />

        <Button
          variant="outline"
          icon={Filter}
          onClick={onClearFilters}
          fullWidth
        >
          Réinitialiser
        </Button>
      </div>
    </div>
  );
};