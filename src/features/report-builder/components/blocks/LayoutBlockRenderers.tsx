/**
 * Layout Block Renderers — Separator, PageBreak, Spacer, Cover
 */
import React from 'react';
import { Minus, FileDown, Shield } from 'lucide-react';
import type { SeparatorBlock, PageBreakBlock, SpacerBlock, CoverBlock } from '../../types';

// ---- Separator ----
export const SeparatorBlockRenderer: React.FC<{ block: SeparatorBlock }> = ({ block }) => (
  <hr
    className="my-2"
    style={{
      borderStyle: block.lineStyle,
      borderColor: block.color || 'var(--color-border)',
      borderWidth: `${block.thickness}px 0 0 0`,
    }}
  />
);

// ---- Page Break ----
export const PageBreakBlockRenderer: React.FC<{ block: PageBreakBlock }> = () => (
  <div className="flex items-center gap-2 py-2 text-neutral-400 text-xs">
    <div className="flex-1 border-t-2 border-dashed border-neutral-200" />
    <FileDown className="w-4 h-4" />
    <span>Saut de page</span>
    <div className="flex-1 border-t-2 border-dashed border-neutral-200" />
  </div>
);

// ---- Spacer ----
export const SpacerBlockRenderer: React.FC<{ block: SpacerBlock }> = ({ block }) => (
  <div style={{ height: block.height }} className="bg-transparent" />
);

// ---- Cover Page ----
const bgStyles: Record<string, string> = {
  'corporate-classic': 'bg-white border-l-8 border-neutral-900',
  'executive-dark': 'text-neutral-900 text-white',
  'finance-modern': 'bg-gradient-to-br from-blue-600 to-blue-900 text-white',
  'formal': 'bg-white border-2 border-gray-800',
  'custom': 'bg-white',
};

export const CoverBlockRenderer: React.FC<{ block: CoverBlock }> = ({ block }) => (
  <div className={`rounded-lg p-8 min-h-[400px] flex flex-col justify-center ${bgStyles[block.backgroundStyle] || bgStyles.custom}`}>
    {block.logoUrl && (
      <img src={block.logoUrl} alt="Logo" className="h-12 w-auto mb-6 object-contain" />
    )}
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{block.reportTitle || 'Titre du Rapport'}</h1>
      {block.subtitle && <p className="text-lg opacity-80">{block.subtitle}</p>}
      <p className="text-sm opacity-60 mt-4">{block.companyName}</p>
    </div>
    {block.confidentiality && (
      <div className="mt-auto pt-6 flex items-center gap-2 text-xs opacity-60">
        <Shield className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider">
          {block.confidentiality === 'confidentiel' ? 'Confidentiel' :
           block.confidentiality === 'usage-interne' ? 'Usage Interne' : 'Public'}
        </span>
      </div>
    )}
  </div>
);
