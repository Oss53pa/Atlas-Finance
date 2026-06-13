/**
 * printReport — impression « rapport » professionnelle, STRICTEMENT limitée aux
 * données (tableaux), calibrée A4 portrait OU paysage au choix de l'utilisateur.
 *
 * Principe : on n'imprime PAS la page écran (chrome, KPI, cartes, boutons…).
 * On clone uniquement les <table> de données dans une iframe isolée dotée d'une
 * feuille de style d'impression dédiée (@page A4, marges, en-tête société +
 * titre + date, pied de page paginé, en-têtes de colonnes répétés à chaque page).
 *
 * Avantages vs window.print() global :
 *  - sortie identique quel que soit le thème/CSS de l'app ;
 *  - aucun « trou » de mise en page (pas de visibility:hidden sur la page) ;
 *  - orientation réellement pilotée par @page size: A4 portrait|landscape.
 */

export type PrintOrientation = 'portrait' | 'landscape';

const esc = (s: string): string =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Nom de société pour l'en-tête (settings.admin_company_legal exposé via le DOM). */
export function getCompanyName(): string {
  const el = document.querySelector('[data-company-name]');
  const v = (el?.getAttribute('data-company-name') || el?.textContent || '').trim();
  return v;
}

/** Titre du rapport = 1er h1/h2 de la zone imprimée, à défaut le titre du document. */
export function getReportTitle(root: HTMLElement | null): string {
  const h = root?.querySelector('h1, h2');
  const t = (h?.textContent || '').replace(/\s+/g, ' ').trim();
  return t || (document.title || 'Document');
}

/**
 * Nettoie un <table> pour l'impression : retire boutons/icônes/champs et les
 * colonnes d'actions (en-tête vide ou « Actions ») puis renvoie son HTML.
 */
function cleanTableHtml(table: HTMLTableElement): string {
  const clone = table.cloneNode(true) as HTMLTableElement;
  clone.querySelectorAll('button, svg, input, select, .print-hide, [data-no-print="true"]').forEach((e) => e.remove());

  // Retire les colonnes d'action / vides (par index, en se basant sur l'en-tête).
  const headRow = clone.querySelector('thead tr');
  if (headRow) {
    const ths = Array.from(headRow.children);
    const removeIdx: number[] = [];
    ths.forEach((th, i) => {
      const t = (th.textContent || '').trim().toLowerCase();
      if (t === '' || t === 'actions' || t === 'action') removeIdx.push(i);
    });
    if (removeIdx.length) {
      removeIdx.sort((a, b) => b - a);
      clone.querySelectorAll('tr').forEach((tr) => {
        removeIdx.forEach((idx) => {
          const cell = tr.children[idx];
          if (cell) cell.remove();
        });
      });
    }
  }
  return `<table>${clone.innerHTML}</table>`;
}

/** Concatène le HTML imprimable de tous les tableaux de données d'une zone. */
export function collectTablesHtml(root: HTMLElement): string {
  const tables = Array.from(root.querySelectorAll('table')) as HTMLTableElement[];
  // Ignore les tableaux purement décoratifs / vides (sans lignes de corps).
  const useful = tables.filter((t) => t.querySelector('tbody tr'));
  if (useful.length === 0) return '';
  return useful.map(cleanTableHtml).join('<div class="rep-gap"></div>');
}

export interface PrintReportOptions {
  title?: string;
  subtitle?: string;
  orientation: PrintOrientation;
  /** HTML déjà nettoyé (cf. collectTablesHtml / cleanTableHtml). */
  bodyHtml: string;
  company?: string;
}

/**
 * Lance l'impression du rapport dans une iframe isolée. Retourne true si une
 * impression a été déclenchée, false s'il n'y avait aucune donnée.
 */
export function printReport(opts: PrintReportOptions): boolean {
  const { title = 'Document', subtitle = '', orientation, bodyHtml, company = '' } = opts;
  if (!bodyHtml || !bodyHtml.trim()) return false;

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const cw = iframe.contentWindow;
  const doc = cw?.document;
  if (!cw || !doc) { iframe.remove(); return false; }

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4 ${orientation}; margin: 16mm 12mm 18mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; font-size: 10pt; line-height: 1.35; }

  .rep-head { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2pt solid #111; padding-bottom: 7pt; margin-bottom: 12pt; }
  .rep-company { font-size: 14pt; font-weight: 700; letter-spacing: .01em; }
  .rep-title { font-size: 12pt; font-weight: 700; margin-top: 2pt; }
  .rep-sub { font-size: 9pt; color: #555; margin-top: 1pt; }
  .rep-meta { font-size: 9pt; color: #555; text-align: right; white-space: nowrap; }

  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin: 0; }
  thead { display: table-header-group; }      /* en-têtes répétés à chaque page */
  tfoot { display: table-footer-group; }
  tr { page-break-inside: avoid; }
  th, td { border: 0.4pt solid #b8b8b8; padding: 3pt 5pt; text-align: left; vertical-align: top; }
  th { background: #ececec; font-weight: 700; text-transform: uppercase; font-size: 8pt; letter-spacing: .02em; }
  tbody tr:nth-child(even) { background: #f7f7f7; }
  .rep-gap { height: 10pt; }

  /* Respecte les alignements/format usuels du tableau source */
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .font-mono, [class*="font-mono"] { font-family: 'Courier New', monospace; }

  .rep-foot { position: fixed; bottom: 6mm; left: 12mm; right: 12mm; font-size: 7.5pt; color: #888;
    text-align: center; border-top: 0.4pt solid #ccc; padding-top: 3pt; }
</style></head>
<body>
  <div class="rep-head">
    <div>
      ${company ? `<div class="rep-company">${esc(company)}</div>` : ''}
      <div class="rep-title">${esc(title)}</div>
      ${subtitle ? `<div class="rep-sub">${esc(subtitle)}</div>` : ''}
    </div>
    <div class="rep-meta">Imprimé le ${today}<br/>Format A4 ${orientation === 'landscape' ? 'paysage' : 'portrait'}</div>
  </div>
  ${bodyHtml}
  <div class="rep-foot">${company ? esc(company) + ' — ' : ''}${esc(title)} · Imprimé le ${today}</div>
</body></html>`;

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => { if (cleaned) return; cleaned = true; try { iframe.remove(); } catch { /* noop */ } };
  cw.onafterprint = cleanup;

  // Laisse le temps au rendu avant d'imprimer ; nettoyage de secours.
  setTimeout(() => { try { cw.focus(); cw.print(); } catch { /* noop */ } }, 300);
  setTimeout(cleanup, 60000);
  return true;
}
