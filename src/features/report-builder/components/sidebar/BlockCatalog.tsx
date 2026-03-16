/**
 * Block Catalog — Sidebar panel with draggable block types
 */
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Type, Heading1, Heading2, Heading3, Quote,
  Hash, LayoutGrid, Table, BarChart3, TrendingUp, PieChart,
  Minus, MoveVertical, FileDown, BookOpen, Search,
} from 'lucide-react';
import { catalogItems, catalogCategories } from '../../data/catalogItems';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { CatalogCategory, ReportBlock } from '../../types';

const iconMap: Record<string, React.ReactNode> = {
  'heading-1': <Heading1 className="w-4 h-4" />,
  'heading-2': <Heading2 className="w-4 h-4" />,
  'heading-3': <Heading3 className="w-4 h-4" />,
  'text': <Type className="w-4 h-4" />,
  'quote': <Quote className="w-4 h-4" />,
  'hash': <Hash className="w-4 h-4" />,
  'layout-grid': <LayoutGrid className="w-4 h-4" />,
  'table': <Table className="w-4 h-4" />,
  'bar-chart-3': <BarChart3 className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'pie-chart': <PieChart className="w-4 h-4" />,
  'minus': <Minus className="w-4 h-4" />,
  'move-vertical': <MoveVertical className="w-4 h-4" />,
  'file-down': <FileDown className="w-4 h-4" />,
  'book-open': <BookOpen className="w-4 h-4" />,
};

// Draggable catalog item
const CatalogDraggableItem: React.FC<{ item: typeof catalogItems[0] }> = ({ item }) => {
  const { addBlock, selectedPageIndex } = useReportBuilderStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalog-${item.id}`,
    data: { catalogItem: item },
  });

  const handleClick = () => {
    const block: ReportBlock = {
      ...item.defaultBlock,
      id: crypto.randomUUID(),
    } as ReportBlock;
    addBlock(selectedPageIndex, block);
  };

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm hover:bg-neutral-100 hover:text-neutral-800 transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <span className="text-neutral-400">{iconMap[item.icon] || <Hash className="w-4 h-4" />}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-neutral-700 text-xs">{item.label}</div>
        <div className="text-[10px] text-neutral-400 truncate">{item.description}</div>
      </div>
    </button>
  );
};

const BlockCatalog: React.FC = () => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CatalogCategory | 'all'>('all');

  const filtered = catalogItems.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search && !item.label.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = activeCategory === 'all'
    ? catalogCategories.map(cat => ({
        ...cat,
        items: filtered.filter(i => i.category === cat.id),
      })).filter(g => g.items.length > 0)
    : [{ id: activeCategory, label: '', icon: '', items: filtered }];

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un bloc…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex px-3 gap-1 mb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-1 text-[10px] rounded-md font-medium ${activeCategory === 'all' ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100'}`}
        >
          Tout
        </button>
        {catalogCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2 py-1 text-[10px] rounded-md font-medium ${activeCategory === cat.id ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-2">
        {grouped.map(group => (
          <div key={group.id} className="mb-3">
            {group.label && (
              <div className="px-1 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <CatalogDraggableItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-xs text-neutral-400 py-8">Aucun bloc trouvé</div>
        )}
      </div>
    </div>
  );
};

export default BlockCatalog;
