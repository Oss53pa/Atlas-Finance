/**
 * Zustand store for Report Studio state management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  Report,
  ReportContent,
  ContentTree,
  Section,
  ContentBlock,
  ReportType,
  ReportCombination,
  DataRequest,
  Insight,
  Recommendation,
  Risk,
  AIMessage,
} from '@/types/reportStudio';

// ============================================================
// State Types
// ============================================================

interface EditorState {
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  isEditing: boolean;
  isDragging: boolean;
  zoomLevel: number;
  showGrid: boolean;
  showComments: boolean;
}

interface AIPanelState {
  isOpen: boolean;
  activeTab: 'summary' | 'insights' | 'recommendations' | 'chat';
  isLoading: boolean;
  chatMessages: AIMessage[];
}

interface UIState {
  isSaving: boolean;
  isGenerating: boolean;
  isPublishing: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  sidebarCollapsed: boolean;
  aiPanelCollapsed: boolean;
}

interface ReportStudioState {
  // Current report data
  report: Report | null;
  content: ContentTree;
  reportTypes: ReportType[];
  combination: ReportCombination | null;

  // AI-generated data
  insights: Insight[];
  recommendations: Recommendation[];
  risks: Risk[];
  dataRequests: DataRequest[];

  // Editor state
  editor: EditorState;

  // AI Panel state
  aiPanel: AIPanelState;

  // UI state
  ui: UIState;

  // History for undo/redo
  history: ContentTree[];
  historyIndex: number;

  // Actions
  setReport: (report: Report) => void;
  setContent: (content: ContentTree) => void;
  updateContent: (content: ContentTree) => void;

  // Section actions
  addSection: (section: Section, afterId?: string) => void;
  updateSection: (sectionId: string, updates: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  moveSection: (sectionId: string, newIndex: number) => void;
  reorderSections: (startIndex: number, endIndex: number) => void;

  // Block actions
  addBlock: (sectionId: string, block: ContentBlock, afterBlockId?: string) => void;
  updateBlock: (sectionId: string, blockId: string, updates: Partial<ContentBlock>) => void;
  deleteBlock: (sectionId: string, blockId: string) => void;
  moveBlock: (fromSectionId: string, blockId: string, toSectionId: string, newIndex: number) => void;
  duplicateBlock: (sectionId: string, blockId: string) => void;
  reorderBlocks: (sectionId: string, startIndex: number, endIndex: number) => void;

  // Editor actions
  selectSection: (sectionId: string | null) => void;
  selectBlock: (blockId: string | null) => void;
  setEditing: (isEditing: boolean) => void;
  setDragging: (isDragging: boolean) => void;
  setZoomLevel: (level: number) => void;
  toggleGrid: () => void;
  toggleComments: () => void;

  // AI Panel actions
  setAIPanelOpen: (isOpen: boolean) => void;
  setAIActiveTab: (tab: AIPanelState['activeTab']) => void;
  addChatMessage: (message: AIMessage) => void;
  clearChatMessages: () => void;
  setAILoading: (isLoading: boolean) => void;

  // AI data actions
  setInsights: (insights: Insight[]) => void;
  setRecommendations: (recommendations: Recommendation[]) => void;
  setRisks: (risks: Risk[]) => void;
  setDataRequests: (requests: DataRequest[]) => void;
  updateDataRequest: (requestId: string, updates: Partial<DataRequest>) => void;

  // UI actions
  setSaving: (isSaving: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setPublishing: (isPublishing: boolean) => void;
  markAsSaved: () => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Design settings
  updateDesignSettings: (settings: import('@/types/reportDesign').ReportDesignSettings) => void;

  // Reset
  reset: () => void;
}

// ============================================================
// Initial State
// ============================================================

const initialEditorState: EditorState = {
  selectedSectionId: null,
  selectedBlockId: null,
  isEditing: false,
  isDragging: false,
  zoomLevel: 100,
  showGrid: false,
  showComments: true,
};

const initialAIPanelState: AIPanelState = {
  isOpen: true,
  activeTab: 'summary',
  isLoading: false,
  chatMessages: [],
};

const initialUIState: UIState = {
  isSaving: false,
  isGenerating: false,
  isPublishing: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  sidebarCollapsed: false,
  aiPanelCollapsed: false,
};

const initialContent: ContentTree = {
  sections: [],
};

// ============================================================
// Helper Functions
// ============================================================

function findSectionIndex(sections: Section[], sectionId: string): number {
  return sections.findIndex((s) => s.id === sectionId);
}

function findBlockIndex(section: Section, blockId: string): number {
  return section.blocks.findIndex((b) => b.id === blockId);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// Store
// ============================================================

export const useReportStudioStore = create<ReportStudioState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      report: null,
      content: initialContent,
      reportTypes: [],
      combination: null,
      insights: [],
      recommendations: [],
      risks: [],
      dataRequests: [],
      editor: initialEditorState,
      aiPanel: initialAIPanelState,
      ui: initialUIState,
      history: [],
      historyIndex: -1,

      // Report actions
      setReport: (report) =>
        set((state) => {
          state.report = report;
        }),

      setContent: (content) =>
        set((state) => {
          state.content = content;
          state.history = [content];
          state.historyIndex = 0;
        }),

      updateContent: (content) =>
        set((state) => {
          // Save to history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(content);
          if (newHistory.length > 50) {
            newHistory.shift();
          }

          state.content = content;
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
          state.ui.hasUnsavedChanges = true;
        }),

      // Section actions
      addSection: (section, afterId) =>
        set((state) => {
          const newSection = { ...section, id: section.id || generateId() };

          if (afterId) {
            const index = findSectionIndex(state.content.sections, afterId);
            state.content.sections.splice(index + 1, 0, newSection);
          } else {
            state.content.sections.push(newSection);
          }

          state.ui.hasUnsavedChanges = true;
        }),

      updateSection: (sectionId, updates) =>
        set((state) => {
          const index = findSectionIndex(state.content.sections, sectionId);
          if (index !== -1) {
            state.content.sections[index] = {
              ...state.content.sections[index],
              ...updates,
            };
            state.ui.hasUnsavedChanges = true;
          }
        }),

      deleteSection: (sectionId) =>
        set((state) => {
          const index = findSectionIndex(state.content.sections, sectionId);
          if (index !== -1) {
            state.content.sections.splice(index, 1);
            state.ui.hasUnsavedChanges = true;

            if (state.editor.selectedSectionId === sectionId) {
              state.editor.selectedSectionId = null;
              state.editor.selectedBlockId = null;
            }
          }
        }),

      moveSection: (sectionId, newIndex) =>
        set((state) => {
          const currentIndex = findSectionIndex(state.content.sections, sectionId);
          if (currentIndex !== -1 && currentIndex !== newIndex) {
            const [section] = state.content.sections.splice(currentIndex, 1);
            state.content.sections.splice(newIndex, 0, section);
            state.ui.hasUnsavedChanges = true;
          }
        }),

      reorderSections: (startIndex, endIndex) =>
        set((state) => {
          const [section] = state.content.sections.splice(startIndex, 1);
          state.content.sections.splice(endIndex, 0, section);
          state.ui.hasUnsavedChanges = true;
        }),

      // Block actions
      addBlock: (sectionId, block, afterBlockId) =>
        set((state) => {
          const sectionIndex = findSectionIndex(state.content.sections, sectionId);
          if (sectionIndex === -1) return;

          const newBlock = { ...block, id: block.id || generateId() };
          const section = state.content.sections[sectionIndex];

          if (afterBlockId) {
            const blockIndex = findBlockIndex(section, afterBlockId);
            section.blocks.splice(blockIndex + 1, 0, newBlock);
          } else {
            section.blocks.push(newBlock);
          }

          state.ui.hasUnsavedChanges = true;
        }),

      updateBlock: (sectionId, blockId, updates) =>
        set((state) => {
          const sectionIndex = findSectionIndex(state.content.sections, sectionId);
          if (sectionIndex === -1) return;

          const section = state.content.sections[sectionIndex];
          const blockIndex = findBlockIndex(section, blockId);

          if (blockIndex !== -1) {
            section.blocks[blockIndex] = {
              ...section.blocks[blockIndex],
              ...updates,
            } as ContentBlock;
            state.ui.hasUnsavedChanges = true;
          }
        }),

      deleteBlock: (sectionId, blockId) =>
        set((state) => {
          const sectionIndex = findSectionIndex(state.content.sections, sectionId);
          if (sectionIndex === -1) return;

          const section = state.content.sections[sectionIndex];
          const blockIndex = findBlockIndex(section, blockId);

          if (blockIndex !== -1) {
            section.blocks.splice(blockIndex, 1);
            state.ui.hasUnsavedChanges = true;

            if (state.editor.selectedBlockId === blockId) {
              state.editor.selectedBlockId = null;
            }
          }
        }),

      moveBlock: (fromSectionId, blockId, toSectionId, newIndex) =>
        set((state) => {
          const fromSectionIndex = findSectionIndex(state.content.sections, fromSectionId);
          const toSectionIndex = findSectionIndex(state.content.sections, toSectionId);

          if (fromSectionIndex === -1 || toSectionIndex === -1) return;

          const fromSection = state.content.sections[fromSectionIndex];
          const blockIndex = findBlockIndex(fromSection, blockId);

          if (blockIndex === -1) return;

          const [block] = fromSection.blocks.splice(blockIndex, 1);
          state.content.sections[toSectionIndex].blocks.splice(newIndex, 0, block);
          state.ui.hasUnsavedChanges = true;
        }),

      duplicateBlock: (sectionId, blockId) =>
        set((state) => {
          const sectionIndex = findSectionIndex(state.content.sections, sectionId);
          if (sectionIndex === -1) return;

          const section = state.content.sections[sectionIndex];
          const blockIndex = findBlockIndex(section, blockId);

          if (blockIndex === -1) return;

          const originalBlock = section.blocks[blockIndex];
          const duplicatedBlock = {
            ...JSON.parse(JSON.stringify(originalBlock)),
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          };

          section.blocks.splice(blockIndex + 1, 0, duplicatedBlock);
          state.ui.hasUnsavedChanges = true;
          state.editor.selectedBlockId = duplicatedBlock.id;
        }),

      reorderBlocks: (sectionId, startIndex, endIndex) =>
        set((state) => {
          const sectionIndex = findSectionIndex(state.content.sections, sectionId);
          if (sectionIndex === -1) return;

          const section = state.content.sections[sectionIndex];
          const [block] = section.blocks.splice(startIndex, 1);
          section.blocks.splice(endIndex, 0, block);
          state.ui.hasUnsavedChanges = true;
        }),

      // Editor actions
      selectSection: (sectionId) =>
        set((state) => {
          state.editor.selectedSectionId = sectionId;
          state.editor.selectedBlockId = null;
        }),

      selectBlock: (blockId) =>
        set((state) => {
          state.editor.selectedBlockId = blockId;
        }),

      setEditing: (isEditing) =>
        set((state) => {
          state.editor.isEditing = isEditing;
        }),

      setDragging: (isDragging) =>
        set((state) => {
          state.editor.isDragging = isDragging;
        }),

      setZoomLevel: (level) =>
        set((state) => {
          state.editor.zoomLevel = Math.min(200, Math.max(50, level));
        }),

      toggleGrid: () =>
        set((state) => {
          state.editor.showGrid = !state.editor.showGrid;
        }),

      toggleComments: () =>
        set((state) => {
          state.editor.showComments = !state.editor.showComments;
        }),

      // AI Panel actions
      setAIPanelOpen: (isOpen) =>
        set((state) => {
          state.aiPanel.isOpen = isOpen;
        }),

      setAIActiveTab: (tab) =>
        set((state) => {
          state.aiPanel.activeTab = tab;
        }),

      addChatMessage: (message) =>
        set((state) => {
          state.aiPanel.chatMessages.push(message);
        }),

      clearChatMessages: () =>
        set((state) => {
          state.aiPanel.chatMessages = [];
        }),

      setAILoading: (isLoading) =>
        set((state) => {
          state.aiPanel.isLoading = isLoading;
        }),

      // AI data actions
      setInsights: (insights) =>
        set((state) => {
          state.insights = insights;
        }),

      setRecommendations: (recommendations) =>
        set((state) => {
          state.recommendations = recommendations;
        }),

      setRisks: (risks) =>
        set((state) => {
          state.risks = risks;
        }),

      setDataRequests: (requests) =>
        set((state) => {
          state.dataRequests = requests;
        }),

      updateDataRequest: (requestId, updates) =>
        set((state) => {
          const index = state.dataRequests.findIndex((r) => r.id === requestId);
          if (index !== -1) {
            state.dataRequests[index] = {
              ...state.dataRequests[index],
              ...updates,
            };
          }
        }),

      // UI actions
      setSaving: (isSaving) =>
        set((state) => {
          state.ui.isSaving = isSaving;
        }),

      setGenerating: (isGenerating) =>
        set((state) => {
          state.ui.isGenerating = isGenerating;
        }),

      setPublishing: (isPublishing) =>
        set((state) => {
          state.ui.isPublishing = isPublishing;
        }),

      markAsSaved: () =>
        set((state) => {
          state.ui.hasUnsavedChanges = false;
          state.ui.lastSavedAt = new Date();
        }),

      toggleSidebar: () =>
        set((state) => {
          state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        }),

      toggleAIPanel: () =>
        set((state) => {
          state.ui.aiPanelCollapsed = !state.ui.aiPanelCollapsed;
        }),

      // History actions
      undo: () =>
        set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex -= 1;
            state.content = state.history[state.historyIndex];
            state.ui.hasUnsavedChanges = true;
          }
        }),

      redo: () =>
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            state.content = state.history[state.historyIndex];
            state.ui.hasUnsavedChanges = true;
          }
        }),

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // Design settings
      updateDesignSettings: (settings) =>
        set((state) => {
          if (state.report) {
            state.report.designSettings = settings;
            state.ui.hasUnsavedChanges = true;
          }
        }),

      // Reset
      reset: () =>
        set((state) => {
          state.report = null;
          state.content = initialContent;
          state.reportTypes = [];
          state.combination = null;
          state.insights = [];
          state.recommendations = [];
          state.risks = [];
          state.dataRequests = [];
          state.editor = initialEditorState;
          state.aiPanel = initialAIPanelState;
          state.ui = initialUIState;
          state.history = [];
          state.historyIndex = -1;
        }),
    })),
    { name: 'report-studio-store' }
  )
);

// ============================================================
// Selectors
// ============================================================

export const selectCurrentSection = (state: ReportStudioState) => {
  if (!state.editor.selectedSectionId) return null;
  return state.content.sections.find((s) => s.id === state.editor.selectedSectionId) || null;
};

export const selectCurrentBlock = (state: ReportStudioState) => {
  if (!state.editor.selectedSectionId || !state.editor.selectedBlockId) return null;
  const section = state.content.sections.find((s) => s.id === state.editor.selectedSectionId);
  if (!section) return null;
  return section.blocks.find((b) => b.id === state.editor.selectedBlockId) || null;
};

export const selectPendingDataRequests = (state: ReportStudioState) => {
  return state.dataRequests.filter((r) => r.status === 'pending');
};

export const selectHighPriorityInsights = (state: ReportStudioState) => {
  return state.insights.filter((i) => i.priority === 'high');
};
