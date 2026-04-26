
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Tag, Search, Plus, Edit2, ChevronRight, X,
  Building, Computer, Car, Package, FileText, Settings,
  TrendingUp, DollarSign, LayoutGrid, List, Save
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { useData } from '../../contexts/DataContext';

interface SubCategory {
  id: number;
  name: string;
  code: string;
  count: number;
  value: number;
  depreciationRate: string;
}

interface Category {
  id: number;
  name: string;
  code: string;
  parent: null;
  count: number;
  value: number;
  depreciationRate: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  children: SubCategory[];
}

// SYSCOHADA category definitions (reference data — structure only, no values)
const SYSCOHADA_CATEGORIES = [
  { code: '21', name: 'Immobilisations corporelles', icon: Building, color: 'blue', subcategories: [
    { code: '211', name: 'Terrains' }, { code: '213', name: 'Bâtiments' },
    { code: '214', name: 'Aménagements' }, { code: '215', name: 'Installations techniques' },
  ]},
  { code: '24', name: 'Matériel informatique', icon: Computer, color: 'primary', subcategories: [
    { code: '241', name: 'Serveurs' }, { code: '244', name: 'Ordinateurs' }, { code: '245', name: 'Périphériques' },
  ]},
  { code: '22', name: 'Matériel de transport', icon: Car, color: 'green', subcategories: [
    { code: '221', name: 'Véhicules légers' }, { code: '222', name: 'Véhicules utilitaires' },
  ]},
  { code: '23', name: 'Mobilier et équipement', icon: Package, color: 'orange', subcategories: [
    { code: '231', name: 'Mobilier de bureau' }, { code: '232', name: 'Équipement industriel' },
  ]},
  { code: '20', name: 'Immobilisations incorporelles', icon: FileText, color: 'red', subcategories: [
    { code: '201', name: 'Logiciels' }, { code: '205', name: 'Brevets et licences' }, { code: '207', name: 'Fonds de commerce' },
  ]},
];

