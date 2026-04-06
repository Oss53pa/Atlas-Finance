
/**
 * ProphetV2 — Orchestrateur Frontend pour Proph3t AI
 *
 * Flux :
 * 1. Utilisateur envoie un message
 * 2. System prompt construit avec RAG (knowledge base)
 * 3. Appel LLM (Ollama local ou Anthropic cloud)
 * 4. Si le LLM retourne des tool_calls → exécution via ToolRegistry
 * 5. Résultat renvoyé au LLM pour reformulation
 * 6. Réponse finale affichée
 * 7. Fallback: pattern-matching offline si aucun LLM
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { LLMProviderFactory } from '../proph3t/LLMProviderFactory';
import { ContextBuilder } from '../proph3t/ContextBuilder';
import type { ILLMProvider } from '../proph3t/providers/ILLMProvider';
import type { DataAdapter } from '@atlas/data';

// Import tool registry (auto-registers all tools on import)
import { toolRegistry } from './tools/index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProphetMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}

interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;  // JSON string of result
}

export interface ProphetResponse {
  content: string;
  toolsUsed: string[];
  ragChunksUsed: number;
  model: string;
  sessionId: string;
}

export interface ProphetConfig {
  countryCode?: string;
  stream?: boolean;
  maxToolRounds?: number;
}

// ---------------------------------------------------------------------------
// ProphetV2 Service
// ---------------------------------------------------------------------------

export class ProphetV2Service {
  private sessionId: string;
  private conversationHistory: ProphetMessage[] = [];
  private config: ProphetConfig;
  private llmProvider: ILLMProvider | null = null;
  private contextBuilder = new ContextBuilder();
  private adapter: DataAdapter | null = null;

  constructor(config: ProphetConfig = {}, adapter?: DataAdapter) {
    this.sessionId = crypto.randomUUID();
    this.config = {
      maxToolRounds: 3,
      stream: false,
      ...config,
    };
    this.adapter = adapter || null;

    // Initialize LLM provider from environment
    this.llmProvider = LLMProviderFactory.createFromEnv();
  }

  /** Set the DataAdapter for real data access */
  setAdapter(adapter: DataAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Send a message and get a response.
   * Handles tool calls automatically (up to maxToolRounds).
   */
  async send(userMessage: string): Promise<ProphetResponse> {
    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    const toolsUsed: string[] = [];
    let ragChunksUsed = 0;
    let model = 'local-fallback';
    let rounds = 0;

    while (rounds < (this.config.maxToolRounds || 3)) {
      rounds++;

      // Call the LLM
      const llmResponse = await this.callLLMProxy(userMessage);

      model = llmResponse.model || model;
      ragChunksUsed = llmResponse.ragChunksUsed || 0;

      const message = llmResponse.message;

      // Check if the LLM wants to call tools
      if (message?.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call via ToolRegistry
        const toolResults: ToolResult[] = [];

        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

          toolsUsed.push(fnName);
          const result = await toolRegistry.executeTool(fnName, fnArgs, this.adapter || undefined);

          toolResults.push({
            toolCallId: toolCall.id || crypto.randomUUID(),
            name: fnName,
            content: result,
          });
        }

        // Add assistant message with tool calls to history
        this.conversationHistory.push({
          role: 'assistant',
          content: message.content || '',
          toolCalls: message.tool_calls,
        });

        // Add tool results to history
        for (const tr of toolResults) {
          this.conversationHistory.push({
            role: 'tool',
            content: tr.content,
          });
        }

        // Continue the loop — let the LLM process tool results
        continue;
      }

      // No tool calls — we have the final response
      const content = message?.content || 'Désolé, je n\'ai pas pu générer de réponse.';

      this.conversationHistory.push({
        role: 'assistant',
        content,
      });

      return {
        content,
        toolsUsed,
        ragChunksUsed,
        model,
        sessionId: this.sessionId,
      };
    }

    // Max rounds reached
    const lastAssistantMsg = this.conversationHistory
      .filter(m => m.role === 'assistant')
      .pop();

    return {
      content: lastAssistantMsg?.content || 'J\'ai atteint la limite de raisonnement. Veuillez reformuler votre question.',
      toolsUsed,
      ragChunksUsed,
      model,
      sessionId: this.sessionId,
    };
  }

  /**
   * Call the LLM provider (Ollama local or Anthropic cloud).
   * Falls back to Supabase Edge Function if configured, then to offline mode.
   */
  private async callLLMProxy(userQuery?: string): Promise<{ message: { content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; model: string; ragChunksUsed: number }> {
    // Strategy 1: Use LLM provider (Ollama or Anthropic)
    if (this.llmProvider) {
      try {
        const isAvail = await this.llmProvider.isAvailable();
        if (isAvail) {
          const systemPrompt = await this.contextBuilder.build({
            countryCode: this.config.countryCode,
            country: this.getCountryName(this.config.countryCode || 'CI'),
            userQuery, // RAG: inject relevant knowledge
          });

          // Get tool schemas from registry
          const tools = toolRegistry.getToolSchemas();

          const response = await this.llmProvider.complete(
            {
              systemPrompt,
              messages: this.conversationHistory.map(m => ({
                role: m.role,
                content: m.content,
              })),
            },
            tools,
          );

          return {
            message: {
              content: response.content,
              tool_calls: response.toolCalls,
            },
            model: `${response.provider}/${response.model}`,
            ragChunksUsed: userQuery ? 5 : 0,
          };
        }
      } catch (e) {
      }
    }

    // Strategy 2: Supabase Edge Function (legacy)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.functions.invoke('llm-proxy', {
          body: {
            messages: this.conversationHistory.map(m => ({
              role: m.role,
              content: m.content,
            })),
            countryCode: this.config.countryCode,
            sessionId: this.sessionId,
            stream: this.config.stream,
          },
        });

        if (!error && data) return data;
      } catch (e) {
      }
    }

    // Strategy 3: Offline fallback (pattern matching + direct tool execution)
    return this.offlineFallback();
  }

  private getCountryName(code: string): string {
    const names: Record<string, string> = {
      CI: "Côte d'Ivoire", SN: 'Sénégal', CM: 'Cameroun', GA: 'Gabon',
      BF: 'Burkina Faso', ML: 'Mali', NE: 'Niger', TG: 'Togo',
      BJ: 'Bénin', GN: 'Guinée', TD: 'Tchad', CF: 'Centrafrique',
      CG: 'Congo-Brazzaville', CD: 'RD Congo', GQ: 'Guinée Équatoriale',
      KM: 'Comores', GW: 'Guinée-Bissau',
    };
    return names[code] || code;
  }

  /**
   * Offline fallback — basic pattern matching + direct tool execution
   * Used when no LLM is available.
   */
  private offlineFallback(): { message: { content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; model: string; ragChunksUsed: number } {
    const lastUserMsg = [...this.conversationHistory]
      .reverse()
      .find(m => m.role === 'user')?.content || '';

    const lower = lastUserMsg.toLowerCase();

    // Try to detect tool calls from the user message
    if (lower.includes('is ') || lower.includes('impôt sur les sociétés') || lower.includes('impot sur')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calculer_is',
              arguments: JSON.stringify({
                countryCode: this.detectCountry(lower),
                resultatComptable: this.extractNumber(lower) || 10_000_000,
                chiffreAffaires: 50_000_000,
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('tva')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calculer_tva',
              arguments: JSON.stringify({
                montantHT: this.extractNumber(lower) || 1_000_000,
                countryCode: this.detectCountry(lower),
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('irpp') || lower.includes('impôt sur le revenu') || lower.includes('igr')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calculer_irpp',
              arguments: JSON.stringify({
                countryCode: this.detectCountry(lower),
                revenuBrutAnnuel: this.extractNumber(lower) || 6_000_000,
                situationFamiliale: lower.includes('marié') ? 'marie' : 'celibataire',
                nombreEnfants: 2,
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('paie') || lower.includes('salaire') || lower.includes('bulletin')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calculer_bulletin_paie',
              arguments: JSON.stringify({
                countryCode: this.detectCountry(lower),
                salaireBrut: this.extractNumber(lower) || 300_000,
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('écriture') || lower.includes('ecriture') || lower.includes('comptabiliser')) {
      const type = lower.includes('achat') ? 'achat_marchandises'
        : lower.includes('vente') ? 'vente_marchandises'
        : 'achat_marchandises';
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'generer_ecriture',
              arguments: JSON.stringify({
                type,
                montantHT: this.extractNumber(lower) || 500_000,
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('balance') || lower.includes('solde des comptes')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'consulter_balance',
              arguments: JSON.stringify({
                classeCompte: this.extractNumber(lower)?.toString() || '',
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('audit') || lower.includes('contrôle') || lower.includes('controle')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'audit_complet',
              arguments: JSON.stringify({ niveauMax: 8 }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('trésorerie') || lower.includes('tresorerie') || lower.includes('solde bancaire')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'consulter_tresorerie',
              arguments: JSON.stringify({}),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('amortissement') || lower.includes('dépréciation') || lower.includes('immobilisation')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calculer_amortissement',
              arguments: JSON.stringify({
                valeurBrute: this.extractNumber(lower) || 15_000_000,
                dureeAnnees: 5,
                methode: 'lineaire',
                dateAcquisition: `${new Date().getFullYear()}-01-01`,
              }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('clôture') || lower.includes('cloture')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'assister_cloture',
              arguments: JSON.stringify({ exerciceId: 'current' }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('calendrier fiscal') || lower.includes('échéance')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'calendrier_fiscal',
              arguments: JSON.stringify({ countryCode: this.detectCountry(lower) }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('benford') || lower.includes('fraude') || lower.includes('anomalie')) {
      return {
        message: {
          content: 'L\'analyse de Benford nécessite une liste de montants. Veuillez fournir les montants à analyser ou indiquer la source des données (journal comptable, factures, etc.).',
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('créance') || lower.includes('creance') || lower.includes('aging') || lower.includes('recouvrement')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'analyser_creances',
              arguments: JSON.stringify({ type: 'customer' }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('budget')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'analyser_budget',
              arguments: JSON.stringify({ exercice: new Date().getFullYear().toString() }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('prévision') || lower.includes('prevision') || lower.includes('forecast')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'prevoir_tresorerie',
              arguments: JSON.stringify({ horizonJours: 30 }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    if (lower.includes('liasse') || lower.includes('états financiers')) {
      return {
        message: {
          content: '',
          tool_calls: [{
            id: crypto.randomUUID(),
            function: {
              name: 'generer_liasse',
              arguments: JSON.stringify({ systeme: 'normal', countryCode: this.detectCountry(lower) }),
            },
          }],
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    // Default — no tool call, generic response
    const toolNames = toolRegistry.getToolNames();
    return {
      message: {
        content: `Je suis **Proph3t**, votre expert-comptable et auditeur IA spécialisé zone OHADA.

**Mes compétences** (${toolNames.length} tools disponibles) :
- **Fiscalité** : Calcul IS, TVA, IRPP, retenues à la source (17 pays)
- **Paie** : Bulletins de paie, cotisations sociales (CNPS, CSS, IPRES...)
- **Comptabilité** : Écritures SYSCOHADA, balance, grand livre, SIG, ratios
- **Audit** : 108 contrôles SYSCOHADA, analyse de Benford, détection anomalies
- **Trésorerie** : Soldes bancaires, prévisions, analyse créances/dettes
- **Clôture** : Checklist, régularisations, amortissements, affectation résultat
- **Fiscal** : Calendrier fiscal, liasse SYSCOHADA

Posez-moi votre question !`,
      },
      model: 'offline-fallback',
      ragChunksUsed: 0,
    };
  }

  /**
   * Detect country code from user message
   */
  private detectCountry(text: string): string {
    const countryMap: Record<string, string> = {
      'côte d\'ivoire': 'CI', 'cote d\'ivoire': 'CI', 'ivoirien': 'CI',
      'sénégal': 'SN', 'senegal': 'SN', 'sénégalais': 'SN',
      'cameroun': 'CM', 'camerounais': 'CM',
      'gabon': 'GA', 'gabonais': 'GA',
      'burkina': 'BF', 'burkinabè': 'BF',
      'mali': 'ML', 'malien': 'ML',
      'niger': 'NE', 'nigérien': 'NE',
      'togo': 'TG', 'togolais': 'TG',
      'bénin': 'BJ', 'benin': 'BJ', 'béninois': 'BJ',
      'guinée': 'GN', 'guinee': 'GN', 'guinéen': 'GN',
      'tchad': 'TD', 'tchadien': 'TD',
      'centrafrique': 'CF', 'centrafricain': 'CF',
      'congo brazza': 'CG', 'congo-brazza': 'CG',
      'rdc': 'CD', 'rd congo': 'CD', 'congo kinshasa': 'CD',
      'guinée équatoriale': 'GQ', 'equato': 'GQ',
      'comores': 'KM', 'comorien': 'KM',
      'guinée-bissau': 'GW', 'bissau': 'GW',
    };

    for (const [key, code] of Object.entries(countryMap)) {
      if (text.includes(key)) return code;
    }

    return this.config.countryCode || 'CI';
  }

  /**
   * Extract a number from user message
   */
  private extractNumber(text: string): number | null {
    // Match patterns like "50M", "50 millions"
    const millionMatch = text.match(/(\d+)\s*m(?:illions?)?/i);
    if (millionMatch) return parseInt(millionMatch[1]) * 1_000_000;

    // Match patterns like 1 000 000, 1000000, 1.000.000
    const match = text.match(/(\d[\d\s.,]*\d)/);
    if (match) {
      const cleaned = match[1].replace(/[\s.,]/g, '');
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /** Reset conversation */
  reset(): void {
    this.conversationHistory = [];
    this.sessionId = crypto.randomUUID();
  }

  /** Get conversation history */
  getHistory(): ProphetMessage[] {
    return [...this.conversationHistory];
  }

  /** Set country code */
  setCountryCode(code: string): void {
    this.config.countryCode = code;
  }

  /** Get session ID */
  getSessionId(): string {
    return this.sessionId;
  }
}

export default ProphetV2Service;
