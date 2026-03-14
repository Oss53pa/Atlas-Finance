/**
 * ColorSchemeEditor - Editor for color scheme settings
 */

import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { COLOR_PRESETS } from '@/types/reportDesign';
import type { ColorPreset } from '@/types/reportDesign';

const ColorSchemeEditor: React.FC = () => {
  const { settings, updateColors } = useReportDesignStore();
  const { colors } = settings;

  const presets: { id: ColorPreset; label: string }[] = [
    { id: 'corporate', label: 'Corporate' },
    { id: 'modern', label: 'Moderne' },
    { id: 'classic', label: 'Classique' },
    { id: 'vibrant', label: 'Dynamique' },
    { id: 'custom', label: 'Personnalise' },
  ];

  const handlePresetChange = (presetId: ColorPreset) => {
    const preset = COLOR_PRESETS[presetId];
    updateColors(preset);
  };

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    updateColors({ [key]: value, preset: 'custom' });
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Palette className="w-4 h-4 inline mr-1" />
          Palette de couleurs
        </label>
        <div className="grid grid-cols-5 gap-2">
          {presets.map((preset) => {
            const presetColors = COLOR_PRESETS[preset.id];
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                  colors.preset === preset.id
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {colors.preset === preset.id && (
                  <div className="absolute top-1 right-1">
                    <Check className="w-4 h-4 text-indigo-600" />
                  </div>
                )}
                <div className="flex gap-0.5">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: presetColors.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: presetColors.secondary }}
                  />
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: presetColors.accent }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Individual colors */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Personnaliser les couleurs</h4>

        {/* Primary */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm text-gray-600">Primaire</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={colors.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={colors.primary}
              onChange={(e) => handleColorChange('primary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Secondary */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm text-gray-600">Secondaire</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={colors.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={colors.secondary}
              onChange={(e) => handleColorChange('secondary', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Accent */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm text-gray-600">Accent</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={colors.accent}
              onChange={(e) => handleColorChange('accent', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={colors.accent}
              onChange={(e) => handleColorChange('accent', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Background */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm text-gray-600">Fond</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={colors.background}
              onChange={(e) => handleColorChange('background', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={colors.background}
              onChange={(e) => handleColorChange('background', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>

        {/* Text */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm text-gray-600">Texte</label>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="color"
              value={colors.text}
              onChange={(e) => handleColorChange('text', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={colors.text}
              onChange={(e) => handleColorChange('text', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Apercu</h4>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: colors.background, color: colors.text }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
            Titre principal
          </h2>
          <p className="mb-3">
            Texte de paragraphe avec{' '}
            <span style={{ color: colors.secondary }}>elements secondaires</span> et{' '}
            <span style={{ color: colors.accent }}>accents</span>.
          </p>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: colors.primary }}
            >
              Bouton primaire
            </button>
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: colors.secondary }}
            >
              Secondaire
            </button>
            <button
              className="px-4 py-2 rounded text-white"
              style={{ backgroundColor: colors.accent }}
            >
              Accent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSchemeEditor;
