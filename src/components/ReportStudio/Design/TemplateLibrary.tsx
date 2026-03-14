/**
 * TemplateLibrary - Library of cover page templates
 */

import React, { useState } from 'react';
import { Search, Check, Crown, Grid, List, X } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import { coverTemplates } from '@/data/reportDesignDefaults';
import type { CoverTemplate, TemplateCategory } from '@/types/reportDesign';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewTemplate, setPreviewTemplate] = useState<CoverTemplate | null>(null);
  const { settings } = useReportDesignStore();

  const categories: { id: TemplateCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'corporate', label: 'Corporate' },
    { id: 'creative', label: 'Creatif' },
    { id: 'minimal', label: 'Minimal' },
    { id: 'professional', label: 'Professionnel' },
  ];

  const filteredTemplates = coverTemplates.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: CoverTemplate) => {
    onSelect(template.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Librairie de modeles</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un modele..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View mode */}
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun modele trouve</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={settings.coverPage.templateId === template.id}
                  onSelect={() => handleSelect(template)}
                  onPreview={() => setPreviewTemplate(template)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <TemplateListItem
                  key={template.id}
                  template={template}
                  isSelected={settings.coverPage.templateId === template.id}
                  onSelect={() => handleSelect(template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Preview modal */}
        {previewTemplate && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-8">
            <div className="relative bg-white rounded-xl max-w-2xl w-full">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <TemplatePreview template={previewTemplate} />
              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    handleSelect(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Utiliser ce modele
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Template Card Component
const TemplateCard: React.FC<{
  template: CoverTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}> = ({ template, isSelected, onSelect, onPreview }) => {
  return (
    <div
      className={`relative group rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-600 ring-2 ring-indigo-200'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onPreview}
    >
      {/* Thumbnail */}
      <div
        className="aspect-[3/4] p-4 flex flex-col justify-center items-center"
        style={{
          background: template.config.backgroundOverlay || template.colors?.primary || '#6366f1',
        }}
      >
        <div className="text-white text-center">
          <div className="text-lg font-bold mb-1">Titre du rapport</div>
          <div className="text-sm opacity-80">Sous-titre</div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 text-sm">{template.name}</h3>
            <p className="text-xs text-gray-500">{template.category}</p>
          </div>
          {template.isPremium && (
            <Crown className="w-4 h-4 text-amber-500" />
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Utiliser
        </button>
      </div>
    </div>
  );
};

// Template List Item Component
const TemplateListItem: React.FC<{
  template: CoverTemplate;
  isSelected: boolean;
  onSelect: () => void;
}> = ({ template, isSelected, onSelect }) => {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50'
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Mini preview */}
      <div
        className="w-16 h-20 rounded flex items-center justify-center flex-shrink-0"
        style={{
          background: template.config.backgroundOverlay || template.colors?.primary || '#6366f1',
        }}
      >
        <div className="text-white text-[8px] text-center font-bold">Aa</div>
      </div>

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          {template.isPremium && <Crown className="w-4 h-4 text-amber-500" />}
        </div>
        <p className="text-sm text-gray-500">{template.description}</p>
        <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
          {template.category}
        </span>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

// Template Preview Component
const TemplatePreview: React.FC<{ template: CoverTemplate }> = ({ template }) => {
  return (
    <div
      className="aspect-[3/4] max-h-[60vh] rounded-t-xl flex flex-col justify-center items-center p-8"
      style={{
        background: template.config.backgroundOverlay || template.colors?.primary || '#6366f1',
      }}
    >
      <div className="text-white text-center">
        <div className="text-3xl font-bold mb-2">Titre du rapport</div>
        <div className="text-lg opacity-80 mb-6">Sous-titre de presentation</div>
        <div className="text-sm opacity-60">
          <div>Auteur: Marie Dupont</div>
          <div>Date: {new Date().toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
    </div>
  );
};

export default TemplateLibrary;
