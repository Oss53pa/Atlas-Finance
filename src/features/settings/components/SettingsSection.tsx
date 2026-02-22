import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { AccountingSetting, ValidationError } from '../types/settings.types';
import { SettingCard } from './SettingCard';

interface SettingsSectionProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  settings: AccountingSetting[];
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, value: string | number | boolean) => void;
  errors?: ValidationError;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  icon: Icon,
  settings,
  expanded,
  onToggle,
  onUpdate,
  errors
}) => {
  return (
    <div className="bg-white rounded-lg border border-[#d4d4d4] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-[#171717]" />}
          <h3 className="text-lg font-semibold text-[#171717]">{title}</h3>
          <span className="text-sm text-[#737373]">
            ({settings.length} paramètre{settings.length > 1 ? 's' : ''})
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-[#737373]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[#737373]" />
        )}
      </button>

      {expanded && (
        <div className="p-4 border-t border-[#d4d4d4] space-y-3">
          {settings.map((setting) => (
            <SettingCard
              key={setting.id}
              setting={setting}
              onUpdate={(value) => onUpdate(setting.id, value)}
              error={errors?.[setting.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
};