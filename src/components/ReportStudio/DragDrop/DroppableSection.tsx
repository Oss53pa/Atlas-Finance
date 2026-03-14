/**
 * DroppableSection - A section container that accepts draggable blocks
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/utils/cn';
import type { Section, ContentBlock } from '@/types/reportStudio';

interface DroppableSectionProps {
  section: Section;
  isEditable: boolean;
  isFirst: boolean;
  children: React.ReactNode;
}

export const DroppableSection: React.FC<DroppableSectionProps> = ({
  section,
  isEditable,
  isFirst,
  children,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-${section.id}`,
    data: {
      type: 'section',
      section,
    },
    disabled: !isEditable,
  });

  // Create sortable items from blocks
  const blockIds = section.blocks.map((block) => `block-${block.id}`);

  return (
    <section
      id={`section-${section.id}`}
      className={cn(
        'relative',
        !isFirst && 'mt-8',
        section.isLocked && 'pointer-events-none opacity-70'
      )}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'min-h-[50px] transition-colors rounded-lg',
            isOver && isEditable && 'bg-primary-50 ring-2 ring-primary-200 ring-dashed'
          )}
        >
          {children}
        </div>
      </SortableContext>
    </section>
  );
};

export default DroppableSection;
