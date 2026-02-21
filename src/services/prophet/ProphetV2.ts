/**
 * ProphetV2 — Orchestrateur Frontend pour Proph3t AI
 *
 * Flux :
 * 1. Utilisateur envoie un message
 * 2. Appel Edge Function llm-proxy (avec RAG + system prompt)
 * 3. Si le LLM retourne des tool_calls → exécution locale des services TypeScript
 * 4. Résultat renvoyé au LLM pour reformulation
 * 5. Réponse finale affichée
 */
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Local calculation services
import { calculateIS } from '../../utils/isCalculation';
import { calculerTVAPays, calculerTVACameroun, TVAValidator } from '../../utils/tvaValidation';
import { calculateIRPP } from '../../utils/irppCalculation';
import { calculerBulletinPaie } from '../../utils/paieCalculation';
import { genererEcriture, validerEcriture } from '../../utils/ecritureGenerator';
import { analyserBenford, genererRapportBenford } from '../../utils/benfordAnalysis';
import { calculerRetenue } from '../../utils/retenueSourceCalc';
import { calculerSIG, calculerRatios, calculerCAF, calculerFRBFR, calculerSeuilRentabilite } from '../../utils/ratiosFinanciers';

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
// Tool execution (local TypeScript services)
// ---------------------------------------------------------------------------

