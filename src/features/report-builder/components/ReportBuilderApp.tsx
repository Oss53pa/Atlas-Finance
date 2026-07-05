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
import { getMasterTemplateBlocks } from '../data/masterTemplates';
import type { MasterTemplateId } from '../data/masterTemplates';
import { loadReport } from '../services/reportPersistenceService';
import { useData } from '../../../contexts/DataContext';
import { toast } from 'react-hot-toast';
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
  const [companyName, setCompanyName] = useState('');
  const { adapter } = useData();

  // Nom entreprise = source canonique settings.admin_company_legal (et non companies/societes
  // qui peuvent diverger). Repli sur companies si le réglage est absent.
  useEffect(() => {
    (async () => {
      try {
        const settings = await adapter.getAll<any>('settings');
        const legal = settings?.find((s: any) => (s.key || s.name) === 'admin_company_legal');
        const legalName = legal?.value?.raisonSociale || legal?.value?.name || legal?.value?.legalName;
        if (legalName) { setCompanyName(String(legalName)); return; }
      } catch { /* repli */ }
      try {
        const cos = await adapter.getAll<any>('companies');
        if (cos.length > 0) setCompanyName(cos[0].name || cos[0].raisonSociale || '');
      } catch { /* ignore */ }
    })();
  }, [adapter]);

  const {
    document: doc,
    createDocument,
    setDocument,
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
  const handleOpenInBuilder = useCallback((title?: string, masterTemplateId?: string) => {
    // Always create a new document (reset if one exists)
    const store = useReportBuilderStore.getState();
    if (store.document) {
      store.reset();
    }

    // Compute current-month period dynamically — never hardcode dates
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const periodLabel = periodStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const capitalize  = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    createDocument(title || 'Nouveau Rapport', {
      type: 'monthly',
      startDate: periodStart.toISOString().split('T')[0],
      endDate:   periodEnd.toISOString().split('T')[0],
      label:     capitalize(periodLabel),
    });

    // If a master template was requested, inject its pre-wired blocks into page 0
    if (masterTemplateId) {
      const templateBlocks = getMasterTemplateBlocks(
        masterTemplateId as MasterTemplateId,
        { companyName: companyName || undefined },
      );
      const freshStore = useReportBuilderStore.getState();
      templateBlocks.forEach(block => {
        freshStore.addBlock(0, { ...block, id: crypto.randomUUID() } as ReportBlock);
      });
    }

    setActiveTab('builder');
  }, [createDocument, companyName]);

  // Ouvrir un rapport EXISTANT : recharge son contenu réel (pages/blocs/thème/période)
  // depuis la table `reports`, au lieu de repartir d'un document vierge.
  const handleOpenReport = useCallback(async (reportId: string) => {
    const loaded = await loadReport(adapter, reportId);
    if (!loaded) {
      toast.error('Rapport introuvable ou illisible');
      return;
    }
    setDocument(loaded);
    setActiveTab('builder');
  }, [adapter, setDocument]);

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
            onOpenReport={handleOpenReport}
            onGoToTemplates={() => setActiveTab('templates')}
          />
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="flex-1 overflow-auto bg-neutral-50">
          <TemplateGalleryPage onUseTemplate={(title, masterTemplateId) => handleOpenInBuilder(title, masterTemplateId)} />
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
