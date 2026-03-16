/**
 * BlockWrapper — Selection border, drag handle, action buttons
 * Project colors: neutral-*
 */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Copy, Trash2, Lock } from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { ReportBlock } from '../../types';

interface BlockWrapperProps {
  block: ReportBlock;
  children: React.ReactNode;
}

const BlockWrapper: React.FC<BlockWrapperProps> = ({ block, children }) => {
  const { selectedBlockId, selectBlock, deleteBlock, duplicateBlock } = useReportBuilderStore();
  const isSelected = selectedBlockId === block.id;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: block.locked });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (block.style.opacity ?? 1),
    marginBottom: block.style.marginBottom ?? 8,
    backgroundColor: block.style.backgroundColor,
    borderRadius: block.style.borderRadius,
    padding: block.style.padding,
    borderWidth: block.style.borderWidth,
    borderColor: block.style.borderColor,
    borderStyle: block.style.borderStyle,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative ${isSelected ? 'ring-2 ring-neutral-900 ring-offset-1' : 'hover:ring-1 hover:ring-neutral-300'}`}
      onClick={(e) => { e.stopPropagation(); selectBlock(block.id); }}
      {...attributes}
    >
      {/* Drag handle */}
      <div className={`absolute -left-10 top-0 flex flex-col gap-1 ${isSelected || isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`} data-no-print>
        <button
          className="p-1 rounded bg-white shadow-sm text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing border border-neutral-200"
          {...listeners}
          title="Déplacer"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons — top right */}
      {isSelected && !block.locked && (
        <div className="absolute -top-3 right-2 flex gap-1 z-10" data-no-print>
          <button
            onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id); }}
            className="p-1 rounded bg-white shadow-sm border border-neutral-200 text-neutral-400 hover:text-neutral-700"
            title="Dupliquer (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
            className="p-1 rounded bg-white shadow-sm border border-neutral-200 text-neutral-400 hover:text-red-600"
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lock indicator */}
      {block.locked && (
        <div className="absolute -right-3 top-0 p-0.5 bg-amber-100 rounded" data-no-print>
          <Lock className="w-3 h-3 text-amber-600" />
        </div>
      )}

      {children}
    </div>
  );
};

export default BlockWrapper;
