/**
 * Point d'entrée de l'extraction OCR — aiguille vers le provider configuré.
 */
import type { ExtractionResult, OCRConfig } from './types';
import { extractWithMindee, testMindee } from './providers/mindeeProvider';
import { extractWithAIVision, testAIVision } from './providers/aiVisionProvider';

export interface FileEncoded {
  /** base64 brut (sans préfixe data:). */
  base64: string;
  /** data: URL complète (avec préfixe) — utilisable directement comme src. */
  dataUrl: string;
  mediaType: string;
}

export function fileToBase64(file: File): Promise<FileEncoded> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(',');
      resolve({
        base64: comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl,
        dataUrl,
        mediaType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export async function extractInvoice(file: File, config: OCRConfig): Promise<ExtractionResult> {
  try {
    if (config.provider === 'mindee') {
      return await extractWithMindee(file, config);
    }
    if (config.provider === 'ai-vision') {
      return await extractWithAIVision(file, config);
    }
    return {
      success: false,
      confidence: 0,
      provider: 'none',
      error: 'Aucun service OCR configuré. Configurez un moteur dans l\'espace Admin.',
    };
  } catch (err) {
    return {
      success: false,
      confidence: 0,
      provider: config.provider,
      error: err instanceof Error ? err.message : 'Erreur OCR inconnue',
    };
  }
}

/** Vérifie que le provider configuré est joignable (pour le bouton « Tester »). */
export async function testOCRProvider(config: OCRConfig): Promise<{ ok: boolean; message: string }> {
  try {
    if (config.provider === 'mindee') return await testMindee(config);
    if (config.provider === 'ai-vision') return await testAIVision(config);
    return { ok: false, message: 'Aucun moteur OCR sélectionné.' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Test échoué' };
  }
}
