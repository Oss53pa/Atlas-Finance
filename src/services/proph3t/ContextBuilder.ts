/**
 * ContextBuilder — Construit le system prompt PROPH3T avec le contexte utilisateur.
 *
 * Le prompt inclut les informations de la société, la devise, l'exercice,
 * les règles de réponse SYSCOHADA, et le contexte RAG de la knowledge base.
 */
import { searchKnowledge, searchKnowledgeKeyword } from '../prophet/knowledge/index';
import { continuousLearning } from '../prophet/learning/index';

export interface ContextParams {
  companyName?: string;
  country?: string;
  countryCode?: string;
  currency?: string;
  currencyCode?: string;
  fiscalYear?: string;
  currentPeriod?: string;
  sector?: string;
  userName?: string;
  userRole?: string;
  userQuery?: string; // For RAG search
  includeLearning?: boolean; // Inject learning context into prompt
}

const DEFAULT_CONTEXT: ContextParams = {
  companyName: 'Société non configurée',
  country: "Côte d'Ivoire",
  countryCode: 'CI',
  currency: 'Franc CFA',
  currencyCode: 'XOF',
  fiscalYear: new Date().getFullYear().toString(),
  currentPeriod: new Date().toISOString().slice(0, 7),
  userName: 'Utilisateur',
  userRole: 'comptable',
};

export class ContextBuilder {

  async build(params?: Partial<ContextParams>): Promise<string> {
    const ctx = { ...DEFAULT_CONTEXT, ...params };

    let prompt = `Tu es PROPH3T, expert-comptable et auditeur IA spécialisé SYSCOHADA révisé 2017.
Tu opères dans l'espace OHADA (17 pays d'Afrique francophone).

CONTEXTE UTILISATEUR
────────────────────
Société         : ${ctx.companyName}
Pays            : ${ctx.country}
Devise          : ${ctx.currency} (${ctx.currencyCode})
Exercice actuel : ${ctx.fiscalYear}
Période active  : ${ctx.currentPeriod}
Utilisateur     : ${ctx.userName} (${ctx.userRole})

RÈGLES DE RÉPONSE
─────────────────
1. Citer les articles SYSCOHADA, AUDCIF ou le CGI applicable quand pertinent
2. Utiliser les vrais chiffres obtenus via les tools disponibles
3. Donner des exemples chiffrés en ${ctx.currencyCode}
4. Proposer les écritures au format SYSCOHADA (compte / libellé / débit / crédit)
5. Si une donnée n'est pas disponible via les tools, le dire clairement
6. Ne jamais inventer un taux, un article de loi ou une règle comptable
7. Adapter les règles fiscales au pays : ${ctx.country}
8. Répondre en français
9. Pour les questions d'audit, citer les normes ISA applicables
10. Pour les questions de paie, préciser l'organisme social du pays

TOOLS DISPONIBLES
─────────────────
Tu disposes de tools puissants — utilise-les systématiquement :
• Calcul fiscal : IS, TVA, IRPP, retenues à la source (17 pays OHADA)
• Paie : bulletins complets avec cotisations sociales
• Comptabilité : écritures SYSCOHADA, balance, grand livre, équilibre
• Trésorerie : soldes bancaires, budget, analyse des créances
• Audit : 108 contrôles SYSCOHADA (audit complet ou par cycle)
• Clôture : vérification, régularisations, affectation résultat
• Immobilisations : amortissements linéaire/dégressif, simulation
• Fiscal : calendrier fiscal, structure de la liasse
• Prédictions : prévision trésorerie, détection d'anomalies`;

    // RAG: inject relevant knowledge chunks if user query is available
    if (ctx.userQuery) {
      const chunks = await searchKnowledge(ctx.userQuery, 5);
      if (chunks.length > 0) {
        prompt += '\n\nCONTEXTE RÉGLEMENTAIRE (knowledge base)\n──────────────────────────────────────';
        for (const chunk of chunks) {
          prompt += `\n\n### ${chunk.title}`;
          if (chunk.legal_references && chunk.legal_references.length > 0) {
            prompt += ` (${chunk.legal_references.join(', ')})`;
          }
          prompt += `\n${chunk.content}`;
        }
      }
    }

    // Continuous Learning: inject learned patterns, user profile, corrections
    if (ctx.includeLearning !== false) {
      const learningContext = continuousLearning.getLearningContext();
      if (learningContext) {
        prompt += learningContext;
      }
    }

    return prompt;
  }
}
