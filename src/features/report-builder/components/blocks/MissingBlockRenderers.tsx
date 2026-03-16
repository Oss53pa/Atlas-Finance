/**
 * Missing Block Renderers — Image, BackPage, Columns, Comment, Callout, ManualTable, Formula, TOC
 * CDC V1 §8 + CDC V2 §B.5, §C.2
 */
import React from 'react';
import {
  Image as ImageIcon, MessageSquare, AlertTriangle, Info,
  CheckCircle, XCircle, MinusCircle, FileText, Hash,
} from 'lucide-react';
import type {
  ImageBlock, BackPageBlock, CommentBlock, CalloutBlock,
  ManualTableBlock, FormulaBlock, TOCBlock, ReportBlock, TextBlock,
} from '../../types';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';

// ============================================================================
// Image Block (CDC §8.1)
// ============================================================================

export const ImageBlockRenderer: React.FC<{ block: ImageBlock }> = ({ block }) => {
  const alignClass = block.alignment === 'center' ? 'mx-auto' : block.alignment === 'right' ? 'ml-auto' : '';

  if (!block.src) {
    return (
      <div className={`border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center ${alignClass}`} style={{ width: block.width || '100%' }}>
        <ImageIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
        <p className="text-xs text-neutral-400">Cliquez pour ajouter une image</p>
      </div>
    );
  }

  return (
    <div className={alignClass} style={{ width: block.width || '100%' }}>
      <img src={block.src} alt={block.alt} className="max-w-full h-auto rounded" />
      {block.caption && (
        <p className="text-[10px] text-neutral-500 mt-1 text-center italic">{block.caption}</p>
      )}
    </div>
  );
};

// ============================================================================
// Back Page Block (CDC §10.2)
// ============================================================================

const backStyles: Record<string, string> = {
  'corporate-classic': 'bg-white border-t-4 border-neutral-900',
  'executive-dark': 'bg-neutral-900 text-white',
  'minimal': 'bg-neutral-50',
  'custom': 'bg-white',
};

export const BackPageBlockRenderer: React.FC<{ block: BackPageBlock }> = ({ block }) => (
  <div className={`rounded-lg p-8 min-h-[300px] flex flex-col justify-end ${backStyles[block.backgroundStyle] || backStyles.custom}`}>
    {block.logoUrl && (
      <img src={block.logoUrl} alt="Logo" className="h-10 w-auto mb-4 object-contain" />
    )}
    <div className="space-y-1 text-xs">
      <div className="font-semibold">{block.companyName}</div>
      {block.address && <div className="text-neutral-500">{block.address}</div>}
      <div className="flex gap-4 text-neutral-500">
        {block.phone && <span>{block.phone}</span>}
        {block.email && <span>{block.email}</span>}
      </div>
      {block.website && <div className="text-neutral-500">{block.website}</div>}
    </div>
    {block.legalMention && (
      <div className="mt-6 pt-4 border-t border-neutral-200 text-[9px] text-neutral-400">
        {block.legalMention}
      </div>
    )}
  </div>
);

// ============================================================================
// Comment Block (CDC V2 §B.5)
// ============================================================================

