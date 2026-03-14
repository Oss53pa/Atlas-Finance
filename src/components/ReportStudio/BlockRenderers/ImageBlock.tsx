import React from 'react';
import { cn } from '@/utils/cn';
import { ImageBlock as ImageBlockType } from '@/types/reportStudio';

interface ImageBlockProps {
  block: ImageBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<ImageBlockType>) => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  return (
    <figure
      className={cn(
        'my-4',
        block.alignment === 'center' && 'text-center',
        block.alignment === 'right' && 'text-right'
      )}
    >
      <img
        src={block.src}
        alt={block.alt || ''}
        className={cn(
          'rounded-lg',
          block.alignment === 'center' && 'mx-auto',
          block.alignment === 'right' && 'ml-auto',
          isEditable && 'cursor-pointer hover:ring-2 hover:ring-primary'
        )}
        style={{
          maxWidth: block.width ? `${block.width}px` : '100%',
          maxHeight: block.height ? `${block.height}px` : undefined,
        }}
      />
      {block.caption && (
        <figcaption className="mt-2 text-sm text-gray-500 italic">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};
