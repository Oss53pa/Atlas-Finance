/**
 * DraggableBlock - A wrapper component that makes blocks draggable using @dnd-kit
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ContentBlock } from '@/types/reportStudio';

interface DraggableBlockProps {
  id: string;
  block: ContentBlock;
  sectionId: string;
  isEditable: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}

export const DraggableBlock: React.FC<DraggableBlockProps> = ({
  id,
  block,
  sectionId,
  isEditable,
  isSelected,
  onSelect,
  onDuplicate,
  onDelete,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    data: {
      type: 'block',
      block,
      sectionId,
    },
    disabled: !isEditable,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'shadow-lg rounded-lg bg-white',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      {/* Drag handle and actions */}
      {isEditable && (
        <div
          className={cn(
            'absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20',
            isDragging && 'opacity-100'
          )}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-primary-300 cursor-grab active:cursor-grabbing transition-colors"
            title="Glisser pour déplacer"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>

          {/* More actions */}
          <div className="relative">
            <button
              className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors peer"
              title="Plus d'actions"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {/* Actions dropdown */}
            <div className="absolute left-full ml-1 top-0 hidden peer-focus:flex hover:flex flex-col bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[120px] z-30">
              {onDuplicate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  Dupliquer
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Block content wrapper */}
      <div
        className={cn(
          'relative rounded-lg transition-all',
          isEditable && 'hover:ring-2 hover:ring-primary/20',
          isSelected && 'ring-2 ring-primary shadow-sm',
          isDragging && 'ring-2 ring-primary'
        )}
        onClick={onSelect}
      >
        {/* AI badge */}
        {block.metadata?.aiGenerated && (
          <div className="absolute -right-2 -top-2 z-10">
            <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full font-medium">
              IA
            </span>
          </div>
        )}

        {/* Comments indicator */}
        {block.metadata?.comments && block.metadata.comments > 0 && (
          <button className="absolute right-2 top-2 z-10 p-1 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="sr-only">{block.metadata.comments} commentaires</span>
          </button>
        )}

        {children}
      </div>
    </div>
  );
};

export default DraggableBlock;
