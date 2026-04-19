/**
 * ImportTemplatesCatalogPage — Catalogue complet des modèles d'import Atlas F&A.
 *
 * Fonctionnalités :
 *   • Grille de cartes pour tous les templates du catalogue
 *   • Filtre par catégorie + code société + année
 *   • Badge de priorité (Essentiel / Recommandé / Optionnel)
 *   • Zone d'upload avec détection automatique (AtlasTemplateDetector)
 *   • Génération de noms de fichiers professionnels
 */
import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Users,
  FileText,
  Calculator,
  Package,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  DollarSign,
  Archive,
  Building2,
  Calendar,
  Percent,
  Landmark,
  LayoutGrid,
  BookOpenCheck,
  Send,
  FileCheck,
  Boxes,
  Shield,
  Settings,
  Download,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  ATLAS_IMPORT_TEMPLATES,
  downloadTemplate,
  type AtlasImportTemplate,
  type TemplateKey,
} from '../../services/import';
import AtlasTemplateDetector from '../../components/import/AtlasTemplateDetector';

// Mapping icône (string → composant lucide)
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  Users,
  FileText,
  Calculator,
  Package,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  DollarSign,
  Archive,
  Building2,
  Calendar,
  Percent,
  Landmark,
  LayoutGrid,
  BookOpenCheck,
  Send,
  FileCheck,
  Boxes,
  Shield,
  Settings,
};

type Priority = 'Essentiel' | 'Recommandé' | 'Optionnel';

const ESSENTIAL_KEYS: TemplateKey[] = [
  'parametres_societe',
  'parametres_exercices',
  'parametres_journaux',
  'parametres_taux_tva',
  'parametres_comptes_bancaires',
  'plan_comptable',
  'tiers',
  'ecritures',
  'reports_a_nouveau',
  'immobilisations',
];
const RECOMMENDED_KEYS: TemplateKey[] = [
  'grand_livre',
  'balance',
  'fec_syscohada',
  'parametres_utilisateurs',
  'parametres_sections_analytiques',
  'taux_devises',
];

function getPriority(key: TemplateKey): Priority {
  if (ESSENTIAL_KEYS.includes(key)) return 'Essentiel';
  if (RECOMMENDED_KEYS.includes(key)) return 'Recommandé';
  return 'Optionnel';
}

const CATEGORY_LABELS: Record<AtlasImportTemplate['category'] | 'all', string> = {
  all: 'Tous',
  parametres: 'Paramètres',
  comptabilite: 'Comptabilité',
  tiers: 'Tiers',
  immobilisations: 'Immobilisations',
  tresorerie: 'Trésorerie',
  stocks: 'Stocks',
  budget: 'Budget',
};

const ImportTemplatesCatalogPage: React.FC = () => {
  const [category, setCategory] = useState<AtlasImportTemplate['category'] | 'all'>('all');
  const [societeCode, setSocieteCode] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const filteredTemplates = useMemo(() => {
    if (category === 'all') return ATLAS_IMPORT_TEMPLATES;
    return ATLAS_IMPORT_TEMPLATES.filter(t => t.category === category);
  }, [category]);

  const handleDownload = (template: AtlasImportTemplate) => {
    downloadTemplate(template, {
      societeCode: societeCode || undefined,
      year: year || undefined,
    });
  };

  const priorityBadgeClass = (p: Priority) => {
    switch (p) {
      case 'Essentiel':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Recommandé':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-neutral-50 text-neutral-600 border-neutral-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              Modèles d'import Atlas F&amp;A
            </h1>
            <p className="text-sm text-neutral-600">
              {ATLAS_IMPORT_TEMPLATES.length} modèles SYSCOHADA prêts à l'emploi — paramétrage, comptabilité, tiers, immobilisations, trésorerie, stocks
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Convention de nommage des fichiers</p>
          <p className="text-blue-800">
            Chaque modèle est téléchargé sous la forme{' '}
            <code className="bg-blue-100 px-1 py-0.5 rounded text-xs">
              Modele_{'{Type}'}_{'{SOCIETE}'}_{'{Annee}'}_{'{Code}'}_{'{Periode}'}.xlsx
            </code>
            . Renseignez le code société et l'année pour personnaliser automatiquement les noms.
          </p>
        </div>
      </div>

      {/* Filtres + params */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Catégorie
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AtlasImportTemplate['category'] | 'all')}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            >
              {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Code société (optionnel)
            </label>
            <input
              type="text"
              value={societeCode}
              onChange={(e) => setSocieteCode(e.target.value)}
              placeholder="ex : SOCIETE_ALPHA_SA"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              Année exercice
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              min={2000}
              max={2100}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
            />
          </div>
        </div>
      </div>

      {/* Zone d'upload (détection automatique — round-trip) */}
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-neutral-700" />
          <h2 className="text-sm font-bold text-neutral-900">
            Vérification round-trip — Uploadez un fichier pour identifier le modèle
          </h2>
        </div>
        <AtlasTemplateDetector />
      </div>

      {/* Grille des templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const Icon = (template.icon && ICON_MAP[template.icon]) || FileSpreadsheet;
          const priority = getPriority(template.key);
          const totalCols = template.sheets.reduce((acc, s) => acc + s.columns.length, 0);

          return (
            <div
              key={template.key}
              className="bg-white rounded-lg border border-neutral-200 p-5 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-neutral-700" />
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {template.code}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 border rounded-full ${priorityBadgeClass(priority)}`}
                >
                  {priority}
                </span>
              </div>

              <h3 className="text-sm font-bold text-neutral-900 mb-1">
                {template.label}
              </h3>
              <p className="text-xs text-neutral-600 mb-4 flex-1">
                {template.description}
              </p>

              <div className="flex items-center justify-between text-xs text-neutral-500 mb-4 pb-3 border-b border-neutral-100">
                <span>{template.sheets.length} feuille{template.sheets.length > 1 ? 's' : ''}</span>
                <span>{totalCols} colonnes</span>
              </div>

              <button
                onClick={() => handleDownload(template)}
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-2 rounded-md text-xs font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Télécharger le modèle
              </button>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <p className="text-sm text-neutral-500">
            Aucun modèle dans cette catégorie.
          </p>
        </div>
      )}
    </div>
  );
};

export default ImportTemplatesCatalogPage;
