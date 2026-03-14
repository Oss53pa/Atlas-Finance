import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EtatType = 'bilan' | 'cdr' | 'sig' | 'tafire';

export interface SocieteInfo {
  name: string;
  nif: string;
  rccm: string;
  exercice: string;
  adresse: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatMontant(n: number): string {
  return `${numberFormatter.format(n)} FCFA`;
}

const TITLES: Record<EtatType, string> = {
  bilan: 'BILAN AU 31 DÉCEMBRE',
  cdr: 'COMPTE DE RÉSULTAT',
  sig: 'SOLDES INTERMÉDIAIRES DE GESTION',
  tafire: 'TABLEAU DES FLUX DE TRÉSORERIE',
};

const HEADER_BG: [number, number, number] = [26, 54, 93]; // #1a365d

// ---------------------------------------------------------------------------
// Header / Footer / Watermark
// ---------------------------------------------------------------------------

function renderHeader(doc: jsPDF, societe: SocieteInfo, type: EtatType): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Left block — company info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(societe.name, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NIF : ${societe.nif}`, 14, 26);
  doc.text(`RCCM : ${societe.rccm}`, 14, 31);
  doc.text(societe.adresse, 14, 36);

  // Right block — exercice
  doc.setFontSize(10);
  doc.text(`Exercice : ${societe.exercice}`, pageWidth - 14, 20, { align: 'right' });

  // Title centered
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(TITLES[type], pageWidth / 2, 48, { align: 'center' });

  // Horizontal rule
  doc.setDrawColor(26, 54, 93);
  doc.setLineWidth(0.5);
  doc.line(14, 52, pageWidth - 14, 52);

  return 58; // Y position after header
}

function renderFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Généré le ${dd}/${mm}/${yyyy} — Atlas Finance`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' },
  );
}

function renderWatermark(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setTextColor(255, 0, 0);
  doc.setFontSize(48);
  doc.setFont('helvetica', 'bold');

  // Save current graphics state
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;

  doc.text('PROVISOIRE — NON AUDITÉ', centerX, centerY, {
    align: 'center',
    angle: 45,
  });

  // Reset text color
  doc.setTextColor(0, 0, 0);
}

// ---------------------------------------------------------------------------
// Table style helpers
// ---------------------------------------------------------------------------

function headStyles() {
  return {
    fillColor: HEADER_BG,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 9,
  };
}

function bodyStyles() {
  return {
    fontSize: 8,
    textColor: [30, 30, 30] as [number, number, number],
  };
}

function alternateRowStyles() {
  return {
    fillColor: [240, 244, 248] as [number, number, number],
  };
}

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------

function renderBilan(doc: jsPDF, data: any, startY: number): void {
  const actifRows = [
    ['AA', 'Immobilisations incorporelles', formatMontant(data.actif.immobilisationsIncorporelles?.brut ?? 0), formatMontant(data.actif.immobilisationsIncorporelles?.amort ?? 0), formatMontant(data.actif.immobilisationsIncorporelles?.net ?? 0)],
    ['AB', 'Immobilisations corporelles', formatMontant(data.actif.immobilisationsCorporelles?.brut ?? 0), formatMontant(data.actif.immobilisationsCorporelles?.amort ?? 0), formatMontant(data.actif.immobilisationsCorporelles?.net ?? 0)],
    ['AC', 'Stocks', formatMontant(data.actif.stocks?.brut ?? 0), formatMontant(data.actif.stocks?.amort ?? 0), formatMontant(data.actif.stocks?.net ?? 0)],
    ['AD', 'Créances', formatMontant(data.actif.creances?.brut ?? 0), formatMontant(data.actif.creances?.amort ?? 0), formatMontant(data.actif.creances?.net ?? 0)],
    ['AE', 'Trésorerie-Actif', formatMontant(data.actif.tresorerieActif?.brut ?? 0), formatMontant(data.actif.tresorerieActif?.amort ?? 0), formatMontant(data.actif.tresorerieActif?.net ?? 0)],
  ];

  const totalActifRow = [
    'AZ',
    'TOTAL ACTIF',
    formatMontant(data.actif.totalActif?.brut ?? 0),
    formatMontant(data.actif.totalActif?.amort ?? 0),
    formatMontant(data.actif.totalActif?.net ?? 0),
  ];

  autoTable(doc, {
    startY,
    head: [['Réf', 'Libellé', 'Brut', 'Amort/Dépréc', 'Net N']],
    body: [
      ...actifRows,
      totalActifRow,
    ],
    headStyles: headStyles(),
    bodyStyles: bodyStyles(),
    alternateRowStyles: alternateRowStyles(),
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' },
    },
    didParseCell(hookData) {
      // Bold the total row
      if (hookData.row.index === actifRows.length) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 241];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // PASSIF table
  const passifStartY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 54, 93);
  doc.text('PASSIF', 14, passifStartY);
  doc.setTextColor(0, 0, 0);

  const passifRows = [
    ['CA', 'Capitaux propres', formatMontant(data.passif.capitauxPropres ?? 0)],
    ['CB', 'Emprunts et dettes financières', formatMontant(data.passif.emprunts ?? 0)],
    ['CC', 'Dettes fournisseurs', formatMontant(data.passif.dettesFournisseurs ?? 0)],
    ['CD', 'Dettes fiscales et sociales', formatMontant(data.passif.dettesFiscales ?? 0)],
    ['CE', 'Trésorerie-Passif', formatMontant(data.passif.tresoreriePassif ?? 0)],
  ];

  const totalPassifRow = [
    'CZ',
    'TOTAL PASSIF',
    formatMontant(data.passif.totalPassif ?? 0),
  ];

  autoTable(doc, {
    startY: passifStartY + 4,
    head: [['Réf', 'Libellé', 'Montant N']],
    body: [
      ...passifRows,
      totalPassifRow,
    ],
    headStyles: headStyles(),
    bodyStyles: bodyStyles(),
    alternateRowStyles: alternateRowStyles(),
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 50, halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.row.index === passifRows.length) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 241];
      }
    },
    margin: { left: 14, right: 14 },
  });
}

