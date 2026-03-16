/**
 * Document Canvas — A4 pages with blocks, headers/footers, page numbers, zoom
 * CDC §5.3 — Canvas Document + §10.3 — En-têtes & Pieds de Page
 * Uses project design system (neutral-* monochrome)
 */
import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import { renderBlock } from './blocks';

// A4 @ 96dpi = 794 x 1123 px
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

// ---- Page Header (CDC §10.3) ----
const PageHeader: React.FC<{ pageIndex: number; totalPages: number }> = ({ pageIndex }) => {
  const doc = useReportBuilderStore(s => s.document);
  if (!doc?.pageSettings.showHeader) return null;

  // Skip header on cover pages
  const page = doc.pages[pageIndex];
  if (page?.pageType === 'cover' || page?.pageType === 'back') return null;

  return (
    <div className="flex items-center justify-between mb-4 pb-2 border-b border-neutral-200 text-[9px] text-neutral-400">
      <span>{doc.pageSettings.headerText || doc.title}</span>
      <span>{doc.period.label}</span>
    </div>
  );
};

// ---- Page Footer (CDC §10.3 + §10.4) ----
const PageFooter: React.FC<{ pageIndex: number; totalPages: number }> = ({ pageIndex, totalPages }) => {
  const doc = useReportBuilderStore(s => s.document);
  if (!doc?.pageSettings.showFooter) return null;

  const page = doc.pages[pageIndex];
  if (page?.pageType === 'cover' || page?.pageType === 'back') return null;

  const startNum = doc.pageSettings.startPageNumber || 1;
  const pageNum = pageIndex + startNum;
  const total = totalPages + startNum - 1;

  // Resolve footer text variables
  let footerText = doc.pageSettings.footerText || '';
  footerText = footerText.replace('{page}', String(pageNum)).replace('{total}', String(total));

  return (
    <div className="flex items-center justify-between mt-4 pt-2 border-t border-neutral-200 text-[9px] text-neutral-400">
      <span className="uppercase tracking-wider">
        {doc.pageSettings.watermark === 'CONFIDENTIEL' ? 'Confidentiel — Usage interne' : ''}
      </span>
      <span>{footerText}</span>
    </div>
  );
};

// ---- Watermark (CDC §7.4) ----
const Watermark: React.FC = () => {
  const watermark = useReportBuilderStore(s => s.document?.pageSettings.watermark);
  const opacity = useReportBuilderStore(s => s.document?.pageSettings.watermarkOpacity) || 0.05;
  if (!watermark) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none"
      style={{ transform: 'rotate(-45deg)' }}
    >
      <span
        className="text-7xl font-bold"
        style={{ color: `rgba(0, 0, 0, ${opacity})` }}
      >
        {watermark}
      </span>
    </div>
  );
};

// ---- Single Page ----
const PageView: React.FC<{ pageIndex: number; totalPages: number }> = ({ pageIndex, totalPages }) => {
  const doc = useReportBuilderStore(s => s.document);
  const selectedPageIndex = useReportBuilderStore(s => s.selectedPageIndex);
  const selectBlock = useReportBuilderStore(s => s.selectBlock);
  const selectPage = useReportBuilderStore(s => s.selectPage);
  const addPage = useReportBuilderStore(s => s.addPage);

  if (!doc) return null;
  const page = doc.pages[pageIndex];
  if (!page) return null;

  const { setNodeRef } = useDroppable({ id: `page-${pageIndex}`, data: { pageIndex } });
  const blockIds = page.blocks.map(b => b.id);

  return (
    <div className="relative">
      {/* Page number label */}
      <div className="absolute -left-10 top-2 text-[10px] text-neutral-400 font-mono">
        {pageIndex + 1}
      </div>

      <div
        ref={setNodeRef}
        data-report-canvas
        className={`bg-white shadow-md border transition-colors ${
          selectedPageIndex === pageIndex ? 'border-neutral-400' : 'border-neutral-200'
        }`}
        style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-report-canvas]') === e.currentTarget) {
            selectBlock(null);
            selectPage(pageIndex);
          }
        }}
      >
        <div className="relative p-10">
          {/* Watermark */}
          <Watermark />

          {/* Header */}
          <PageHeader pageIndex={pageIndex} totalPages={totalPages} />

          {/* Blocks */}
          <div className="relative z-10">
            <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
              {page.blocks.map(block => (
                <React.Fragment key={block.id}>
                  {renderBlock(block)}
                </React.Fragment>
              ))}
            </SortableContext>

            {/* Empty state */}
            {page.blocks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-neutral-300">
                <Plus className="w-8 h-8 mb-2" />
                <p className="text-sm">Glissez un bloc depuis le catalogue</p>
                <p className="text-xs mt-1">ou cliquez sur un bloc pour l'ajouter</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <PageFooter pageIndex={pageIndex} totalPages={totalPages} />
        </div>
      </div>
    </div>
  );
};

// ---- Canvas (scroll container) ----
const Canvas: React.FC = () => {
  const doc = useReportBuilderStore(s => s.document);
  const zoomLevel = useReportBuilderStore(s => s.zoomLevel);
  const addPage = useReportBuilderStore(s => s.addPage);

  if (!doc) return (
    <div className="flex-1 flex items-center justify-center bg-neutral-100 text-neutral-400">
      Créez ou ouvrez un rapport pour commencer.
    </div>
  );

  const scale = zoomLevel / 100;
  const totalPages = doc.pages.length;

  return (
    <div className="flex-1 bg-neutral-100 overflow-auto">
      <div
        className="flex flex-col items-center gap-8 py-8 px-4"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          minHeight: `${100 / scale}%`,
        }}
      >
        {doc.pages.map((_, idx) => (
          <PageView key={doc.pages[idx].id} pageIndex={idx} totalPages={totalPages} />
        ))}

        {/* Add page button */}
        <button
          onClick={() => addPage()}
          className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-400 hover:text-neutral-600 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter une page
        </button>
      </div>
    </div>
  );
};

export default Canvas;
