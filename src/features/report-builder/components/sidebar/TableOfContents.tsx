/**
 * Table of Contents — OUTIL DE CONSTRUCTION du sommaire
 *
 * Les titres et sous-titres se gèrent ICI, pas dans les blocs texte.
 * - Ajouter H1/H2/H3 depuis le sommaire → crée le bloc dans le document
 * - Renommer inline depuis le sommaire
 * - Réorganiser par drag (monter/descendre)
 * - Supprimer une section depuis le sommaire
 * - Clic → scroll vers le bloc dans le canvas
 *
 * CDC §6.2 — Onglet Sommaire
 */
import React, { useState, useRef } from 'react';
import {
  Heading1, Heading2, Heading3, Plus, GripVertical,
  Trash2, ChevronUp, ChevronDown, Edit3, Check, X,
  BarChart3, Table as TableIcon, Hash, FileText,
} from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { ReportBlock, TextBlock, TextVariant } from '../../types';

// ============================================================================
// Types & Helpers
// ============================================================================

interface TOCEntry {
  block: ReportBlock;
  pageIndex: number;
  blockIndex: number;
  level: number; // 1, 2, 3
  label: string;
}

function getHeadingEntries(pages: { blocks: ReportBlock[] }[]): TOCEntry[] {
  const entries: TOCEntry[] = [];
  pages.forEach((page, pageIndex) => {
    page.blocks.forEach((block, blockIndex) => {
      if (block.type === 'text') {
        const tb = block as TextBlock;
        if (tb.variant === 'h1' || tb.variant === 'h2' || tb.variant === 'h3') {
          entries.push({
            block,
            pageIndex,
            blockIndex,
            level: tb.variant === 'h1' ? 1 : tb.variant === 'h2' ? 2 : 3,
            label: tb.content || `${tb.variant.toUpperCase()} sans titre`,
          });
        }
      }
      // Also show cover, tables, charts as non-editable entries
      if (block.type === 'cover') {
        entries.push({ block, pageIndex, blockIndex, level: 0, label: 'Page de couverture' });
      }
    });
  });
  return entries;
}

function buildNumbering(entries: TOCEntry[]): string[] {
  const counters = [0, 0, 0]; // h1, h2, h3
  return entries.map(e => {
    if (e.level === 0) return '';
    if (e.level === 1) { counters[0]++; counters[1] = 0; counters[2] = 0; return `${counters[0]}`; }
    if (e.level === 2) { counters[1]++; counters[2] = 0; return `${counters[0]}.${counters[1]}`; }
    if (e.level === 3) { counters[2]++; return `${counters[0]}.${counters[1]}.${counters[2]}`; }
    return '';
  });
}

const levelIcons: Record<number, React.ReactNode> = {
  0: <FileText className="w-3.5 h-3.5" />,
  1: <Heading1 className="w-3.5 h-3.5" />,
  2: <Heading2 className="w-3.5 h-3.5" />,
  3: <Heading3 className="w-3.5 h-3.5" />,
};

const levelIndent: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-0',
  2: 'pl-5',
  3: 'pl-10',
};

const levelStyle: Record<number, string> = {
  0: 'text-neutral-400 italic text-[10px]',
  1: 'text-neutral-900 font-semibold text-xs',
  2: 'text-neutral-700 font-medium text-[11px]',
  3: 'text-neutral-600 text-[11px]',
};

// ============================================================================
// Single Entry Component
// ============================================================================

