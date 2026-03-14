/**
 * RecipientSelector - Selector for recipient type with preset design settings
 */

import React from 'react';
import {
  Briefcase,
  Users,
  Building2,
  TrendingUp,
  Globe,
  Settings,
  Check,
} from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { recipientProfiles } from '@/data/reportDesignDefaults';
import type { RecipientType } from '@/types/reportDesign';

const iconMap: Record<string, React.ElementType> = {
  Briefcase,
  Users,
  Building2,
  TrendingUp,
  Globe,
  Settings,
};

const RecipientSelector: React.FC = () => {
  const { recipientType, applyRecipientDefaults } = useReportDesignStore();

  const handleSelect = (type: RecipientType) => {
    applyRecipientDefaults(type);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-1">Type de destinataire</h3>
        <p className="text-xs text-gray-500">
          Selectionnez le profil de votre audience pour appliquer des parametres optimises
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {recipientProfiles.map((profile) => {
          const Icon = iconMap[profile.icon] || Settings;
          const isSelected = recipientType === profile.type;

          return (
            <button
              key={profile.id}
              onClick={() => handleSelect(profile.type)}
              className={`relative flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`font-medium ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}
                >
                  {profile.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{profile.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Applied settings preview */}
      {recipientType !== 'custom' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-medium text-gray-700 mb-2">Parametres appliques:</h4>
          <div className="flex flex-wrap gap-2">
            {recipientProfiles.find((p) => p.type === recipientType)?.defaultSettings.coverPage
              .enabled && (
              <span className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                Page de garde
              </span>
            )}
            {recipientProfiles.find((p) => p.type === recipientType)?.defaultSettings
              .tableOfContents.enabled && (
              <span className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                Sommaire
              </span>
            )}
            {recipientProfiles.find((p) => p.type === recipientType)?.defaultSettings.backCover
              .enabled && (
              <span className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
                Couverture dos
              </span>
            )}
            <span className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200">
              {recipientProfiles.find((p) => p.type === recipientType)?.defaultSettings.typography
                .fontSize === 'large'
                ? 'Grande police'
                : 'Police standard'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipientSelector;
