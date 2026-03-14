/**
 * BrandingEditor - Editor for branding settings
 */

import React from 'react';
import { Building2, Upload, Hash, AlignCenter, AlignRight, ChevronsUp } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import type { PageNumberPosition } from '@/types/reportDesign';

const BrandingEditor: React.FC = () => {
  const { settings, updateBranding } = useReportDesignStore();
  const { branding } = settings;

  const pageNumberPositions: { id: PageNumberPosition; label: string; icon: React.ElementType }[] = [
    { id: 'bottom-center', label: 'Bas centre', icon: AlignCenter },
    { id: 'bottom-right', label: 'Bas droite', icon: AlignRight },
    { id: 'top-right', label: 'Haut droite', icon: ChevronsUp },
  ];

  const handleLogoUpload = () => {
    // In a real app, this would open a file picker
    updateBranding({ logo: 'https://via.placeholder.com/200x80?text=Logo' });
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Logo de l'entreprise
        </label>
        {branding.logo ? (
          <div className="relative inline-block">
            <img
              src={branding.logo}
              alt="Logo"
              className="h-16 object-contain bg-gray-100 rounded-lg p-2"
            />
            <button
              onClick={() => updateBranding({ logo: undefined })}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
            >
              X
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogoUpload}
            className="w-full flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Telecharger un logo
          </button>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Format recommande: PNG ou SVG, max 500KB
        </p>
      </div>

      {/* Company name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'entreprise</label>
        <input
          type="text"
          value={branding.companyName || ''}
          onChange={(e) => updateBranding({ companyName: e.target.value })}
          placeholder="Nom affiche dans l'en-tete"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Slogan / Tagline</label>
        <input
          type="text"
          value={branding.tagline || ''}
          onChange={(e) => updateBranding({ tagline: e.target.value })}
          placeholder="Votre slogan ou baseline"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Watermark */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Filigrane</label>
        <input
          type="text"
          value={branding.watermark || ''}
          onChange={(e) => updateBranding({ watermark: e.target.value })}
          placeholder="Texte en filigrane (ex: CONFIDENTIEL)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Texte affiche en leger sur toutes les pages
        </p>
      </div>

      {/* Header template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">En-tete de page</label>
        <input
          type="text"
          value={branding.headerTemplate || ''}
          onChange={(e) => updateBranding({ headerTemplate: e.target.value })}
          placeholder="Ex: {{companyName}} - {{reportTitle}}"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Variables: {'{{companyName}}'}, {'{{reportTitle}}'}, {'{{date}}'}
        </p>
      </div>

      {/* Footer template */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pied de page</label>
        <input
          type="text"
          value={branding.footerTemplate || ''}
          onChange={(e) => updateBranding({ footerTemplate: e.target.value })}
          placeholder="Ex: Confidentiel - {{companyName}}"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Page numbers */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">
              <Hash className="w-4 h-4 inline mr-1" />
              Numeros de page
            </h4>
            <p className="text-sm text-gray-500">Afficher la pagination sur chaque page</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={branding.showPageNumbers}
              onChange={(e) => updateBranding({ showPageNumbers: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {branding.showPageNumbers && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <div className="grid grid-cols-3 gap-2">
              {pageNumberPositions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => updateBranding({ pageNumberPosition: pos.id })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    branding.pageNumberPosition === pos.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <pos.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{pos.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Apercu de page</h4>
        <div className="relative bg-white rounded border border-gray-200 p-4 min-h-[200px]">
          {/* Header */}
          {branding.headerTemplate && (
            <div className="text-xs text-gray-400 border-b border-gray-100 pb-2 mb-4">
              {branding.headerTemplate
                .replace('{{companyName}}', branding.companyName || 'Entreprise')
                .replace('{{reportTitle}}', 'Titre du rapport')
                .replace('{{date}}', new Date().toLocaleDateString('fr-FR'))}
            </div>
          )}

          {/* Logo */}
          {branding.logo && (
            <div className="absolute top-4 right-4">
              <img src={branding.logo} alt="Logo" className="h-8 object-contain opacity-50" />
            </div>
          )}

          {/* Watermark */}
          {branding.watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-gray-100 transform -rotate-45">
                {branding.watermark}
              </span>
            </div>
          )}

          {/* Content placeholder */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
          </div>

          {/* Footer */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-2">
            <span>
              {branding.footerTemplate
                ?.replace('{{companyName}}', branding.companyName || 'Entreprise')
                .replace('{{reportTitle}}', 'Titre du rapport')
                .replace('{{date}}', new Date().toLocaleDateString('fr-FR')) || ''}
            </span>
            {branding.showPageNumbers && (
              <span
                className={
                  branding.pageNumberPosition === 'bottom-center' ? 'mx-auto' : ''
                }
              >
                Page 1 / 10
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingEditor;
