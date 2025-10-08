import React, { useState } from 'react';
import { Input } from '@/shared/components/form/Input';
import { Select } from '@/shared/components/form/Select';
import { Button } from '@/shared/components/ui/Button';
import { Search, Filter, X } from 'lucide-react';
import { AssetsFilters as Filters } from '../types/assets-list.types';

interface AssetsFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onReset: () => void;
}

export const AssetsFilters: React.FC<AssetsFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeOptions = [
    { value: 'Equipement', label: 'Équipement' },
    { value: 'Batiment', label: 'Bâtiment' },
    { value: 'Materiel', label: 'Matériel' },
    { value: 'Vehicule', label: 'Véhicule' },
  ];

  const categorieOptions = [
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Equipements', label: 'Équipements' },
    { value: 'Mobilier', label: 'Mobilier' },
    { value: 'Vehicules', label: 'Véhicules' },
  ];

  const classeOptions = [
    { value: 'Classe 2', label: 'Classe 2' },
    { value: 'Classe 3', label: 'Classe 3' },
  ];

  const hasActiveFilters = filters.search || filters.typeActif?.length || filters.categorie?.length || filters.classe?.length;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            icon={Search}
            placeholder="Rechercher par numéro, identifiant ou description..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          icon={Filter}
        >
          Filtres avancés
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onReset}
            icon={X}
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <Select
            label="Type d'actif"
            multiple
            value={filters.typeActif || []}
            onChange={(value) => onFiltersChange({ ...filters, typeActif: value as string[] })}
            options={typeOptions}
          />
          <Select
            label="Catégorie"
            multiple
            value={filters.categorie || []}
            onChange={(value) => onFiltersChange({ ...filters, categorie: value as string[] })}
            options={categorieOptions}
          />
          <Select
            label="Classe"
            multiple
            value={filters.classe || []}
            onChange={(value) => onFiltersChange({ ...filters, classe: value as string[] })}
            options={classeOptions}
          />
        </div>
      )}
    </div>
  );
};