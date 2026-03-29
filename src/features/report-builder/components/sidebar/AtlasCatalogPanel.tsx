// @ts-nocheck
/**
 * Atlas F&A Catalog — FULL independent section
 * Displays ALL tables, dashboards, charts, KPIs from Atlas F&A.
 * User can browse, search, preview, and add to report.
 * CDC Section 6.3 — CŒUR DU SYSTÈME
 */
import React, { useState, useMemo } from 'react';
import {
  Search, LayoutDashboard, Table, BarChart3, Hash,
  ChevronRight, ChevronDown, Plus, Eye, Star, StarOff,
  TrendingUp, PieChart, Clock, FileText, BookOpen,
  Shield, Target, Package, Users, Briefcase, DollarSign,
  Layers, Activity, Calculator, RefreshCw, FileBarChart,
  ArrowDownUp, GitCompare, UserCheck, Percent, Droplets, Scale,
  PiggyBank, Receipt,
} from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import {
  atlasCatalog,
  atlasCatalogCategories,
  getSubcategories,
  type AtlasCatalogCategory,
  type AtlasCatalogItem,
} from '../../data/atlasCatalog';
import type { ReportBlock, KPIBlock, TableBlock, ChartBlock } from '../../types';

// ---- Icon mapping ----
const iconMap: Record<string, React.ReactNode> = {
  'layout-dashboard': <LayoutDashboard className="w-4 h-4" />,
  'table': <Table className="w-4 h-4" />,
  'bar-chart-3': <BarChart3 className="w-4 h-4" />,
  'hash': <Hash className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'pie-chart': <PieChart className="w-4 h-4" />,
  'clock': <Clock className="w-4 h-4" />,
  'file-text': <FileText className="w-4 h-4" />,
  'book-open': <BookOpen className="w-4 h-4" />,
  'shield': <Shield className="w-4 h-4" />,
  'shield-check': <Shield className="w-4 h-4" />,
  'target': <Target className="w-4 h-4" />,
  'package': <Package className="w-4 h-4" />,
  'users': <Users className="w-4 h-4" />,
  'briefcase': <Briefcase className="w-4 h-4" />,
  'dollar-sign': <DollarSign className="w-4 h-4" />,
  'layers': <Layers className="w-4 h-4" />,
  'activity': <Activity className="w-4 h-4" />,
  'calculator': <Calculator className="w-4 h-4" />,
  'refresh-cw': <RefreshCw className="w-4 h-4" />,
  'file-bar-chart': <FileBarChart className="w-4 h-4" />,
  'arrow-down-up': <ArrowDownUp className="w-4 h-4" />,
  'git-compare': <GitCompare className="w-4 h-4" />,
  'user-check': <UserCheck className="w-4 h-4" />,
  'percent': <Percent className="w-4 h-4" />,
  'droplets': <Droplets className="w-4 h-4" />,
  'scale': <Scale className="w-4 h-4" />,
  'piggy-bank': <PiggyBank className="w-4 h-4" />,
  'receipt': <Receipt className="w-4 h-4" />,
  'trending-down': <TrendingUp className="w-4 h-4 rotate-180" />,
  'radar': <Activity className="w-4 h-4" />,
};

const categoryIcons: Record<AtlasCatalogCategory, React.ReactNode> = {
  dashboards: <LayoutDashboard className="w-4 h-4" />,
  tables: <Table className="w-4 h-4" />,
  charts: <BarChart3 className="w-4 h-4" />,
  kpis: <Hash className="w-4 h-4" />,
};