// ---------------------------------------------------------------------------
// Compte de Résultat
// ---------------------------------------------------------------------------

function renderCDR(doc: jsPDF, data: any, startY: number): void {
  const rows = [
    { ref: 'TA', label: 'Produits d\'exploitation', value: data.produitsExploitation ?? 0, section: true },
    { ref: 'RA', label: 'Charges d\'exploitation', value: data.chargesExploitation ?? 0, section: true },
    { ref: 'XA', label: 'RÉSULTAT D\'EXPLOITATION', value: data.resultatExploitation ?? 0, total: true },
    { ref: 'TB', label: 'Produits financiers', value: data.produitsFinanciers ?? 0, section: true },
    { ref: 'RB', label: 'Charges financières', value: data.chargesFinancieres ?? 0, section: true },
    { ref: 'XB', label: 'RÉSULTAT FINANCIER', value: data.resultatFinancier ?? 0, total: true },
    { ref: 'TC', label: 'Produits HAO', value: data.produitsHAO ?? 0, section: true },
    { ref: 'RC', label: 'Charges HAO', value: data.chargesHAO ?? 0, section: true },
    { ref: 'XC', label: 'RÉSULTAT HAO', value: data.resultatHAO ?? 0, total: true },
    { ref: 'XI', label: 'RÉSULTAT NET', value: data.resultatNet ?? 0, total: true },
  ];

  const tableBody = rows.map((r) => [r.ref, r.label, formatMontant(r.value)]);
  const totalIndices = rows
    .map((r, i) => (r.total ? i : -1))
    .filter((i) => i >= 0);

  autoTable(doc, {
    startY,
    head: [['Réf', 'Libellé', 'Montant N']],
    body: tableBody,
    headStyles: headStyles(),
    bodyStyles: bodyStyles(),
    alternateRowStyles: alternateRowStyles(),
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 50, halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && totalIndices.includes(hookData.row.index)) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 241];
      }
    },
    margin: { left: 14, right: 14 },
  });
}

// ---------------------------------------------------------------------------
// Soldes Intermédiaires de Gestion
// ---------------------------------------------------------------------------

function renderSIG(doc: jsPDF, data: any, startY: number): void {
  const sigLabels = [
    'Marge Commerciale',
    'Production',
    'Valeur Ajoutée',
    'EBE',
    'Résultat Exploitation',
    'Résultat Courant',
    'Résultat HAO',
    'Résultat Net',
    'CAF',
  ];

  const sigArray: { label: string; value: number }[] = data.sig ?? [];

  const tableBody = sigLabels.map((label, idx) => {
    const entry = sigArray[idx];
    return [
      String(idx + 1),
      entry?.label ?? label,
      formatMontant(entry?.value ?? 0),
    ];
  });

  autoTable(doc, {
    startY,
    head: [['N°', 'SIG', 'Montant']],
    body: tableBody,
    headStyles: headStyles(),
    bodyStyles: bodyStyles(),
    alternateRowStyles: alternateRowStyles(),
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 120 },
      2: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
}

// ---------------------------------------------------------------------------
// TAFIRE
// ---------------------------------------------------------------------------

function renderTAFIRE(doc: jsPDF, data: any, startY: number): void {
  const rows = [
    { label: 'A. Flux d\'exploitation', value: data.fluxExploitation ?? 0, section: true },
    { label: 'B. Flux d\'investissement', value: data.fluxInvestissement ?? 0, section: true },
    { label: 'C. Flux de financement', value: data.fluxFinancement ?? 0, section: true },
    { label: 'Variation nette de trésorerie', value: data.variationTresorerie ?? 0, total: true },
    { label: 'Trésorerie à l\'ouverture', value: data.tresorerieOuverture ?? 0, section: false },
    { label: 'Trésorerie à la clôture', value: data.tresorerieCloture ?? 0, total: true },
  ];

  const tableBody = rows.map((r) => [r.label, formatMontant(r.value)]);
  const totalIndices = rows
    .map((r, i) => (r.total ? i : -1))
    .filter((i) => i >= 0);

  autoTable(doc, {
    startY,
    head: [['Libellé', 'Montant']],
    body: tableBody,
    headStyles: headStyles(),
    bodyStyles: bodyStyles(),
    alternateRowStyles: alternateRowStyles(),
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 45, halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && totalIndices.includes(hookData.row.index)) {
        hookData.cell.styles.fontStyle = 'bold';
        hookData.cell.styles.fillColor = [220, 230, 241];
      }
    },
    margin: { left: 14, right: 14 },
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function generateEtatPDF(
  type: EtatType,
  data: any,
  societe: SocieteInfo,
  isProvisoire: boolean,
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Header
  const startY = renderHeader(doc, societe, type);

  // Watermark (rendered before tables so it sits behind content)
  if (isProvisoire) {
    renderWatermark(doc);
  }

  // Body
  switch (type) {
    case 'bilan':
      renderBilan(doc, data, startY);
      break;
    case 'cdr':
      renderCDR(doc, data, startY);
      break;
    case 'sig':
      renderSIG(doc, data, startY);
      break;
    case 'tafire':
      renderTAFIRE(doc, data, startY);
      break;
  }

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    renderFooter(doc);
  }

  return doc.output('blob');
}
