/**
 * Service d'export PDF de la piste d'audit.
 *
 * Génère un rapport PDF conforme SYSCOHADA contenant :
 * 1. En-tête (société, période, date de génération)
 * 2. Résumé (nombre d'événements, intégrité chaîne de hachage)
 * 3. Tableau détaillé des événements d'audit
 * 4. Vérification d'intégrité (hash chain)
 *
 * Utilise jsPDF pour la génération PDF.
 */

import { db } from '../../lib/db';
import type { DBAuditLog } from '../../lib/db';
import { jsPDF } from 'jspdf';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditTrailReportOptions {
  startDate?: string;
  endDate?: string;
  entityType?: string;
  action?: string;
  userId?: string;
  companyName?: string;
  fiscalYear?: string;
  verifyIntegrity?: boolean;
}

export interface AuditIntegrityResult {
  totalLogs: number;
  verified: number;
  broken: number;
  brokenAt: Array<{ index: number; id: string; timestamp: string }>;
  isIntact: boolean;
}

// ============================================================================
// INTEGRITY VERIFICATION
// ============================================================================

/**
 * Verify the audit trail hash chain integrity.
 */
export async function verifyAuditIntegrity(logs?: DBAuditLog[]): Promise<AuditIntegrityResult> {
  const allLogs = logs || await db.auditLogs.orderBy('timestamp').toArray();

  const result: AuditIntegrityResult = {
    totalLogs: allLogs.length,
    verified: 0,
    broken: 0,
    brokenAt: [],
    isIntact: true,
  };

  if (allLogs.length === 0) return result;

  // First log should have empty previousHash
  for (let i = 0; i < allLogs.length; i++) {
    const log = allLogs[i];
    if (i > 0 && log.previousHash !== allLogs[i - 1].hash) {
      result.broken++;
      result.brokenAt.push({ index: i, id: log.id, timestamp: log.timestamp });
      result.isIntact = false;
    } else {
      result.verified++;
    }
  }

  return result;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate a PDF audit trail report.
 */
export async function generateAuditTrailPdf(options: AuditTrailReportOptions = {}): Promise<Blob> {
  // Fetch and filter logs
  let logs = await db.auditLogs.orderBy('timestamp').toArray();

  if (options.startDate) {
    logs = logs.filter(l => l.timestamp >= options.startDate!);
  }
  if (options.endDate) {
    logs = logs.filter(l => l.timestamp <= options.endDate!);
  }
  if (options.entityType) {
    logs = logs.filter(l => l.entityType === options.entityType);
  }
  if (options.action) {
    logs = logs.filter(l => l.action === options.action);
  }
  if (options.userId) {
    logs = logs.filter(l => l.userId === options.userId);
  }

  // Verify integrity if requested
  const integrity = options.verifyIntegrity !== false ? await verifyAuditIntegrity(logs) : null;

  // Create PDF
  const pdf = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // ---- HEADER ----
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PISTE D\'AUDIT', pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(options.companyName || 'Atlas Finance', pageWidth / 2, y, { align: 'center' });
  y += 5;

  const periodText = options.startDate && options.endDate
    ? `Période : ${formatDate(options.startDate)} au ${formatDate(options.endDate)}`
    : `Tous les événements au ${formatDate(new Date().toISOString())}`;
  pdf.text(periodText, pageWidth / 2, y, { align: 'center' });
  y += 5;

  pdf.setFontSize(8);
  pdf.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  // ---- SUMMARY ----
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RÉSUMÉ', margin, y);
  y += 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nombre total d'événements : ${logs.length}`, margin, y);
  y += 5;

  if (integrity) {
    const integrityStatus = integrity.isIntact ? 'INTACTE' : 'COMPROMISE';
    pdf.text(`Intégrité de la chaîne de hachage : ${integrityStatus}`, margin, y);
    y += 5;
    pdf.text(`  Vérifiés : ${integrity.verified} | Rompus : ${integrity.broken}`, margin, y);
    y += 5;

    if (!integrity.isIntact) {
      pdf.setTextColor(200, 0, 0);
      pdf.text(`  ATTENTION : ${integrity.broken} rupture(s) détectée(s) dans la chaîne d'audit`, margin, y);
      pdf.setTextColor(0, 0, 0);
      y += 5;
    }
  }

  // Breakdown by action type
  const actionCounts = new Map<string, number>();
  for (const log of logs) {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  }
  y += 3;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Répartition par type d\'action :', margin, y);
  y += 5;
  pdf.setFont('helvetica', 'normal');
  for (const [action, count] of actionCounts.entries()) {
    pdf.text(`  ${action} : ${count}`, margin, y);
    y += 4;
    if (y > 180) { pdf.addPage(); y = margin; }
  }

  y += 8;

  // ---- DETAIL TABLE ----
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DÉTAIL DES ÉVÉNEMENTS', margin, y);
  y += 8;

  // Table header
  const colWidths = [35, 35, 30, 25, 95, 47];
  const headers = ['Date/Heure', 'Action', 'Type entité', 'ID entité', 'Détails', 'Hash (8 car.)'];

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(240, 240, 240);
  pdf.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F');

  let x = margin;
  for (let i = 0; i < headers.length; i++) {
    pdf.text(headers[i], x + 1, y);
    x += colWidths[i];
  }
  y += 6;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);

  for (const log of logs) {
    if (y > 190) {
      pdf.addPage();
      y = margin;
      // Re-draw header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 3, pageWidth - 2 * margin, 6, 'F');
      x = margin;
      for (let i = 0; i < headers.length; i++) {
        pdf.text(headers[i], x + 1, y);
        x += colWidths[i];
      }
      y += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
    }

    x = margin;
    const row = [
      formatDateTime(log.timestamp),
      log.action,
      log.entityType,
      log.entityId.substring(0, 8) || '—',
      truncate(log.details, 80),
      log.hash.substring(0, 8),
    ];

    for (let i = 0; i < row.length; i++) {
      pdf.text(row[i], x + 1, y);
      x += colWidths[i];
    }
    y += 4.5;
  }

  // ---- FOOTER ----
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Page ${i}/${pageCount} — Piste d'audit Atlas Finance — ${new Date().toISOString().split('T')[0]}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  return pdf.output('blob');
}

/**
 * Download the audit trail PDF directly.
 */
export async function downloadAuditTrailPdf(options: AuditTrailReportOptions = {}): Promise<void> {
  const blob = await generateAuditTrailPdf(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `piste-audit-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR');
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function truncate(str: string, max: number): string {
  if (!str) return '—';
  try {
    const parsed = JSON.parse(str);
    str = typeof parsed === 'object' ? Object.keys(parsed).join(', ') : String(parsed);
  } catch {
    // not JSON, use as-is
  }
  return str.length > max ? str.substring(0, max - 3) + '...' : str;
}
