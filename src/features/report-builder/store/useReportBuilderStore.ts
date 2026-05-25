// @ts-nocheck
/**
 * Report Builder — Zustand Store
 * State management with undo/redo history
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  ReportDocument,
  ReportPage,
  ReportBlock,
  PeriodSelection,
  ReportTheme,
  ReportTypography,
  PageSettings,
  BlockStyle,
} from '../types';
import {
  DEFAULT_THEME,
  DEFAULT_TYPOGRAPHY,
  DEFAULT_PAGE_SETTINGS,
} from '../types';

// ============================================================================
// State Shape
// ============================================================================

export type SidebarLeftTab = 'toc' | 'catalog' | 'atlas-catalog';
export type SidebarRightTab = 'properties' | 'style' | 'page' | 'typography' | 'theme';

interface ReportBuilderState {
  // Document
  document: ReportDocument | null;

  // Selection
  selectedBlockId: string | null;
  selectedPageIndex: number;

  // UI
  sidebarLeftTab: SidebarLeftTab;
  sidebarLeftOpen: boolean;
  sidebarRightTab: SidebarRightTab;
  sidebarRightOpen: boolean;
  zoomLevel: number;

  // Undo/Redo
  history: ReportDocument[];
  historyIndex: number;
  maxHistory: number;

  // Actions — Document
  createDocument: (title: string, period: PeriodSelection) => void;
  setDocument: (doc: ReportDocument) => void;
  updateTitle: (title: string) => void;
  setPeriod: (period: PeriodSelection) => void;
  setTheme: (theme: Partial<ReportTheme>) => void;
  setTypography: (typography: Partial<ReportTypography>) => void;
  setPageSettings: (settings: Partial<PageSettings>) => void;

  // Actions — Pages
  addPage: (pageType?: ReportPage['pageType']) => void;
  deletePage: (pageIndex: number) => void;

  // Actions — Blocks
  addBlock: (pageIndex: number, block: ReportBlock, afterBlockId?: string) => void;
  updateBlock: (blockId: string, updates: Partial<ReportBlock>) => void;
  updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
  deleteBlock: (blockId: string) => void;
  moveBlock: (blockId: string, toPageIndex: number, toIndex: number) => void;
  duplicateBlock: (blockId: string) => void;

  // Actions — Selection
  selectBlock: (blockId: string | null) => void;
  selectPage: (pageIndex: number) => void;

  // Actions — UI
  setSidebarLeftTab: (tab: SidebarLeftTab) => void;
  toggleSidebarLeft: () => void;
  setSidebarRightTab: (tab: SidebarRightTab) => void;
  toggleSidebarRight: () => void;
  setZoom: (zoom: number) => void;

  // Actions — History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Reset
  reset: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function createEmptyPage(pageType: ReportPage['pageType'] = 'content'): ReportPage {
  return { id: generateId(), blocks: [], pageType };
}

function now(): string {
  return new Date().toISOString();
}

function findBlockLocation(pages: ReportPage[], blockId: string): { pageIndex: number; blockIndex: number } | null {
  for (let pi = 0; pi < pages.length; pi++) {
    const bi = pages[pi].blocks.findIndex(b => b.id === blockId);
    if (bi !== -1) return { pageIndex: pi, blockIndex: bi };
  }
  return null;
}

// ============================================================================
// Store
// ============================================================================

export const useReportBuilderStore = create<ReportBuilderState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      document: null,
      selectedBlockId: null,
      selectedPageIndex: 0,
      sidebarLeftTab: 'catalog',
      sidebarLeftOpen: true,
      sidebarRightTab: 'properties',
      sidebarRightOpen: true,
      zoomLevel: 100,
      history: [],
      historyIndex: -1,
      maxHistory: 50,
      canUndo: false,
      canRedo: false,

      // --- Document actions ---

      createDocument: (title, period) => {
        const doc: ReportDocument = {
          id: generateId(),
          title,
          status: 'draft',
          period,
          pages: [createEmptyPage()],
          pageSettings: { ...DEFAULT_PAGE_SETTINGS },
          theme: { ...DEFAULT_THEME },
          typography: { ...DEFAULT_TYPOGRAPHY },
          createdAt: now(),
          updatedAt: now(),
          version: 1,
        };
        set(state => {
          state.document = doc;
          state.history = [JSON.parse(JSON.stringify(doc))];
          state.historyIndex = 0;
          state.canUndo = false;
          state.canRedo = false;
          state.selectedBlockId = null;
          state.selectedPageIndex = 0;
        });
      },

      setDocument: (doc) => set(state => {
        state.document = doc;
        state.history = [JSON.parse(JSON.stringify(doc))];
        state.historyIndex = 0;
        state.canUndo = false;
        state.canRedo = false;
      }),

      updateTitle: (title) => set(state => {
        if (!state.document) return;
        state.document.title = title;
        state.document.updatedAt = now();
      }),

      setPeriod: (period) => {
        set(state => {
          if (!state.document) return;
          state.document.period = period;
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      setTheme: (theme) => set(state => {
        if (!state.document) return;
        Object.assign(state.document.theme, theme);
        state.document.updatedAt = now();
      }),

      setTypography: (typography) => set(state => {
        if (!state.document) return;
        Object.assign(state.document.typography, typography);
        state.document.updatedAt = now();
      }),

      setPageSettings: (settings) => set(state => {
        if (!state.document) return;
        Object.assign(state.document.pageSettings, settings);
        state.document.updatedAt = now();
      }),

      // --- Page actions ---

      addPage: (pageType = 'content') => {
        set(state => {
          if (!state.document) return;
          state.document.pages.push(createEmptyPage(pageType));
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      deletePage: (pageIndex) => {
        set(state => {
          if (!state.document || state.document.pages.length <= 1) return;
          state.document.pages.splice(pageIndex, 1);
          if (state.selectedPageIndex >= state.document.pages.length) {
            state.selectedPageIndex = state.document.pages.length - 1;
          }
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      // --- Block actions ---

      addBlock: (pageIndex, block, afterBlockId) => {
        set(state => {
          if (!state.document) return;
          const page = state.document.pages[pageIndex];
          if (!page) return;

          if (afterBlockId) {
            const idx = page.blocks.findIndex(b => b.id === afterBlockId);
            page.blocks.splice(idx + 1, 0, block);
          } else {
            page.blocks.push(block);
          }
          state.selectedBlockId = block.id;
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      updateBlock: (blockId, updates) => {
        set(state => {
          if (!state.document) return;
          const loc = findBlockLocation(state.document.pages, blockId);
          if (!loc) return;
          const block = state.document.pages[loc.pageIndex].blocks[loc.blockIndex];
          Object.assign(block, updates);
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      updateBlockStyle: (blockId, style) => {
        set(state => {
          if (!state.document) return;
          const loc = findBlockLocation(state.document.pages, blockId);
          if (!loc) return;
          const block = state.document.pages[loc.pageIndex].blocks[loc.blockIndex];
          Object.assign(block.style, style);
          state.document.updatedAt = now();
        });
      },

      deleteBlock: (blockId) => {
        set(state => {
          if (!state.document) return;
          const loc = findBlockLocation(state.document.pages, blockId);
          if (!loc) return;
          state.document.pages[loc.pageIndex].blocks.splice(loc.blockIndex, 1);
          if (state.selectedBlockId === blockId) state.selectedBlockId = null;
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      moveBlock: (blockId, toPageIndex, toIndex) => {
        set(state => {
          if (!state.document) return;
          const loc = findBlockLocation(state.document.pages, blockId);
          if (!loc) return;
          const [block] = state.document.pages[loc.pageIndex].blocks.splice(loc.blockIndex, 1);
          state.document.pages[toPageIndex].blocks.splice(toIndex, 0, block);
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      duplicateBlock: (blockId) => {
        set(state => {
          if (!state.document) return;
          const loc = findBlockLocation(state.document.pages, blockId);
          if (!loc) return;
          const original = state.document.pages[loc.pageIndex].blocks[loc.blockIndex];
          const clone = JSON.parse(JSON.stringify(original));
          clone.id = generateId();
          state.document.pages[loc.pageIndex].blocks.splice(loc.blockIndex + 1, 0, clone);
          state.selectedBlockId = clone.id;
          state.document.updatedAt = now();
        });
        get()._pushHistory();
      },

      // --- Selection ---

      selectBlock: (blockId) => set(state => { state.selectedBlockId = blockId; }),
      selectPage: (pageIndex) => set(state => { state.selectedPageIndex = pageIndex; }),

      // --- UI ---

      setSidebarLeftTab: (tab) => set(state => { state.sidebarLeftTab = tab; }),
      toggleSidebarLeft: () => set(state => { state.sidebarLeftOpen = !state.sidebarLeftOpen; }),
      setSidebarRightTab: (tab) => set(state => { state.sidebarRightTab = tab; }),
      toggleSidebarRight: () => set(state => { state.sidebarRightOpen = !state.sidebarRightOpen; }),
      setZoom: (zoom) => set(state => { state.zoomLevel = Math.min(200, Math.max(50, zoom)); }),

      // --- History ---

      _pushHistory: () => set(state => {
        if (!state.document) return;
        const snap = JSON.parse(JSON.stringify(state.document));
        // Truncate forward history
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(snap);
        if (state.history.length > state.maxHistory) {
          state.history.shift();
        }
        state.historyIndex = state.history.length - 1;
        state.canUndo = state.historyIndex > 0;
        state.canRedo = false;
      }),

      undo: () => set(state => {
        if (state.historyIndex <= 0 || !state.document) return;
        state.historyIndex -= 1;
        state.document = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.canUndo = state.historyIndex > 0;
        state.canRedo = true;
      }),

      redo: () => set(state => {
        if (state.historyIndex >= state.history.length - 1 || !state.document) return;
        state.historyIndex += 1;
        state.document = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.canUndo = true;
        state.canRedo = state.historyIndex < state.history.length - 1;
      }),

      // --- Reset ---

      reset: () => set(state => {
        state.document = null;
        state.selectedBlockId = null;
        state.selectedPageIndex = 0;
        state.history = [];
        state.historyIndex = -1;
        state.canUndo = false;
        state.canRedo = false;
      }),
    })),
    { name: 'report-builder' }
  )
);
