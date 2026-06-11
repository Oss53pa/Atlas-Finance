/**
 * Provider IA Vision — extraction de factures par modèle multimodal.
 *
 * Deux backends :
 *  - anthropic : Claude via l'edge function `ai-proxy` (la clé reste serveur).
 *                Le proxy transmet `messages` tel quel → on envoie des blocs
 *                image/document (vision native, aucun redéploiement requis).
 *  - ollama    : modèle vision local (llama3.2-vision, llava…) via /api/chat.
 *
 * Backend `auto` : Ollama si VITE_OLLAMA_BASE_URL est défini, sinon Claude
 * dès que Supabase est configuré.
 */
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import type { ExtractionResult, OCRConfig } from '../types';
import { buildExtractedData, extractJSON } from '../normalize';
import { fileToBase64 } from '../extractInvoice';

type ResolvedBackend = 'ollama' | 'anthropic';

function resolveBackend(config: OCRConfig): ResolvedBackend | null {
  const ollamaUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
  if (config.aiVisionBackend === 'ollama') return ollamaUrl ? 'ollama' : null;
  if (config.aiVisionBackend === 'anthropic') return isSupabaseConfigured ? 'anthropic' : null;
  // auto
  if (ollamaUrl) return 'ollama';
  if (isSupabaseConfigured) return 'anthropic';
  return null;
}

function buildPrompt(config: OCRConfig): { system: string; user: string } {
  const langLabel = config.language === 'en' ? 'English' : 'français';
  const system =
    `Tu es un moteur d'extraction de factures comptables (zone OHADA/SYSCOHADA). ` +
    `Tu reçois l'image ou le PDF d'une facture fournisseur et tu renvoies UNIQUEMENT ` +
    `un objet JSON valide, sans texte ni explication autour. Les montants sont des ` +
    `nombres (pas de symbole de devise, point décimal). Les dates au format AAAA-MM-JJ. ` +
    `Si un champ est absent, mets une chaîne vide ou 0. Réponds dans la langue : ${langLabel}.`;
  const user =
    `Extrais les données de cette facture et renvoie ce JSON exact :\n` +
    `{\n` +
    `  "documentType": "invoice|credit_note|receipt|purchase_order",\n` +
    `  "documentNumber": "",\n` +
    `  "documentDate": "AAAA-MM-JJ",\n` +
    `  "dueDate": "AAAA-MM-JJ",\n` +
    `  "supplierName": "",\n` +
    `  "supplierAddress": "",\n` +
    `  "supplierTaxId": "",\n` +
    `  "supplierCountry": "",\n` +
    `  "currency": "${config.defaultCurrency}",\n` +
    `  "subtotal": 0,\n` +
    `  "taxAmount": 0,\n` +
    `  "totalAmount": 0,\n` +
    `  "items": [{ "description": "", "quantity": 1, "unitPrice": 0, "total": 0, "taxRate": ${config.defaultTaxRate} }],\n` +
    `  "_confidence": 0\n` +
    `}\n` +
    `"_confidence" = ta confiance globale d'extraction sur 100.`;
  return { system, user };
}

async function callOllama(
  base64: string,
  mediaType: string,
  config: OCRConfig,
): Promise<ExtractionResult> {
  const baseUrl = String(import.meta.env.VITE_OLLAMA_BASE_URL || '').replace(/\/$/, '');
  if (mediaType === 'application/pdf') {
    return {
      success: false,
      confidence: 0,
      provider: 'ai-vision:ollama',
      error: 'Ollama vision ne lit pas les PDF. Convertissez la facture en image (JPG/PNG).',
    };
  }
  const { system, user } = buildPrompt(config);
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaVisionModel,
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user, images: [base64] },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { success: false, confidence: 0, provider: 'ai-vision:ollama', error: `Ollama ${response.status}: ${text.slice(0, 200)}` };
  }
  const json = await response.json();
  const content: string = json?.message?.content ?? '';
  const raw = extractJSON(content);
  const data = buildExtractedData(raw, config);
  const confidence = Math.min(100, Math.max(0, Math.round(Number(raw._confidence) || 75)));
  return { success: true, data, confidence, rawText: content, provider: 'ai-vision:ollama' };
}

