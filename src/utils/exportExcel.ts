/**
 * Export Excel via SheetJS (xlsx)
 * Utilisé par tous les ExportMenu du projet.
 */
import * as XLSX from 'xlsx';

export function exportToExcel(
  data: Record<string, unknown>[],
  sheetName: string,
  fileName: string
): void {
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);

  // Auto column widths
  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map(k => ({
    wch: Math.max(
      k.length + 2,
      ...data.slice(0, 50).map(row => String(row[k] ?? '').length)
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportBalanceToExcel(data: Record<string, unknown>[], annee: number): void {
  exportToExcel(data, 'Balance Générale', `Balance_${annee}`);
}

export function exportGrandLivreToExcel(data: Record<string, unknown>[], annee: number): void {
  exportToExcel(data, 'Grand Livre', `GrandLivre_${annee}`);
}

export function exportJournalToExcel(data: Record<string, unknown>[], periode: string): void {
  exportToExcel(data, 'Journal', `Journal_${periode}`);
}

export function exportBilanToExcel(
  bilanData: { actif?: Record<string, unknown>[]; passif?: Record<string, unknown>[] },
  annee: number
): void {
  const rows = [
    ...(bilanData.actif || []).map(r => ({ ...r, section: 'ACTIF' })),
    ...(bilanData.passif || []).map(r => ({ ...r, section: 'PASSIF' })),
  ];
  exportToExcel(rows, 'Bilan SYSCOHADA', `Bilan_${annee}`);
}
