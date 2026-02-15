import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { Button, Label, Input, Checkbox } from '../ui';
import { toast } from 'react-hot-toast';

export interface ScheduleConfig {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string;
  dayOfWeek?: number; // 0-6 pour weekly
  dayOfMonth?: number; // 1-31 pour monthly
  active: boolean;
  notification: boolean;
  format?: string;
}

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'import' | 'export' | 'backup';
  module?: string;
  onSave?: (config: ScheduleConfig) => void;
  initialConfig?: Partial<ScheduleConfig>;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  open,
  onOpenChange,
  type,
  module,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<ScheduleConfig>({
    name: initialConfig?.name || '',
    frequency: initialConfig?.frequency || 'daily',
    time: initialConfig?.time || '22:00',
    active: initialConfig?.active ?? true,
    notification: initialConfig?.notification ?? true,
    format: initialConfig?.format || 'excel'
  });

  const handleSave = () => {
    if (!config.name) {
      toast.error('Veuillez entrer un nom pour la planification');
      return;
    }

    if (onSave) {
      onSave(config);
    } else {
      toast.success('Planification enregistrée avec succès !');
    }

    onOpenChange(false);
  };

  const getTitle = () => {
    switch (type) {
      case 'import':
        return 'Planifier un import automatique';
      case 'export':
        return 'Planifier un export automatique';
      case 'backup':
        return 'Planifier une sauvegarde automatique';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {module && `Configurez une planification automatique pour ${module}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Nom de la planification</Label>
            <Input
              placeholder={`Ex: ${type === 'export' ? 'Export' : type === 'import' ? 'Import' : 'Sauvegarde'} quotidien`}
              className="mt-2"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
            />
          </div>

          <div>
            <Label>Fréquence</Label>
            <Select
              value={config.frequency}
              onValueChange={(value: any) => setConfig({ ...config, frequency: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Quotidienne</SelectItem>
                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                <SelectItem value="monthly">Mensuelle</SelectItem>
                <SelectItem value="yearly">Annuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.frequency === 'weekly' && (
            <div>
              <Label>Jour de la semaine</Label>
              <Select
                value={config.dayOfWeek?.toString() || '1'}
                onValueChange={(value) => setConfig({ ...config, dayOfWeek: parseInt(value) })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Lundi</SelectItem>
                  <SelectItem value="2">Mardi</SelectItem>
                  <SelectItem value="3">Mercredi</SelectItem>
                  <SelectItem value="4">Jeudi</SelectItem>
                  <SelectItem value="5">Vendredi</SelectItem>
                  <SelectItem value="6">Samedi</SelectItem>
                  <SelectItem value="0">Dimanche</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {config.frequency === 'monthly' && (
            <div>
              <Label>Jour du mois</Label>
              <Input
                type="number"
                min="1"
                max="31"
                className="mt-2"
                value={config.dayOfMonth || 1}
                onChange={(e) => setConfig({ ...config, dayOfMonth: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div>
            <Label className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Heure d'exécution
            </Label>
            <Input
              type="time"
              className="mt-2"
              value={config.time}
              onChange={(e) => setConfig({ ...config, time: e.target.value })}
            />
          </div>

          {type === 'export' && (
            <div>
              <Label>Format d'export</Label>
              <Select
                value={config.format}
                onValueChange={(value) => setConfig({ ...config, format: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="json">JSON (.json)</SelectItem>
                  <SelectItem value="xml">XML (.xml)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={config.active}
                onCheckedChange={(checked) => setConfig({ ...config, active: !!checked })}
              />
              <Label className="cursor-pointer">Planification active</Label>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={config.notification}
                onCheckedChange={(checked) => setConfig({ ...config, notification: !!checked })}
              />
              <Label className="cursor-pointer">Recevoir une notification</Label>
            </label>
          </div>

          <div className="p-3 bg-[var(--color-info-light)] rounded-lg">
            <p className="text-sm text-[var(--color-text-secondary)]">
              <strong>Résumé:</strong> Cette tâche s'exécutera{' '}
              {config.frequency === 'daily' && 'tous les jours'}
              {config.frequency === 'weekly' && 'toutes les semaines'}
              {config.frequency === 'monthly' && 'tous les mois'}
              {config.frequency === 'yearly' && 'tous les ans'}
              {' '}à {config.time}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            <Calendar className="mr-2 h-4 w-4" />
            Créer la planification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
