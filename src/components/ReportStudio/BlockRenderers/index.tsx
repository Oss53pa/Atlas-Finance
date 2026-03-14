import React from 'react';
import { cn } from '@/utils/cn';
import { ContentBlock } from '@/types/reportStudio';
import { ParagraphBlock } from './ParagraphBlock';
import { HeadingBlock } from './HeadingBlock';
import { ChartBlock } from './ChartBlock';
import { TableBlock } from './TableBlock';
import { ImageBlock } from './ImageBlock';
import { CalloutBlock } from './CalloutBlock';
import { DividerBlock } from './DividerBlock';
import { ListBlock } from './ListBlock';

interface BlockRendererProps {
  block: ContentBlock;
  isEditable: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<ContentBlock>) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, position: 'before' | 'after') => void;
  onDragOver: (e: React.DragEvent) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  isEditable,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDrop,
  onDragOver,
}) => {
  const [showDropBefore, setShowDropBefore] = React.useState(false);
  const [showDropAfter, setShowDropAfter] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (e.clientY < midY) {
      setShowDropBefore(true);
      setShowDropAfter(false);
    } else {
      setShowDropBefore(false);
      setShowDropAfter(true);
    }
  };

  const handleDragLeave = () => {
    setShowDropBefore(false);
    setShowDropAfter(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const position = showDropBefore ? 'before' : 'after';
    onDrop(e, position);
    setShowDropBefore(false);
    setShowDropAfter(false);
  };

  const renderBlock = () => {
    switch (block.type) {
      case 'paragraph':
        return (
          <ParagraphBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'heading':
        return (
          <HeadingBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'chart':
        return (
          <ChartBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'table':
        return (
          <TableBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'image':
        return (
          <ImageBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'callout':
        return (
          <CalloutBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      case 'divider':
        return <DividerBlock block={block} />;
      case 'pagebreak':
        return (
          <div className="border-t-2 border-dashed border-gray-300 my-8 relative">
            <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-xs text-gray-400">
              Saut de page
            </span>
          </div>
        );
      case 'list':
        return (
          <ListBlock
            block={block}
            isEditable={isEditable}
            onChange={onChange}
          />
        );
      default:
        return (
          <div className="p-4 bg-gray-100 rounded text-gray-500 text-sm">
            Type de bloc non supporté: {(block as any).type}
          </div>
        );
    }
  };

  return (
    <div
      className="relative group"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop indicator - before */}
      {showDropBefore && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded" />
      )}

      {/* Block wrapper */}
      <div
        className={cn(
          'relative rounded transition-all',
          isEditable && 'hover:ring-2 hover:ring-primary/20',
          isSelected && 'ring-2 ring-primary',
        )}
        onClick={onSelect}
        draggable={isEditable}
        onDragStart={onDragStart}
      >
        {/* Block actions (visible on hover in edit mode) */}
        {isEditable && (
          <div className="absolute -left-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
            <button
              className="p-1 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 cursor-grab active:cursor-grabbing"
              title="Déplacer"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm8-12a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0zm0 6a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* AI badge */}
        {block.metadata?.aiGenerated && (
          <div className="absolute -right-2 -top-2 z-10">
            <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">
              🤖 IA
            </span>
          </div>
        )}

        {/* Comments indicator */}
        {block.metadata?.comments && block.metadata.comments > 0 && (
          <button className="absolute right-2 top-2 z-10 p-1 bg-blue-100 rounded-full">
            <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        )}

        {/* Block content */}
        {renderBlock()}
      </div>

      {/* Drop indicator - after */}
      {showDropAfter && (
        <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded" />
      )}
    </div>
  );
};
