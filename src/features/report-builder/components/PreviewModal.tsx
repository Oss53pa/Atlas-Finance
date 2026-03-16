/**
 * PreviewModal — Aperçu avant impression du rapport
 * Affiche le document en lecture seule, sans sidebars, sans handles, plein écran.
 * CDC §14.1 — Aperçu avant impression
 */
import React from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { useReportBuilderStore } from '../store/useReportBuilderStore';
import { renderBlock } from './blocks';
import { exportToPDF } from '../services/pdfExportService';
import type { TextBlock } from '../types';

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PreviewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const doc = useReportBuilderStore(s => s.document);
  const [zoom, setZoom] = React.useState(75);

  if (!isOpen || !doc) return null;

  const scale = zoom / 100;
  const totalPages = doc.pages.length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportToPDF(doc).catch(err => console.error('Export failed:', err));
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/80 flex flex-col">
      {/* Toolbar */}
      <div className="h-12 bg-neutral-900 flex items-center px-4 gap-3 shrink-0">
        <span className="text-sm font-medium text-white flex-1">
          Aperçu — {doc.title} — {doc.period.label}
        </span>

        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(30, z - 10))} className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-400 w-10 text-center font-mono">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(150, z + 10))} className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-5 bg-neutral-700 mx-2" />

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-600 rounded-md"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimer
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-md"
        >
          <Download className="w-3.5 h-3.5" /> PDF
        </button>

        <div className="w-px h-5 bg-neutral-700 mx-2" />

        <button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Pages */}
      <div className="flex-1 overflow-auto bg-neutral-800">
        <div
          className="flex flex-col items-center gap-6 py-6"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
        >
          {doc.pages.map((page, pageIndex) => {
            const isCover = page.pageType === 'cover';
            const isBack = page.pageType === 'back';
            const showHeader = doc.pageSettings.showHeader && !isCover && !isBack;
            const showFooter = doc.pageSettings.showFooter && !isCover && !isBack;
            const pageNum = pageIndex + (doc.pageSettings.startPageNumber || 1);

            let footerText = doc.pageSettings.footerText || '';
            footerText = footerText.replace('{page}', String(pageNum)).replace('{total}', String(totalPages + (doc.pageSettings.startPageNumber || 1) - 1));

            return (
              <div
                key={page.id}
                className="bg-white shadow-2xl"
                style={{ width: A4_WIDTH, minHeight: A4_HEIGHT }}
              >
                <div className="p-10 relative" style={{ fontFamily: doc.typography.fontMain }}>
                  {/* Watermark */}
                  {doc.pageSettings.watermark && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'rotate(-45deg)' }}>
                      <span className="text-7xl font-bold" style={{ color: `rgba(0,0,0,${doc.pageSettings.watermarkOpacity || 0.05})` }}>
                        {doc.pageSettings.watermark}
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  {showHeader && (
                    <div className="flex items-center justify-between mb-4 pb-2 border-b text-[9px]" style={{ borderColor: doc.theme.borderColor, color: doc.theme.textSecondary }}>
                      <span>{doc.pageSettings.headerText || doc.title}</span>
                      <span>{doc.period.label}</span>
                    </div>
                  )}

                  {/* Blocks — render without selection/drag UI */}
                  <div>
                    {page.blocks.map(block => {
                      // Skip editorial comments in preview
                      if (block.type === 'comment' && (block as any).hideOnPrint) return null;

                      return (
                        <div key={block.id} style={{ marginBottom: block.style.marginBottom ?? 8 }}>
                          {renderBlockPreview(block)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  {showFooter && (
                    <div className="flex items-center justify-between mt-4 pt-2 border-t text-[9px]" style={{ borderColor: doc.theme.borderColor, color: doc.theme.textSecondary }}>
                      <span>{doc.pageSettings.watermark === 'CONFIDENTIEL' ? 'Confidentiel — Usage interne' : ''}</span>
                      <span>{footerText}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-8 bg-neutral-900 flex items-center justify-center text-[10px] text-neutral-500 shrink-0">
        {totalPages} page{totalPages > 1 ? 's' : ''} — {doc.period.label} — v{doc.version}
      </div>
    </div>
  );
};

/**
 * Render a block in preview mode (no selection ring, no drag handle)
 * Re-uses the same renderers but without BlockWrapper
 */
function renderBlockPreview(block: any): React.ReactNode {
  // We use the same renderBlock but it wraps in BlockWrapper which adds
  // selection/drag. For preview we just render the inner content directly.
  // Import individual renderers:
  switch (block.type) {
    case 'text': {
      const styles: Record<string, string> = {
        h1: 'text-2xl font-semibold text-neutral-900',
        h2: 'text-xl font-semibold text-neutral-800',
        h3: 'text-lg font-medium text-neutral-700',
        paragraph: 'text-sm text-neutral-600 leading-relaxed',
        quote: 'text-sm text-neutral-500 italic border-l-4 border-neutral-400 pl-4',
        footnote: 'text-[10px] text-neutral-400 border-t border-neutral-200 pt-2',
      };
      return <div className={styles[block.variant] || styles.paragraph} style={{ textAlign: block.alignment }}>{block.content}</div>;
    }
    default:
      // For all other blocks, use the standard renderer (it'll have BlockWrapper but in preview it's non-interactive)
      return renderBlock(block);
  }
}

export default PreviewModal;