const AssetsCategories: React.FC = () => {
  const { adapter } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [settingsForm, setSettingsForm] = useState({
    classificationMethod: 'nature',
    maxHierarchy: '2',
    autoDepreciation: true,
    syscohadaCompliance: true,
  });

  // Load assets from DataAdapter
  useEffect(() => {
    if (!adapter) return;
    adapter.getAll('assets').then((assets: any[]) => setDbAssets(assets || [])).catch(() => setDbAssets([]));
  }, [adapter]);

  // Build categories dynamically from real assets
  const categories: Category[] = useMemo(() => {
    return SYSCOHADA_CATEGORIES.map((catDef, idx) => {
      // Filter assets matching this category code
      const catAssets = dbAssets.filter(a => {
        const code = a.accountCode || a.category || '';
        return code.startsWith(catDef.code);
      });
      const totalValue = catAssets.reduce((s, a) => s + (a.acquisitionValue || 0), 0);
      const avgRate = catAssets.length > 0
        ? (catAssets.reduce((s, a) => s + (a.depreciationRate || (a.usefulLife > 0 ? 100 / a.usefulLife : 0)), 0) / catAssets.length)
        : 0;

      const children: SubCategory[] = catDef.subcategories.map((sub, si) => {
        const subAssets = dbAssets.filter(a => {
          const code = a.accountCode || a.category || '';
          return code.startsWith(sub.code);
        });
        return {
          id: (idx + 1) * 10 + si + 1,
          name: sub.name,
          code: sub.code,
          count: subAssets.length,
          value: subAssets.reduce((s, a) => s + (a.acquisitionValue || 0), 0),
          depreciationRate: subAssets.length > 0
            ? `${(subAssets.reduce((s, a) => s + (a.depreciationRate || 0), 0) / subAssets.length).toFixed(0)}%`
            : '—',
        };
      });

      return {
        id: idx + 1,
        name: catDef.name,
        code: catDef.code,
        parent: null,
        count: catAssets.length,
        value: totalValue,
        depreciationRate: avgRate > 0 ? `${avgRate.toFixed(0)}%` : '—',
        icon: catDef.icon,
        color: catDef.color,
        children,
      };
    });
  }, [dbAssets]);

  const filteredCategories = categories.filter(cat =>
    searchTerm === '' ||
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.children.some(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleCategory = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-[var(--color-primary)]/10', text: 'text-[var(--color-primary)]', border: 'border-[var(--color-primary)]/20' },
      primary: { bg: 'bg-[var(--color-text-secondary)]/10', text: 'text-[var(--color-text-secondary)]', border: 'border-[var(--color-text-secondary)]/20' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
      orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
      red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' }
    };
    return colors[color] || colors.blue;
  };

  const totalAssets = categories.reduce((sum, c) => sum + c.count, 0);
  const totalValue = categories.reduce((sum, c) => sum + c.value, 0);
  const totalSubCategories = categories.reduce((sum, c) => sum + c.children.length, 0);

  const handleSaveSettings = () => {
    toast.success('Paramètres des catégories sauvegardés');
    setShowSettingsModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
            Catégories d'Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Classification et organisation des actifs
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Vue cartes"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Vue tableau"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <ModernButton
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Paramètres
          </ModernButton>
          <ModernButton
            variant="primary"
            size="sm"
            onClick={() => toast.success('Créer une nouvelle catégorie')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nouvelle catégorie
          </ModernButton>
        </div>
      </div>

      {/* Search */}
      <ModernCard>
        <CardBody>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -tranprimary-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Rechercher une catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </CardBody>
      </ModernCard>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total catégories</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {categories.length + totalSubCategories}
                </p>
              </div>
              <Tag className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Total actifs</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {totalAssets.toLocaleString()}
                </p>
              </div>
              <Package className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Valeur totale</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {(totalValue / 1000000).toFixed(2)}M FCFA
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Taux moyen</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">18.5%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-text-secondary)] opacity-20" />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* ========== TABLE VIEW ========== */}
      {viewMode === 'table' && (
        <ModernCard>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Toutes les catégories
            </h2>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="text-left p-3 text-sm font-medium text-[var(--color-text-primary)]">Code</th>
                    <th className="text-right p-3 text-sm font-medium text-[var(--color-text-primary)]">Actifs</th>
                    <th className="text-right p-3 text-sm font-medium text-[var(--color-text-primary)]">Valeur</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">Taux amort.</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">Sous-catégories</th>
                    <th className="text-center p-3 text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((category) => {
                    const colors = getColorClasses(category.color);
                    const Icon = category.icon;
                    const isExpanded = expandedCategories.has(category.id);

                    return (
                      <React.Fragment key={category.id}>
                        <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleCategory(category.id)}
                                className="p-0.5"
                              >
                                <ChevronRight
                                  className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                              <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                <Icon className={`w-4 h-4 ${colors.text}`} />
                              </div>
                              <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                                {category.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm font-mono text-[var(--color-text-secondary)]">{category.code}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{category.count}</span>
                          </td>
                          <td className="p-3 text-right">
                            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                              {(category.value / 1000).toLocaleString()}K
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-sm text-[var(--color-text-primary)]">{category.depreciationRate}</span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="text-sm text-[var(--color-text-secondary)]">{category.children.length}</span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => toast.success(`Modifier: ${category.name}`)}
                              className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {/* Sub-categories rows */}
                        {isExpanded && category.children.map((child) => (
                          <tr
                            key={child.id}
                            className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors bg-[var(--color-background-subtle)]"
                          >
                            <td className="p-3 pl-16">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${colors.bg}`} />
                                <span className="text-sm text-[var(--color-text-primary)]">{child.name}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="text-sm font-mono text-[var(--color-text-secondary)]">{child.code}</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-sm text-[var(--color-text-primary)]">{child.count}</span>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-sm text-[var(--color-text-primary)]">
                                {(child.value / 1000).toLocaleString()}K
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-sm text-[var(--color-text-primary)]">{child.depreciationRate}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-sm text-[var(--color-text-secondary)]">—</span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toast.success(`Modifier: ${child.name}`)}
                                className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </ModernCard>
      )}

      {/* ========== CARDS VIEW ========== */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((category) => {
            const colors = getColorClasses(category.color);
            const Icon = category.icon;
            const isExpanded = expandedCategories.has(category.id);

            return (
              <ModernCard key={category.id} className="overflow-hidden">
                <CardBody>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--color-text-primary)]">
                            {category.name}
                          </h3>
                          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                            Code: {category.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="p-1 hover:bg-[var(--color-background-subtle)] rounded transition-colors"
                        >
                          <ChevronRight
                            className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => toast.success(`Modifier catégorie: ${category.name}`)}
                          className="p-1 hover:bg-[var(--color-background-subtle)] rounded transition-colors"
                          title="Modifier la catégorie"
                        >
                          <Edit2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Actifs</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{category.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Valeur</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {(category.value / 1000000).toFixed(2)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Taux amort.</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{category.depreciationRate}</p>
                      </div>
                    </div>

                    {isExpanded && category.children && (
                      <div className="pt-3 border-t border-[var(--color-border)] space-y-2">
                        {category.children.map((child) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--color-background-subtle)] transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-1 h-4 rounded-full ${colors.bg}`} />
                              <div>
                                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                  {child.name}
                                </p>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {child.code} • {child.count} actifs
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                {(child.value / 1000).toFixed(0)}K
                              </p>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {child.depreciationRate}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardBody>
              </ModernCard>
            );
          })}
        </div>
      )}

      {/* ========== SETTINGS MODAL ========== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSettingsModal(false)}
          />
          <div className="relative bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Paramètres des catégories
                  </h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Configuration de la classification des immobilisations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-[var(--color-background-subtle)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Classification Method */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Méthode de classification par défaut
                </label>
                <select
                  value={settingsForm.classificationMethod}
                  onChange={(e) => setSettingsForm({ ...settingsForm, classificationMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="nature">Par nature d'actif</option>
                  <option value="department">Par département</option>
                  <option value="location">Par localisation</option>
                  <option value="custom">Personnalisée</option>
                </select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Détermine comment les nouvelles immobilisations sont classées automatiquement
                </p>
              </div>

              {/* Max Hierarchy */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Hiérarchie maximale
                </label>
                <select
                  value={settingsForm.maxHierarchy}
                  onChange={(e) => setSettingsForm({ ...settingsForm, maxHierarchy: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="2">2 niveaux</option>
                  <option value="3">3 niveaux</option>
                  <option value="4">4 niveaux</option>
                  <option value="unlimited">Illimitée</option>
                </select>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  Nombre maximum de niveaux de sous-catégories
                </p>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Amortissement automatique
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Appliquer le taux par défaut de la catégorie aux nouveaux actifs
                    </p>
                  </div>
                  <button
                    onClick={() => setSettingsForm({ ...settingsForm, autoDepreciation: !settingsForm.autoDepreciation })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settingsForm.autoDepreciation ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settingsForm.autoDepreciation ? 'tranprimary-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Conformité SYSCOHADA
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Valider les taux et durées selon les normes SYSCOHADA
                    </p>
                  </div>
                  <button
                    onClick={() => setSettingsForm({ ...settingsForm, syscohadaCompliance: !settingsForm.syscohadaCompliance })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settingsForm.syscohadaCompliance ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        settingsForm.syscohadaCompliance ? 'tranprimary-x-5' : ''
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)]">
              <ModernButton
                variant="outline"
                size="sm"
                onClick={() => setShowSettingsModal(false)}
              >
                Annuler
              </ModernButton>
              <ModernButton
                variant="primary"
                size="sm"
                onClick={handleSaveSettings}
              >
                <Save className="w-4 h-4 mr-1" />
                Sauvegarder
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsCategories;