export const CommentBlockRenderer: React.FC<{ block: CommentBlock }> = ({ block }) => (
  <div className={`border border-amber-300 bg-amber-50/50 rounded-lg p-3 ${block.hideOnPrint ? 'print:hidden' : ''}`}>
    <div className="flex items-center gap-1.5 mb-1.5">
      <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
      <span className="text-[10px] font-semibold text-amber-700">Note éditoriale</span>
      {block.author && <span className="text-[9px] text-amber-500">— {block.author}</span>}
      {block.hideOnPrint && <span className="text-[8px] bg-amber-200 text-amber-700 px-1 py-0.5 rounded ml-auto">Masqué à l'impression</span>}
    </div>
    <p className="text-xs text-amber-800">{block.content || 'Saisissez votre note…'}</p>
  </div>
);

// ============================================================================
// Callout / Encadré Block (CDC §8.1)
// ============================================================================

const calloutConfig: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  info: { bg: 'bg-blue-50/50', border: 'border-blue-300', text: 'text-blue-800', icon: <Info className="w-4 h-4 text-blue-500" /> },
  warning: { bg: 'bg-amber-50/50', border: 'border-amber-300', text: 'text-amber-800', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
  success: { bg: 'bg-primary-50/50', border: 'border-primary-300', text: 'text-primary-800', icon: <CheckCircle className="w-4 h-4 text-primary-500" /> },
  error: { bg: 'bg-red-50/50', border: 'border-red-300', text: 'text-red-800', icon: <XCircle className="w-4 h-4 text-red-500" /> },
  neutral: { bg: 'bg-neutral-50', border: 'border-neutral-300', text: 'text-neutral-800', icon: <MinusCircle className="w-4 h-4 text-neutral-500" /> },
};

export const CalloutBlockRenderer: React.FC<{ block: CalloutBlock }> = ({ block }) => {
  const cfg = calloutConfig[block.variant] || calloutConfig.neutral;
  return (
    <div className={`border-l-4 ${cfg.border} ${cfg.bg} rounded-r-lg p-4`}>
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          {block.title && <div className={`text-xs font-semibold ${cfg.text} mb-1`}>{block.title}</div>}
          <p className={`text-xs ${cfg.text}`}>{block.content || 'Saisissez le contenu…'}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Manual Table Block (CDC §8.1)
// ============================================================================

export const ManualTableBlockRenderer: React.FC<{ block: ManualTableBlock }> = ({ block }) => (
  <div className="overflow-x-auto">
    {block.title && <div className="text-xs font-semibold text-neutral-800 mb-2">{block.title}</div>}
    <table className={`w-full text-xs ${block.bordered ? 'border border-neutral-300' : ''}`}>
      <thead>
        <tr className="bg-neutral-50 border-b border-neutral-300">
          {block.headers.map((h, i) => (
            <th key={i} className="px-3 py-2 text-left font-semibold text-neutral-700">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, ri) => (
          <tr key={ri} className={`border-b border-neutral-200 ${block.striped && ri % 2 === 1 ? 'bg-neutral-50/50' : ''}`}>
            {row.map((cell, ci) => (
              <td key={ci} className="px-3 py-1.5 text-neutral-700">{cell}</td>
            ))}
          </tr>
        ))}
        {block.rows.length === 0 && (
          <tr><td colSpan={block.headers.length} className="px-3 py-6 text-center text-neutral-400">Aucune donnée — cliquez pour saisir</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

// ============================================================================
// Formula Block (CDC V2 §C.2)
// ============================================================================

export const FormulaBlockRenderer: React.FC<{ block: FormulaBlock }> = ({ block }) => (
  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center gap-3">
    <div className="p-1.5 bg-neutral-200 rounded">
      <Hash className="w-4 h-4 text-neutral-600" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-medium text-neutral-500">{block.label}</div>
      <div className="font-mono text-xs text-neutral-400 truncate mt-0.5">fx = {block.expression || '…'}</div>
    </div>
    <div className="text-right">
      {block.error ? (
        <span className="text-xs text-red-500 font-medium">{block.error}</span>
      ) : block.result !== null && block.result !== undefined ? (
        <span className="text-lg font-bold text-neutral-900 font-mono">
          {block.format === 'currency'
            ? new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(block.result) + ' FCFA'
            : block.format === 'percent'
            ? block.result.toFixed(1) + '%'
            : String(block.result)
          }
        </span>
      ) : (
        <span className="text-xs text-neutral-400">—</span>
      )}
    </div>
  </div>
);

// ============================================================================
// TOC Block — Auto-generated Table of Contents (CDC §8.1)
// ============================================================================

export const TOCBlockRenderer: React.FC<{ block: TOCBlock }> = ({ block }) => {
  const document = useReportBuilderStore(s => s.document);

  if (!document) return null;

  const entries: { label: string; pageIndex: number; level: number }[] = [];
  document.pages.forEach((page, pageIndex) => {
    page.blocks.forEach(b => {
      if (b.type === 'text') {
        const tb = b as TextBlock;
        const level = tb.variant === 'h1' ? 1 : tb.variant === 'h2' ? 2 : tb.variant === 'h3' ? 3 : 0;
        if (level > 0 && level <= block.maxDepth && tb.content) {
          entries.push({ label: tb.content, pageIndex, level });
        }
      }
    });
  });

  return (
    <div>
      <div className="text-sm font-semibold text-neutral-900 mb-3 pb-2 border-b border-neutral-200">
        {block.title || 'Table des Matières'}
      </div>
      <div className="space-y-1">
        {entries.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">Ajoutez des titres H1/H2/H3 au document.</p>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-baseline gap-2 text-xs"
              style={{ paddingLeft: (entry.level - 1) * 16 }}
            >
              <span className={`flex-1 truncate ${entry.level === 1 ? 'font-semibold text-neutral-900' : entry.level === 2 ? 'font-medium text-neutral-700' : 'text-neutral-600'}`}>
                {entry.label}
              </span>
              <span className="shrink-0 text-neutral-400 text-[10px] border-b border-dotted border-neutral-300 flex-1 mx-2" />
              <span className="shrink-0 text-neutral-500 font-mono text-[10px]">{entry.pageIndex + 1}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
