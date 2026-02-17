/**
 * TemplateSelector — Selection de modeles d'ecritures predefinies SYSCOHADA.
 * Affiche les 22 templates par categorie et pre-remplit les champs variables.
 */
import React, { useState, useMemo } from 'react';
import { X, FileText, ChevronRight, Search, Check, AlertCircle } from 'lucide-react';
import {
  JOURNAL_TEMPLATES,
  getTemplateCategories,
  getTemplatesByCategory,
  applyTemplate,
  type JournalEntryTemplate,
  type TemplateCategorie,
  type TemplateApplicationResult,
  type ChampVariable,
} from '../../services/templates/journalTemplates';

// ============================================================================
// TYPES
// ============================================================================

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: {
    lines: Array<{
      accountCode: string;
      accountName: string;
      label: string;
      debit: number;
      credit: number;
    }>;
    journal: string;
    label: string;
  }) => void;
}

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_COLORS: Record<TemplateCategorie, string> = {
  ACHATS: 'bg-orange-100 text-orange-700 border-orange-200',
  VENTES: 'bg-green-100 text-green-700 border-green-200',
  TRESORERIE: 'bg-blue-100 text-blue-700 border-blue-200',
  PAIE: 'bg-purple-100 text-purple-700 border-purple-200',
  OD: 'bg-gray-100 text-gray-700 border-gray-200',
  FISCALITE: 'bg-red-100 text-red-700 border-red-200',
};

// ============================================================================
// COMPONENT
// ============================================================================

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ isOpen, onClose, onApply }) => {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategorie | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<JournalEntryTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string | number>>({});
  const [applyError, setApplyError] = useState<string | null>(null);

  const categories = useMemo(() => getTemplateCategories(), []);

  const filteredTemplates = useMemo(() => {
    let templates = selectedCategory
      ? getTemplatesByCategory(selectedCategory)
      : JOURNAL_TEMPLATES;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(
        t => t.libelle.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)
      );
    }
    return templates;
  }, [selectedCategory, searchQuery]);

  const handleSelectTemplate = (template: JournalEntryTemplate) => {
    setSelectedTemplate(template);
    setApplyError(null);
    // Pre-fill defaults
    const defaults: Record<string, string | number> = {};
    for (const champ of template.champsVariables) {
      if (champ.defaut !== undefined) {
        defaults[champ.cle] = champ.defaut;
      }
    }
    setFieldValues(defaults);
  };

  const handleFieldChange = (cle: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [cle]: value }));
    setApplyError(null);
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    const result = applyTemplate(selectedTemplate, fieldValues);
    if (!result.success || !result.lines) {
      setApplyError(result.error || 'Erreur inconnue');
      return;
    }
    onApply({
      lines: result.lines,
      journal: selectedTemplate.journalDefaut,
      label: String(fieldValues['libelle'] || selectedTemplate.libelle),
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedCategory(null);
    setSelectedTemplate(null);
    setSearchQuery('');
    setFieldValues({});
    setApplyError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              {selectedTemplate ? selectedTemplate.libelle : "Modeles d'ecritures SYSCOHADA"}
            </h2>
          </div>
          <button onClick={() => { handleReset(); onClose(); }} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!selectedTemplate ? (
          /* Template browser */
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search + Category filter */}
            <div className="px-6 py-3 border-b border-gray-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un modele..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                    !selectedCategory ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Tous ({JOURNAL_TEMPLATES.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.categorie}
                    onClick={() => setSelectedCategory(cat.categorie)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      selectedCategory === cat.categorie
                        ? CATEGORY_COLORS[cat.categorie]
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full mb-1 ${CATEGORY_COLORS[template.categorie]}`}>
                          {template.categorie}
                        </span>
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-700">{template.libelle}</h3>
                        <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Journal: {template.journalDefaut} | {template.lignes.length} lignes
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-1 flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">Aucun modele trouve.</div>
              )}
            </div>
          </div>
        ) : (
          /* Field form for selected template */
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Template info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${CATEGORY_COLORS[selectedTemplate.categorie]}`}>
                  {selectedTemplate.categorie}
                </span>
                <span className="text-xs text-gray-500">Journal: {selectedTemplate.journalDefaut}</span>
              </div>
              <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
              <div className="mt-2 text-xs text-gray-500">
                Lignes comptables: {selectedTemplate.lignes.map(l => `${l.compte} ${l.libelle}`).join(' | ')}
              </div>
            </div>

            {/* Variable fields */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">Champs a renseigner</h3>
              {selectedTemplate.champsVariables.map((champ: ChampVariable) => (
                <div key={champ.cle} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    {champ.libelle} {champ.obligatoire && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={champ.type === 'montant' || champ.type === 'taux' ? 'number' : 'text'}
                    value={fieldValues[champ.cle] ?? ''}
                    onChange={e => handleFieldChange(champ.cle, e.target.value)}
                    placeholder={champ.defaut !== undefined ? String(champ.defaut) : ''}
                    step={champ.type === 'taux' ? '0.01' : champ.type === 'montant' ? '1' : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>

            {/* Error */}
            {applyError && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{applyError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => { setSelectedTemplate(null); setFieldValues({}); setApplyError(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Retour aux modeles
              </button>
              <button
                onClick={handleApply}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Appliquer le modele</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;
