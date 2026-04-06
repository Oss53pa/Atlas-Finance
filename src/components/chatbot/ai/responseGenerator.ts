// @ts-nocheck

/**
 * Advanced Response Generator - IA Dynamique et Adaptative
 * Génère des réponses intelligentes, contextuelles et personnalisées pour Proph3t
 */

import { UserIntent, ChatResponse, ChatAction, ChatContext, KnowledgeBaseEntry } from '../types';
import { searchKnowledgeBase, getEntriesByCategory } from '../utils/knowledgeBase';
import { advancedSearch, advancedSearchKnowledge, KnowledgeEntry } from '../knowledge/atlasFinanceKnowledge';

// Interfaces pour la génération avancée
interface ResponsePersonality {
  tone: 'enthusiastic' | 'professional' | 'friendly' | 'concise' | 'encouraging';
  complexity: 'simple' | 'detailed' | 'expert';
  style: 'conversational' | 'instructional' | 'supportive';
}

interface DynamicResponseContext {
  userExpertiseLevel: 'beginner' | 'intermediate' | 'expert';
  emotionalState: 'neutral' | 'frustrated' | 'confused' | 'satisfied' | 'urgent';
  conversationLength: number;
  recentSuccesses: string[];
  recentFailures: string[];
  preferredResponseStyle: string;
  sessionGoals: string[];
}

interface ResponseVariation {
  opening: string[];
  connecting: string[];
  explaining: string[];
  closing: string[];
  encouraging: string[];
}

interface AdaptiveResponse {
  message: string;
  confidence: number;
  personalityUsed: ResponsePersonality;
  adaptationReasons: string[];
  suggestedFollowUps: string[];
  actions?: ChatAction[];
}

export class AdvancedResponseGenerator {
  private responseTemplates: { [key: string]: ResponseTemplate } = {
    // Templates de base conservés pour la compatibilité
    greeting: {
      responses: [
        "Salut ! 🤖 C'est Proph3t ! Votre assistante Atlas Studio préférée. Prête à vous dépanner !",
        "Coucou ! 👋 Proph3t ici ! Je suis votre guide personnel Atlas Studio. Comment ça va ?",
        "Hello ! ✨ Proph3t à l'appareil ! Experte en Atlas Studio et bonne humeur. Que puis-je faire pour vous ?"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Voir le tableau de bord',
          payload: { route: '/dashboard' },
          icon: 'dashboard'
        }
      ],
      quickReplies: [
        "Comment créer un budget ?",
        "Aide sur les stocks",
        "Gérer les utilisateurs",
        "Problème technique"
      ]
    },

