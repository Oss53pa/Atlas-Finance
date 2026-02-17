import React from 'react';
import { Info } from 'lucide-react';
import { AccountingSetting } from '../types/settings.types';
import { Input, Select, Checkbox } from '@/shared/components/ui/Form';
import { Button } from '@/shared/components/ui/Button';

interface SettingCardProps {
  setting: AccountingSetting;
  onUpdate: (value: any) => void;
  error?: string;
}

export const SettingCard: React.FC<SettingCardProps> = ({
  setting,
  onUpdate,
  error
}) => {
  const renderInput = () => {
    switch (setting.type) {
      case 'text':
        return (
          <Input
            value={setting.value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            error={error}
            fullWidth
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={setting.value || ''}
            onChange={(e) => onUpdate(Number(e.target.value))}
            min={setting.min}
            max={setting.max}
            error={error}
            fullWidth
          />
        );

      case 'select':
        return (
          <Select
            value={setting.value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            options={setting.options || []}
            error={error}
            fullWidth
          />
        );

      case 'boolean':
        return (
          <Checkbox
            checked={setting.value || false}
            onChange={(e) => onUpdate(e.target.checked)}
            label=""
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={setting.value || ''}
            onChange={(e) => onUpdate(e.target.value)}
            error={error}
            fullWidth
          />
        );

      case 'action':
        return (
          <Button onClick={setting.action} size="sm">
            {setting.actionLabel || 'Action'}
          </Button>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-[#D9D9D9]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#191919]">
              {setting.label}
              {setting.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
          {setting.description && (
            <div className="flex items-start gap-1 mt-1">
              <Info className="w-3 h-3 text-[#767676] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#767676]">{setting.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        {renderInput()}
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
};