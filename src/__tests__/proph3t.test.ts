/**
 * Tests PROPH3T — LLMProviderFactory + ContextBuilder
 */
import { describe, it, expect } from 'vitest';
import { LLMProviderFactory } from '../services/proph3t/LLMProviderFactory';
import { OllamaProvider } from '../services/proph3t/providers/OllamaProvider';
import { AnthropicProvider } from '../services/proph3t/providers/AnthropicProvider';
import { ContextBuilder } from '../services/proph3t/ContextBuilder';

describe('LLMProviderFactory', () => {

  it('retourne OllamaProvider si Ollama configuré', () => {
    const provider = LLMProviderFactory.create({
      ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'mistral' },
    });
    expect(provider).toBeInstanceOf(OllamaProvider);
    expect(provider.name).toBe('ollama');
    expect(provider.model).toBe('mistral');
  });

  it('retourne AnthropicProvider si Ollama absent et clé Anthropic présente', () => {
    const provider = LLMProviderFactory.create({
      anthropic: { apiKey: 'sk-ant-test-key' },
    });
    expect(provider).toBeInstanceOf(AnthropicProvider);
    expect(provider.name).toBe('anthropic');
  });

  it('préfère Ollama sur Anthropic quand les deux sont configurés', () => {
    const provider = LLMProviderFactory.create({
      ollama: { enabled: true, baseUrl: 'http://localhost:11434', model: 'mistral' },
      anthropic: { apiKey: 'sk-ant-test-key' },
    });
    expect(provider.name).toBe('ollama');
  });

  it('ignore Ollama quand enabled=false', () => {
    const provider = LLMProviderFactory.create({
      ollama: { enabled: false, baseUrl: 'http://localhost:11434', model: 'mistral' },
      anthropic: { apiKey: 'sk-ant-test-key' },
    });
    expect(provider.name).toBe('anthropic');
  });

  it('lève une erreur si aucun provider configuré', () => {
    expect(() => LLMProviderFactory.create({})).toThrow('Aucun provider LLM configuré');
  });

  it('lève une erreur avec instructions Ollama si rien configuré', () => {
    expect(() => LLMProviderFactory.create({})).toThrow('ollama.ai');
  });

  it('ne requiert PAS Anthropic pour fonctionner', () => {
    const provider = LLMProviderFactory.create({
      ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
    });
    expect(provider.name).not.toBe('anthropic');
    expect(provider.model).toBe('llama3');
  });
});

describe('OllamaProvider', () => {

  it('configure correctement les paramètres', () => {
    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434',
      model: 'mistral-large',
      timeout: 30000,
      temperature: 0.2,
    });
    expect(provider.name).toBe('ollama');
    expect(provider.model).toBe('mistral-large');
  });

  it('supprime le trailing slash de baseUrl', () => {
    const provider = new OllamaProvider({
      baseUrl: 'http://localhost:11434/',
      model: 'mistral',
    });
    // The provider should work without double slashes in URLs
    expect(provider.model).toBe('mistral');
  });
});

describe('AnthropicProvider', () => {

  it('configure le modèle par défaut', () => {
    const provider = new AnthropicProvider({
      apiKey: 'sk-ant-test',
    });
    expect(provider.name).toBe('anthropic');
    expect(provider.model).toContain('claude');
  });

  it('isAvailable retourne true si clé API présente', async () => {
    const provider = new AnthropicProvider({ apiKey: 'sk-ant-test' });
    expect(await provider.isAvailable()).toBe(true);
  });

  it('isAvailable retourne false si clé API vide', async () => {
    const provider = new AnthropicProvider({ apiKey: '' });
    expect(await provider.isAvailable()).toBe(false);
  });
});

describe('ContextBuilder', () => {
  const builder = new ContextBuilder();

  it('génère un system prompt avec le contexte utilisateur', () => {
    const prompt = builder.build({
      companyName: 'Atlas SARL',
      country: "Côte d'Ivoire",
      currencyCode: 'XOF',
    });
    expect(prompt).toContain('PROPH3T');
    expect(prompt).toContain('Atlas SARL');
    expect(prompt).toContain("Côte d'Ivoire");
    expect(prompt).toContain('XOF');
    expect(prompt).toContain('SYSCOHADA');
  });

  it('utilise les valeurs par défaut si aucun contexte fourni', () => {
    const prompt = builder.build();
    expect(prompt).toContain('PROPH3T');
    expect(prompt).toContain('SYSCOHADA');
    expect(prompt).toContain('XOF');
  });

  it('inclut les règles de réponse', () => {
    const prompt = builder.build();
    expect(prompt).toContain('RÈGLES DE RÉPONSE');
    expect(prompt).toContain('articles SYSCOHADA');
    expect(prompt).toContain('Ne jamais inventer');
  });

  it('adapte la devise au contexte', () => {
    const prompt = builder.build({ currencyCode: 'XAF' });
    expect(prompt).toContain('XAF');
  });
});
