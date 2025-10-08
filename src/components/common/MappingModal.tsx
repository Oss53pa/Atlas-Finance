import React, { useState } from 'react';
import { ArrowRight, Plus, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { Button, Label, Input } from '../ui';
import { toast } from 'react-hot-toast';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface MappingConfig {
  name: string;
  type: string;
  mappings: FieldMapping[];
}

interface MappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataType?: string;
  sourceFields?: string[];
  targetFields?: string[];
  onSave?: (config: MappingConfig) => void;
  initialConfig?: Partial<MappingConfig>;
}

export const MappingModal: React.FC<MappingModalProps> = ({
  open,
  onOpenChange,
  dataType = 'customers',
  sourceFields = ['customer_id', 'client_code', 'name', 'email', 'phone', 'address'],
  targetFields = ['Code', 'Nom', 'Email', 'Téléphone', 'Adresse'],
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<MappingConfig>({
    name: initialConfig?.name || '',
    type: initialConfig?.type || dataType,
    mappings: initialConfig?.mappings || [
      { sourceField: '', targetField: '' }
    ]
  });

  const addMapping = () => {
    setConfig({
      ...config,
      mappings: [...config.mappings, { sourceField: '', targetField: '' }]
    });
  };

  const removeMapping = (index: number) => {
    setConfig({
      ...config,
      mappings: config.mappings.filter((_, i) => i !== index)
    });
  };

  const updateMapping = (index: number, field: 'sourceField' | 'targetField', value: string) => {
    const newMappings = [...config.mappings];
    newMappings[index][field] = value;
    setConfig({ ...config, mappings: newMappings });
  };

  const handleSave = () => {
    if (!config.name) {
      toast.error('Veuillez entrer un nom pour le mapping');
      return;
    }

    const validMappings = config.mappings.filter(
      m => m.sourceField && m.targetField
    );

    if (validMappings.length === 0) {
      toast.error('Veuillez configurer au moins une correspondance de champ');
      return;
    }

    const finalConfig = { ...config, mappings: validMappings };

    if (onSave) {
      onSave(finalConfig);
    } else {
      toast.success('Mapping sauvegardé avec succès !');
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuration du Mapping</DialogTitle>
          <DialogDescription>
            Configurez la correspondance entre les champs de votre fichier et les champs de l'application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nom du mapping</Label>
              <Input
                placeholder="Ex: Import clients standard"
                className="mt-2"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Type de données</Label>
              <Select
                value={config.type}
                onValueChange={(value) => setConfig({ ...config, type: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Clients</SelectItem>
                  <SelectItem value="suppliers">Fournisseurs</SelectItem>
                  <SelectItem value="products">Produits</SelectItem>
                  <SelectItem value="accounts">Comptes</SelectItem>
                  <SelectItem value="entries">Écritures</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Correspondance des champs</h4>
              <Button size="sm" variant="outline" onClick={addMapping}>
                <Plus className="mr-1 h-3 w-3" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {/* En-têtes */}
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 pb-2 border-b">
                <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Champ source (fichier)
                </div>
                <div className="w-8"></div>
                <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Champ destination (application)
                </div>
                <div className="w-8"></div>
              </div>

              {/* Mappings */}
              {config.mappings.map((mapping, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
                  <Select
                    value={mapping.sourceField}
                    onValueChange={(value) => updateMapping(index, 'sourceField', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <ArrowRight className="h-4 w-4 text-[var(--color-text-tertiary)]" />

                  <Select
                    value={mapping.targetField}
                    onValueChange={(value) => updateMapping(index, 'targetField', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {targetFields.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeMapping(index)}
                    className="hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-3 bg-[var(--color-info-light)] rounded-lg">
            <p className="text-sm font-medium mb-2">Aperçu du mapping:</p>
            <div className="space-y-1">
              {config.mappings
                .filter(m => m.sourceField && m.targetField)
                .map((mapping, index) => (
                  <p key={index} className="text-xs text-[var(--color-text-secondary)]">
                    {mapping.sourceField} → {mapping.targetField}
                  </p>
                ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder le mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
