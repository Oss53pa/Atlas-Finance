import React, { useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ParagraphBlock as ParagraphBlockType } from '@/types/reportStudio';

interface ParagraphBlockProps {
  block: ParagraphBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<ParagraphBlockType>) => void;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  const contentRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (contentRef.current && isEditable) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content, isEditable]);

  const handleBlur = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      if (newContent !== block.content) {
        onChange({ content: newContent });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // TODO: Create new paragraph block
    }
  };

  const style: React.CSSProperties = {};
  if (block.formatting) {
    if (block.formatting.color) style.color = block.formatting.color;
    if (block.formatting.backgroundColor) style.backgroundColor = block.formatting.backgroundColor;
    if (block.formatting.fontSize) style.fontSize = `${block.formatting.fontSize}px`;
    if (block.formatting.fontFamily) style.fontFamily = block.formatting.fontFamily;
  }

  return (
    <p
      ref={contentRef}
      className={cn(
        'text-gray-700 leading-relaxed',
        isEditable && 'outline-none focus:bg-blue-50 rounded px-1 -mx-1',
        block.formatting?.bold && 'font-bold',
        block.formatting?.italic && 'italic',
        block.formatting?.underline && 'underline',
        block.formatting?.strikethrough && 'line-through',
        block.formatting?.alignment === 'center' && 'text-center',
        block.formatting?.alignment === 'right' && 'text-right',
        block.formatting?.alignment === 'justify' && 'text-justify',
      )}
      style={style}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {block.content}
    </p>
  );
};