function executeToolCall(name: string, args: Record<string, unknown>): string {
  try {
    switch (name) {
      case 'calculer_is': {
        const result = calculateIS({
          countryCode: args.countryCode,
          resultatComptable: args.resultatComptable,
          reintegrations: args.reintegrations || 0,
          deductions: args.deductions || 0,
          deficitsAnterieurs: args.deficitsAnterieurs || 0,
          chiffreAffaires: args.chiffreAffaires,
          acomptesVerses: args.acomptesVerses || 0,
        });
        return JSON.stringify({
          resultatFiscal: result.resultatFiscal.toNumber(),
          tauxIS: result.tauxIS,
          impotBrut: result.impotBrut.toNumber(),
          minimumIS: result.minimumIS.toNumber(),
          impotDu: result.impotDu.toNumber(),
          acomptesVerses: result.acomptesVerses.toNumber(),
          impotNet: result.impotNet.toNumber(),
          acomptesTrimestriels: result.acomptesTrimestriels.toNumber(),
        });
      }

      case 'calculer_tva': {
        if (args.countryCode === 'CM') {
          const result = calculerTVACameroun(args.montantHT);
          return JSON.stringify({ ...result, montantHT: args.montantHT, montantTTC: args.montantHT + result.total });
        }
        const montantTVA = calculerTVAPays(args.montantHT, args.countryCode, args.tauxReduit);
        const montantTTC = TVAValidator.calculerTTC(args.montantHT, montantTVA / args.montantHT * 100);
        return JSON.stringify({ montantHT: args.montantHT, montantTVA, montantTTC });
      }

      case 'calculer_irpp': {
        const result = calculateIRPP({
          countryCode: args.countryCode,
          revenuBrutAnnuel: args.revenuBrutAnnuel,
          situationFamiliale: args.situationFamiliale,
          nombreEnfants: args.nombreEnfants,
        });
        return JSON.stringify({
          revenuBrut: result.revenuBrut.toNumber(),
          abattement: result.abattement.toNumber(),
          revenuNet: result.revenuNet.toNumber(),
          nombreParts: result.nombreParts,
          impotBrut: result.impotBrut.toNumber(),
          cac: result.cac.toNumber(),
          impotNet: result.impotNet.toNumber(),
          tauxEffectif: result.tauxEffectif,
          detailTranches: result.detailTranches,
        });
      }

      case 'calculer_bulletin_paie': {
        const result = calculerBulletinPaie({
          countryCode: args.countryCode,
          salaireBrut: args.salaireBrut,
          primes: args.primes,
          estCadre: args.estCadre,
        });
        return JSON.stringify({
          salaireBrut: result.salaireBrut.toNumber(),
          salaireImposable: result.salaireImposable.toNumber(),
          cotisations: result.cotisations,
          totalCotisationsEmployeur: result.totalCotisationsEmployeur.toNumber(),
          totalCotisationsSalarie: result.totalCotisationsSalarie.toNumber(),
          salaireNet: result.salaireNet.toNumber(),
          netAPayer: result.netAPayer.toNumber(),
        });
      }

      case 'generer_ecriture': {
        const ecriture = genererEcriture(args.type, {
          montantHT: args.montantHT,
          montantTVA: args.montantTVA,
          montantTTC: args.montantTVA ? args.montantHT + args.montantTVA : undefined,
          tiers: args.tiers,
        });
        const validation = validerEcriture(ecriture);
        return JSON.stringify({ ecriture, equilibree: validation.valide, ecart: validation.ecart });
      }

      case 'analyser_benford': {
        const result = analyserBenford(args.montants);
        const rapport = genererRapportBenford(result);
        return JSON.stringify({ ...result, rapport });
      }

      case 'calculer_retenue_source': {
        const result = calculerRetenue({
          countryCode: args.countryCode,
          typeRevenu: args.typeRevenu,
          montantBrut: args.montantBrut,
        });
        return JSON.stringify({
          montantBrut: result.montantBrut.toNumber(),
          taux: result.taux,
          montantRetenue: result.montantRetenue.toNumber(),
          montantNet: result.montantNet.toNumber(),
          libelle: result.libelle,
        });
      }

      case 'calculer_ratios': {
        // Simplified — in production, the LLM would provide all parameters
        const sigInput = {
          ventesMarchandises: args.ventesMarchandises || 0,
          achatsMarchandises: args.achatsMarchandises || 0,
          variationStockMarchandises: 0,
          productionVendue: 0,
          productionStockee: 0,
          productionImmobilisee: 0,
          achatsMatieresApprovisionnements: 0,
          variationStockMatieres: 0,
          autresAchatsChargesExternes: 0,
          autresProduits: 0,
          autresCharges: 0,
          impotsTaxes: 0,
          chargesPersonnel: args.chargesPersonnel || 0,
          dotationsAmortissements: args.dotationsAmortissements || 0,
          reprisesProvisions: 0,
          produitsFinanciers: 0,
          chargesFinancieres: 0,
          produitsHAO: 0,
          chargesHAO: 0,
          impotsSurResultat: 0,
        };
        const sig = calculerSIG(sigInput);
        return JSON.stringify({
          margeCommerciale: sig.margeCommerciale.toNumber(),
          valeurAjoutee: sig.valeurAjoutee.toNumber(),
          ebe: sig.excedentBrutExploitation.toNumber(),
          resultatExploitation: sig.resultatExploitation.toNumber(),
          resultatNet: sig.resultatNet.toNumber(),
        });
      }

      default:
        return JSON.stringify({ error: `Outil inconnu: ${name}` });
    }
  } catch (error) {
    return JSON.stringify({
      error: `Erreur d'exécution ${name}: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// ---------------------------------------------------------------------------
// ProphetV2 Service
// ---------------------------------------------------------------------------

export class ProphetV2Service {
  private sessionId: string;
  private conversationHistory: ProphetMessage[] = [];
  private config: ProphetConfig;

  constructor(config: ProphetConfig = {}) {
    this.sessionId = crypto.randomUUID();
    this.config = {
      maxToolRounds: 3,
      stream: false,
      ...config,
    };
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

      // Call the Edge Function
      const llmResponse = await this.callLLMProxy();

      model = llmResponse.model || model;
      ragChunksUsed = llmResponse.ragChunksUsed || 0;

      const message = llmResponse.message;

      // Check if the LLM wants to call tools
      if (message?.tool_calls && message.tool_calls.length > 0) {
        // Execute each tool call locally
        const toolResults: ToolResult[] = [];

        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;

          toolsUsed.push(fnName);
          const result = executeToolCall(fnName, fnArgs);

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
   * Call the Supabase Edge Function llm-proxy
   */
  private async callLLMProxy(): Promise<{ message: { content: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; model: string; ragChunksUsed: number }> {
    if (!isSupabaseConfigured) {
      // Fallback: execute locally without LLM (offline mode)
      return this.offlineFallback();
    }

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

      if (error) {
        console.error('Edge Function error:', error);
        return this.offlineFallback();
      }

      return data;
    } catch (e) {
      console.error('ProphetV2 network error:', e);
      return this.offlineFallback();
    }
  }

  /**
   * Offline fallback — basic pattern matching + direct tool execution
   * Used when Supabase is not configured or LLM is unavailable.
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
                reintegrations: 0,
                deductions: 0,
                deficitsAnterieurs: 0,
                acomptesVerses: 0,
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

    if (lower.includes('benford') || lower.includes('fraude') || lower.includes('anomalie')) {
      return {
        message: {
          content: 'L\'analyse de Benford nécessite une liste de montants. Veuillez fournir les montants à analyser ou indiquer la source des données (journal comptable, factures, etc.).',
        },
        model: 'offline-fallback',
        ragChunksUsed: 0,
      };
    }

    // Default — no tool call, generic response
    return {
      message: {
        content: `Je suis **Proph3t**, votre expert-comptable IA spécialisé zone OHADA.\n\nJe peux vous aider avec :\n- **Fiscalité** : Calcul IS, TVA, IRPP, retenues à la source (17 pays)\n- **Paie** : Bulletins de paie, cotisations sociales (CNPS, CSS, IPRES...)\n- **Comptabilité** : Écritures SYSCOHADA, SIG, ratios financiers\n- **Audit** : Analyse de Benford, contrôle interne\n\nPosez-moi votre question !`,
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

    return this.config.countryCode || 'CI'; // Default to Côte d'Ivoire
  }

  /**
   * Extract a number from user message
   */
  private extractNumber(text: string): number | null {
    // Match patterns like 1 000 000, 1000000, 1.000.000
    const match = text.match(/(\d[\d\s.,]*\d)/);
    if (match) {
      const cleaned = match[1].replace(/[\s.,]/g, '');
      const num = parseInt(cleaned, 10);
      return isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Reset conversation
   */
  reset(): void {
    this.conversationHistory = [];
    this.sessionId = crypto.randomUUID();
  }

  /**
   * Get conversation history
   */
  getHistory(): ProphetMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Set country code
   */
  setCountryCode(code: string): void {
    this.config.countryCode = code;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton export
export const prophetV2 = new ProphetV2Service();

export default ProphetV2Service;
