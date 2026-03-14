/**
 * PageFormatEditor - Editor for page format settings (size, orientation, margins)
 */

import React from 'react';
import { FileText, RotateCw, Maximize } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { PAGE_DIMENSIONS } from '@/types/reportDesign';
import type { PageSize, PageOrientation } from '@/types/reportDesign';

const PageFormatEditor: React.FC = () => {
  const { settings, updatePageFormat } = useReportDesignStore();
  const { pageFormat } = settings;

  const pageSizes: { id: PageSize; label: string; description: string }[] = [
    { id: 'A4', label: 'A4', description: '210 x 297 mm' },
    { id: 'A3', label: 'A3', description: '297 x 420 mm' },
    { id: 'Letter', label: 'Letter', description: '216 x 279 mm' },
    { id: 'Legal', label: 'Legal', description: '216 x 356 mm' },
  ];

  const orientations: { id: PageOrientation; label: string; icon: 'portrait' | 'landscape' }[] = [
    { id: 'portrait', label: 'Portrait', icon: 'portrait' },
    { id: 'landscape', label: 'Paysage', icon: 'landscape' },
  ];

  const marginPresets = [
    { label: 'Etroit', value: 10 },
    { label: 'Normal', value: 20 },
    { label: 'Large', value: 30 },
  ];

  const getDimensions = () => {
    const dims = PAGE_DIMENSIONS[pageFormat.size];
    if (pageFormat.orientation === 'landscape') {
      return { width: dims.height, height: dims.width };
    }
    return dims;
  };

  const currentDims = getDimensions();

  return (
    <div className="space-y-6">
      {/* Page Size */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <FileText className="w-4 h-4 inline mr-1" />
          Format de page
        </label>
        <div className="grid grid-cols-2 gap-3">
          {pageSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => updatePageFormat({ size: size.id })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                pageFormat.size === size.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div
                className={`border-2 rounded ${
                  pageFormat.size === size.id ? 'border-indigo-400' : 'border-gray-300'
                }`}
                style={{
                  width: size.id === 'A3' ? 40 : 32,
                  height: size.id === 'A3' ? 56 : size.id === 'Legal' ? 48 : 44,
                }}
              />
              <div className="text-center">
                <span className="font-medium block">{size.label}</span>
                <span className="text-xs text-gray-500">{size.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Orientation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <RotateCw className="w-4 h-4 inline mr-1" />
          Orientation
        </label>
        <div className="grid grid-cols-2 gap-3">
          {orientations.map((orientation) => (
            <button
              key={orientation.id}
              onClick={() => updatePageFormat({ orientation: orientation.id })}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                pageFormat.orientation === orientation.id
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <div
                className={`border-2 rounded ${
                  pageFormat.orientation === orientation.id ? 'border-indigo-400' : 'border-gray-300'
                }`}
                style={{
                  width: orientation.id === 'portrait' ? 28 : 44,
                  height: orientation.id === 'portrait' ? 40 : 28,
                }}
              />
              <span className="font-medium">{orientation.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Margins */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <Maximize className="w-4 h-4 inline mr-1" />
          Marges
        </label>

        {/* Margin Presets */}
        <div className="flex gap-2 mb-4">
          {marginPresets.map((preset) => {
            const isActive =
              pageFormat.margins.top === preset.value &&
              pageFormat.margins.right === preset.value &&
              pageFormat.margins.bottom === preset.value &&
              pageFormat.margins.left === preset.value;
            return (
              <button
                key={preset.label}
                onClick={() =>
                  updatePageFormat({
                    margins: {
                      top: preset.value,
                      right: preset.value,
                      bottom: preset.value,
                      left: preset.value,
                    },
                  })
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Custom Margins */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Haut (mm)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={pageFormat.margins.top}
              onChange={(e) =>
                updatePageFormat({
                  margins: { ...pageFormat.margins, top: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bas (mm)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={pageFormat.margins.bottom}
              onChange={(e) =>
                updatePageFormat({
                  margins: { ...pageFormat.margins, bottom: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gauche (mm)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={pageFormat.margins.left}
              onChange={(e) =>
                updatePageFormat({
                  margins: { ...pageFormat.margins, left: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Droite (mm)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={pageFormat.margins.right}
              onChange={(e) =>
                updatePageFormat({
                  margins: { ...pageFormat.margins, right: Number(e.target.value) },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Apercu</h4>
        <div className="flex items-center justify-center">
          <div
            className="bg-white border-2 border-gray-300 rounded shadow-sm relative"
            style={{
              width: pageFormat.orientation === 'portrait' ? 120 : 160,
              height: pageFormat.orientation === 'portrait' ? 160 : 120,
            }}
          >
            {/* Margin visualization */}
            <div
              className="absolute border border-dashed border-indigo-300 bg-indigo-50/30"
              style={{
                top: `${(pageFormat.margins.top / currentDims.height) * 100}%`,
                left: `${(pageFormat.margins.left / currentDims.width) * 100}%`,
                right: `${(pageFormat.margins.right / currentDims.width) * 100}%`,
                bottom: `${(pageFormat.margins.bottom / currentDims.height) * 100}%`,
              }}
            />
            {/* Content lines */}
            <div
              className="absolute flex flex-col gap-1 p-1"
              style={{
                top: `${(pageFormat.margins.top / currentDims.height) * 100}%`,
                left: `${(pageFormat.margins.left / currentDims.width) * 100}%`,
                right: `${(pageFormat.margins.right / currentDims.width) * 100}%`,
                bottom: `${(pageFormat.margins.bottom / currentDims.height) * 100}%`,
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-1 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
        <div className="text-center mt-3 text-sm text-gray-500">
          {pageFormat.size} - {pageFormat.orientation === 'portrait' ? 'Portrait' : 'Paysage'}
          <br />
          {currentDims.width} x {currentDims.height} mm
        </div>
      </div>
    </div>
  );
};

export default PageFormatEditor;
