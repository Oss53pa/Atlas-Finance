/**
 * Extraction OCR d'un relevé bancaire (image/PDF) → lignes d'opérations.
 *
 * Réutilise l'edge function `ocr-extract` (Claude images+PDF, repli Groq images).
 * NE crée AUCUNE écriture : les lignes alimentent le module Rapprochement, qui
 * les pointe contre les écritures de trésorerie (classe 5) déjà comptabilisées
 * — évite tout doublon d'écriture.
 */
import { supabase } from '../../lib/supabase';
import { extractJSON } from './normalize';
import { fileToBase64 } from './extractInvoice';
import type { OCRConfig } from './types';

export interface BankStatementLineOCR {
  date: string;         // ISO AAAA-MM-JJ
  label: string;
  reference?: string;
  debit: number;        // sortie (décaissement)
  credit: number;       // entrée (encaissement)
}

export interface BankStatementExtraction {
  success: boolean;
  lines: BankStatementLineOCR[];
  provider?: string;
  error?: string;
}

const num = (v: unknown): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d.,-]/g, '').replace(/\s/g, '');
    const normalized = cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
    const n = parseFloat(normalized);
    return Number.isFinite(n) ? Math.abs(n) : 0;
  }
  return 0;
};

const isoDate = (v: unknown): string => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
};

export async function extractBankStatement(
  file: File,
  _config: OCRConfig,
): Promise<BankStatementExtraction> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) {
      return { success: false, lines: [], error: 'OCR relevé indisponible (Supabase non configuré).' };
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, lines: [], error: 'Session expirée — reconnectez-vous pour utiliser l\'OCR.' };
    }

    const { base64, mediaType } = await fileToBase64(file);
    const system =
      `Tu es un moteur d'extraction de relevés bancaires (zone OHADA). Tu renvoies ` +
      `UNIQUEMENT un objet JSON valide, sans texte autour. Montants = nombres positifs ` +
      `(point décimal, pas de symbole). Dates au format AAAA-MM-JJ.`;
    const user =
      `Extrais TOUTES les lignes d'opérations de ce relevé bancaire et renvoie ce JSON exact :\n` +
      `{ "lines": [ { "date": "AAAA-MM-JJ", "label": "", "reference": "", "debit": 0, "credit": 0 } ] }\n` +
      `"debit" = montant au débit du relevé (sortie/décaissement), "credit" = montant au ` +
      `crédit (entrée/encaissement). Renseigne UNE seule des deux colonnes par ligne, ` +
      `l'autre à 0. N'invente aucune ligne ; ignore les lignes de solde/report.`;

    const response = await fetch(`${supabaseUrl}/functions/v1/ocr-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ base64, mediaType, system, user, maxTokens: 8192 }),
    });

    if (!response.ok) {
      let message = '';
      try { message = (await response.json())?.error || ''; } catch { /* texte brut */ }
      if (!message) message = await response.text().catch(() => '') || `Erreur serveur ${response.status}`;
      return { success: false, lines: [], error: message.slice(0, 300) };
    }

    const json = await response.json();
    const raw = extractJSON(json?.content ?? '');
    const arr: unknown[] = Array.isArray((raw as Record<string, unknown>).lines)
      ? (raw as { lines: unknown[] }).lines
      : Array.isArray(raw) ? (raw as unknown[]) : [];

    const lines: BankStatementLineOCR[] = arr
      .map((r) => {
        const o = r as Record<string, unknown>;
        return {
          date: isoDate(o.date ?? o.dateOperation ?? o.value_date),
          label: String(o.label ?? o.libelle ?? o.description ?? '').trim(),
          reference: (o.reference ?? o.ref) ? String(o.reference ?? o.ref).trim() : undefined,
          debit: num(o.debit ?? o.sortie),
          credit: num(o.credit ?? o.entree),
        };
      })
      .filter((l) => l.debit > 0 || l.credit > 0);

    return { success: true, lines, provider: `ocr:${json?.engine || 'serveur'}` };
  } catch (err) {
    return { success: false, lines: [], error: err instanceof Error ? err.message : 'Erreur OCR relevé' };
  }
}