async function callAnthropic(
  base64: string,
  mediaType: string,
  config: OCRConfig,
): Promise<ExtractionResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (!supabaseUrl) {
    return { success: false, confidence: 0, provider: 'ai-vision:serveur', error: 'Supabase non configuré.' };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { success: false, confidence: 0, provider: 'ai-vision:serveur', error: 'Session expirée — reconnectez-vous pour utiliser l\'IA Vision.' };
  }

  // Edge function dédiée `ocr-extract` : le SERVEUR résout le moteur disponible
  // (Claude si une clé Anthropic est configurée — images + PDF — sinon Groq/Llama 4
  // vision — images). La clé ne quitte jamais le serveur ; aucun secret côté client.
  const { system, user } = buildPrompt(config);
  const response = await fetch(`${supabaseUrl}/functions/v1/ocr-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ base64, mediaType, system, user, maxTokens: 2048 }),
  });

  if (!response.ok) {
    let message = '';
    try { message = (await response.json())?.error || ''; } catch { /* texte brut ci-dessous */ }
    if (!message) message = await response.text().catch(() => '') || `Erreur serveur ${response.status}`;
    return { success: false, confidence: 0, provider: 'ai-vision:serveur', error: message.slice(0, 300) };
  }
  const json = await response.json();
  const content: string = json?.content ?? '';
  const engine: string = json?.engine || 'serveur';
  const raw = extractJSON(content);
  const data = buildExtractedData(raw, config);
  const confidence = Math.min(100, Math.max(0, Math.round(Number(raw._confidence) || 80)));
  return { success: true, data, confidence, rawText: content, provider: `ai-vision:${engine}` };
}

export async function extractWithAIVision(file: File, config: OCRConfig): Promise<ExtractionResult> {
  const backend = resolveBackend(config);
  if (!backend) {
    return {
      success: false,
      confidence: 0,
      provider: 'ai-vision',
      error: 'Aucun backend IA disponible (ni Ollama local, ni Claude/Supabase).',
    };
  }
  const { base64, mediaType } = await fileToBase64(file);
  return backend === 'ollama'
    ? callOllama(base64, mediaType, config)
    : callAnthropic(base64, mediaType, config);
}

export async function testAIVision(config: OCRConfig): Promise<{ ok: boolean; message: string }> {
  const backend = resolveBackend(config);
  if (!backend) {
    return { ok: false, message: 'Aucun backend IA disponible (configurez Ollama ou Claude/Supabase).' };
  }
  if (backend === 'ollama') {
    const baseUrl = String(import.meta.env.VITE_OLLAMA_BASE_URL || '').replace(/\/$/, '');
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return { ok: false, message: `Ollama injoignable (${res.status}).` };
      const data = await res.json();
      const target = config.ollamaVisionModel.replace(':latest', '');
      const present = (data.models ?? []).some((m: { name: string }) => m.name.startsWith(target));
      return present
        ? { ok: true, message: `Ollama OK — modèle vision « ${config.ollamaVisionModel} » disponible.` }
        : { ok: false, message: `Ollama joignable mais le modèle « ${config.ollamaVisionModel} » n'est pas installé (ollama pull ${config.ollamaVisionModel}).` };
    } catch {
      return { ok: false, message: 'Ollama injoignable sur ' + baseUrl };
    }
  }
  // serveur (ocr-extract) : Claude si clé Anthropic configurée, sinon Groq/Llama 4 vision.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, message: 'Reconnectez-vous : aucune session Supabase active.' };
  return { ok: true, message: 'Moteur IA Vision serveur (ocr-extract) prêt — Claude (images + PDF) si clé Anthropic configurée, sinon Groq/Llama 4 (images).' };
}