const categoryColors: Record<AtlasCatalogCategory, string> = {
  dashboards: 'bg-primary-50 text-primary-700 border-primary-200',
  tables: 'bg-neutral-100 text-neutral-800 border-blue-200',
  charts: 'bg-primary-50 text-primary-700 border-primary-200',
  kpis: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ---- Create block from catalog item ----
function createBlockFromCatalog(item: AtlasCatalogItem): ReportBlock {
  const id = crypto.randomUUID();
  const baseStyle = { marginBottom: 12 };

  switch (item.blockType) {
    case 'kpi':
      return {
        id, type: 'kpi', locked: false, style: baseStyle,
        label: item.label, value: null, previousValue: null,
        format: 'currency', unit: 'FCFA',
        source: item.source, showTrend: true, showSparkline: false, size: 'medium',
      } as KPIBlock;

    case 'table':
      return {
        id, type: 'table', locked: false, style: baseStyle,
        title: item.label, source: item.source,
        columns: [
          { key: 'label', label: 'Libellé', align: 'left', format: 'text', visible: true },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency', visible: true },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency', visible: true },
          { key: 'solde', label: 'Solde', align: 'right', format: 'currency', visible: true },
        ],
        rows: [],
        showHeader: true, showTotal: true, striped: true,
        bordered: false, highlightNegative: true,
      } as TableBlock;

    case 'chart':
      return {
        id, type: 'chart', locked: false, style: baseStyle,
        title: item.label, source: item.source,
        chartType: item.source.includes('donut') || item.source.includes('structure') ? 'donut'
          : item.source.includes('line') || item.source.includes('evolution') || item.source.includes('dso') || item.source.includes('bfr') || item.source.includes('cumul') ? 'line'
          : 'bar',
        data: [],
        xAxisKey: 'label',
        series: [{ key: 'value', label: 'Valeur' }],
        showLegend: true, legendPosition: 'bottom',
        height: 250, showGrid: true,
      } as ChartBlock;

    default:
      // Dashboard → KPI Grid as fallback
      return {
        id, type: 'kpi-grid', locked: false, style: baseStyle,
        columns: 4,
        kpis: [
          { label: 'CA', value: null, format: 'currency' as const, showTrend: true, showSparkline: false, size: 'medium' as const, locked: false, style: {} },
          { label: 'Résultat', value: null, format: 'currency' as const, showTrend: true, showSparkline: false, size: 'medium' as const, locked: false, style: {} },
          { label: 'EBITDA', value: null, format: 'currency' as const, showTrend: true, showSparkline: false, size: 'medium' as const, locked: false, style: {} },
          { label: 'Trésorerie', value: null, format: 'currency' as const, showTrend: true, showSparkline: false, size: 'medium' as const, locked: false, style: {} },
        ],
      } as ReportBlock;
  }
}

