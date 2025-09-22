/**
 * Knowledge Base for WiseBook Assistant
 * Base de connaissances complète pour l'assistance utilisateur
 */

import { KnowledgeBaseEntry } from '../types';

export const knowledgeBase: KnowledgeBaseEntry[] = [
  // DASHBOARD
  {
    id: 'dashboard-overview',
    title: 'Vue d\'ensemble du tableau de bord',
    content: 'Le tableau de bord WiseBook vous donne un aperçu en temps réel de votre activité financière. Vous y trouverez les métriques clés, les graphiques de performance, les notifications importantes et les raccourcis vers les modules principaux.',
    category: 'dashboard',
    tags: ['tableau de bord', 'overview', 'accueil'],
    module: 'dashboard',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['dashboard', 'accueil', 'aperçu', 'résumé', 'métriques'],
  },
  {
    id: 'dashboard-widgets',
    title: 'Personnaliser les widgets du tableau de bord',
    content: 'Pour personnaliser vos widgets : 1) Cliquez sur l\'icône paramètres en haut à droite, 2) Sélectionnez "Personnaliser le tableau de bord", 3) Glissez-déposez les widgets selon vos préférences, 4) Sauvegardez votre configuration.',
    category: 'dashboard',
    tags: ['widgets', 'personnalisation', 'configuration'],
    module: 'dashboard',
    difficulty: 'intermediate',
    lastUpdated: new Date(),
    searchKeywords: ['widget', 'personnaliser', 'configuration', 'modifier', 'layout'],
  },

  // FINANCE - BUDGET
  {
    id: 'budget-creation',
    title: 'Créer un nouveau budget',
    content: 'Pour créer un budget : 1) Allez dans Finance > Budget & Prévisions, 2) Cliquez sur "Nouveau Budget", 3) Définissez la période (mensuel, trimestriel, annuel), 4) Ajoutez les postes budgétaires, 5) Définissez les montants prévus, 6) Sauvegardez et activez le budget.',
    category: 'finance',
    tags: ['budget', 'création', 'prévisions'],
    module: 'finance',
    difficulty: 'intermediate',
    lastUpdated: new Date(),
    searchKeywords: ['budget', 'créer', 'nouveau', 'prévisions', 'planification'],
  },
  {
    id: 'budget-analysis',
    title: 'Analyser les variations budgétaires',
    content: 'L\'analyse des variations compare le réalisé vs prévu. Rendez-vous dans l\'onglet "Analyse Variation" pour voir : les écarts en montant et pourcentage, les graphiques d\'évolution, les alertes sur les dépassements, et les recommandations d\'ajustement.',
    category: 'finance',
    tags: ['budget', 'analyse', 'variations', 'écarts'],
    module: 'finance',
    difficulty: 'advanced',
    lastUpdated: new Date(),
    searchKeywords: ['analyse', 'variation', 'écart', 'budget', 'comparaison'],
  },

  // FINANCE - COMPTABILITÉ
  {
    id: 'accounting-entries',
    title: 'Saisir des écritures comptables',
    content: 'Pour saisir une écriture : 1) Allez dans Finance > Comptabilité, 2) Cliquez sur "Nouvelle écriture", 3) Sélectionnez le journal, 4) Renseignez la date et la référence, 5) Ajoutez les lignes débit/crédit, 6) Vérifiez l\'équilibre, 7) Validez l\'écriture.',
    category: 'finance',
    tags: ['comptabilité', 'écriture', 'journal'],
    module: 'finance',
    difficulty: 'intermediate',
    lastUpdated: new Date(),
    searchKeywords: ['écriture', 'comptable', 'journal', 'débit', 'crédit', 'saisie'],
  },
  {
    id: 'chart-of-accounts',
    title: 'Gérer le plan comptable',
    content: 'Le plan comptable est accessible dans Finance > Comptabilité > Plan comptable. Vous pouvez : ajouter de nouveaux comptes, modifier les libellés, définir les types de comptes, configurer les reports à nouveau, et exporter le plan.',
    category: 'finance',
    tags: ['plan comptable', 'comptes', 'configuration'],
    module: 'finance',
    difficulty: 'advanced',
    lastUpdated: new Date(),
    searchKeywords: ['plan', 'comptable', 'compte', 'numéro', 'libellé'],
  },

  // FINANCE - RECOUVREMENT
  {
    id: 'debt-management',
    title: 'Gérer les créances clients',
    content: 'Pour gérer les créances : 1) Consultez Finance > Recouvrement > Créances, 2) Visualisez l\'âge des créances, 3) Identifiez les retards de paiement, 4) Lancez des actions de relance, 5) Suivez les promesses de paiement.',
    category: 'finance',
    tags: ['recouvrement', 'créances', 'clients'],
    module: 'finance',
    difficulty: 'intermediate',
    lastUpdated: new Date(),
    searchKeywords: ['créance', 'recouvrement', 'client', 'impayé', 'relance'],
  },
  {
    id: 'debt-recovery-process',
    title: 'Processus de recouvrement',
    content: 'Le processus de recouvrement suit ces étapes : 1) Relance amiable automatique, 2) Mise en demeure, 3) Négociation d\'échéancier, 4) Passage en contentieux si nécessaire, 5) Radiation éventuelle des créances irrécouvrables.',
    category: 'finance',
    tags: ['recouvrement', 'processus', 'relance'],
    module: 'finance',
    difficulty: 'advanced',
    lastUpdated: new Date(),
    searchKeywords: ['processus', 'recouvrement', 'relance', 'contentieux', 'radiation'],
  },

  // INVENTORY
  {
    id: 'stock-management',
    title: 'Gérer les stocks',
    content: 'La gestion des stocks vous permet de : suivre les niveaux de stock en temps réel, définir des seuils d\'alerte, gérer les mouvements d\'entrée/sortie, effectuer des inventaires, et analyser la rotation des stocks.',
    category: 'inventory',
    tags: ['stock', 'inventaire', 'gestion'],
    module: 'inventory',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['stock', 'inventaire', 'produit', 'quantité', 'mouvement'],
  },
  {
    id: 'purchase-orders',
    title: 'Créer des commandes fournisseurs',
    content: 'Pour créer une commande : 1) Allez dans Inventory > Approvisionnement, 2) Cliquez "Nouvelle commande", 3) Sélectionnez le fournisseur, 4) Ajoutez les articles et quantités, 5) Vérifiez les prix, 6) Validez et envoyez la commande.',
    category: 'inventory',
    tags: ['commande', 'fournisseur', 'approvisionnement'],
    module: 'inventory',
    difficulty: 'intermediate',
    lastUpdated: new Date(),
    searchKeywords: ['commande', 'fournisseur', 'achat', 'approvisionnement'],
  },

  // SÉCURITÉ
  {
    id: 'user-roles',
    title: 'Gérer les rôles utilisateurs',
    content: 'Dans Paramètres > Utilisateurs > Rôles, vous pouvez : créer de nouveaux rôles, définir les permissions par module, assigner des rôles aux utilisateurs, et auditer les accès. Les rôles prédéfinis sont : Admin, Manager, Comptable, Utilisateur.',
    category: 'security',
    tags: ['utilisateurs', 'rôles', 'permissions'],
    module: 'security',
    difficulty: 'advanced',
    lastUpdated: new Date(),
    searchKeywords: ['rôle', 'permission', 'utilisateur', 'accès', 'sécurité'],
  },
  {
    id: 'password-policy',
    title: 'Politique de mot de passe',
    content: 'Les mots de passe doivent respecter : minimum 8 caractères, au moins une majuscule, une minuscule, un chiffre et un caractère spécial. Changement obligatoire tous les 90 jours. Historique des 12 derniers mots de passe conservé.',
    category: 'security',
    tags: ['mot de passe', 'sécurité', 'politique'],
    module: 'security',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['mot de passe', 'password', 'sécurité', 'politique', 'changement'],
  },

  // PARAMÈTRES
  {
    id: 'system-settings',
    title: 'Configuration système',
    content: 'Les paramètres système permettent de configurer : les préférences générales, les formats de date/devise, les notifications, les sauvegardes automatiques, et les intégrations externes. Accessible via Paramètres > Configuration.',
    category: 'settings',
    tags: ['paramètres', 'configuration', 'système'],
    module: 'settings',
    difficulty: 'advanced',
    lastUpdated: new Date(),
    searchKeywords: ['paramètres', 'configuration', 'système', 'préférences'],
  },
  {
    id: 'notifications',
    title: 'Gérer les notifications',
    content: 'Personnalisez vos notifications dans Paramètres > Notifications. Vous pouvez activer/désactiver : les alertes budgétaires, les rappels d\'échéances, les notifications de validation, et choisir les canaux (email, push, dans l\'application).',
    category: 'settings',
    tags: ['notifications', 'alertes', 'paramètres'],
    module: 'settings',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['notification', 'alerte', 'rappel', 'email', 'paramètres'],
  },

  // AIDE GÉNÉRALE
  {
    id: 'navigation-tips',
    title: 'Conseils de navigation',
    content: 'Conseils pour naviguer efficacement : utilisez les raccourcis clavier (Ctrl+K pour la recherche), marquez vos pages favorites, utilisez les filtres pour affiner les résultats, et exploitez la fonction de recherche globale.',
    category: 'general',
    tags: ['navigation', 'conseils', 'raccourcis'],
    module: 'general',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['navigation', 'raccourci', 'recherche', 'menu', 'favoris'],
  },
  {
    id: 'data-export',
    title: 'Exporter des données',
    content: 'La plupart des écrans proposent un bouton "Exporter" permettant de télécharger les données en format Excel, PDF ou CSV. Vous pouvez choisir les colonnes à exporter et appliquer des filtres avant l\'export.',
    category: 'general',
    tags: ['export', 'données', 'téléchargement'],
    module: 'general',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['export', 'exporter', 'télécharger', 'excel', 'pdf', 'csv'],
  },

  // DÉPANNAGE
  {
    id: 'connection-issues',
    title: 'Problèmes de connexion',
    content: 'En cas de problème de connexion : 1) Vérifiez votre connexion internet, 2) Effacez le cache du navigateur, 3) Essayez en navigation privée, 4) Contactez l\'administrateur si le problème persiste.',
    category: 'troubleshooting',
    tags: ['connexion', 'problème', 'dépannage'],
    module: 'general',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['connexion', 'problème', 'erreur', 'bug', 'lent'],
  },
  {
    id: 'performance-tips',
    title: 'Optimiser les performances',
    content: 'Pour améliorer les performances : fermez les onglets inutiles, utilisez les filtres pour limiter les données affichées, évitez d\'ouvrir trop de modules simultanément, et redémarrez l\'application si elle devient lente.',
    category: 'troubleshooting',
    tags: ['performance', 'optimisation', 'lenteur'],
    module: 'general',
    difficulty: 'beginner',
    lastUpdated: new Date(),
    searchKeywords: ['performance', 'lent', 'optimiser', 'vitesse', 'améliorer'],
  },
];

