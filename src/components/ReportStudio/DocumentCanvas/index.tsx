import React, { useRef, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/utils/cn';
import { ReportContent, ContentBlock, Section } from '@/types/reportStudio';
import { SectionRenderer } from './SectionRenderer';
import { useReportStudioStore } from '@/stores/reportStudioStore';

interface DocumentCanvasProps {
  content: {
    contentTree: {
      sections: Section[];
    };
    version?: number;
    lastEditedAt?: string;
  };
  mode: 'view' | 'edit';
  zoom: number;
  viewMode: 'single' | 'double' | 'continuous';
  selectedBlockId: string | null;
  onContentChange: (blockId: string, updates: Partial<ContentBlock>) => void;
  onBlockSelect: (blockId: string | null) => void;
  onSelectionChange: (text: string | null) => void;
  children?: React.ReactNode;
}

interface ActiveDragItem {
  id: UniqueIdentifier;
  type: 'block' | 'section';
  data: ContentBlock | Section;
  sectionId?: string;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  content,
  mode,
  zoom,
  viewMode,
  selectedBlockId,
  onContentChange,
  onBlockSelect,
  onSelectionChange,
  children,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [activeDragItem, setActiveDragItem] = React.useState<ActiveDragItem | null>(null);

  const {
    reorderBlocks,
    reorderSections,
    moveBlock,
    duplicateBlock,
    deleteBlock,
    setDragging,
  } = useReportStudioStore();

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Create sortable IDs for sections
  const sectionIds = useMemo(
    () => content.contentTree.sections.map((s) => `section-${s.id}`),
    [content.contentTree.sections]
  );

  // Create sortable IDs for all blocks (flattened)
  const allBlockIds = useMemo(() => {
    const ids: string[] = [];
    content.contentTree.sections.forEach((section) => {
      section.blocks.forEach((block) => {
        ids.push(`block-${block.id}`);
      });
    });
    return ids;
  }, [content.contentTree.sections]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Deselect block when clicking on empty space
    if (e.target === canvasRef.current || e.target === contentRef.current) {
      onBlockSelect(null);
    }
  }, [onBlockSelect]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      onSelectionChange(selection.toString());
    } else {
      onSelectionChange(null);
    }
  }, [onSelectionChange]);

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData) {
      setActiveDragItem({
        id: active.id,
        type: activeData.type,
        data: activeData.block || activeData.section,
        sectionId: activeData.sectionId,
      });
    }

    setDragging(true);
  }, [setDragging]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragItem(null);
    setDragging(false);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Block reordering
    if (activeData.type === 'block' && overData.type === 'block') {
      const activeSectionId = activeData.sectionId;
      const overSectionId = overData.sectionId;

      if (activeSectionId === overSectionId) {
        // Same section - reorder
        const section = content.contentTree.sections.find((s) => s.id === activeSectionId);
        if (!section) return;

        const activeBlockId = String(active.id).replace('block-', '');
        const overBlockId = String(over.id).replace('block-', '');

        const oldIndex = section.blocks.findIndex((b) => b.id === activeBlockId);
        const newIndex = section.blocks.findIndex((b) => b.id === overBlockId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderBlocks(activeSectionId, oldIndex, newIndex);
        }
      } else {
        // Different section - move block
        const activeBlockId = String(active.id).replace('block-', '');
        const overSection = content.contentTree.sections.find((s) => s.id === overSectionId);
        if (!overSection) return;

        const overBlockId = String(over.id).replace('block-', '');
        const newIndex = overSection.blocks.findIndex((b) => b.id === overBlockId);

        moveBlock(activeSectionId, activeBlockId, overSectionId, newIndex >= 0 ? newIndex : 0);
      }
    }

    // Block dropped on section
    if (activeData.type === 'block' && overData.type === 'section') {
      const activeSectionId = activeData.sectionId;
      const targetSectionId = overData.section.id;

      if (activeSectionId !== targetSectionId) {
        const activeBlockId = String(active.id).replace('block-', '');
        const targetSection = content.contentTree.sections.find((s) => s.id === targetSectionId);
        if (!targetSection) return;

        moveBlock(activeSectionId, activeBlockId, targetSectionId, targetSection.blocks.length);
      }
    }

    // Section reordering
    if (activeData.type === 'section' && overData.type === 'section') {
      const activeSectionId = String(active.id).replace('section-', '');
      const overSectionId = String(over.id).replace('section-', '');

      const oldIndex = content.contentTree.sections.findIndex((s) => s.id === activeSectionId);
      const newIndex = content.contentTree.sections.findIndex((s) => s.id === overSectionId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderSections(oldIndex, newIndex);
      }
    }
  }, [content, reorderBlocks, reorderSections, moveBlock, setDragging]);

  const handleDragCancel = useCallback(() => {
    setActiveDragItem(null);
    setDragging(false);
  }, [setDragging]);

  const handleBlockDuplicate = useCallback((sectionId: string, blockId: string) => {
    duplicateBlock(sectionId, blockId);
  }, [duplicateBlock]);

  const handleBlockDelete = useCallback((sectionId: string, blockId: string) => {
    deleteBlock(sectionId, blockId);
  }, [deleteBlock]);

  // Calculate page dimensions based on view mode
  const pageWidth = viewMode === 'double' ? 1200 : 800;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={canvasRef}
        className={cn(
          'flex-1 overflow-auto bg-primary-200 relative',
          mode === 'edit' && 'cursor-text'
        )}
        onClick={handleClick}
        onMouseUp={handleTextSelection}
      >
        {/* Floating toolbar (passed as children) */}
        {children}

        {/* Document content */}
        <div
          ref={contentRef}
          className={cn(
            'mx-auto my-8 bg-white shadow-lg rounded-sm',
            viewMode === 'continuous' && 'min-h-screen'
          )}
          style={{
            width: `${pageWidth}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            padding: '60px 80px',
          }}
        >
          {/* Document header */}
          <div className="mb-8 pb-8 border-b border-primary-200">
            <h1 className="text-3xl font-bold text-primary-900 mb-4">
              Rapport
            </h1>
            <div className="flex items-center gap-4 text-sm text-primary-500">
              <span>Version {content.version || 1}</span>
              <span>|</span>
              <span>
                Derniere modification: {new Date(content.lastEditedAt || new Date().toISOString()).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>

          {/* Sortable Sections */}
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {content.contentTree.sections.map((section, index) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isEditable={mode === 'edit'}
                isFirst={index === 0}
                selectedBlockId={selectedBlockId}
                onBlockSelect={onBlockSelect}
                onBlockChange={onContentChange}
                onBlockDuplicate={handleBlockDuplicate}
                onBlockDelete={handleBlockDelete}
              />
            ))}
          </SortableContext>

          {/* Empty state */}
          {content.contentTree.sections.length === 0 && (
            <div className="text-center py-16 text-primary-400">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg">Document vide</p>
              {mode === 'edit' && (
                <p className="mt-2">Cliquez sur &quot;Ajouter une section&quot; pour commencer</p>
              )}
            </div>
          )}
        </div>

        {/* Page navigation for non-continuous view */}
        {viewMode !== 'continuous' && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-lg px-4 py-2 flex items-center gap-4">
            <button className="p-1 hover:bg-primary-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm">Page 1 / 24</span>
            <button className="p-1 hover:bg-primary-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem && (
          <div className="bg-white rounded-lg shadow-2xl border-2 border-primary p-4 opacity-95 max-w-md pointer-events-none">
            {activeDragItem.type === 'block' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium capitalize">
                    {(activeDragItem.data as ContentBlock).type}
                  </span>
                  <p className="text-xs text-gray-400">Deposez pour repositionner</p>
                </div>
              </div>
            )}
            {activeDragItem.type === 'section' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <span className="font-medium">
                    {(activeDragItem.data as Section).title}
                  </span>
                  <p className="text-xs text-gray-400">Section</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
