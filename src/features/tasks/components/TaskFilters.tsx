import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Filter } from 'lucide-react';
import { Select } from '@/shared/components/ui/Form';
import { Button } from '@/shared/components/ui/Button';
import { TaskFilters as Filters, TaskStatus, TaskPriority } from '../types/task.types';

interface TaskFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Partial<Filters>) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  onFiltersChange,
  showFilters,
  onToggleFilters
}) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        icon={Filter}
        onClick={onToggleFilters}
      >
        {showFilters ? 'Masquer' : 'Afficher'} Filtres
      </Button>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg border border-[#d4d4d4] grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Statut"
            value={filters.status?.[0] || ''}
            onChange={(e) => onFiltersChange({
              status: e.target.value ? [e.target.value as TaskStatus] : undefined
            })}
            options={[
              { value: '', label: 'Tous' },
              { value: 'todo', label: 'À faire' },
              { value: 'in-progress', label: t('status.inProgress') },
              { value: 'review', label: 'En révision' },
              { value: 'done', label: t('status.completed') },
              { value: 'blocked', label: 'Bloqué' },
              { value: 'cancelled', label: 'Annulé' }
            ]}
          />

          <Select
            label="Priorité"
            value={filters.priority?.[0] || ''}
            onChange={(e) => onFiltersChange({
              priority: e.target.value ? [e.target.value as TaskPriority] : undefined
            })}
            options={[
              { value: '', label: 'Toutes' },
              { value: 'low', label: 'Basse' },
              { value: 'medium', label: 'Moyenne' },
              { value: 'high', label: 'Haute' },
              { value: 'urgent', label: 'Urgente' }
            ]}
          />

          <Select
            label="Catégorie"
            value={filters.category || ''}
            onChange={(e) => onFiltersChange({ category: e.target.value || undefined })}
            options={[
              { value: '', label: 'Toutes' },
              { value: 'Validation', label: 'Validation' },
              { value: 'Trésorerie', label: t('navigation.treasury') },
              { value: 'Reporting', label: 'Reporting' },
              { value: 'Saisie', label: 'Saisie' },
              { value: 'Recouvrement', label: t('thirdParty.collection') }
            ]}
          />

          <Select
            label="Projet"
            value={filters.project || ''}
            onChange={(e) => onFiltersChange({ project: e.target.value || undefined })}
            options={[
              { value: '', label: 'Tous' },
              { value: 'Clôture mensuelle', label: 'Clôture mensuelle' },
              { value: 'Clôture annuelle', label: 'Clôture annuelle' }
            ]}
          />
        </div>
      )}
    </div>
  );
};