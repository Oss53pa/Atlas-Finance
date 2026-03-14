import React, { useRef } from 'react';
import { cn } from '@/utils/cn';
import { HeadingBlock as HeadingBlockType } from '@/types/reportStudio';

interface HeadingBlockProps {
  block: HeadingBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<HeadingBlockType>) => void;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  const contentRef = useRef<HTMLHeadingElement>(null);

  const handleBlur = () => {
    if (contentRef.current) {
      const newContent = contentRef.current.textContent || '';
      if (newContent !== block.content) {
        onChange({ content: newContent });
      }
    }
  };

  const levelClasses = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold',
    5: 'text-base font-medium',
    6: 'text-sm font-medium',
  };

  const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;

  return (
    <Tag
      ref={contentRef as any}
      className={cn(
        'text-gray-900',
        levelClasses[block.level],
        isEditable && 'outline-none focus:bg-blue-50 rounded px-1 -mx-1',
        block.formatting?.alignment === 'center' && 'text-center',
        block.formatting?.alignment === 'right' && 'text-right',
      )}
      contentEditable={isEditable}
      suppressContentEditableWarning
      onBlur={handleBlur}
    >
      {block.content}
    </Tag>
  );
};
