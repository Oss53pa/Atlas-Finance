/**
 * ReportBuilderApp — Point d'entrée avec 3 ONGLETS principaux :
 *   [Journal]   — Liste de tous les rapports + bouton Nouveau (brouillon)
 *   [Modèles]   — Bibliothèque de templates prédéfinis
 *   [Builder]    — Éditeur de rapport (s'ouvre quand on ouvre un rapport)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { FileText, BookOpen, Palette } from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import type { ReportBlock } from '../types';
import { catalogItems } from '../data/catalogItems';
import TopBar from './TopBar';
import Canvas from './Canvas';
import StatusBar from './StatusBar';
import SidebarLeft from './sidebar/SidebarLeft';
import SidebarRight from './sidebar/SidebarRight';
import ReportJournalPage from './ReportJournalPage';
import TemplateGalleryPage from './TemplateGalleryPage';

type ActiveTab = 'journal' | 'templates' | 'builder';

const ReportBuilderApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('journal');

  const {
    document: doc,
    createDocument,
    addBlock,
    moveBlock,
    selectedPageIndex,
    undo,
    redo,
    duplicateBlock,
    deleteBlock,
    selectedBlockId,
  } = useReportBuilderStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Open a report in the builder (called from Journal or Templates)
  const handleOpenInBuilder = useCallback((title?: string) => {
    // Always create a new document (reset if one exists)
    const store = useReportBuilderStore.getState();
    if (store.document) {
      store.reset();
    }
    createDocument(title || 'Nouveau Rapport', {
      type: 'monthly',
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      label: 'Décembre 2025',
    });
    setActiveTab('builder');
  }, [createDocument]);

  // Keyboard shortcuts (only in builder mode)
  useEffect(() => {
    if (activeTab !== 'builder') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.contentEditable === 'true')) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId) { e.preventDefault(); duplicateBlock(selectedBlockId); }
      if (e.key === 'Delete' && selectedBlockId) { e.preventDefault(); deleteBlock(selectedBlockId); }
      if (e.key === 'Escape') { useReportBuilderStore.getState().selectBlock(null); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, undo, redo, duplicateBlock, deleteBlock, selectedBlockId]);

  // DnD handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !doc) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith('catalog-')) {
      const catalogId = activeId.replace('catalog-', '');
      const item = catalogItems.find(c => c.id === catalogId);
      if (!item) return;
      const block: ReportBlock = { ...item.defaultBlock, id: crypto.randomUUID() } as ReportBlock;
      const overData = over.data?.current;
      addBlock(overData?.pageIndex ?? selectedPageIndex, block);
      return;
    }

    if (activeId !== overId) {
      const pages = doc.pages;
      for (let pi = 0; pi < pages.length; pi++) {
        const blockIds = pages[pi].blocks.map(b => b.id);
        const oldIndex = blockIds.indexOf(activeId);
        const newIndex = blockIds.indexOf(overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          moveBlock(activeId, pi, newIndex);
          return;
        }
      }
    }
  }, [doc, addBlock, moveBlock, selectedPageIndex]);

  const tabs: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'journal', label: 'Journal', icon: FileText },
    { id: 'templates', label: 'Modèles', icon: BookOpen },
    { id: 'builder', label: 'Builder', icon: Palette },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white font-['Exo_2',sans-serif]">
      {/* ── ONGLETS PRINCIPAUX ── */}
      <div className="flex items-center border-b border-neutral-200 bg-white shrink-0 px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'builder' && !doc) return; // Builder disabled if no report open
              setActiveTab(tab.id);
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-neutral-900 text-neutral-900'
                : tab.id === 'builder' && !doc
                  ? 'border-transparent text-neutral-300 cursor-not-allowed'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
            disabled={tab.id === 'builder' && !doc}
            title={tab.id === 'builder' && !doc ? 'Ouvrez un rapport depuis le Journal pour accéder au Builder' : ''}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
        {/* Indicator when a report is open */}
        {doc && activeTab !== 'builder' && (
          <div className="ml-auto flex items-center gap-2 pr-2">
            <span className="text-[10px] text-neutral-400">Rapport ouvert :</span>
            <button
              onClick={() => setActiveTab('builder')}
              className="text-[11px] font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-md transition-colors"
            >
              {doc.title} →
            </button>
          </div>
        )}
      </div>

      {/* ── CONTENU ── */}
      {activeTab === 'journal' && (
        <div className="flex-1 overflow-auto bg-neutral-50">
          <ReportJournalPage
            onOpenBuilder={(title) => handleOpenInBuilder(title)}
            onGoToTemplates={() => setActiveTab('templates')}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="flex-1 overflow-auto bg-neutral-50">
          <TemplateGalleryPage onUseTemplate={(title) => handleOpenInBuilder(title)} />
        </div>
      )}

      {activeTab === 'builder' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex flex-col flex-1 overflow-hidden">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
              <SidebarLeft />
              <Canvas />
              <SidebarRight />
            </div>
            <StatusBar />
          </div>
        </DndContext>
      )}
    </div>
  );
};

export default ReportBuilderApp;