const TOCEntryRow: React.FC<{
  entry: TOCEntry;
  numbering: string;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (newLabel: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ entry, numbering, isSelected, onSelect, onRename, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.level === 0) return; // Can't rename cover
    setEditValue(entry.label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmEdit = () => {
    if (editValue.trim()) {
      onRename(editValue.trim());
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditValue(entry.label);
    setEditing(false);
  };

  return (
    <div
      className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${levelIndent[entry.level]} ${
        isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
      }`}
      onClick={onSelect}
    >
      {/* Numbering */}
      {numbering && (
        <span className="text-[9px] text-neutral-400 font-mono w-6 shrink-0 text-right mr-1">
          {numbering}
        </span>
      )}

      {/* Icon */}
      <span className="text-neutral-400 shrink-0">{levelIcons[entry.level]}</span>

      {/* Label — editable or static */}
      {editing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEdit(); }}
            onBlur={confirmEdit}
            className="flex-1 text-xs border border-neutral-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <button onClick={confirmEdit} className="p-0.5 text-primary-600 hover:bg-primary-50 rounded">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={cancelEdit} className="p-0.5 text-neutral-400 hover:bg-neutral-100 rounded">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <span className={`flex-1 truncate ${levelStyle[entry.level]}`}>
            {entry.label}
          </span>

          {/* Page number */}
          <span className="text-[9px] text-neutral-400 shrink-0 mr-1">
            p.{entry.pageIndex + 1}
          </span>

          {/* Actions — visible on hover */}
          {entry.level > 0 && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={startEdit}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded"
                title="Renommer"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={isFirst}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20"
                title="Monter"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={isLast}
                className="p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded disabled:opacity-20"
                title="Descendre"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-0.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// Add Section Buttons
// ============================================================================

const AddSectionButtons: React.FC = () => {
  const { addBlock, selectedPageIndex, document: doc } = useReportBuilderStore();

  const handleAdd = (variant: TextVariant) => {
    const block: TextBlock = {
      id: crypto.randomUUID(),
      type: 'text',
      variant,
      content: '',
      alignment: 'left',
      locked: false,
      style: { marginBottom: variant === 'h1' ? 16 : variant === 'h2' ? 12 : 8 },
    };
    addBlock(selectedPageIndex, block);
  };

  return (
    <div className="px-3 py-2 border-t border-neutral-100">
      <div className="text-[9px] text-neutral-400 uppercase tracking-wider font-medium mb-2">Ajouter au sommaire</div>
      <div className="flex gap-1.5">
        <button
          onClick={() => handleAdd('h1')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
          title="Ajouter une section H1"
        >
          <Heading1 className="w-3.5 h-3.5" />
          Section
        </button>
        <button
          onClick={() => handleAdd('h2')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 rounded-md transition-colors"
          title="Ajouter une sous-section H2"
        >
          <Heading2 className="w-3.5 h-3.5" />
          Sous-section
        </button>
        <button
          onClick={() => handleAdd('h3')}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-medium text-neutral-600 bg-neutral-50 hover:bg-neutral-100 rounded-md transition-colors"
          title="Ajouter une rubrique H3"
        >
          <Heading3 className="w-3.5 h-3.5" />
          Rubrique
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TableOfContents: React.FC = () => {
  const { document: doc, selectedBlockId, selectBlock, selectPage, updateBlock, deleteBlock, moveBlock } = useReportBuilderStore();

  if (!doc) return <div className="p-4 text-xs text-neutral-400">Aucun document</div>;

  const entries = getHeadingEntries(doc.pages);
  const numbering = buildNumbering(entries);

  const handleRename = (entry: TOCEntry, newLabel: string) => {
    updateBlock(entry.block.id, { content: newLabel } as Partial<TextBlock>);
  };

  const handleDelete = (entry: TOCEntry) => {
    deleteBlock(entry.block.id);
  };

  const handleMoveUp = (entry: TOCEntry, idx: number) => {
    if (idx <= 0) return;
    const prevEntry = entries[idx - 1];
    // Swap block positions
    moveBlock(entry.block.id, prevEntry.pageIndex, prevEntry.blockIndex);
  };

  const handleMoveDown = (entry: TOCEntry, idx: number) => {
    if (idx >= entries.length - 1) return;
    const nextEntry = entries[idx + 1];
    moveBlock(entry.block.id, nextEntry.pageIndex, nextEntry.blockIndex + 1);
  };

  const handleSelect = (entry: TOCEntry) => {
    selectPage(entry.pageIndex);
    selectBlock(entry.block.id);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between">
        <div className="text-xs font-semibold text-neutral-800">Structure du Rapport</div>
        <span className="text-[9px] text-neutral-400">{entries.filter(e => e.level > 0).length} sections</span>
      </div>

      {/* Entries list */}
      <div className="flex-1 overflow-y-auto py-1 px-1">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
              <Heading1 className="w-5 h-5 text-neutral-400" />
            </div>
            <p className="text-xs text-neutral-500 font-medium mb-1">Aucune section</p>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Utilisez les boutons ci-dessous pour construire la structure de votre rapport.
              Chaque section ajoutée ici crée automatiquement un titre dans le document.
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => (
            <TOCEntryRow
              key={entry.block.id}
              entry={entry}
              numbering={numbering[idx]}
              isSelected={selectedBlockId === entry.block.id}
              onSelect={() => handleSelect(entry)}
              onRename={(newLabel) => handleRename(entry, newLabel)}
              onDelete={() => handleDelete(entry)}
              onMoveUp={() => handleMoveUp(entry, idx)}
              onMoveDown={() => handleMoveDown(entry, idx)}
              isFirst={idx === 0 || entry.level === 0}
              isLast={idx === entries.length - 1}
            />
          ))
        )}
      </div>

      {/* Add section buttons — always visible at bottom */}
      <AddSectionButtons />
    </div>
  );
};

export default TableOfContents;
