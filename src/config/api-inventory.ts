/**
 * INVENTAIRE COMPLET DES ENDPOINTS API - WISEBOOK ERP v3.0
 *
 * Ce fichier recense TOUS les endpoints backend Django REST disponibles
 * Généré le: 27 Septembre 2025
 *
 * Structure: Groupé par modules métier avec méthodes HTTP complètes
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEndpointConfig {
  method: HttpMethod;
  path: string;
  description: string;
  requiresAuth: boolean;
  params?: {
    path?: string[];
    query?: string[];
    body?: Record<string, any>;
  };
  response?: {
    type: string;
    structure?: Record<string, any>;
  };
}

export interface ApiModule {
  [key: string]: ApiEndpointConfig | ApiModule;
}

/**
 * BASE URL de l'API
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const API_PREFIX = '/api';

/**
 * ENDPOINTS COMPLETS PAR MODULE
 */
export const API_ENDPOINTS = {
  /**
   * ========================================
   * CORE - Gestion de base
   * ========================================
   */
  core: {
    // Point d'entrée API
    root: {
      method: 'GET' as HttpMethod,
      path: '/api/',
      description: 'Point d\'entrée principal de l\'API avec liste des endpoints',
      requiresAuth: false,
    },

    // Health check
    health: {
      method: 'GET' as HttpMethod,
      path: '/api/health/',
      description: 'Vérification de l\'état de santé de l\'API',
      requiresAuth: false,
    },

    // Sociétés
    companies: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/societes/',
        description: 'Liste de toutes les sociétés',
        requiresAuth: true,
        params: {
          query: ['page', 'page_size', 'search', 'ordering'],
        },
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/societes/',
        description: 'Créer une nouvelle société',
        requiresAuth: true,
        params: {
          body: {
            nom: 'string',
            code: 'string',
            adresse: 'string',
            telephone: 'string',
            email: 'string',
          },
        },
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/societes/{id}/',
        description: 'Détails d\'une société',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/societes/{id}/',
        description: 'Mettre à jour une société',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      partialUpdate: {
        method: 'PATCH' as HttpMethod,
        path: '/api/societes/{id}/',
        description: 'Mise à jour partielle d\'une société',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/societes/{id}/',
        description: 'Supprimer une société',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Exercices comptables
    fiscalYears: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/exercices/',
        description: 'Liste des exercices comptables',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/exercices/',
        description: 'Créer un exercice comptable',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/exercices/{id}/',
        description: 'Détails d\'un exercice',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/exercices/{id}/',
        description: 'Mettre à jour un exercice',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/exercices/{id}/',
        description: 'Supprimer un exercice',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Devises
    currencies: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/devises/',
        description: 'Liste des devises',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/devises/',
        description: 'Créer une devise',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/devises/{id}/',
        description: 'Détails d\'une devise',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/devises/{id}/',
        description: 'Mettre à jour une devise',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/devises/{id}/',
        description: 'Supprimer une devise',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * AUTHENTICATION - Authentification
   * ========================================
   */
  auth: {
    // JWT Token
    token: {
      obtain: {
        method: 'POST' as HttpMethod,
        path: '/api/auth/token/',
        description: 'Obtenir token JWT',
        requiresAuth: false,
        params: {
          body: {
            username: 'string',
            password: 'string',
          },
        },
      },
      refresh: {
        method: 'POST' as HttpMethod,
        path: '/api/auth/token/refresh/',
        description: 'Rafraîchir token JWT',
        requiresAuth: false,
        params: {
          body: {
            refresh: 'string',
          },
        },
      },
      verify: {
        method: 'POST' as HttpMethod,
        path: '/api/auth/token/verify/',
        description: 'Vérifier token JWT',
        requiresAuth: false,
        params: {
          body: {
            token: 'string',
          },
        },
      },
    },

    // Authentification classique
    login: {
      method: 'POST' as HttpMethod,
      path: '/api/auth/login/',
      description: 'Connexion utilisateur',
      requiresAuth: false,
      params: {
        body: {
          username: 'string',
          password: 'string',
        },
      },
    },
    logout: {
      method: 'POST' as HttpMethod,
      path: '/api/auth/logout/',
      description: 'Déconnexion utilisateur',
      requiresAuth: true,
    },
    profile: {
      method: 'GET' as HttpMethod,
      path: '/api/auth/profile/',
      description: 'Profil utilisateur connecté',
      requiresAuth: true,
    },
    updateProfile: {
      method: 'PUT' as HttpMethod,
      path: '/api/auth/profile/',
      description: 'Mettre à jour profil',
      requiresAuth: true,
    },
  },

  /**
   * ========================================
   * ACCOUNTING - Comptabilité
   * ========================================
   */
  accounting: {
    // Plan comptable
    chartOfAccounts: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/comptes/',
        description: 'Liste des comptes comptables',
        requiresAuth: true,
        params: {
          query: ['page', 'page_size', 'search', 'classe', 'actif'],
        },
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/comptes/',
        description: 'Créer un compte comptable',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/comptes/{id}/',
        description: 'Détails d\'un compte',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/comptes/{id}/',
        description: 'Mettre à jour un compte',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/comptes/{id}/',
        description: 'Supprimer un compte',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Journaux
    journals: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/journaux/',
        description: 'Liste des journaux comptables',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/journaux/',
        description: 'Créer un journal',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/journaux/{id}/',
        description: 'Détails d\'un journal',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/journaux/{id}/',
        description: 'Mettre à jour un journal',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/journaux/{id}/',
        description: 'Supprimer un journal',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Écritures comptables
    entries: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/ecritures/',
        description: 'Liste des écritures comptables',
        requiresAuth: true,
        params: {
          query: ['page', 'page_size', 'journal', 'date_debut', 'date_fin', 'statut'],
        },
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/ecritures/',
        description: 'Créer une écriture comptable',
        requiresAuth: true,
        params: {
          body: {
            journal: 'string',
            date: 'string',
            libelle: 'string',
            lignes: 'array',
          },
        },
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/ecritures/{id}/',
        description: 'Détails d\'une écriture',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/ecritures/{id}/',
        description: 'Mettre à jour une écriture',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/ecritures/{id}/',
        description: 'Supprimer une écriture',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      validate: {
        method: 'POST' as HttpMethod,
        path: '/api/ecritures/{id}/validate/',
        description: 'Valider une écriture',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Lignes d'écriture
    entryLines: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/lignes-ecriture/',
        description: 'Liste des lignes d\'écriture',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/lignes-ecriture/',
        description: 'Créer une ligne d\'écriture',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/lignes-ecriture/{id}/',
        description: 'Détails d\'une ligne',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/lignes-ecriture/{id}/',
        description: 'Mettre à jour une ligne',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/lignes-ecriture/{id}/',
        description: 'Supprimer une ligne',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * THIRD PARTY - Tiers (Clients/Fournisseurs)
   * ========================================
   */
  thirdParty: {
    // Tiers
    list: {
      method: 'GET' as HttpMethod,
      path: '/api/tiers/',
      description: 'Liste des tiers',
      requiresAuth: true,
      params: {
        query: ['page', 'page_size', 'type', 'search'],
      },
    },
    create: {
      method: 'POST' as HttpMethod,
      path: '/api/tiers/',
      description: 'Créer un tiers',
      requiresAuth: true,
    },
    detail: {
      method: 'GET' as HttpMethod,
      path: '/api/tiers/{id}/',
      description: 'Détails d\'un tiers',
      requiresAuth: true,
      params: { path: ['id'] },
    },
    update: {
      method: 'PUT' as HttpMethod,
      path: '/api/tiers/{id}/',
      description: 'Mettre à jour un tiers',
      requiresAuth: true,
      params: { path: ['id'] },
    },
    delete: {
      method: 'DELETE' as HttpMethod,
      path: '/api/tiers/{id}/',
      description: 'Supprimer un tiers',
      requiresAuth: true,
      params: { path: ['id'] },
    },

    // Contacts
    contacts: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/contacts/',
        description: 'Liste des contacts',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/contacts/',
        description: 'Créer un contact',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/contacts/{id}/',
        description: 'Détails d\'un contact',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/contacts/{id}/',
        description: 'Mettre à jour un contact',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/contacts/{id}/',
        description: 'Supprimer un contact',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * TREASURY - Trésorerie
   * ========================================
   */
  treasury: {
    // Comptes bancaires
    bankAccounts: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/comptes-bancaires/',
        description: 'Liste des comptes bancaires',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/comptes-bancaires/',
        description: 'Créer un compte bancaire',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/comptes-bancaires/{id}/',
        description: 'Détails d\'un compte bancaire',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/comptes-bancaires/{id}/',
        description: 'Mettre à jour un compte bancaire',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/comptes-bancaires/{id}/',
        description: 'Supprimer un compte bancaire',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Mouvements bancaires
    bankTransactions: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/mouvements-bancaires/',
        description: 'Liste des mouvements bancaires',
        requiresAuth: true,
        params: {
          query: ['page', 'page_size', 'compte', 'date_debut', 'date_fin'],
        },
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/mouvements-bancaires/',
        description: 'Créer un mouvement bancaire',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/mouvements-bancaires/{id}/',
        description: 'Détails d\'un mouvement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/mouvements-bancaires/{id}/',
        description: 'Mettre à jour un mouvement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/mouvements-bancaires/{id}/',
        description: 'Supprimer un mouvement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * ASSETS - Immobilisations
   * ========================================
   */
  assets: {
    // Immobilisations
    fixedAssets: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/immobilisations/',
        description: 'Liste des immobilisations',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/immobilisations/',
        description: 'Créer une immobilisation',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/immobilisations/{id}/',
        description: 'Détails d\'une immobilisation',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/immobilisations/{id}/',
        description: 'Mettre à jour une immobilisation',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/immobilisations/{id}/',
        description: 'Supprimer une immobilisation',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Amortissements
    depreciations: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/amortissements/',
        description: 'Liste des amortissements',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/amortissements/',
        description: 'Créer un amortissement',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/amortissements/{id}/',
        description: 'Détails d\'un amortissement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/amortissements/{id}/',
        description: 'Mettre à jour un amortissement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/amortissements/{id}/',
        description: 'Supprimer un amortissement',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * ANALYTICS - Comptabilité Analytique
   * ========================================
   */
  analytics: {
    // Axes analytiques
    axes: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/axes-analytiques/',
        description: 'Liste des axes analytiques',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/axes-analytiques/',
        description: 'Créer un axe analytique',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/axes-analytiques/{id}/',
        description: 'Détails d\'un axe',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/axes-analytiques/{id}/',
        description: 'Mettre à jour un axe',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/axes-analytiques/{id}/',
        description: 'Supprimer un axe',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Centres analytiques
    centers: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/centres-analytiques/',
        description: 'Liste des centres analytiques',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/centres-analytiques/',
        description: 'Créer un centre analytique',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/centres-analytiques/{id}/',
        description: 'Détails d\'un centre',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/centres-analytiques/{id}/',
        description: 'Mettre à jour un centre',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/centres-analytiques/{id}/',
        description: 'Supprimer un centre',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * BUDGETING - Budget
   * ========================================
   */
  budgeting: {
    // Budgets
    budgets: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/budgets/',
        description: 'Liste des budgets',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/budgets/',
        description: 'Créer un budget',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/budgets/{id}/',
        description: 'Détails d\'un budget',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/budgets/{id}/',
        description: 'Mettre à jour un budget',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/budgets/{id}/',
        description: 'Supprimer un budget',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Contrôles budgétaires
    controls: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/controles-budgetaires/',
        description: 'Liste des contrôles budgétaires',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/controles-budgetaires/',
        description: 'Créer un contrôle budgétaire',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/controles-budgetaires/{id}/',
        description: 'Détails d\'un contrôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/controles-budgetaires/{id}/',
        description: 'Mettre à jour un contrôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/controles-budgetaires/{id}/',
        description: 'Supprimer un contrôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * TAXATION - Fiscalité
   * ========================================
   */
  taxation: {
    // Déclarations fiscales
    declarations: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/declarations-fiscales/',
        description: 'Liste des déclarations fiscales',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/declarations-fiscales/',
        description: 'Créer une déclaration fiscale',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/declarations-fiscales/{id}/',
        description: 'Détails d\'une déclaration',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/declarations-fiscales/{id}/',
        description: 'Mettre à jour une déclaration',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/declarations-fiscales/{id}/',
        description: 'Supprimer une déclaration',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },

  /**
   * ========================================
   * REPORTING - Rapports et Dashboards
   * ========================================
   */
  reporting: {
    // Rapports
    reports: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/rapports/',
        description: 'Liste des rapports',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/rapports/',
        description: 'Créer un rapport',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/rapports/{id}/',
        description: 'Détails d\'un rapport',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      generate: {
        method: 'POST' as HttpMethod,
        path: '/api/rapports/{id}/generate/',
        description: 'Générer un rapport',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      export: {
        method: 'GET' as HttpMethod,
        path: '/api/rapports/{id}/export/',
        description: 'Exporter un rapport',
        requiresAuth: true,
        params: {
          path: ['id'],
          query: ['format'], // pdf, excel, csv
        },
      },
    },

    // Dashboards
    dashboards: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/dashboards/',
        description: 'Liste des dashboards',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/dashboards/{id}/',
        description: 'Données d\'un dashboard',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      data: {
        method: 'GET' as HttpMethod,
        path: '/api/dashboard/',
        description: 'Données du dashboard principal',
        requiresAuth: true,
      },
    },
  },

  /**
   * ========================================
   * SECURITY - Sécurité et Permissions
   * ========================================
   */
  security: {
    // Utilisateurs
    users: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/utilisateurs/',
        description: 'Liste des utilisateurs',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/utilisateurs/',
        description: 'Créer un utilisateur',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/utilisateurs/{id}/',
        description: 'Détails d\'un utilisateur',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/utilisateurs/{id}/',
        description: 'Mettre à jour un utilisateur',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/utilisateurs/{id}/',
        description: 'Supprimer un utilisateur',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },

    // Rôles
    roles: {
      list: {
        method: 'GET' as HttpMethod,
        path: '/api/roles/',
        description: 'Liste des rôles',
        requiresAuth: true,
      },
      create: {
        method: 'POST' as HttpMethod,
        path: '/api/roles/',
        description: 'Créer un rôle',
        requiresAuth: true,
      },
      detail: {
        method: 'GET' as HttpMethod,
        path: '/api/roles/{id}/',
        description: 'Détails d\'un rôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      update: {
        method: 'PUT' as HttpMethod,
        path: '/api/roles/{id}/',
        description: 'Mettre à jour un rôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
      delete: {
        method: 'DELETE' as HttpMethod,
        path: '/api/roles/{id}/',
        description: 'Supprimer un rôle',
        requiresAuth: true,
        params: { path: ['id'] },
      },
    },
  },
} as const;

/**
 * HELPER FUNCTIONS
 */

/**
 * Construire l'URL complète d'un endpoint
 */
export function buildApiUrl(endpoint: ApiEndpointConfig, pathParams?: Record<string, string | number>): string {
  let url = API_BASE_URL + endpoint.path;

  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, String(value));
    });
  }

  return url;
}

/**
 * Extraire tous les endpoints de l'inventaire
 */
export function getAllEndpoints(): ApiEndpointConfig[] {
  const endpoints: ApiEndpointConfig[] = [];

  function extractEndpoints(obj: any) {
    for (const key in obj) {
      const value = obj[key];
      if (value && typeof value === 'object') {
        if ('method' in value && 'path' in value) {
          endpoints.push(value as ApiEndpointConfig);
        } else {
          extractEndpoints(value);
        }
      }
    }
  }

  extractEndpoints(API_ENDPOINTS);
  return endpoints;
}

/**
 * Compter le nombre total d'endpoints
 */
export function countEndpoints(): number {
  return getAllEndpoints().length;
}

/**
 * Grouper les endpoints par module
 */
export function getEndpointsByModule(): Record<string, ApiEndpointConfig[]> {
  const byModule: Record<string, ApiEndpointConfig[]> = {};

  Object.keys(API_ENDPOINTS).forEach(module => {
    byModule[module] = [];
    const moduleEndpoints = (API_ENDPOINTS as any)[module];

    function extractFromModule(obj: any) {
      for (const key in obj) {
        const value = obj[key];
        if (value && typeof value === 'object') {
          if ('method' in value && 'path' in value) {
            byModule[module].push(value as ApiEndpointConfig);
          } else {
            extractFromModule(value);
          }
        }
      }
    }

    extractFromModule(moduleEndpoints);
  });

  return byModule;
}

/**
 * STATISTIQUES
 */
export const API_STATS = {
  totalEndpoints: countEndpoints(),
  modules: Object.keys(API_ENDPOINTS).length,
  endpointsByModule: getEndpointsByModule(),
};

// Export pour debug
if (import.meta.env.DEV) {
  console.log('📊 API Inventory Stats:', API_STATS);
  console.log(`✅ ${API_STATS.totalEndpoints} endpoints catalogués`);
  console.log(`📦 ${API_STATS.modules} modules API`);
}