    help_general: {
      responses: [
        "Parfait ! 🎯 Proph3t est là pour vous ! Voici tout ce que je peux faire :",
        "Super ! 🚀 Je maîtrise Atlas Studio de A à Z ! Voici mes spécialités :",
        "Génial ! ✨ Proph3t, experte Atlas Studio, à votre service ! Mes domaines d'expertise :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Guide de démarrage',
          payload: { route: '/help/getting-started' },
          icon: 'book'
        },
        {
          type: 'open-modal',
          label: 'Raccourcis clavier',
          payload: { modal: 'keyboard-shortcuts' },
          icon: 'keyboard'
        }
      ],
      quickReplies: [
        "Finance et comptabilité",
        "Gestion des stocks",
        "Administration",
        "Rapports et exports"
      ]
    },

    navigation: {
      responses: [
        "Je vais vous aider à naviguer vers {target}.",
        "Voici comment accéder à {target} :",
        "Pour aller à {target}, suivez ces étapes :"
      ],
      dynamicContent: true
    },

    budget_help: {
      responses: [
        "Super question ! 💰 Proph3t adore les budgets ! C'est le cœur de Atlas Studio. Voici comment faire :",
        "Génial ! 📊 Les budgets, c'est mon dada ! Proph3t va tout vous expliquer :",
        "Parfait ! 🎯 Planification budgétaire = spécialité Proph3t ! Suivez le guide :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Créer un budget',
          payload: { route: '/finance/budget/create' },
          icon: 'plus'
        },
        {
          type: 'navigate',
          label: 'Voir les budgets existants',
          payload: { route: '/finance/budget' },
          icon: 'list'
        }
      ],
      quickReplies: [
        "Créer un nouveau budget",
        "Analyser les variations",
        "Budgets par département",
        "Prévisions annuelles"
      ]
    },

    budget_analysis: {
      responses: [
        "L'analyse des variations budgétaires est cruciale pour le pilotage financier. Voici comment procéder :",
        "Parfait ! L'analyse budget vs réalisé vous donnera des insights précieux :",
        "Je vais vous expliquer comment analyser vos performances budgétaires :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Tableau d\'analyse',
          payload: { route: '/finance/budget/analysis' },
          icon: 'chart'
        }
      ]
    },

    accounting_help: {
      responses: [
        "La comptabilité dans Atlas Studio est complète et intuitive. Que souhaitez-vous faire ?",
        "Je vais vous accompagner dans la gestion comptable :",
        "Comptabilité, écritures, plan comptable... Je maîtrise ! Comment puis-je vous aider ?"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Nouvelle écriture',
          payload: { route: '/finance/accounting/entry/new' },
          icon: 'plus'
        },
        {
          type: 'navigate',
          label: 'Plan comptable',
          payload: { route: '/finance/accounting/chart' },
          icon: 'list'
        }
      ],
      quickReplies: [
        "Saisir une écriture",
        "Consulter le plan comptable",
        "Générer un bilan",
        "Rapports comptables"
      ]
    },

    accounting_entry: {
      responses: [
        "Pour saisir une écriture comptable, c'est très simple ! Suivez ces étapes :",
        "Parfait ! Je vais vous guider pour créer une nouvelle écriture :",
        "Saisie d'écriture comptable - voici la marche à suivre :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Créer une écriture',
          payload: { route: '/finance/accounting/entry/new' },
          icon: 'edit'
        }
      ]
    },

    debt_management: {
      responses: [
        "Le recouvrement des créances est essentiel pour la trésorerie. Voici comment optimiser vos recouvrements :",
        "Gestion des impayés et relances clients - je vais vous expliquer le processus :",
        "Le module recouvrement de Atlas Studio est très efficace ! Voici comment l'utiliser :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Voir les créances',
          payload: { route: '/finance/recovery/debts' },
          icon: 'list'
        },
        {
          type: 'navigate',
          label: 'Lancer des relances',
          payload: { route: '/finance/recovery/reminders' },
          icon: 'send'
        }
      ]
    },

    inventory_help: {
      responses: [
        "La gestion des stocks est optimisée dans Atlas Studio ! Que voulez-vous faire ?",
        "Stocks, inventaires, mouvements... Je connais tout ! Comment puis-je vous aider ?",
        "Le module inventaire offre de nombreuses fonctionnalités. Précisez votre besoin :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Vue d\'ensemble stocks',
          payload: { route: '/inventory/stock' },
          icon: 'warehouse'
        },
        {
          type: 'navigate',
          label: 'Nouvelle commande',
          payload: { route: '/inventory/purchase/new' },
          icon: 'shopping-cart'
        }
      ],
      quickReplies: [
        "Consulter les stocks",
        "Passer une commande",
        "Faire un inventaire",
        "Alertes de stock"
      ]
    },

    purchase_order: {
      responses: [
        "Excellente idée ! Créer une commande fournisseur avec Atlas Studio est très simple :",
        "Je vais vous guider pour passer votre commande fournisseur :",
        "Commande fournisseur - voici le processus étape par étape :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Nouvelle commande',
          payload: { route: '/inventory/purchase/new' },
          icon: 'plus'
        }
      ]
    },

    user_management: {
      responses: [
        "La gestion des utilisateurs et des droits d'accès est cruciale. Voici comment procéder :",
        "Administration des utilisateurs, rôles et permissions - je vous explique tout :",
        "Sécurité et gestion d'équipe avec Atlas Studio - laissez-moi vous guider :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Gérer les utilisateurs',
          payload: { route: '/settings/users' },
          icon: 'users'
        },
        {
          type: 'navigate',
          label: 'Configurer les rôles',
          payload: { route: '/settings/roles' },
          icon: 'shield'
        }
      ]
    },

    password_help: {
      responses: [
        "Problème de mot de passe ? Pas de souci ! Voici comment procéder :",
        "Sécurité avant tout ! Je vais vous aider avec votre mot de passe :",
        "Mot de passe oublié ou à changer ? Voici les étapes :"
      ],
      actions: [
        {
          type: 'navigate',
          label: 'Changer le mot de passe',
          payload: { route: '/profile/password' },
          icon: 'key'
        }
      ]
    },

    export_data: {
      responses: [
        "L'export de données dans Atlas Studio est très flexible ! Voici vos options :",
        "Parfait ! Vous pouvez exporter vos données dans plusieurs formats :",
        "Export Excel, PDF, CSV... Atlas Studio supporte tout ! Voici comment faire :"
      ],
      quickReplies: [
        "Export Excel",
        "Génération PDF",
        "Export comptable",
        "Rapports personnalisés"
      ]
    },

    technical_issue: {
      responses: [
        "Oh là là ! 🔧 Un pépin technique ? Pas de panique ! Proph3t va réparer ça !",
        "Aïe ! 🚨 Problème détecté ! Mais heureusement, Proph3t est là pour vous dépanner !",
        "Oups ! 🛠️ Un bug ? Proph3t sort sa boîte à outils virtuelle ! On va arranger ça !"
      ],
      actions: [
        {
          type: 'copy-text',
          label: 'Copier infos de diagnostic',
          payload: { text: 'Version: 3.0.0, Navigateur: {browser}, OS: {os}' },
          icon: 'copy'
        }
      ],
      quickReplies: [
        "Problème de connexion",
        "Application lente",
        "Erreur de sauvegarde",
        "Contacter le support"
      ]
    },

    performance_issue: {
      responses: [
        "Application un peu lente ? Voici comment optimiser les performances :",
        "Je vais vous donner des astuces pour améliorer la vitesse de Atlas Studio :",
        "Performance au top avec ces conseils :"
      ],
      quickReplies: [
        "Vider le cache",
        "Optimiser l'affichage",
        "Fermer les onglets",
        "Redémarrer l'app"
      ]
    },

    training_request: {
      responses: [
        "Excellente initiative ! La formation continue est clé pour maîtriser Atlas Studio :",
        "Bravo pour votre volonté d'apprendre ! Voici les ressources disponibles :",
        "Formation et montée en compétences - voici votre plan d'apprentissage :"
      ],
      actions: [
        {
          type: 'external-link',
          label: 'Centre de formation',
          payload: { url: '/training' },
          icon: 'graduation-cap'
        }
      ]
    },

    unknown: {
      responses: [
        "Oups ! 🤔 Proph3t ne comprend pas très bien... Pouvez-vous reformuler différemment ?",
        "Hmm... 🔍 Ma base de données Proph3t ne trouve pas ça ! Essayons autrement ?",
        "Désolée ! 😅 Proph3t a besoin de plus de détails pour vous aider au mieux !"
      ],
      quickReplies: [
        "Aide générale",
        "Navigation",
        "Problème technique",
        "Contacter un humain"
      ]
    }
  };

  // Nouvelles propriétés pour la génération dynamique
  private responseVariations: ResponseVariation = {
    opening: [
      '🚀 Parfait !', '✨ Excellent !', '🎯 Super question !', '💡 Génial !',
      '👍 Très bonne idée !', '🌟 Formidable !', '🔥 Top !', '⚡ Excellent timing !'
    ],
    connecting: [
      'Laissez-moi vous expliquer', 'Voici comment procéder', 'Je vais vous guider',
      'Suivez ces étapes', 'Proph3t va tout vous détailler', 'Voici la marche à suivre'
    ],
    explaining: [
      'En pratique, voici ce que vous devez faire', 'Concrètement',
      'Pour bien comprendre', 'En résumé', 'L\'essentiel à retenir'
    ],
    closing: [
      'N\'hésitez pas si vous avez des questions !', 'Je reste à votre disposition !',
      'Dites-moi si vous voulez plus de détails !', 'Besoin d\'aide supplémentaire ?',
      'Tout est clair pour vous ?', 'On continue ensemble ?'
    ],
    encouraging: [
      'Vous y arrivez très bien !', 'Continuez comme ça !', 'Parfait, vous maîtrisez !',
      'Excellent travail !', 'Bravo pour votre progression !', 'Vous êtes sur la bonne voie !'
    ]
  };

  private personalityProfiles: Map<string, ResponsePersonality> = new Map([
    ['beginner_enthusiastic', { tone: 'enthusiastic', complexity: 'simple', style: 'supportive' }],
    ['expert_concise', { tone: 'professional', complexity: 'expert', style: 'instructional' }],
    ['frustrated_encouraging', { tone: 'encouraging', complexity: 'simple', style: 'supportive' }],
    ['urgent_efficient', { tone: 'concise', complexity: 'detailed', style: 'instructional' }],
    ['confused_patient', { tone: 'friendly', complexity: 'simple', style: 'conversational' }]
  ]);

  generateResponse(intent: UserIntent, context: ChatContext): ChatResponse {
    // Construire le contexte dynamique étendu
    const dynamicContext = this.buildDynamicContext(intent, context);

    // Sélectionner la personnalité optimale
    const personality = this.selectOptimalPersonality(dynamicContext);

    // Générer une réponse adaptative
    const adaptiveResponse = this.generateAdaptiveResponse(intent, context, dynamicContext, personality);

    // Recherche enrichie dans la base de connaissances
    const knowledgeResults = this.performEnhancedKnowledgeSearch(intent, context);

    // Construire la réponse finale
    const finalMessage = this.buildDynamicMessage(adaptiveResponse, knowledgeResults, personality);

    // Générer des actions intelligentes
    const smartActions = this.generateIntelligentActions(intent, context, knowledgeResults);

    // Quick replies personnalisées
    const personalizedQuickReplies = this.generatePersonalizedQuickReplies(intent, context, dynamicContext);

    return {
      message: finalMessage,
      confidence: this.calculateDynamicConfidence(intent, knowledgeResults, adaptiveResponse),
      source: this.determineResponseSource(knowledgeResults, adaptiveResponse),
      actions: smartActions,
      quickReplies: personalizedQuickReplies,
      suggestedArticles: knowledgeResults.slice(0, 3),
      metadata: {
        personalityUsed: personality,
        adaptationReasons: adaptiveResponse.adaptationReasons,
        responseGeneration: 'dynamic'
      }
    };
  }

  private searchKnowledge(intent: UserIntent, context: ChatContext) {
    // Construire la requête de recherche
    let searchQuery = '';

    if (intent.entities.page) {
      searchQuery += intent.entities.page + ' ';
    }
    if (intent.entities.module) {
      searchQuery += intent.entities.module + ' ';
    }
    if (intent.entities.action) {
      searchQuery += intent.entities.action + ' ';
    }

    // Fallback sur l'intention
    if (!searchQuery.trim()) {
      searchQuery = intent.intent.replace('_', ' ');
    }

    return searchKnowledgeBase(searchQuery.trim(), 5);
  }

  private buildResponseMessage(
    template: ResponseTemplate,
    intent: UserIntent,
    context: ChatContext,
    knowledgeResults: KnowledgeBaseEntry[]
  ): string {
    let baseMessage = this.selectRandomResponse(template.responses);

    // Remplacer les variables dynamiques
    if (template.dynamicContent) {
      baseMessage = this.replaceDynamicContent(baseMessage, intent, context);
    }

    // Ajouter des informations de la base de connaissances si pertinentes
    if (knowledgeResults.length > 0 && this.shouldIncludeKnowledge(intent)) {
      const topResult = knowledgeResults[0];
      baseMessage += `\n\n📚 **${topResult.title}**\n${topResult.content.substring(0, 200)}...`;
    }

    // Personnalisation selon le contexte
    baseMessage = this.personalizeMessage(baseMessage, context);

    return baseMessage;
  }

  private selectRandomResponse(responses: string[]): string {
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }

  private replaceDynamicContent(
    message: string,
    intent: UserIntent,
    context: ChatContext
  ): string {
    let result = message;

    // Remplacer {target} par l'entité appropriée
    if (intent.entities.page) {
      result = result.replace('{target}', intent.entities.page);
    } else if (intent.entities.module) {
      result = result.replace('{target}', intent.entities.module);
    } else {
      result = result.replace('{target}', 'la section demandée');
    }

    // Autres remplacements contextuels
    result = result.replace('{user}', context.userRole || 'utilisateur');
    result = result.replace('{currentPage}', context.currentPage || 'page actuelle');

    return result;
  }

  private shouldIncludeKnowledge(intent: UserIntent): boolean {
    // Inclure la base de connaissances pour certaines intentions
    const knowledgeIntents = [
      'budget_help', 'accounting_help', 'inventory_help',
      'user_management', 'help_general'
    ];
    return knowledgeIntents.includes(intent.intent);
  }

  private personalizeMessage(message: string, context: ChatContext): string {
    // Ajouter des touches personnelles selon le contexte
    if (context.currentModule === 'finance') {
      message += "\n\n💡 *Conseil* : Pensez à sauvegarder régulièrement vos données financières !";
    } else if (context.currentModule === 'inventory') {
      message += "\n\n📦 *Astuce* : Utilisez les filtres pour trouver rapidement vos produits !";
    }

    // Ajouter des emojis contextuels
    if (message.includes('budget')) {
      message = '💰 ' + message;
    } else if (message.includes('stock')) {
      message = '📦 ' + message;
    } else if (message.includes('utilisateur')) {
      message = '👥 ' + message;
    }

    return message;
  }

  private generateContextualActions(
    template: ResponseTemplate,
    intent: UserIntent,
    context: ChatContext
  ): ChatAction[] {
    const actions = [...(template.actions || [])];

    // Ajouter des actions contextuelles intelligentes
    if (context.currentPage && context.currentPage !== '/dashboard') {
      actions.push({
        type: 'navigate',
        label: 'Retour au tableau de bord',
        payload: { route: '/dashboard' },
        icon: 'home'
      });
    }

    // Actions basées sur l'intention
    if (intent.intent.includes('help') && intent.entities.module) {
      actions.push({
        type: 'navigate',
        label: `Aller au module ${intent.entities.module}`,
        payload: { route: `/${intent.entities.module}` },
        icon: 'arrow-right'
      });
    }

    return actions;
  }

  private generateSmartQuickReplies(
    template: ResponseTemplate,
    intent: UserIntent,
    context: ChatContext
  ): string[] {
    let quickReplies = [...(template.quickReplies || [])];

    // Quick replies contextuelles selon le module actuel
    if (context.currentModule === 'finance') {
      quickReplies = [
        ...quickReplies,
        "Créer un budget",
        "Saisir une écriture",
        "Voir les créances"
      ];
    } else if (context.currentModule === 'inventory') {
      quickReplies = [
        ...quickReplies,
        "Consulter les stocks",
        "Nouvelle commande",
        "Faire un inventaire"
      ];
    }

    // Limiter à 4 quick replies et éviter les doublons
    return [...new Set(quickReplies)].slice(0, 4);
  }

  // Nouvelles méthodes pour la génération dynamique

  private buildDynamicContext(intent: UserIntent, context: ChatContext): DynamicResponseContext {
    return {
      userExpertiseLevel: this.inferExpertiseLevel(intent, context),
      emotionalState: this.detectEmotionalState(intent, context),
      conversationLength: context.recentActions?.length || 0,
      recentSuccesses: this.extractRecentSuccesses(context),
      recentFailures: this.extractRecentFailures(context),
      preferredResponseStyle: this.inferPreferredStyle(context),
      sessionGoals: this.identifySessionGoals(context)
    };
  }

  private selectOptimalPersonality(dynamicContext: DynamicResponseContext): ResponsePersonality {
    // Logique de sélection de personnalité basée sur le contexte
    if (dynamicContext.emotionalState === 'frustrated') {
      return this.personalityProfiles.get('frustrated_encouraging')!;
    }
    if (dynamicContext.emotionalState === 'urgent') {
      return this.personalityProfiles.get('urgent_efficient')!;
    }
    if (dynamicContext.emotionalState === 'confused') {
      return this.personalityProfiles.get('confused_patient')!;
    }
    if (dynamicContext.userExpertiseLevel === 'expert') {
      return this.personalityProfiles.get('expert_concise')!;
    }
    return this.personalityProfiles.get('beginner_enthusiastic')!;
  }

  private generateAdaptiveResponse(
    intent: UserIntent,
    context: ChatContext,
    dynamicContext: DynamicResponseContext,
    personality: ResponsePersonality
  ): AdaptiveResponse {
    const template = this.responseTemplates[intent.intent];
    const adaptationReasons: string[] = [];

    let baseMessage = '';
    if (template) {
      baseMessage = this.selectVariedResponse(template.responses, dynamicContext);
    } else {
      baseMessage = this.generateSmartFallback(intent, dynamicContext);
      adaptationReasons.push('Fallback intelligent généré');
    }

    // Adapter selon la personnalité
    let adaptedMessage = this.adaptMessageToPersonality(baseMessage, personality);
    adaptationReasons.push(`Adaptation ${personality.tone}`);

    // Ajouter des éléments contextuels
    if (dynamicContext.recentSuccesses.length > 0 && personality.style === 'supportive') {
      const encouragement = this.selectRandomFromArray(this.responseVariations.encouraging);
      adaptedMessage = `${encouragement} ${adaptedMessage}`;
      adaptationReasons.push('Encouragement ajouté');
    }

    // Personnaliser selon l'état émotionnel
    if (dynamicContext.emotionalState === 'frustrated') {
      adaptedMessage = this.addEmpathyToMessage(adaptedMessage);
      adaptationReasons.push('Empathie ajoutée pour frustration');
    }

    const suggestedFollowUps = this.generateContextualFollowUps(intent, dynamicContext);

    return {
      message: adaptedMessage,
      confidence: this.calculateAdaptationConfidence(template, personality),
      personalityUsed: personality,
      adaptationReasons,
      suggestedFollowUps
    };
  }

  private performEnhancedKnowledgeSearch(intent: UserIntent, context: ChatContext) {
    // Utiliser le nouveau système de recherche avancée
    const searchQuery = this.buildSmartSearchQuery(intent, context);
    const searchResults = advancedSearchKnowledge(searchQuery, {
      maxResults: 5,
      threshold: 0.3,
      semanticExpansion: true,
      contextBoost: true
    });

    return searchResults.map(result => result.entry);
  }

  private buildDynamicMessage(
    adaptiveResponse: AdaptiveResponse,
    knowledgeResults: KnowledgeEntry[],
    personality: ResponsePersonality
  ): string {
    let message = adaptiveResponse.message;

    // Ajouter des informations de la base de connaissances si pertinentes
    if (knowledgeResults.length > 0 && personality.complexity !== 'simple') {
      const topResult = knowledgeResults[0];
      message += `\n\n📚 **Référence**: ${topResult.title}\n${this.summarizeContent(topResult.content, personality.complexity)}`;
    }

    // Ajouter des conseils personnalisés
    if (personality.style === 'supportive') {
      const tip = this.generatePersonalizedTip(personality);
      if (tip) {
        message += `\n\n💡 **Conseil Proph3t**: ${tip}`;
      }
    }

    return message;
  }

  private generateIntelligentActions(
    intent: UserIntent,
    context: ChatContext,
    knowledgeResults: KnowledgeEntry[]
  ): ChatAction[] {
    const actions: ChatAction[] = [];

    // Actions basées sur l'intention
    const intentActions = this.getIntentSpecificActions(intent);
    actions.push(...intentActions);

    // Actions basées sur la base de connaissances
    if (knowledgeResults.length > 0) {
      const knowledgeActions = this.generateKnowledgeBasedActions(knowledgeResults);
      actions.push(...knowledgeActions.slice(0, 2));
    }

    // Actions contextuelles intelligentes
    const contextualActions = this.generateSmartContextualActions(context);
    actions.push(...contextualActions);

    return actions.slice(0, 4); // Limiter à 4 actions max
  }

  private generatePersonalizedQuickReplies(
    intent: UserIntent,
    context: ChatContext,
    dynamicContext: DynamicResponseContext
  ): string[] {
    const quickReplies: string[] = [];

    // Quick replies basées sur les objectifs de session
    if (dynamicContext.sessionGoals.length > 0) {
      quickReplies.push(...dynamicContext.sessionGoals.slice(0, 2));
    }

    // Quick replies basées sur l'expertise
    if (dynamicContext.userExpertiseLevel === 'beginner') {
      quickReplies.push('Guide étape par étape', 'Explications détaillées');
    } else if (dynamicContext.userExpertiseLevel === 'expert') {
      quickReplies.push('Options avancées', 'Raccourcis professionnels');
    }

    // Quick replies basées sur l'état émotionnel
    if (dynamicContext.emotionalState === 'frustrated') {
      quickReplies.push('Contacter le support', 'Solution alternative');
    } else if (dynamicContext.emotionalState === 'confused') {
      quickReplies.push('Plus d\'explications', 'Exemple concret');
    }

    // Ajouter des quick replies par défaut si nécessaire
    if (quickReplies.length < 3) {
      const defaultReplies = ['Aide générale', 'Continuer', 'Autre question'];
      quickReplies.push(...defaultReplies.slice(0, 3 - quickReplies.length));
    }

    return [...new Set(quickReplies)].slice(0, 4);
  }

  // Méthodes utilitaires pour l'adaptation dynamique

  private inferExpertiseLevel(intent: UserIntent, context: ChatContext): 'beginner' | 'intermediate' | 'expert' {
    const complexIntents = ['accounting_entry', 'budget_analysis', 'debt_management'];
    const recentActions = context.recentActions || [];

    if (complexIntents.includes(intent.intent) && recentActions.length > 10) {
      return 'expert';
    }
    if (recentActions.length > 5) {
      return 'intermediate';
    }
    return 'beginner';
  }

  private detectEmotionalState(intent: UserIntent, context: ChatContext): DynamicResponseContext['emotionalState'] {
    const recentActions = context.recentActions || [];

    if (intent.intent === 'technical_issue' || recentActions.filter(a => a.includes('error')).length > 1) {
      return 'frustrated';
    }
    if (intent.intent === 'help_general' || intent.confidence < 0.5) {
      return 'confused';
    }
    if (recentActions.some(a => a.includes('success'))) {
      return 'satisfied';
    }
    return 'neutral';
  }

  private extractRecentSuccesses(context: ChatContext): string[] {
    return (context.recentActions || [])
      .filter(action => action.includes('success') || action.includes('completed'))
      .slice(-3);
  }

  private extractRecentFailures(context: ChatContext): string[] {
    return (context.recentActions || [])
      .filter(action => action.includes('error') || action.includes('failed'))
      .slice(-3);
  }

  private inferPreferredStyle(context: ChatContext): string {
    // Analyser l'historique pour inférer le style préféré
    return 'balanced'; // Implémentation simple pour l'instant
  }

  private identifySessionGoals(context: ChatContext): string[] {
    const goals: string[] = [];
    const recentActions = context.recentActions || [];

    if (recentActions.some(a => a.includes('budget'))) {
      goals.push('Maîtriser la budgétisation');
    }
    if (recentActions.some(a => a.includes('inventory'))) {
      goals.push('Optimiser la gestion des stocks');
    }

    return goals;
  }

  private selectVariedResponse(responses: string[], dynamicContext: DynamicResponseContext): string {
    // Sélectionner une réponse en évitant la répétition
    const index = dynamicContext.conversationLength % responses.length;
    return responses[index];
  }

  private generateSmartFallback(intent: UserIntent, dynamicContext: DynamicResponseContext): string {
    const baseMessages = [
      'Hmm, laissez-moi chercher la meilleure façon de vous aider avec ça',
      'Intéressant ! Cette question mérite une réponse personnalisée',
      'Je vais adapter ma réponse à votre situation spécifique'
    ];

    const selected = this.selectRandomFromArray(baseMessages);

    if (dynamicContext.emotionalState === 'frustrated') {
      return `🤗 ${selected}. Je comprends que ce soit frustrant, prenons le temps de bien résoudre cela.`;
    }

    return `✨ ${selected}.`;
  }

  private adaptMessageToPersonality(message: string, personality: ResponsePersonality): string {
    let adapted = message;

    switch (personality.tone) {
      case 'enthusiastic':
        adapted = this.addEnthusiasm(adapted);
        break;
      case 'professional':
        adapted = this.makeProfessional(adapted);
        break;
      case 'encouraging':
        adapted = this.addEncouragement(adapted);
        break;
      case 'concise':
        adapted = this.makeConcise(adapted);
        break;
    }

    return adapted;
  }

  private addEnthusiasm(message: string): string {
    const enthusiasticOpening = this.selectRandomFromArray(this.responseVariations.opening);
    return `${enthusiasticOpening} ${message}`;
  }

  private makeProfessional(message: string): string {
    return message
      .replace(/!/g, '.')
      .replace(/😊|✨|🎯|💡/g, '')
      .trim();
  }

  private addEncouragement(message: string): string {
    const encouragement = this.selectRandomFromArray(this.responseVariations.encouraging);
    return `${message}\n\n💪 ${encouragement}`;
  }

  private makeConcise(message: string): string {
    return message
      .split('\n')[0] // Prendre seulement la première ligne
      .replace(/\s*\([^)]*\)/g, '') // Supprimer les parenthèses
      .trim();
  }

  private addEmpathyToMessage(message: string): string {
    const empathyPhrases = [
      '🤗 Je comprends que ce soit frustrant.',
      '💙 Pas de souci, on va résoudre ça ensemble.',
      '🤝 Je suis là pour vous accompagner.'
    ];
    const empathy = this.selectRandomFromArray(empathyPhrases);
    return `${empathy} ${message}`;
  }

  private generateContextualFollowUps(intent: UserIntent, dynamicContext: DynamicResponseContext): string[] {
    const followUps: string[] = [];

    if (dynamicContext.userExpertiseLevel === 'beginner') {
      followUps.push('Besoin d\'un guide pas à pas ?', 'Voulez-vous un exemple concret ?');
    }

    if (dynamicContext.sessionGoals.length > 0) {
      followUps.push(`Continuer avec: ${dynamicContext.sessionGoals[0]}`);
    }

    return followUps;
  }

  private generatePersonalizedTip(personality: ResponsePersonality): string | null {
    const tips = [
      'Sauvegardez régulièrement vos données importantes',
      'Utilisez les raccourcis clavier pour gagner du temps',
      'N\'hésitez pas à explorer les options avancées',
      'Consultez les rapports pour suivre vos performances'
    ];

    if (personality.complexity === 'expert') {
      return null; // Pas de tips pour les experts
    }

    return this.selectRandomFromArray(tips);
  }

  private calculateDynamicConfidence(
    intent: UserIntent,
    knowledgeResults: KnowledgeEntry[],
    adaptiveResponse: AdaptiveResponse
  ): number {
    let confidence = intent.confidence;

    // Bonus pour les résultats de la base de connaissances
    if (knowledgeResults.length > 0) {
      confidence += 0.1;
    }

    // Bonus pour une adaptation réussie
    if (adaptiveResponse.adaptationReasons.length > 0) {
      confidence += 0.05;
    }

    return Math.min(confidence, 1.0);
  }

  private determineResponseSource(knowledgeResults: KnowledgeEntry[], adaptiveResponse: AdaptiveResponse): string {
    if (knowledgeResults.length > 0) {
      return 'enhanced-knowledge-base';
    }
    if (adaptiveResponse.adaptationReasons.length > 0) {
      return 'adaptive-ai';
    }
    return 'ai';
  }

  private selectRandomFromArray(array: string[]): string {
    return array[Math.floor(Math.random() * array.length)];
  }

  private calculateAdaptationConfidence(template: ResponseTemplate | undefined, personality: ResponsePersonality): number {
    let confidence = template ? 0.8 : 0.6;

    // Bonus pour la personnalité appropriée
    if (personality.tone === 'encouraging' || personality.style === 'supportive') {
      confidence += 0.1;
    }

    return confidence;
  }

  private buildSmartSearchQuery(intent: UserIntent, context: ChatContext): string {
    let query = intent.intent.replace('_', ' ');

    // Ajouter des entités si disponibles
    if (intent.entities.module) {
      query += ` ${intent.entities.module}`;
    }
    if (intent.entities.action) {
      query += ` ${intent.entities.action}`;
    }

    return query;
  }

  private summarizeContent(content: string, complexity: 'simple' | 'detailed' | 'expert'): string {
    const maxLength = complexity === 'simple' ? 100 : complexity === 'detailed' ? 200 : 300;
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  }

  private getIntentSpecificActions(intent: UserIntent): ChatAction[] {
    const actionMap: { [key: string]: ChatAction[] } = {
      budget_help: [{
        type: 'navigate',
        label: 'Créer un budget',
        payload: { route: '/finance/budget/create' },
        icon: 'plus'
      }],
      technical_issue: [{
        type: 'copy-text',
        label: 'Copier infos de diagnostic',
        payload: { text: 'Diagnostic système généré' },
        icon: 'copy'
      }]
    };

    return actionMap[intent.intent] || [];
  }

  private generateKnowledgeBasedActions(knowledgeResults: KnowledgeEntry[]): ChatAction[] {
    return knowledgeResults
      .filter(result => result.navigationPath)
      .map(result => ({
        type: 'navigate' as const,
        label: `Ouvrir ${result.title}`,
        payload: { route: result.navigationPath },
        icon: 'arrow-right'
      }));
  }

  private generateSmartContextualActions(context: ChatContext): ChatAction[] {
    const actions: ChatAction[] = [];

    if (context.currentPage && context.currentPage !== '/dashboard') {
      actions.push({
        type: 'navigate',
        label: 'Retour au tableau de bord',
        payload: { route: '/dashboard' },
        icon: 'home'
      });
    }

    return actions;
  }

  private generateFallbackResponse(intent: UserIntent, context: ChatContext): ChatResponse {
    const dynamicContext = this.buildDynamicContext(intent, context);
    const personality = this.selectOptimalPersonality(dynamicContext);

    const smartFallback = this.generateSmartFallback(intent, dynamicContext);
    const adaptedFallback = this.adaptMessageToPersonality(smartFallback, personality);

    return {
      message: adaptedFallback,
      confidence: 0.4, // Un peu plus élevé que l'ancien système
      source: 'adaptive-fallback',
      quickReplies: this.generatePersonalizedQuickReplies(intent, context, dynamicContext)
    };
  }
}

interface ResponseTemplate {
  responses: string[];
  actions?: ChatAction[];
  quickReplies?: string[];
  dynamicContent?: boolean;
}

// Maintenir la compatibilité avec l'ancienne interface
export class ResponseGenerator extends AdvancedResponseGenerator {}

export const responseGenerator = new AdvancedResponseGenerator();