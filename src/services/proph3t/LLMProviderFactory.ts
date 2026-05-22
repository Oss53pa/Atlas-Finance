/**
 * LLMProviderFactory — Sélection automatique du provider LLM.
 *
 * Ordre de priorité :
 * 1. Ollama (local, gratuit, aucune clé requise) — PRINCIPAL
 * 2. Anthropic (cloud, clé API requise) — OPTIONNEL
 *
 * Si aucun provider n'est configuré, lance une erreur explicative.
 */

import type { ILLMProvider } from './providers/ILLMProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { isSupabaseConfigured } from '../../lib/supabase';

export interface LLMProviderConfig {
  ollama?: {
    enabled?: boolean;
    baseUrl?: string;
    model?: string;
    timeout?: number;
  };
  anthropic?: {
    enabled?: boolean;
    model?: string;
  };
}

export class LLMProviderFactory {

  static create(config: LLMProviderConfig): ILLMProvider {

    // Provider principal : Ollama local
    if (config.ollama?.enabled !== false && config.ollama?.baseUrl) {
      return new OllamaProvider({
        baseUrl: config.ollama.baseUrl,
        model: config.ollama.model ?? 'mistral',
        timeout: config.ollama.timeout ?? 60_000,
        temperature: 0.1,
      });
    }

    // Provider optionnel : Anthropic (via Supabase Edge Function proxy)
    if (config.anthropic?.enabled) {
      return new AnthropicProvider({
        model: config.anthropic.model,
      });
    }

    throw new Error(
      '[PROPH3T] Aucun provider LLM configuré.\n' +
      'Option 1 (recommandée) : Installer Ollama → https://ollama.ai\n' +
      '  puis : ollama pull mistral\n' +
      '  puis ajouter dans .env.local : VITE_OLLAMA_BASE_URL=http://localhost:11434\n' +
      'Option 2 : Activer Anthropic via VITE_ANTHROPIC_ENABLED=true dans .env.local\n' +
      '  (la clé API doit être configurée côté serveur dans Supabase Secrets)'
    );
  }

  static createFromEnv(): ILLMProvider | null {
    const ollamaUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL;
    const anthropicFlag = import.meta.env.VITE_ANTHROPIC_ENABLED;
    const anthropicModel = import.meta.env.VITE_ANTHROPIC_MODEL;

    // Bascule automatique selon l'environnement :
    //  - Dev local : Ollama prioritaire dès que VITE_OLLAMA_BASE_URL est défini.
    //  - SaaS / prod : Anthropic Claude (via l'edge function ai-proxy) activé par
    //    DÉFAUT dès que Supabase est configuré — plus besoin d'un flag manuel.
    //    Surcharge possible : VITE_ANTHROPIC_ENABLED='false' désactive, ='true'
    //    force l'activation même hors Supabase.
    const anthropicEnabled =
      anthropicFlag === 'false' ? false
      : anthropicFlag === 'true' ? true
      : isSupabaseConfigured;

    try {
      return LLMProviderFactory.create({
        ollama: ollamaUrl ? {
          enabled: true,
          baseUrl: ollamaUrl,
          model: ollamaModel || 'mistral',
        } : undefined,
        anthropic: anthropicEnabled ? {
          enabled: true,
          model: anthropicModel || undefined,
        } : undefined,
      });
    } catch (err) { /* silent */
      return null;
    }
  }

  static async healthCheck(provider: ILLMProvider): Promise<boolean> {
    try {
      return await provider.isAvailable();
    } catch (err) { /* silent */
      return false;
    }
  }
}
