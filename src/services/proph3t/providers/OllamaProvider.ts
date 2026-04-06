/**
 * OllamaProvider — Provider LLM principal pour PROPH3T.
 *
 * Ollama tourne en local (http://localhost:11434), gratuit, sans clé API.
 * Supporte le tool calling depuis v0.3+ (format OpenAI compatible).
 *
 * Installation : https://ollama.ai
 * Modèle recommandé : ollama pull mistral-large
 */

import type { ILLMProvider, LLMRequest, LLMResponse, LLMTool } from './ILLMProvider';

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout?: number;
  temperature?: number;
}

export class OllamaProvider implements ILLMProvider {
  readonly name = 'ollama' as const;
  readonly model: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly temperature: number;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.model = config.model;
    this.timeout = config.timeout ?? 60_000;
    this.temperature = config.temperature ?? 0.1;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.models?.some((m: { name: string }) =>
        m.name.startsWith(this.model.replace(':latest', ''))
      ) ?? false;
    } catch (err) { /* silent */
      return false;
    }
  }

  async complete(request: LLMRequest, tools?: LLMTool[]): Promise<LLMResponse> {
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: this.model,
      stream: false,
      options: { temperature: request.temperature ?? this.temperature },
      messages: [
        { role: 'system', content: request.systemPrompt },
        ...request.messages.map(m => ({ role: m.role, content: m.content })),
      ],
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[Ollama] ${response.status}: ${err}`);
    }

    const data = await response.json();

    return {
      content: data.message?.content ?? '',
      toolCalls: data.message?.tool_calls?.map((tc: { function: { name: string; arguments: string | Record<string, unknown> } }) => ({
        id: crypto.randomUUID(),
        function: {
          name: tc.function.name,
          arguments: typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        },
      })),
      tokensUsed: data.eval_count ?? 0,
      provider: 'ollama',
      model: this.model,
      latencyMs: Date.now() - start,
    };
  }
}
