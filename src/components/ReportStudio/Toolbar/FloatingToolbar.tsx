/**
 * FloatingToolbar - Complete insertion and editing toolbar
 * Provides tools for inserting blocks, formatting text, and document actions
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { BlockType } from '@/types/reportStudio';
import {
  Pilcrow,
  Heading,
  List,
  Quote,
  Lightbulb,
  BarChart3,
  Table,
  Image,
  SeparatorHorizontal,
  FileText,
  PenTool,
  Layout,
} from 'lucide-react';

interface FloatingToolbarProps {
  visible: boolean;
  selectedBlockId: string | null;
  onInsert: (type: BlockType, afterBlockId?: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

interface ToolbarItem {
  id: BlockType | string;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  category: 'content' | 'media' | 'structure' | 'ai';
}

const toolbarItems: ToolbarItem[] = [
  // Content blocks
  { id: 'paragraph', icon: Pilcrow, label: 'Paragraphe', shortcut: '/texte', category: 'content' },
  { id: 'heading', icon: Heading, label: 'Titre', shortcut: '/titre', category: 'content' },
  { id: 'list', icon: List, label: 'Liste', shortcut: '/liste', category: 'content' },
  { id: 'quote', icon: Quote, label: 'Citation', shortcut: '/citation', category: 'content' },
  { id: 'callout', icon: Lightbulb, label: 'Encadré', shortcut: '/encadre', category: 'content' },

  // Media blocks
  { id: 'chart', icon: BarChart3, label: 'Graphique', shortcut: '/graphique', category: 'media' },
  { id: 'table', icon: Table, label: 'Tableau', shortcut: '/tableau', category: 'media' },
  { id: 'image', icon: Image, label: 'Image', shortcut: '/image', category: 'media' },

  // Structure blocks
  { id: 'divider', icon: SeparatorHorizontal, label: 'Séparateur', shortcut: '/separateur', category: 'structure' },
  { id: 'pagebreak', icon: FileText, label: 'Saut de page', shortcut: '/page', category: 'structure' },
];

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  visible,
  selectedBlockId,
  onInsert,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('content');

  const handleInsert = useCallback((type: string) => {
    onInsert(type as BlockType, selectedBlockId || undefined);
    setIsExpanded(false);
  }, [onInsert, selectedBlockId]);

  const filteredItems = toolbarItems.filter(item =>
    activeCategory === 'all' || item.category === activeCategory
  );

  const categories: { id: string; label: string; icon: React.ElementType }[] = [
    { id: 'content', label: 'Contenu', icon: PenTool },
    { id: 'media', label: 'Média', icon: BarChart3 },
    { id: 'structure', label: 'Structure', icon: Layout },
  ];

  if (!visible) return null;

  return (
    <>
      {/* Main Floating Toolbar - Fixed at bottom */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Expanded panel */}
          {isExpanded && (
            <div className="p-4 border-b border-gray-100 min-w-[500px]">
              {/* Category tabs */}
              <div className="flex gap-2 mb-4">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                        activeCategory === cat.id
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-4 gap-2">
                {filteredItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleInsert(item.id)}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                    >
                      <Icon className="w-6 h-6 text-gray-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium text-gray-700">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] text-gray-400 font-mono">{item.shortcut}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Slash command hint */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Astuce : Tapez <code className="bg-gray-100 px-1.5 py-0.5 rounded">/</code> dans le document pour insérer rapidement
                </p>
              </div>
            </div>
          )}

          {/* Main toolbar row */}
          <div className="flex items-center gap-1 p-2">
            {/* Toggle expand button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-2.5 rounded-xl transition-all',
                isExpanded
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
              title="Ajouter un élément"
            >
              <svg className={cn('w-5 h-5 transition-transform', isExpanded && 'rotate-45')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Quick insert buttons */}
            <button
              onClick={() => handleInsert('paragraph')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter un paragraphe"
            >
              <span className="text-sm font-bold">T</span>
            </button>
            <button
              onClick={() => handleInsert('heading')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter un titre"
            >
              <span className="text-sm font-bold">H</span>
            </button>
            <button
              onClick={() => handleInsert('list')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter une liste"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => handleInsert('chart')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter un graphique"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={() => handleInsert('table')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter un tableau"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => handleInsert('image')}
              className="p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Ajouter une image"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* AI generate button */}
            <button
              onClick={() => handleInsert('callout')}
              className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-colors"
              title="Générer avec l'IA"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>

            {/* Block actions when selected */}
            {selectedBlockId && (
              <>
                <div className="w-px h-6 bg-gray-200 mx-1" />

                <button
                  onClick={onMoveUp}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Déplacer vers le haut"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={onMoveDown}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Déplacer vers le bas"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={onDuplicate}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Dupliquer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2 z-40">
        <p className="text-xs text-gray-400">
          Appuyez sur <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">/</kbd> pour insérer
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 ml-2">Ctrl+S</kbd> sauvegarder
        </p>
      </div>
    </>
  );
};

export default FloatingToolbar;