// ---- Catalog Item Component ----
const CatalogItemCard: React.FC<{
  item: AtlasCatalogItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPreview: () => void;
  onAdd: () => void;
}> = ({ item, isFavorite, onToggleFavorite, onPreview, onAdd }) => {
  const catColor = categoryColors[item.category];

  return (
    <div className="group border border-neutral-200 rounded-lg p-3 hover:border-neutral-300 hover:shadow-sm transition-all bg-white">
      <div className="flex items-start gap-2.5">
        <div className={`p-1.5 rounded-md border ${catColor}`}>
          {iconMap[item.icon] || <Hash className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-neutral-800 truncate">{item.label}</span>
            {item.isNew && (
              <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Nouveau</span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">{item.description}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded">{item.subcategory}</span>
            {item.periodBound && (
              <span className="text-[9px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />Période
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-neutral-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded"
        >
          <Plus className="w-3 h-3" />
          Ajouter au rapport
        </button>
        <button onClick={onPreview} className="p-1 rounded hover:bg-neutral-100 text-neutral-400" title="Aperçu">
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button onClick={onToggleFavorite} className="p-1 rounded hover:bg-neutral-100" title="Favoris">
          {isFavorite
            ? <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            : <StarOff className="w-3.5 h-3.5 text-neutral-400" />
          }
        </button>
      </div>
    </div>
  );
};

// ---- Preview Panel ----
const PreviewPanel: React.FC<{ item: AtlasCatalogItem; onClose: () => void; onAdd: () => void }> = ({ item, onClose, onAdd }) => (
  <div className="absolute inset-0 bg-white z-20 flex flex-col">
    <div className="flex items-center justify-between p-3 border-b border-neutral-200">
      <button onClick={onClose} className="text-xs text-neutral-900 hover:text-blue-800">← Retour</button>
      <button onClick={onAdd} className="flex items-center gap-1 px-3 py-1 text-[10px] font-medium text-white bg-neutral-900 rounded">
        <Plus className="w-3 h-3" /> Ajouter
      </button>
    </div>
    <div className="p-4 flex-1 overflow-y-auto">
      <div className={`inline-flex items-center gap-2 p-2 rounded-md border ${categoryColors[item.category]} mb-3`}>
        {iconMap[item.icon] || <Hash className="w-4 h-4" />}
        <span className="text-xs font-semibold">{item.label}</span>
      </div>
      <p className="text-xs text-neutral-600 mb-3">{item.description}</p>
      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between"><span className="text-neutral-500">Catégorie</span><span className="text-neutral-700 font-medium">{item.subcategory}</span></div>
        <div className="flex justify-between"><span className="text-neutral-500">Type de bloc</span><span className="text-neutral-700 font-medium capitalize">{item.blockType}</span></div>
        <div className="flex justify-between"><span className="text-neutral-500">Source</span><span className="text-neutral-700 font-mono text-[10px]">{item.source}</span></div>
        <div className="flex justify-between"><span className="text-neutral-500">Lié à la période</span><span className="text-neutral-700">{item.periodBound ? 'Oui' : 'Non'}</span></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {item.tags.map(tag => (
          <span key={tag} className="text-[9px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded">{tag}</span>
        ))}
      </div>
      {/* Preview placeholder */}
      <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-lg p-6 text-center">
        <div className={`inline-flex p-3 rounded-lg mb-2 ${categoryColors[item.category]}`}>
          {categoryIcons[item.category]}
        </div>
        <p className="text-xs text-neutral-500">Aperçu avec données réelles</p>
        <p className="text-[10px] text-neutral-400 mt-1">Les données se chargeront automatiquement depuis Atlas F&A</p>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AtlasCatalogPanel: React.FC = () => {
  const { addBlock, selectedPageIndex } = useReportBuilderStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<AtlasCatalogCategory | 'all'>('all');
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [previewItem, setPreviewItem] = useState<AtlasCatalogItem | null>(null);

  const toggleSub = (sub: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      next.has(sub) ? next.delete(sub) : next.add(sub);
      return next;
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAdd = (item: AtlasCatalogItem) => {
    const block = createBlockFromCatalog(item);
    addBlock(selectedPageIndex, block);
  };

  // Filter items
  const filtered = useMemo(() => {
    return atlasCatalog.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (showFavoritesOnly && !favorites.has(item.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        return item.label.toLowerCase().includes(q)
          || item.description.toLowerCase().includes(q)
          || item.tags.some(t => t.includes(q))
          || item.subcategory.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeCategory, search, showFavoritesOnly, favorites]);

  // Group by subcategory
  const grouped = useMemo(() => {
    const map = new Map<string, AtlasCatalogItem[]>();
    for (const item of filtered) {
      const key = item.subcategory;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  // If previewing
  if (previewItem) {
    return (
      <div className="relative h-full">
        <PreviewPanel
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onAdd={() => { handleAdd(previewItem); setPreviewItem(null); }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="text-xs font-bold text-neutral-800 mb-2">Catalogue Atlas F&A</div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher tables, graphiques, KPIs…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 px-3 mb-2 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-1 text-[10px] rounded-md font-medium ${activeCategory === 'all' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'}`}
        >
          Tout ({atlasCatalog.length})
        </button>
        {atlasCatalogCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-md font-medium ${
              activeCategory === cat.id ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
            }`}
          >
            {categoryIcons[cat.id]}
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Favorites toggle */}
      <div className="flex items-center px-3 mb-2">
        <button
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-md ${showFavoritesOnly ? 'bg-amber-100 text-amber-700' : 'text-neutral-400 hover:bg-neutral-100'}`}
        >
          <Star className="w-3 h-3" />
          Favoris ({favorites.size})
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-neutral-400">{filtered.length} éléments</span>
      </div>

      {/* Items grouped by subcategory */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Aucun élément trouvé</p>
          </div>
        ) : (
          grouped.map(([subcategory, items]) => {
            const isExpanded = expandedSubs.has(subcategory) || search.length > 0;
            return (
              <div key={subcategory} className="mb-3">
                <button
                  onClick={() => toggleSub(subcategory)}
                  className="flex items-center gap-1.5 w-full text-left py-1.5 text-[11px] font-semibold text-neutral-600 hover:text-neutral-800"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {subcategory}
                  <span className="text-[9px] text-neutral-400 font-normal">({items.length})</span>
                </button>
                {isExpanded && (
                  <div className="space-y-2 mt-1">
                    {items.map(item => (
                      <CatalogItemCard
                        key={item.id}
                        item={item}
                        isFavorite={favorites.has(item.id)}
                        onToggleFavorite={() => toggleFavorite(item.id)}
                        onPreview={() => setPreviewItem(item)}
                        onAdd={() => handleAdd(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AtlasCatalogPanel;
