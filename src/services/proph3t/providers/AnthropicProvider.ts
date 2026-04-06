/**
 * AnthropicProvider — Provider LLM cloud optionnel pour PROPH3T.
 *
 * Utilisé uniquement si Ollama est indisponible ET que le provider
 * Anthropic est activé dans la configuration.
 *
 * Appel via le Supabase Edge Function ai-proxy (la clé API reste côté serveur).
 */

import type { ILLMProvider, LLMRequest, LLMResponse, LLMTool, LLMToolCall } from './ILLMProvider';
import { supabase } from '../../../lib/supabase';

export interface AnthropicConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic' as const;
  readonly model: string;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(config: AnthropicConfig) {
    this.model = config.model ?? 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens ?? 1024;
    this.temperature = config.temperature ?? 0.1;
  }

  async isAvailable(): Promise<boolean> {
    return !!supabaseUrl;
  }

  async complete(request: LLMRequest, tools?: LLMTool[]): Promise<LLMResponse> {
    const start = Date.now();

    // Get current Supabase auth session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('[Anthropic] No active Supabase session — user must be logged in.');
    }

    const messages = request.messages.map(m => ({
      role: m.role === 'tool' ? 'user' : m.role,
      content: m.content,
    }));

    const proxyBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.maxTokens,
      temperature: request.temperature ?? this.temperature,
      system: request.systemPrompt,
      messages,
    };

    if (tools && tools.length > 0) {
      proxyBody.tools = tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(proxyBody),
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
