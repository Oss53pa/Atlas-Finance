/**
 * DndProvider - Provider component for drag and drop functionality in Report Studio
 */

import React, { useCallback, useState } from 'react';
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
  DragOverEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useReportStudioStore } from '@/stores/reportStudioStore';
import type { ContentBlock, Section } from '@/types/reportStudio';

interface DndProviderProps {
  children: React.ReactNode;
}

interface ActiveItem {
  id: UniqueIdentifier;
  type: 'block' | 'section';
  data: ContentBlock | Section;
  sectionId?: string;
}

export const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  const {
    content,
    reorderBlocks,
    reorderSections,
    moveBlock,
    setDragging,
  } = useReportStudioStore();

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData) {
      setActiveItem({
        id: active.id,
        type: activeData.type,
        data: activeData.block || activeData.section,
        sectionId: activeData.sectionId,
      });
    }

    setDragging(true);
  }, [setDragging]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over logic for visual feedback
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveItem(null);
    setDragging(false);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    // Block reordering within same section
    if (activeData.type === 'block' && overData.type === 'block') {
      const activeSectionId = activeData.sectionId;
      const overSectionId = overData.sectionId;

      if (activeSectionId === overSectionId) {
        // Same section - reorder
        const section = content.sections.find((s) => s.id === activeSectionId);
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
        const overSection = content.sections.find((s) => s.id === overSectionId);
        if (!overSection) return;

        const overBlockId = String(over.id).replace('block-', '');
        const newIndex = overSection.blocks.findIndex((b) => b.id === overBlockId);

        moveBlock(activeSectionId, activeBlockId, overSectionId, newIndex >= 0 ? newIndex : 0);
      }
    }

    // Block dropped on section (move to section)
    if (activeData.type === 'block' && overData.type === 'section') {
      const activeSectionId = activeData.sectionId;
      const targetSectionId = overData.section.id;

      if (activeSectionId !== targetSectionId) {
        const activeBlockId = String(active.id).replace('block-', '');
        const targetSection = content.sections.find((s) => s.id === targetSectionId);
        if (!targetSection) return;

        moveBlock(activeSectionId, activeBlockId, targetSectionId, targetSection.blocks.length);
      }
    }

    // Section reordering
    if (activeData.type === 'section' && overData.type === 'section') {
      const activeSectionId = String(active.id).replace('section-', '');
      const overSectionId = String(over.id).replace('section-', '');

      const oldIndex = content.sections.findIndex((s) => s.id === activeSectionId);
      const newIndex = content.sections.findIndex((s) => s.id === overSectionId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderSections(oldIndex, newIndex);
      }
    }
  }, [content, reorderBlocks, reorderSections, moveBlock, setDragging]);

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
    setDragging(false);
  }, [setDragging]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag Overlay - shows preview of dragged item */}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="bg-white rounded-lg shadow-2xl border-2 border-primary p-4 opacity-90 max-w-md">
            {activeItem.type === 'block' && (
              <div className="text-sm text-gray-600">
                <span className="font-medium capitalize">
                  {(activeItem.data as ContentBlock).type}
                </span>
                {' - Déplacez vers un nouvel emplacement'}
              </div>
            )}
            {activeItem.type === 'section' && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">
                  {(activeItem.data as Section).title}
                </span>
                {' - Section'}
              </div>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default DndProvider;
