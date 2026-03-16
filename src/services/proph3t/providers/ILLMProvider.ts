/**
 * Interface commune pour tous les providers LLM de PROPH3T.
 * Chaque provider (Ollama, Anthropic, OpenAI) implémente cette interface.
 */

export interface LLMRequest {
  systemPrompt: string;
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: LLMToolCall[];
  tokensUsed: number;
  provider: string;
  model: string;
  latencyMs: number;
}

export interface ILLMProvider {
  readonly name: 'ollama' | 'anthropic' | 'openai' | 'mistral';
  readonly model: string;

  isAvailable(): Promise<boolean>;

  complete(request: LLMRequest, tools?: LLMTool[]): Promise<LLMResponse>;
}
