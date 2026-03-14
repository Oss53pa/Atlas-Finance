/**
 * CoverPageEditor - Editor for cover page settings with drag and drop positioning
 */

import React, { useState } from 'react';
import { Image, Upload, Type, AlignCenter, AlignLeft, AlignRight, Minus, LayoutGrid, Move, ChevronDown, ChevronUp } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { DraggableLogoPosition } from '../DragDrop/DraggableLogoPosition';
import { DraggableImageCrop } from '../DragDrop/DraggableImageCrop';
import type { CoverPageLayout, LogoPosition, ImageCropPosition, DEFAULT_LOGO_POSITION, DEFAULT_IMAGE_CROP_POSITION } from '@/types/reportDesign';
import { cn } from '@/utils/cn';

const CoverPageEditor: React.FC = () => {
  const { settings, updateCoverPage } = useReportDesignStore();
  const { coverPage } = settings;

  const [expandedSection, setExpandedSection] = useState<'logo' | 'background' | null>(null);

  const layouts: { id: CoverPageLayout; label: string; icon: React.ElementType }[] = [
    { id: 'centered', label: 'Centre', icon: AlignCenter },
    { id: 'left', label: 'Gauche', icon: AlignLeft },
    { id: 'right', label: 'Droite', icon: AlignRight },
    { id: 'minimal', label: 'Minimal', icon: Minus },
    { id: 'corporate', label: 'Corporate', icon: LayoutGrid },
  ];

  const handleImageUpload = (field: 'logo' | 'backgroundImage') => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (field === 'logo') {
            updateCoverPage({
              logo: dataUrl,
              logoPosition: coverPage.logoPosition || { x: 50, y: 10, scale: 1, rotation: 0 }
            });
          } else {
            updateCoverPage({
              backgroundImage: dataUrl,
              backgroundPosition: coverPage.backgroundPosition || { x: 0, y: 0, scale: 1 }
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleLogoPositionChange = (position: LogoPosition) => {
    updateCoverPage({ logoPosition: position });
  };

  const handleBackgroundPositionChange = (position: ImageCropPosition) => {
    updateCoverPage({ backgroundPosition: position });
  };

  const toggleSection = (section: 'logo' | 'background') => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Page de garde</h4>
          <p className="text-sm text-gray-500">Ajouter une page de couverture au rapport</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={coverPage.enabled}
            onChange={(e) => updateCoverPage({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {coverPage.enabled && (
        <>
          {/* Layout selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Disposition</label>
            <div className="grid grid-cols-5 gap-2">
              {layouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => updateCoverPage({ layout: layout.id })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    coverPage.layout === layout.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <layout.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{layout.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Type className="w-4 h-4 inline mr-1" />
              Titre
            </label>
            <input
              type="text"
              value={coverPage.title}
              onChange={(e) => updateCoverPage({ title: e.target.value })}
              placeholder="Titre du rapport"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sous-titre</label>
            <input
              type="text"
              value={coverPage.subtitle || ''}
              onChange={(e) => updateCoverPage({ subtitle: e.target.value })}
              placeholder="Sous-titre optionnel"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Date and Version */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={coverPage.date || ''}
                onChange={(e) => updateCoverPage({ date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
              <input
                type="text"
                value={coverPage.version || ''}
                onChange={(e) => updateCoverPage({ version: e.target.value })}
                placeholder="v1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Author and Organization */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auteur</label>
              <input
                type="text"
                value={coverPage.author || ''}
                onChange={(e) => updateCoverPage({ author: e.target.value })}
                placeholder="Nom de l'auteur"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Organisation</label>
              <input
                type="text"
                value={coverPage.organization || ''}
                onChange={(e) => updateCoverPage({ organization: e.target.value })}
                placeholder="Nom de l'entreprise"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Logo upload with drag & drop positioning */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('logo')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">Logo</span>
                {coverPage.logo && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Configure
                  </span>
                )}
              </div>
              {expandedSection === 'logo' ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === 'logo' && (
              <div className="p-4 space-y-4">
                {coverPage.logo ? (
                  <>
                    {/* Logo position editor */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Move className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Positionnez le logo par glisser-deposer
                        </span>
                      </div>
                      <DraggableLogoPosition
                        logoUrl={coverPage.logo}
                        position={coverPage.logoPosition || { x: 50, y: 10, scale: 1, rotation: 0 }}
                        onChange={handleLogoPositionChange}
                      />
                    </div>

                    {/* Remove logo button */}
                    <button
                      onClick={() => updateCoverPage({ logo: undefined, logoPosition: undefined })}
                      className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Supprimer le logo
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleImageUpload('logo')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Telecharger un logo
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Background image with drag & drop positioning */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('background')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">Image de fond</span>
                {coverPage.backgroundImage && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Configure
                  </span>
                )}
              </div>
              {expandedSection === 'background' ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === 'background' && (
              <div className="p-4 space-y-4">
                {coverPage.backgroundImage ? (
                  <>
                    {/* Background image position editor */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Move className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Ajustez le cadrage de l'image
                        </span>
                      </div>
                      <DraggableImageCrop
                        imageUrl={coverPage.backgroundImage}
                        position={coverPage.backgroundPosition || { x: 0, y: 0, scale: 1 }}
                        onChange={handleBackgroundPositionChange}
                      />
                    </div>

                    {/* Background overlay */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Superposition (overlay)
                      </label>
                      <input
                        type="text"
                        value={coverPage.backgroundOverlay || ''}
                        onChange={(e) => updateCoverPage({ backgroundOverlay: e.target.value })}
                        placeholder="rgba(0,0,0,0.5) ou linear-gradient(...)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Couleur ou degrade CSS a appliquer sur l'image de fond
                      </p>

                      {/* Quick overlay presets */}
                      <div className="flex gap-2 mt-2">
                        {[
                          { label: 'Sombre', value: 'rgba(0,0,0,0.5)' },
                          { label: 'Clair', value: 'rgba(255,255,255,0.3)' },
                          { label: 'Bleu', value: 'rgba(59,130,246,0.4)' },
                          { label: 'Degrade', value: 'linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.6))' },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => updateCoverPage({ backgroundOverlay: preset.value })}
                            className={cn(
                              'px-2 py-1 text-xs rounded border transition-colors',
                              coverPage.backgroundOverlay === preset.value
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-300 hover:bg-gray-100'
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Remove background button */}
                    <button
                      onClick={() => updateCoverPage({
                        backgroundImage: undefined,
                        backgroundPosition: undefined,
                        backgroundOverlay: undefined
                      })}
                      className="w-full px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Supprimer l'image de fond
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleImageUpload('backgroundImage')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Telecharger une image de fond
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CoverPageEditor;
