import React from 'react';
import { cn } from '@/utils/cn';
import { DividerBlock as DividerBlockType } from '@/types/reportStudio';

interface DividerBlockProps {
  block: DividerBlockType;
}

export const DividerBlock: React.FC<DividerBlockProps> = ({ block }) => {
  const styleClass = {
    solid: 'border-solid',
    dashed: 'border-dashed',
    dotted: 'border-dotted',
  };

  return (
    <hr
      className={cn(
        'my-6 border-gray-300',
        styleClass[block.style || 'solid']
      )}
    />
  );
};
