
import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { toast } from 'sonner';
import {
  Tag, Search, Plus, Edit2, ChevronRight, X,
  Building, Computer, Car, Package, FileText, Settings,
  TrendingUp, DollarSign, LayoutGrid, List, Save
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';

interface SubCategory {
  id: number;
  name: string;
  code: string;
  count: number;
  value: number;        // valeur brute (acquisition)
  amort: number;        // amortissements cumulés
  vnc: number;          // valeur nette comptable = value − amort
  depreciationRate: string;
}

interface Category {
  id: number;
  name: string;
  code: string;
  parent: null;
  count: number;
  value: number;        // valeur brute
  amort: number;        // amortissements cumulés
  vnc: number;          // valeur nette comptable
  depreciationRate: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  children: SubCategory[];
}

// Classes SYSCOHADA d'immobilisations (libellés OFFICIELS). Les sous-catégories
// sont dérivées DYNAMIQUEMENT des comptes réels (pas de liste figée).
const SYSCOHADA_CATEGORIES = [
  { code: '20', name: 'Charges immobilisées', icon: FileText, color: 'red' },
  { code: '21', name: 'Immobilisations incorporelles', icon: FileText, color: 'red' },
  { code: '22', name: 'Terrains', icon: Building, color: 'green' },
  { code: '23', name: 'Bâtiments, installations et agencements', icon: Building, color: 'blue' },
  { code: '24', name: 'Matériel, mobilier et transport', icon: Package, color: 'orange' },
  { code: '25', name: 'Avances et acomptes sur immobilisations', icon: DollarSign, color: 'primary' },
  { code: '26', name: 'Titres de participation', icon: TrendingUp, color: 'primary' },
  { code: '27', name: 'Autres immobilisations financières', icon: TrendingUp, color: 'primary' },
];

const AssetsCategories: React.FC = () => {
  const { adapter } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  // Catégorie ouverte en MODALE détaillée (au lieu d'un dépliage en ligne).
  const [detailCategory, setDetailCategory] = useState<Category | null>(null);
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
      // Taux d'amortissement linéaire SYSCOHADA = 100 / durée d'utilité.
      const ratedCatAssets = catAssets.filter(a => (a.usefulLifeYears || a.usefulLife || 0) > 0);
      const avgRate = ratedCatAssets.length > 0
        ? (ratedCatAssets.reduce((s, a) => s + 100 / (a.usefulLifeYears || a.usefulLife), 0) / ratedCatAssets.length)
        : 0;

      // Sous-catégories = comptes RÉELS (préfixe 3 chiffres) présents dans la classe.
      const bySub: Record<string, any[]> = {};
      for (const a of catAssets) {
        const sub = String(a.accountCode || '').substring(0, 3) || catDef.code;
        (bySub[sub] = bySub[sub] || []).push(a);
      }
      const children: SubCategory[] = Object.entries(bySub)
        .sort((x, y) => x[0].localeCompare(y[0]))
        .map(([code, subAssets], si) => {
          const value = subAssets.reduce((s, a) => s + (a.acquisitionValue || 0), 0);
          const amort = subAssets.reduce((s, a) => s + (a.cumulDepreciation || 0), 0);
          return {
            id: (idx + 1) * 100 + si + 1,
            name: subAssets[0]?.name || subAssets[0]?.designation || code,
            code,
            count: subAssets.length,
            value,
            amort,
            vnc: Math.max(0, value - amort),
            depreciationRate: (() => {
              const rated = subAssets.filter(a => (a.usefulLifeYears || a.usefulLife || 0) > 0);
              if (rated.length === 0) return '—';
              const r = rated.reduce((s, a) => s + 100 / (a.usefulLifeYears || a.usefulLife), 0) / rated.length;
              return `${r.toFixed(0)}%`;
            })(),
          };
        });

      const totalAmort = catAssets.reduce((s, a) => s + (a.cumulDepreciation || 0), 0);
      return {
        id: idx + 1,
        name: catDef.name,
        code: catDef.code,
        parent: null,
        count: catAssets.length,
        value: totalValue,
        amort: totalAmort,
        vnc: Math.max(0, totalValue - totalAmort),
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

  // Taux d'amortissement moyen réel (linéaire SYSCOHADA = 100 / durée d'utilité)
  // calculé sur les immobilisations dont la durée d'utilité est renseignée.
  const ratedAssets = dbAssets.filter(a => (a.usefulLifeYears || a.usefulLife || 0) > 0);
  const avgDepreciationRate = ratedAssets.length > 0
    ? ratedAssets.reduce((s, a) => s + 100 / (a.usefulLifeYears || a.usefulLife), 0) / ratedAssets.length
    : null;

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
          <PageHeaderActions />
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
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
                <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                  {avgDepreciationRate !== null ? `${avgDepreciationRate.toFixed(1)}%` : '—'}
                </p>
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
                      <tr
                        key={category.id}
                        onClick={() => setDetailCategory(category)}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
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
                            {formatCurrency(category.value)}
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
                            onClick={(e) => { e.stopPropagation(); setDetailCategory(category); }}
                            className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1 text-xs"
                            title="Voir le détail de la catégorie"
                          >
                            Détail <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
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
                      <button
                        onClick={() => setDetailCategory(category)}
                        className="p-1.5 text-[var(--color-text-secondary)] hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-flex items-center gap-1 text-xs"
                        title="Voir le détail de la catégorie"
                      >
                        Détail <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Actifs</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{category.count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Valeur brute</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(category.value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">VNC</p>
                        <p className="font-semibold text-green-600">{formatCurrency(category.vnc)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--color-text-secondary)]">Taux amort.</p>
                        <p className="font-semibold text-[var(--color-text-primary)]">{category.depreciationRate}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDetailCategory(category)}
                      className="w-full text-sm text-[var(--color-primary)] hover:underline text-left"
                    >
                      {category.children.length} sous-catégorie{category.children.length > 1 ? 's' : ''} — voir le détail →
                    </button>
                  </div>
                </CardBody>
              </ModernCard>
            );
          })}
        </div>
      )}

      {/* ========== DÉTAIL CATÉGORIE (MODALE) ========== */}
      {detailCategory && (() => {
        const c = detailCategory;
        const colors = getColorClasses(c.color);
        const Icon = c.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDetailCategory(null)} />
            <div className="relative bg-[var(--color-surface)] rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              {/* En-tête */}
              <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{c.name}</h2>
                    <p className="text-sm text-[var(--color-text-secondary)]">Classe SYSCOHADA {c.code} · {c.children.length} sous-catégorie(s)</p>
                  </div>
                </div>
                <button onClick={() => setDetailCategory(null)} className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-background-subtle)]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Synthèse de la classe */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 border-b border-[var(--color-border)]">
                <div><p className="text-xs text-[var(--color-text-secondary)]">Actifs</p><p className="font-bold text-[var(--color-text-primary)]">{c.count}</p></div>
                <div><p className="text-xs text-[var(--color-text-secondary)]">Valeur brute</p><p className="font-bold text-[var(--color-text-primary)]">{formatCurrency(c.value)}</p></div>
                <div><p className="text-xs text-[var(--color-text-secondary)]">Amort. cumulé</p><p className="font-bold text-red-600">{formatCurrency(c.amort)}</p></div>
                <div><p className="text-xs text-[var(--color-text-secondary)]">VNC</p><p className="font-bold text-green-600">{formatCurrency(c.vnc)}</p></div>
                <div><p className="text-xs text-[var(--color-text-secondary)]">Taux amort.</p><p className="font-bold text-[var(--color-text-primary)]">{c.depreciationRate}</p></div>
              </div>

              {/* Détail des sous-catégories */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Sous-catégories (comptes)</h3>
                {c.children.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)]">Aucune sous-catégorie.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-[var(--color-text-secondary)]">
                          <th className="text-left py-2 pr-3 font-medium">Compte</th>
                          <th className="text-left py-2 px-3 font-medium">Libellé</th>
                          <th className="text-right py-2 px-3 font-medium">Actifs</th>
                          <th className="text-right py-2 px-3 font-medium">Valeur brute</th>
                          <th className="text-right py-2 px-3 font-medium">Amort. cumulé</th>
                          <th className="text-right py-2 px-3 font-medium">VNC</th>
                          <th className="text-center py-2 pl-3 font-medium">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.children.map(child => (
                          <tr key={child.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-subtle)]">
                            <td className="py-2 pr-3 font-mono text-xs text-[var(--color-primary)]">{child.code}</td>
                            <td className="py-2 px-3 max-w-[260px] truncate" title={child.name}>{child.name}</td>
                            <td className="py-2 px-3 text-right">{child.count}</td>
                            <td className="py-2 px-3 text-right font-mono">{formatCurrency(child.value)}</td>
                            <td className="py-2 px-3 text-right font-mono text-red-600">{formatCurrency(child.amort)}</td>
                            <td className="py-2 px-3 text-right font-mono text-green-600">{formatCurrency(child.vnc)}</td>
                            <td className="py-2 pl-3 text-center">{child.depreciationRate}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[var(--color-border)] font-bold">
                          <td className="py-2 pr-3" colSpan={2}>Total {c.code}</td>
                          <td className="py-2 px-3 text-right">{c.count}</td>
                          <td className="py-2 px-3 text-right font-mono">{formatCurrency(c.value)}</td>
                          <td className="py-2 px-3 text-right font-mono text-red-700">{formatCurrency(c.amort)}</td>
                          <td className="py-2 px-3 text-right font-mono text-green-700">{formatCurrency(c.vnc)}</td>
                          <td className="py-2 pl-3 text-center">{c.depreciationRate}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                        settingsForm.autoDepreciation ? 'translate-x-5' : ''
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
                        settingsForm.syscohadaCompliance ? 'translate-x-5' : ''
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
