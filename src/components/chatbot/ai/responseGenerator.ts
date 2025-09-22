/**
 * Response Generator - IA Simulée
 * Génère des réponses intelligentes et contextuelles
 */

import { UserIntent, ChatResponse, ChatAction, ChatContext } from '../types';
import { searchKnowledgeBase, getEntriesByCategory } from '../utils/knowledgeBase';

export class ResponseGenerator {
  private responseTemplates: { [key: string]: ResponseTemplate } = {
    greeting: {
      responses: [
        "Salut ! 🤖 C'est Paloma ! Votre assistante WiseBook préférée. Prête à vous dépanner !",
        "Coucou ! 👋 Paloma ici ! Je suis votre guide personnel WiseBook. Comment ça va ?",
        "Hello ! ✨ Paloma à l'appareil ! Experte en WiseBook et bonne humeur. Que puis-je faire pour vous ?"
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
        "Parfait ! 🎯 Paloma est là pour vous ! Voici tout ce que je peux faire :",
        "Super ! 🚀 Je maîtrise WiseBook de A à Z ! Voici mes spécialités :",
        "Génial ! ✨ Paloma, experte WiseBook, à votre service ! Mes domaines d'expertise :"
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
        "Super question ! 💰 Paloma adore les budgets ! C'est le cœur de WiseBook. Voici comment faire :",
        "Génial ! 📊 Les budgets, c'est mon dada ! Paloma va tout vous expliquer :",
        "Parfait ! 🎯 Planification budgétaire = spécialité Paloma ! Suivez le guide :"
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
        "La comptabilité dans WiseBook est complète et intuitive. Que souhaitez-vous faire ?",
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
        "Le module recouvrement de WiseBook est très efficace ! Voici comment l'utiliser :"
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
        "La gestion des stocks est optimisée dans WiseBook ! Que voulez-vous faire ?",
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
        "Excellente idée ! Créer une commande fournisseur avec WiseBook est très simple :",
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
        "Sécurité et gestion d'équipe avec WiseBook - laissez-moi vous guider :"
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
        "L'export de données dans WiseBook est très flexible ! Voici vos options :",
        "Parfait ! Vous pouvez exporter vos données dans plusieurs formats :",
        "Export Excel, PDF, CSV... WiseBook supporte tout ! Voici comment faire :"
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
        "Oh là là ! 🔧 Un pépin technique ? Pas de panique ! Paloma va réparer ça !",
        "Aïe ! 🚨 Problème détecté ! Mais heureusement, Paloma est là pour vous dépanner !",
        "Oups ! 🛠️ Un bug ? Paloma sort sa boîte à outils virtuelle ! On va arranger ça !"
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
        "Je vais vous donner des astuces pour améliorer la vitesse de WiseBook :",
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
        "Excellente initiative ! La formation continue est clé pour maîtriser WiseBook :",
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
        "Oups ! 🤔 Paloma ne comprend pas très bien... Pouvez-vous reformuler différemment ?",
        "Hmm... 🔍 Ma base de données Paloma ne trouve pas ça ! Essayons autrement ?",
        "Désolée ! 😅 Paloma a besoin de plus de détails pour vous aider au mieux !"
      ],
      quickReplies: [
        "Aide générale",
        "Navigation",
        "Problème technique",
        "Contacter un humain"
      ]
    }
  };

  generateResponse(intent: UserIntent, context: ChatContext): ChatResponse {
    const template = this.responseTemplates[intent.intent];

    if (!template) {
      return this.generateFallbackResponse(intent, context);
    }

    // Recherche dans la base de connaissances
    const knowledgeResults = this.searchKnowledge(intent, context);

    // Génération de la réponse principale
    const message = this.buildResponseMessage(template, intent, context, knowledgeResults);

    // Actions contextuelles
    const actions = this.generateContextualActions(template, intent, context);

    // Quick replies intelligentes
    const quickReplies = this.generateSmartQuickReplies(template, intent, context);

    return {
      message,
      confidence: intent.confidence,
      source: knowledgeResults.length > 0 ? 'knowledge-base' : 'ai',
      actions,
      quickReplies,
      suggestedArticles: knowledgeResults.slice(0, 3)
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
    knowledgeResults: any[]
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

  private generateFallbackResponse(intent: UserIntent, context: ChatContext): ChatResponse {
    const fallbackMessages = [
      "Je ne suis pas certain de comprendre votre demande. Pouvez-vous être plus précis ?",
      "Hmm, cette question est complexe ! Pouvez-vous reformuler ou choisir un sujet spécifique ?",
      "Je n'ai pas de réponse exacte, mais je peux vous orienter vers les bonnes ressources !"
    ];

    return {
      message: this.selectRandomResponse(fallbackMessages),
      confidence: 0.3,
      source: 'fallback',
      quickReplies: [
        "Aide sur la navigation",
        "Problèmes techniques",
        "Formation utilisateur",
        "Contacter le support"
      ]
    };
  }
}

interface ResponseTemplate {
  responses: string[];
  actions?: ChatAction[];
  quickReplies?: string[];
  dynamicContent?: boolean;
}

export const responseGenerator = new ResponseGenerator();