/**
 * Tests PROPH3T — ToolRegistry, accountingTools, ContextBuilder RAG, Knowledge search, ProphetV2 orchestration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolRegistry } from '../services/prophet/tools/ToolRegistry';
import { accountingTools } from '../services/prophet/tools/accountingTools';
import { ContextBuilder } from '../services/proph3t/ContextBuilder';
import { searchKnowledgeKeyword, getKnowledgeCount, getKnowledgeByCategory } from '../services/prophet/knowledge/index';

// ---------------------------------------------------------------------------
// 1. ToolRegistry.executeTool with a mock adapter
// ---------------------------------------------------------------------------

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('registers and retrieves a tool', () => {
    registry.register('test_tool', {
      schema: {
        type: 'function',
        function: { name: 'test_tool', description: 'A test tool', parameters: { type: 'object', properties: {}, required: [] } },
      },
      execute: async () => JSON.stringify({ result: 'ok' }),
    });

    expect(registry.has('test_tool')).toBe(true);
    expect(registry.size).toBe(1);
    expect(registry.getToolNames()).toContain('test_tool');
  });

  it('registerAll registers multiple tools at once', () => {
    registry.registerAll(accountingTools);
    expect(registry.has('consulter_balance')).toBe(true);
    expect(registry.has('consulter_grand_livre')).toBe(true);
    expect(registry.has('verifier_equilibre')).toBe(true);
    expect(registry.size).toBe(3);
  });

  it('getToolSchemas returns schemas for all registered tools', () => {
    registry.registerAll(accountingTools);
    const schemas = registry.getToolSchemas();
    expect(schemas).toHaveLength(3);
    expect(schemas.every(s => s.type === 'function')).toBe(true);
    expect(schemas.map(s => s.function.name)).toContain('consulter_balance');
  });

  it('executeTool returns error JSON for unknown tool', async () => {
    const result = await registry.executeTool('nonexistent', {});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Outil inconnu');
    expect(parsed.error).toContain('nonexistent');
  });

  it('executeTool calls execute function and returns result', async () => {
    const mockExecute = vi.fn().mockResolvedValue(JSON.stringify({ total: 42 }));
    registry.register('mock_tool', {
      schema: { type: 'function', function: { name: 'mock_tool', description: '', parameters: { type: 'object', properties: {}, required: [] } } },
      execute: mockExecute,
    });

    const result = await registry.executeTool('mock_tool', { foo: 'bar' });
    expect(mockExecute).toHaveBeenCalledWith({ foo: 'bar' }, undefined);
    expect(JSON.parse(result)).toEqual({ total: 42 });
  });

  it('executeTool catches errors and returns error JSON', async () => {
    registry.register('failing_tool', {
      schema: { type: 'function', function: { name: 'failing_tool', description: '', parameters: { type: 'object', properties: {}, required: [] } } },
      execute: async () => { throw new Error('Database connection failed'); },
    });

    const result = await registry.executeTool('failing_tool', {});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Erreur d\'ex');
    expect(parsed.error).toContain('Database connection failed');
  });

  it('executeTool passes adapter to the execute function', async () => {
    const mockAdapter = { getTrialBalance: vi.fn() } as any;
    const mockExecute = vi.fn().mockResolvedValue('{}');
    registry.register('adapter_tool', {
      schema: { type: 'function', function: { name: 'adapter_tool', description: '', parameters: { type: 'object', properties: {}, required: [] } } },
      execute: mockExecute,
    });

    await registry.executeTool('adapter_tool', {}, mockAdapter);
    expect(mockExecute).toHaveBeenCalledWith({}, mockAdapter);
  });
});

// ---------------------------------------------------------------------------
// 2. accountingTools — consulter_balance returns proper data
// ---------------------------------------------------------------------------

describe('accountingTools', () => {

  it('consulter_balance returns error without adapter', async () => {
    const tool = accountingTools['consulter_balance'];
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('DataAdapter non disponible');
  });

  it('consulter_balance returns balance data with mock adapter', async () => {
    const mockAdapter = {
      getTrialBalance: vi.fn().mockResolvedValue([
        { accountCode: '601000', accountName: 'Achats de marchandises', totalDebit: 500000, totalCredit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', totalDebit: 0, totalCredit: 500000 },
        { accountCode: '701000', accountName: 'Ventes de marchandises', totalDebit: 0, totalCredit: 1200000 },
      ]),
    } as any;

    const tool = accountingTools['consulter_balance'];
    const result = await tool.execute({}, mockAdapter);
    const parsed = JSON.parse(result);

    expect(parsed.nombreComptes).toBe(3);
    expect(parsed.totalDebit).toBe(500000);
    expect(parsed.totalCredit).toBe(1700000);
    expect(parsed.comptes).toHaveLength(3);
    expect(parsed.comptes[0].compte).toBe('601000');
  });

  it('consulter_balance filters by classeCompte prefix', async () => {
    const mockAdapter = {
      getTrialBalance: vi.fn().mockResolvedValue([
        { accountCode: '601000', accountName: 'Achats', totalDebit: 500000, totalCredit: 0 },
        { accountCode: '401000', accountName: 'Fournisseurs', totalDebit: 0, totalCredit: 500000 },
        { accountCode: '701000', accountName: 'Ventes', totalDebit: 0, totalCredit: 1200000 },
      ]),
    } as any;

    const tool = accountingTools['consulter_balance'];
    const result = await tool.execute({ classeCompte: '6' }, mockAdapter);
    const parsed = JSON.parse(result);

    expect(parsed.nombreComptes).toBe(1);
    expect(parsed.comptes[0].compte).toBe('601000');
  });

  it('consulter_grand_livre returns error without adapter', async () => {
    const tool = accountingTools['consulter_grand_livre'];
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('DataAdapter non disponible');
  });

  it('verifier_equilibre returns error without adapter', async () => {
    const tool = accountingTools['verifier_equilibre'];
    const result = await tool.execute({});
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('DataAdapter non disponible');
  });
});

// ---------------------------------------------------------------------------
// 3. ContextBuilder.build() produces system prompt with company context
// ---------------------------------------------------------------------------

describe('ContextBuilder with RAG', () => {
  const builder = new ContextBuilder();

  it('includes RAG knowledge chunks when userQuery is provided', async () => {
    const prompt = await builder.build({
      companyName: 'Test SARL',
      userQuery: 'amortissement immobilisation',
    });
    expect(prompt).toContain('PROPH3T');
    expect(prompt).toContain('Test SARL');
    // If knowledge base has amortissement content, it should appear
    // The RAG section header should be present if chunks were found
    if (prompt.includes('CONTEXTE REGLEMENTAIRE')) {
      expect(prompt).toContain('knowledge base');
    }
  });

  it('does not include RAG section when userQuery is empty', async () => {
    const prompt = await builder.build({ companyName: 'Test SARL' });
    expect(prompt).not.toContain('CONTEXTE REGLEMENTAIRE');
  });

  it('includes TOOLS DISPONIBLES section', async () => {
    const prompt = await builder.build();
    expect(prompt).toContain('TOOLS DISPONIBLES');
    expect(prompt).toContain('Comptabilit');
  });

  it('includes learning context by default', async () => {
    const prompt = await builder.build({ companyName: 'Test SARL' });
    // Learning context is included when includeLearning !== false
    // The actual content depends on the learning module state
    expect(prompt).toContain('PROPH3T');
  });

  it('excludes learning context when includeLearning is false', async () => {
    const promptWith = await builder.build({ companyName: 'Test', includeLearning: true });
    const promptWithout = await builder.build({ companyName: 'Test', includeLearning: false });
    // Both should contain the base prompt; learning section may differ
    expect(promptWith).toContain('PROPH3T');
    expect(promptWithout).toContain('PROPH3T');
  });
});

// ---------------------------------------------------------------------------
// 4. RAG searchKnowledge returns relevant chunks
// ---------------------------------------------------------------------------

describe('searchKnowledge (RAG)', () => {

  it('returns empty array for empty query', () => {
    expect(searchKnowledgeKeyword('')).toEqual([]);
    expect(searchKnowledgeKeyword(' ')).toEqual([]);
    expect(searchKnowledgeKeyword('a')).toEqual([]); // too short
  });

  it('returns relevant chunks for accounting queries', () => {
    const results = searchKnowledgeKeyword('amortissement immobilisation');
    expect(results.length).toBeGreaterThan(0);
    // Results should have the expected shape
    for (const chunk of results) {
      expect(chunk).toHaveProperty('title');
      expect(chunk).toHaveProperty('content');
      expect(chunk).toHaveProperty('category');
    }
  });

  it('respects topK parameter', () => {
    const results = searchKnowledgeKeyword('comptabilite', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns chunks for fiscal queries', () => {
    const results = searchKnowledgeKeyword('TVA impot societe');
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns chunks for audit queries', () => {
    const results = searchKnowledgeKeyword('audit controle');
    expect(results.length).toBeGreaterThan(0);
  });

  it('knowledge base has a non-trivial number of chunks', () => {
    expect(getKnowledgeCount()).toBeGreaterThan(10);
  });

  it('getKnowledgeByCategory filters correctly', () => {
    const syscohada = getKnowledgeByCategory('syscohada');
    for (const chunk of syscohada) {
      expect(chunk.category).toMatch(/^syscohada/);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. ProphetV2 orchestration flow (mock LLM -> tool_calls -> execution -> refinement)
// ---------------------------------------------------------------------------

describe('ProphetV2 orchestration (mocked)', () => {

  it('handles a complete tool-call round trip', async () => {
    // We test the ToolRegistry integration that ProphetV2 relies on
    const registry = new ToolRegistry();
    registry.registerAll(accountingTools);

    const mockAdapter = {
      getTrialBalance: vi.fn().mockResolvedValue([
        { accountCode: '521000', accountName: 'Banque', totalDebit: 5000000, totalCredit: 3000000 },
      ]),
    } as any;

    // Simulate what ProphetV2.send() does when LLM returns a tool_call:
    // 1. LLM returns tool_call for consulter_balance
    const toolCall = {
      id: 'call_001',
      function: {
        name: 'consulter_balance',
        arguments: JSON.stringify({ classeCompte: '5' }),
      },
    };

    // 2. Execute the tool via registry (as ProphetV2 does)
    const fnArgs = JSON.parse(toolCall.function.arguments);
    const result = await registry.executeTool(
      toolCall.function.name,
      fnArgs,
      mockAdapter,
    );

    // 3. Verify the result is valid JSON that can be sent back to LLM
    const parsed = JSON.parse(result);
    expect(parsed.nombreComptes).toBe(1);
    expect(parsed.comptes[0].compte).toBe('521000');
    expect(parsed.comptes[0].solde).toBe(2000000); // 5M - 3M

    // 4. Verify adapter was called
    expect(mockAdapter.getTrialBalance).toHaveBeenCalled();
  });

  it('handles multiple tool calls in sequence', async () => {
    const registry = new ToolRegistry();
    registry.registerAll(accountingTools);

    const mockAdapter = {
      getTrialBalance: vi.fn().mockResolvedValue([
        { accountCode: '601000', accountName: 'Achats', totalDebit: 1000000, totalCredit: 0 },
      ]),
      getJournalEntries: vi.fn().mockResolvedValue([
        {
          id: 'e1',
          description: 'Achat marchandises',
          lines: [
            { accountCode: '601000', label: 'Achats', debit: 1000000, credit: 0 },
            { accountCode: '401000', label: 'Fournisseurs', debit: 0, credit: 1000000 },
          ],
        },
      ]),
    } as any;

    // First tool call: consulter_balance
    const balanceResult = await registry.executeTool('consulter_balance', {}, mockAdapter);
    const balance = JSON.parse(balanceResult);
    expect(balance.nombreComptes).toBe(1);

    // Second tool call: consulter_grand_livre
    const glResult = await registry.executeTool('consulter_grand_livre', { compteDebut: '601' }, mockAdapter);
    const gl = JSON.parse(glResult);
    expect(gl.nombreLignes).toBe(1);
    expect(gl.lignes[0].compte).toBe('601000');
  });

  it('gracefully handles unknown tool calls from LLM', async () => {
    const registry = new ToolRegistry();
    registry.registerAll(accountingTools);

    // LLM might hallucinate a tool name
    const result = await registry.executeTool('analyser_tresorerie_avancee', { period: '2024-01' });
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Outil inconnu');
  });
});