// Fonctions utilitaires pour la recherche dans la base de connaissances
export function searchKnowledgeBase(query: string, maxResults: number = 5): KnowledgeBaseEntry[] {
  const normalizedQuery = query.toLowerCase();
  const results: Array<{ entry: KnowledgeBaseEntry; score: number }> = [];

  knowledgeBase.forEach(entry => {
    let score = 0;

    // Recherche dans le titre (poids élevé)
    if (entry.title.toLowerCase().includes(normalizedQuery)) {
      score += 10;
    }

    // Recherche dans les mots-clés (poids élevé)
    entry.searchKeywords.forEach(keyword => {
      if (keyword.toLowerCase().includes(normalizedQuery)) {
        score += 8;
      }
    });

    // Recherche dans les tags (poids moyen)
    entry.tags.forEach(tag => {
      if (tag.toLowerCase().includes(normalizedQuery)) {
        score += 5;
      }
    });

    // Recherche dans le contenu (poids faible)
    if (entry.content.toLowerCase().includes(normalizedQuery)) {
      score += 2;
    }

    // Recherche exacte dans les mots individuels
    const queryWords = normalizedQuery.split(' ');
    queryWords.forEach(word => {
      if (word.length > 2) {
        entry.searchKeywords.forEach(keyword => {
          if (keyword.toLowerCase() === word) {
            score += 15;
          }
        });
      }
    });

    if (score > 0) {
      results.push({ entry, score });
    }
  });

  // Trier par score décroissant et retourner les meilleurs résultats
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(result => result.entry);
}

export function getEntriesByCategory(category: string): KnowledgeBaseEntry[] {
  return knowledgeBase.filter(entry => entry.category === category);
}

export function getEntriesByModule(module: string): KnowledgeBaseEntry[] {
  return knowledgeBase.filter(entry => entry.module === module);
}

export function getRandomEntries(count: number = 3): KnowledgeBaseEntry[] {
  const shuffled = [...knowledgeBase].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}