/**
 * Text Block Properties Panel
 */
import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { TextBlock, TextVariant } from '../../types';

const variants: { value: TextVariant; label: string }[] = [
  { value: 'h1', label: 'Titre H1' },
  { value: 'h2', label: 'Titre H2' },
  { value: 'h3', label: 'Titre H3' },
  { value: 'paragraph', label: 'Paragraphe' },
  { value: 'quote', label: 'Citation' },
];

const alignments = [
  { value: 'left' as const, icon: AlignLeft },
  { value: 'center' as const, icon: AlignCenter },
  { value: 'right' as const, icon: AlignRight },
  { value: 'justify' as const, icon: AlignJustify },
];

const TextProperties: React.FC<{ block: TextBlock }> = ({ block }) => {
  const { updateBlock } = useReportBuilderStore();

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Bloc Texte</div>

      {/* Variant */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Style</label>
        <select
          value={block.variant}
          onChange={e => updateBlock(block.id, { variant: e.target.value as TextVariant })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        >
          {variants.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Alignment */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Alignement</label>
        <div className="flex gap-1">
          {alignments.map(a => (
            <button
              key={a.value}
              onClick={() => updateBlock(block.id, { alignment: a.value })}
              className={`p-1.5 rounded ${block.alignment === a.value ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-400 hover:bg-neutral-100'}`}
            >
              <a.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextProperties;
