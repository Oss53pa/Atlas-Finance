import { useState } from 'react';

export interface FiltersState {
  searchTerm: string;
  filterStatut: string;
  filterNiveau: string;
  filterResponsable: string;
  filterTypeRecouvrement: string;
  filterDateDebut: string;
  filterDateFin: string;
  filterMontantMin: number | null;
  filterMontantMax: number | null;
}

export const useFiltersState = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('tous');
  const [filterNiveau, setFilterNiveau] = useState('tous');
  const [filterResponsable, setFilterResponsable] = useState('tous');
  const [filterTypeRecouvrement, setFilterTypeRecouvrement] = useState('tous');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterMontantMin, setFilterMontantMin] = useState<number | null>(null);
  const [filterMontantMax, setFilterMontantMax] = useState<number | null>(null);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterStatut('tous');
    setFilterNiveau('tous');
    setFilterResponsable('tous');
    setFilterTypeRecouvrement('tous');
    setFilterDateDebut('');
    setFilterDateFin('');
    setFilterMontantMin(null);
    setFilterMontantMax(null);
  };

  const hasActiveFilters = () => {
    return (
      searchTerm !== '' ||
      filterStatut !== 'tous' ||
      filterNiveau !== 'tous' ||
      filterResponsable !== 'tous' ||
      filterTypeRecouvrement !== 'tous' ||
      filterDateDebut !== '' ||
      filterDateFin !== '' ||
      filterMontantMin !== null ||
      filterMontantMax !== null
    );
  };

  return {
    filters: {
      searchTerm,
      filterStatut,
      filterNiveau,
      filterResponsable,
      filterTypeRecouvrement,
      filterDateDebut,
      filterDateFin,
      filterMontantMin,
      filterMontantMax
    },
    actions: {
      setSearchTerm,
      setFilterStatut,
      setFilterNiveau,
      setFilterResponsable,
      setFilterTypeRecouvrement,
      setFilterDateDebut,
      setFilterDateFin,
      setFilterMontantMin,
      setFilterMontantMax,
      resetFilters,
      hasActiveFilters
    }
  };
};