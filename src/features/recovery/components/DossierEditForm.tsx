import React, { useState } from 'react';
import { Input, Select, Textarea } from '@/shared/components/ui/Form';
import { DossierRecouvrement } from '../types/recovery.types';

interface DossierEditFormProps {
  dossier: DossierRecouvrement;
  onSubmit: (updatedDossier: Partial<DossierRecouvrement>) => void;
  onCancel: () => void;
}

export const DossierEditForm: React.FC<DossierEditFormProps> = ({
  dossier,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    statut: dossier.statut,
    niveauRisque: dossier.niveauRisque,
    responsable: dossier.responsable,
    montantPaye: dossier.montantPaye,
    notes: dossier.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.statut) {
      newErrors.statut = 'Le statut est requis';
    }

    if (!formData.niveauRisque) {
      newErrors.niveauRisque = 'Le niveau de risque est requis';
    }

    if (!formData.responsable || formData.responsable.trim() === '') {
      newErrors.responsable = 'Le responsable est requis';
    }

    if (formData.montantPaye < 0) {
      newErrors.montantPaye = 'Le montant payé ne peut pas être négatif';
    }

    if (formData.montantPaye > dossier.montantTotal) {
      newErrors.montantPaye = 'Le montant payé ne peut pas dépasser le montant total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Statut"
          value={formData.statut}
          onChange={(e) => handleChange('statut', e.target.value)}
          options={[
            { value: 'actif', label: 'Actif' },
            { value: 'suspendu', label: 'Suspendu' },
            { value: 'cloture', label: 'Clôturé' },
            { value: 'juridique', label: 'Juridique' },
          ]}
          error={errors.statut}
          required
          fullWidth
        />

        <Select
          label="Niveau de Risque"
          value={formData.niveauRisque}
          onChange={(e) => handleChange('niveauRisque', e.target.value)}
          options={[
            { value: 'faible', label: 'Faible' },
            { value: 'moyen', label: 'Moyen' },
            { value: 'eleve', label: 'Élevé' },
            { value: 'critique', label: 'Critique' },
          ]}
          error={errors.niveauRisque}
          required
          fullWidth
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Responsable"
          value={formData.responsable}
          onChange={(e) => handleChange('responsable', e.target.value)}
          error={errors.responsable}
          required
          fullWidth
        />

        <Input
          label="Montant Payé (FCFA)"
          type="number"
          value={formData.montantPaye}
          onChange={(e) => handleChange('montantPaye', parseFloat(e.target.value) || 0)}
          error={errors.montantPaye}
          helperText={`Montant total: ${dossier.montantTotal} FCFA`}
          min={0}
          max={dossier.montantTotal}
          step={0.01}
          required
          fullWidth
        />
      </div>

      <Textarea
        label="Notes"
        value={formData.notes}
        onChange={(e) => handleChange('notes', e.target.value)}
        placeholder="Ajouter des notes ou commentaires..."
        rows={4}
        fullWidth
      />

      <div className="pt-4 border-t border-[#D9D9D9]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-[#767676]">Référence: </span>
            <span className="font-medium text-[#191919]">{dossier.numeroRef}</span>
          </div>
          <div>
            <span className="text-[#767676]">Client: </span>
            <span className="font-medium text-[#191919]">{dossier.client}</span>
          </div>
          <div>
            <span className="text-[#767676]">Montant Total: </span>
            <span className="font-medium text-[#191919]">{dossier.montantTotal} FCFA</span>
          </div>
          <div>
            <span className="text-[#767676]">Montant Restant: </span>
            <span className="font-medium text-[#B85450]">
              {dossier.montantTotal - formData.montantPaye} FCFA
            </span>
          </div>
        </div>
      </div>
    </form>
  );
};