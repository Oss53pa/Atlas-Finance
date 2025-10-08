import React from 'react';
import { Input, Select, Textarea } from '@/shared/components/ui/Form';
import { AssetMasterData } from '../types/asset-master.types';

interface AssetFormSectionProps {
  section: 'general' | 'acquisition' | 'immobilisation' | 'maintenance';
  asset: Partial<AssetMasterData>;
  onChange: (section: string, field: string, value: any) => void;
}

export const AssetFormSection: React.FC<AssetFormSectionProps> = ({
  section,
  asset,
  onChange
}) => {
  if (section === 'general') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Information Générale</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Classe d'actif"
            value={asset.general?.asset_class || ''}
            onChange={(e) => onChange('general', 'asset_class', e.target.value)}
            fullWidth
          />
          <Input
            label="Sous-classe"
            value={asset.general?.asset_subclass || ''}
            onChange={(e) => onChange('general', 'asset_subclass', e.target.value)}
            fullWidth
          />
          <Input
            label="Fabricant"
            value={asset.general?.manufacturer || ''}
            onChange={(e) => onChange('general', 'manufacturer', e.target.value)}
            fullWidth
          />
          <Input
            label="Modèle"
            value={asset.general?.model || ''}
            onChange={(e) => onChange('general', 'model', e.target.value)}
            fullWidth
          />
          <Input
            label="N° de série"
            value={asset.general?.serial_number || ''}
            onChange={(e) => onChange('general', 'serial_number', e.target.value)}
            fullWidth
          />
          <Input
            label="Localisation"
            value={asset.general?.location || ''}
            onChange={(e) => onChange('general', 'location', e.target.value)}
            fullWidth
            required
          />
        </div>
      </div>
    );
  }

  if (section === 'acquisition') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Informations d'Acquisition</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date d'acquisition"
            type="date"
            value={asset.acquisition?.acquisition_date ? new Date(asset.acquisition.acquisition_date).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange('acquisition', 'acquisition_date', new Date(e.target.value))}
            fullWidth
            required
          />
          <Input
            label="Coût d'acquisition"
            type="number"
            value={asset.acquisition?.acquisition_cost || ''}
            onChange={(e) => onChange('acquisition', 'acquisition_cost', Number(e.target.value))}
            fullWidth
            required
          />
          <Input
            label="Fournisseur"
            value={asset.acquisition?.supplier || ''}
            onChange={(e) => onChange('acquisition', 'supplier', e.target.value)}
            fullWidth
          />
          <Input
            label="N° Facture"
            value={asset.acquisition?.invoice_number || ''}
            onChange={(e) => onChange('acquisition', 'invoice_number', e.target.value)}
            fullWidth
          />
        </div>
      </div>
    );
  }

  if (section === 'immobilisation') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Immobilisation</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="N° de compte"
            value={asset.immobilisation?.account_number || ''}
            onChange={(e) => onChange('immobilisation', 'account_number', e.target.value)}
            fullWidth
            required
          />
          <Select
            label="Méthode d'amortissement"
            value={asset.immobilisation?.depreciation_method || 'LINEAR'}
            onChange={(e) => onChange('immobilisation', 'depreciation_method', e.target.value)}
            options={[
              { value: 'LINEAR', label: 'Linéaire' },
              { value: 'DECLINING', label: 'Dégressif' },
              { value: 'UNITS', label: 'Unités de production' }
            ]}
            fullWidth
            required
          />
          <Input
            label="Durée d'utilité (années)"
            type="number"
            value={asset.immobilisation?.useful_life_years || ''}
            onChange={(e) => onChange('immobilisation', 'useful_life_years', Number(e.target.value))}
            fullWidth
            required
          />
          <Input
            label="Valeur de récupération"
            type="number"
            value={asset.immobilisation?.salvage_value || ''}
            onChange={(e) => onChange('immobilisation', 'salvage_value', Number(e.target.value))}
            fullWidth
          />
        </div>
      </div>
    );
  }

  if (section === 'maintenance') {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#191919] mb-4">Données de Maintenance</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Dernière maintenance"
            type="date"
            value={asset.maintenance?.last_maintenance_date ? new Date(asset.maintenance.last_maintenance_date).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange('maintenance', 'last_maintenance_date', new Date(e.target.value))}
            fullWidth
          />
          <Input
            label="Prochaine maintenance"
            type="date"
            value={asset.maintenance?.next_maintenance_date ? new Date(asset.maintenance.next_maintenance_date).toISOString().split('T')[0] : ''}
            onChange={(e) => onChange('maintenance', 'next_maintenance_date', new Date(e.target.value))}
            fullWidth
          />
          <Input
            label="Fréquence"
            value={asset.maintenance?.maintenance_frequency || ''}
            onChange={(e) => onChange('maintenance', 'maintenance_frequency', e.target.value)}
            fullWidth
          />
          <Input
            label="Coût maintenance annuel"
            type="number"
            value={asset.maintenance?.maintenance_cost_ytd || ''}
            onChange={(e) => onChange('maintenance', 'maintenance_cost_ytd', Number(e.target.value))}
            fullWidth
          />
        </div>
      </div>
    );
  }

  return null;
};