/**
 * AnthropicProvider — Provider LLM cloud optionnel pour PROPH3T.
 *
 * Utilisé uniquement si Ollama est indisponible ET qu'une clé Anthropic
 * est configurée dans les variables d'environnement.
 *
 * Appel via l'API REST directe (pas de SDK nécessaire côté frontend).
 */

import type { ILLMProvider, LLMRequest, LLMResponse, LLMTool, LLMToolCall } from './ILLMProvider';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic' as const;
  readonly model: string;
  private readonly apiKey: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens ?? 1024;
    this.temperature = config.temperature ?? 0.1;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async complete(request: LLMRequest, tools?: LLMTool[]): Promise<LLMResponse> {
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.maxTokens,
      temperature: request.temperature ?? this.temperature,
      system: request.systemPrompt,
      messages: request.messages.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.content,
      })),
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`[Anthropic] ${response.status}: ${err}`);
    }

    const data = await response.json();

    // Extract text content and tool calls
    let content = '';
    const toolCalls: LLMToolCall[] = [];

    for (const block of data.content ?? []) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      tokensUsed: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      provider: 'anthropic',
      model: this.model,
      latencyMs: Date.now() - start,
    };
  }
}
