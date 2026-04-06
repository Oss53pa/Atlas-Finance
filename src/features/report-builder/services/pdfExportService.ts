/**
 * PDF Export Service — CDC §14, CDC V2 §A
 *
 * Architecture duale :
 * - Rapports simples (< 20 pages) → window.print() avec @media print
 * - Rapports complexes → future integration avec react-pdf/renderer ou Puppeteer
 *
 * Ce fichier implémente l'export MVP via window.print() + CSS @media print.
 */

import type { ReportDocument, ExportOptions } from '../types';

/**
 * Export the current report to PDF using browser print dialog.
 * This is the MVP approach — works immediately without extra dependencies.
 */
export async function exportToPDF(
  document: ReportDocument,
  options: Partial<ExportOptions> = {}
): Promise<void> {
  // Find the canvas element
  const canvas = window.document.querySelector('[data-report-canvas]');
  if (!canvas) {
    throw new Error('Canvas du rapport non trouvé');
  }

  // Create a new window with only the report content
  const printWindow = window.open('', '_blank', 'width=800,height=1200');
  if (!printWindow) {
    throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez les popups.');
  }

  // Get page dimensions
  const isLandscape = document.pageSettings.format === 'a4-landscape';
  const pageWidth = isLandscape ? '297mm' : '210mm';
  const pageHeight = isLandscape ? '210mm' : '297mm';
  const { marginTop, marginBottom, marginLeft, marginRight } = document.pageSettings;

  // Build print CSS
  const printCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=JetBrains+Mono&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: ${pageWidth} ${pageHeight};
      margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
    }

    body {
      font-family: '${document.typography.fontMain}', 'Exo 2', sans-serif;
      font-size: ${document.typography.baseFontSize}px;
      line-height: ${document.typography.lineHeight};
      color: ${document.theme.textPrimary};
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-page {
      page-break-after: always;
      min-height: ${pageHeight};
      position: relative;
    }
    .report-page:last-child {
      page-break-after: avoid;
    }

    /* Headers & Footers */
    .page-header {
      position: running(header);
      font-size: 9px;
      color: ${document.theme.textSecondary};
      border-bottom: 1px solid ${document.theme.borderColor};
      padding-bottom: 4px;
      margin-bottom: 16px;
    }
    .page-footer {
      position: running(footer);
      font-size: 9px;
      color: ${document.theme.textSecondary};
      border-top: 1px solid ${document.theme.borderColor};
      padding-top: 4px;
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
    }

    /* Watermark */
    ${document.pageSettings.watermark ? `
    .report-page::before {
      content: '${document.pageSettings.watermark}';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: tranprimary(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: 700;
      color: rgba(0, 0, 0, ${document.pageSettings.watermarkOpacity || 0.05});
      pointer-events: none;
      z-index: 0;
    }` : ''}

    /* Hide editorial comments */
    .comment-block.hide-on-print { display: none !important; }

    /* Table styles */
    table { border-collapse: collapse; width: 100%; }
    th, td { padding: 4px 8px; font-size: 11px; }
    th { background-color: #f5f5f5; font-weight: 600; border-bottom: 2px solid #d4d4d4; }
    td { border-bottom: 1px solid #e5e5e5; }

    /* KPI cards */
    .kpi-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }

    /* Charts — rendered as images */
    .chart-container svg { max-width: 100%; height: auto; }

    /* Cover page */
    .cover-page { page-break-after: always; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; }

    /* Avoid page breaks inside these elements */
    .kpi-card, .chart-container, .callout-block, .cover-page { page-break-inside: avoid; }

    /* Headings */
    h1 { font-size: ${document.typography.h1Size}px; font-weight: ${document.typography.h1Weight}; color: ${document.typography.h1Color}; margin-bottom: 12px; }
    h2 { font-size: ${document.typography.h2Size}px; font-weight: ${document.typography.h2Weight}; color: ${document.typography.h2Color}; margin-bottom: 8px; }
    h3 { font-size: ${document.typography.h3Size}px; font-weight: ${document.typography.h3Weight}; color: ${document.typography.h3Color}; margin-bottom: 6px; }

    /* Monospace for numbers */
    .font-mono { font-family: '${document.typography.fontData}', 'JetBrains Mono', monospace; }

    /* Negative values */
    .text-negative { color: ${document.theme.negative}; }
    .text-positive { color: ${document.theme.positive}; }
  `;

  // Clone the canvas content
  const content = canvas.cloneNode(true) as HTMLElement;

  // Remove non-printable elements (drag handles, action buttons, selection rings)
  content.querySelectorAll('[data-no-print]').forEach(el => el.remove());
  content.querySelectorAll('.group-hover\\:opacity-100').forEach(el => el.remove());

  // Write to print window using srcdoc-style DOM construction (avoids document.write XSS risk)
  const printDoc = printWindow.document;
  printDoc.open();
  printDoc.close();

  // Build the document safely via DOM APIs
  printDoc.documentElement.setAttribute('lang', 'fr');

  const head = printDoc.head;
  const meta = printDoc.createElement('meta');
  meta.setAttribute('charset', 'UTF-8');
  head.appendChild(meta);

  const titleEl = printDoc.createElement('title');
  titleEl.textContent = `${document.title} — ${document.period.label}`;
  head.appendChild(titleEl);

  const styleEl = printDoc.createElement('style');
  styleEl.textContent = printCSS;
  head.appendChild(styleEl);

  // Append cloned content into body
  const importedContent = printDoc.importNode(content, true);
  printDoc.body.appendChild(importedContent);

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // Close after print dialog (user may cancel)
      printWindow.onafterprint = () => printWindow.close();
    }, 500);
  };
}

/**
 * Export options for different formats (CDC §14.1)
 */
export function getExportFormats(): { id: string; label: string; description: string; icon: string }[] {
  return [
    { id: 'pdf-high', label: 'PDF Haute Qualité', description: '300 DPI — pour impression', icon: 'file-text' },
    { id: 'pdf-low', label: 'PDF Email', description: '72-150 DPI — pour e-mail', icon: 'mail' },
    { id: 'xlsx', label: 'Excel (.xlsx)', description: 'Tables de données uniquement', icon: 'table' },
    { id: 'pptx', label: 'PowerPoint (.pptx)', description: 'Slides exécutifs', icon: 'presentation' },
    { id: 'html', label: 'HTML Interactif', description: 'Rapport web consultable', icon: 'globe' },
  ];
}

/**
 * Naming pattern resolver (CDC §15.2)
 * Pattern: {type_rapport}_{periode}_{societe}_{version}_{statut}.pdf
 */
export function resolveNamingPattern(
  pattern: string,
  document: ReportDocument,
  companyName?: string
): string {
  const now = new Date();
  return pattern
    .replace('{type}', document.title.replace(/[^a-zA-Z0-9_\-]/g, '_'))
    .replace('{YYYY}', document.period.endDate.substring(0, 4))
    .replace('{MM}', document.period.endDate.substring(5, 7))
    .replace('{period}', document.period.label.replace(/[^a-zA-Z0-9_\-]/g, '_'))
    .replace('{societe}', (companyName || 'Atlas').replace(/[^a-zA-Z0-9_\-]/g, '_'))
    .replace('{version}', `v${document.version}`)
    .replace('{statut}', document.status.toUpperCase())
    .replace('{date}', `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
}
