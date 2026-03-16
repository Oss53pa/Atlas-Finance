/**
 * TextBlock Renderer — Editable text with variant support
 * Uses project design system colors (neutral-*)
 */
import React, { useRef, useEffect } from 'react';
import { Edit3 } from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { TextBlock } from '../../types';

const variantStyles: Record<string, string> = {
  h1: 'text-2xl font-semibold text-neutral-900',
  h2: 'text-xl font-semibold text-neutral-800',
  h3: 'text-lg font-medium text-neutral-700',
  paragraph: 'text-sm text-neutral-600 leading-relaxed',
  quote: 'text-sm text-neutral-500 italic border-l-4 border-neutral-400 pl-4',
  footnote: 'text-[10px] text-neutral-400 border-t border-neutral-200 pt-2',
};

const variantPlaceholders: Record<string, string> = {
  h1: 'Titre de section…',
  h2: 'Sous-titre…',
  h3: 'Rubrique…',
  paragraph: 'Saisissez votre texte ici…',
  quote: 'Citation…',
  footnote: 'Note de bas de page…',
};

interface Props {
  block: TextBlock;
}

const TextBlockRenderer: React.FC<Props> = ({ block }) => {
  const { selectedBlockId, updateBlock } = useReportBuilderStore();
  const isSelected = selectedBlockId === block.id;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== block.content && !isSelected) {
      ref.current.textContent = block.content;
    }
  }, [block.content, isSelected]);

  const handleBlur = () => {
    const newContent = ref.current?.textContent || '';
    if (newContent !== block.content) {
      updateBlock(block.id, { content: newContent } as Partial<TextBlock>);
    }
  };

  return (
    <div className="relative">
      {/* Narrative zone indicator (CDC V3 §E.2) */}
      {block.isNarrativeZone && (
        <div className="absolute -left-2 top-0 bottom-0 w-1 bg-amber-400 rounded-full" title="Zone narrative" />
      )}
      <div
        ref={ref}
        contentEditable={!block.locked}
        suppressContentEditableWarning
        className={`${variantStyles[block.variant] || variantStyles.paragraph} outline-none min-h-[1.5em] ${block.locked ? 'cursor-default' : 'cursor-text'} ${block.isNarrativeZone ? 'bg-amber-50/30 pl-3' : ''} empty:before:content-[attr(data-placeholder)] empty:before:text-neutral-300`}
        style={{ textAlign: block.alignment }}
        onBlur={handleBlur}
        data-placeholder={variantPlaceholders[block.variant]}
      >
        {block.content || ''}
      </div>
      {block.isNarrativeZone && !block.content && (
        <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-500">
          <Edit3 className="w-2.5 h-2.5" />
          Zone narrative — à rédiger pour chaque instance
        </div>
      )}
    </div>
  );
};

export default TextBlockRenderer;
