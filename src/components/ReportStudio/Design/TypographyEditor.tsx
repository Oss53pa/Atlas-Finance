/**
 * TypographyEditor - Editor for typography settings
 */

import React from 'react';
import { Type, AlignJustify } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { AVAILABLE_FONTS } from '@/types/reportDesign';
import type { FontSize, LineHeight } from '@/types/reportDesign';

const TypographyEditor: React.FC = () => {
  const { settings, updateTypography } = useReportDesignStore();
  const { typography } = settings;

  const fontSizes: { id: FontSize; label: string; description: string }[] = [
    { id: 'small', label: 'Petit', description: '14px base' },
    { id: 'medium', label: 'Moyen', description: '16px base' },
    { id: 'large', label: 'Grand', description: '18px base' },
  ];

  const lineHeights: { id: LineHeight; label: string; value: string }[] = [
    { id: 'compact', label: 'Compact', value: '1.4' },
    { id: 'normal', label: 'Normal', value: '1.6' },
    { id: 'relaxed', label: 'Aere', value: '1.8' },
  ];

  return (
    <div className="space-y-6">
      {/* Heading Font */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline mr-1" />
          Police des titres
        </label>
        <select
          value={typography.headingFont}
          onChange={(e) => updateTypography({ headingFont: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          style={{ fontFamily: typography.headingFont }}
        >
          {AVAILABLE_FONTS.map((font) => (
            <option key={font.id} value={font.value} style={{ fontFamily: font.value }}>
              {font.name}
            </option>
          ))}
        </select>
        <div
          className="mt-2 p-3 bg-gray-50 rounded-lg text-xl font-bold"
          style={{ fontFamily: typography.headingFont }}
        >
          Exemple de titre
        </div>
      </div>

      {/* Body Font */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Type className="w-4 h-4 inline mr-1" />
          Police du texte
        </label>
        <select
          value={typography.bodyFont}
          onChange={(e) => updateTypography({ bodyFont: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          style={{ fontFamily: typography.bodyFont }}
        >
          {AVAILABLE_FONTS.map((font) => (
            <option key={font.id} value={font.value} style={{ fontFamily: font.value }}>
              {font.name}
            </option>
          ))}
        </select>
        <div
          className="mt-2 p-3 bg-gray-50 rounded-lg text-sm"
          style={{ fontFamily: typography.bodyFont }}
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua.
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Taille de police</label>
        <div className="grid grid-cols-3 gap-2">
          {fontSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => updateTypography({ fontSize: size.id })}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                typography.fontSize === size.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <span
                className="font-medium"
                style={{
                  fontSize: size.id === 'small' ? '14px' : size.id === 'medium' ? '16px' : '18px',
                }}
              >
                Aa
              </span>
              <span className="text-xs">{size.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Line Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <AlignJustify className="w-4 h-4 inline mr-1" />
          Interligne
        </label>
        <div className="grid grid-cols-3 gap-2">
          {lineHeights.map((lh) => (
            <button
              key={lh.id}
              onClick={() => updateTypography({ lineHeight: lh.id })}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                typography.lineHeight === lh.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-0.5 bg-current rounded"
                    style={{
                      marginTop: i > 1 ? (lh.id === 'compact' ? 2 : lh.id === 'normal' ? 4 : 6) : 0,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs mt-1">{lh.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Apercu</h4>
        <div
          className="p-4 bg-white rounded border border-gray-200"
          style={{ fontFamily: typography.bodyFont }}
        >
          <h2
            className="font-bold mb-2"
            style={{
              fontFamily: typography.headingFont,
              fontSize:
                typography.fontSize === 'small'
                  ? '20px'
                  : typography.fontSize === 'medium'
                  ? '24px'
                  : '28px',
            }}
          >
            Titre de section
          </h2>
          <p
            style={{
              fontSize:
                typography.fontSize === 'small'
                  ? '14px'
                  : typography.fontSize === 'medium'
                  ? '16px'
                  : '18px',
              lineHeight:
                typography.lineHeight === 'compact'
                  ? '1.4'
                  : typography.lineHeight === 'normal'
                  ? '1.6'
                  : '1.8',
            }}
          >
            Ceci est un exemple de paragraphe avec les parametres typographiques selectionnes.
            Vous pouvez voir comment le texte apparaitra dans votre rapport final.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TypographyEditor;
