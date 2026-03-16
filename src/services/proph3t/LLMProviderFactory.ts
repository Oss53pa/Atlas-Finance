/**
 * LLMProviderFactory — Sélection automatique du provider LLM.
 *
 * Ordre de priorité :
 * 1. Ollama (local, gratuit, aucune clé requise) — PRINCIPAL
 * 2. Anthropic (cloud, clé API requise) — OPTIONNEL
 * 3. OpenAI (cloud, clé API requise) — OPTIONNEL
 *
 * Si aucun provider n'est configuré, lance une erreur explicative.
 */

import type { ILLMProvider } from './providers/ILLMProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';

export interface LLMProviderConfig {
  ollama?: {
    enabled?: boolean;
    baseUrl?: string;
    model?: string;
    timeout?: number;
  };
  anthropic?: {
    apiKey?: string;
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

    // Provider optionnel : Anthropic
    if (config.anthropic?.apiKey) {
      return new AnthropicProvider({
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
      });
    }

    throw new Error(
      '[PROPH3T] Aucun provider LLM configuré.\n' +
      'Option 1 (recommandée) : Installer Ollama → https://ollama.ai\n' +
      '  puis : ollama pull mistral\n' +
      '  puis ajouter dans .env.local : VITE_OLLAMA_BASE_URL=http://localhost:11434\n' +
      'Option 2 : Configurer VITE_ANTHROPIC_API_KEY dans .env.local'
    );
  }

  static createFromEnv(): ILLMProvider | null {
    const ollamaUrl = import.meta.env.VITE_OLLAMA_BASE_URL;
    const ollamaModel = import.meta.env.VITE_OLLAMA_MODEL;
    const anthropicKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

    try {
      return LLMProviderFactory.create({
        ollama: ollamaUrl ? {
          enabled: true,
          baseUrl: ollamaUrl,
          model: ollamaModel || 'mistral',
        } : undefined,
        anthropic: anthropicKey ? {
          apiKey: anthropicKey,
        } : undefined,
      });
    } catch {
      return null;
    }
  }

  static async healthCheck(provider: ILLMProvider): Promise<boolean> {
    try {
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }
}
