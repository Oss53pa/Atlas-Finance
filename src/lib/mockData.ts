/**
 * DONNÉES MOCKÉES POUR LE MODE DÉMO
 *
 * Ces données sont utilisées quand l'utilisateur se connecte avec un compte démo
 * pour éviter les erreurs 401 et afficher du contenu réaliste
 */

export const MOCK_DATA = {
  // Informations système
  systemInfo: {
    name: 'Atlas Finance',
    version: '3.0.0',
    description: 'Système ERP Comptable et Financier SYSCOHADA',
    environment: 'development (DEMO)',
    features: {
      syscohada_compliant: true,
      multi_currency: true,
      ssl_enabled: true,
      modules_count: 10,
    }
  },

  // Statistiques système
  systemStats: {
    users: {
      total: 25,
      active: 18,
    },
    companies: {
      total: 5,
      active: 3,
    },
    system: {
      uptime: '99.9%',
      database: 'PostgreSQL',
      cache: 'Redis',
    }
  },

  // Workspaces comptable
  workspacesComptable: {
    count: 3,
    results: [
      {
        id: 1,
        name: 'Comptabilité Générale',
        description: 'Gestion du plan comptable et des écritures',
        icon: 'Calculator',
        route: '/accounting',
        color: '#4F46E5',
        modules: ['Plan Comptable', 'Écritures', 'Grand Livre', 'Balance'],
      },
      {
        id: 2,
        name: 'Trésorerie',
        description: 'Suivi des flux de trésorerie et rapprochements bancaires',
        icon: 'Wallet',
        route: '/treasury',
        color: '#059669',
        modules: ['Comptes Bancaires', 'Rapprochements', 'Prévisions'],
      },
      {
        id: 3,
        name: 'Immobilisations',
        description: 'Gestion des actifs fixes et amortissements',
        icon: 'Package',
        route: '/assets',
        color: '#DC2626',
        modules: ['Registre', 'Amortissements', 'Cessions'],
      },
    ],
  },

  // Modules système
  systemModules: {
    count: 9,
    modules: [
      {
        id: 'accounting',
        name: 'Comptabilité',
        description: 'Plan comptable SYSCOHADA, écritures, journaux, grand livre',
        icon: 'Calculator',
        route: '/accounting',
        color: '#4F46E5',
        active: true,
        features: ['SYSCOHADA', 'Écritures', 'Journaux', 'Grand Livre']
      },
      {
        id: 'treasury',
        name: 'Trésorerie',
        description: 'Gestion bancaire, rapprochements, flux de trésorerie',
        icon: 'Wallet',
        route: '/treasury',
        color: '#059669',
        active: true,
        features: ['Comptes bancaires', 'Rapprochements', 'Cash flow']
      },
      {
        id: 'assets',
        name: 'Immobilisations',
        description: 'Actifs fixes, amortissements, plus/moins-values',
        icon: 'Package',
        route: '/assets',
        color: '#DC2626',
        active: true,
        features: ['Registre actifs', 'Amortissements', 'Cessions']
      },
      {
        id: 'analytics',
        name: 'Analytique',
        description: 'Axes analytiques, centres de coûts, tableaux de bord',
        icon: 'PieChart',
        route: '/analytics',
        color: '#7C2D12',
        active: true,
        features: ['Axes analytiques', 'Centres de coûts', 'Reporting']
      },
      {
        id: 'budgeting',
        name: 'Budget',
        description: 'Budgets prévisionnels, contrôle budgétaire, écarts',
        icon: 'Target',
        route: '/budgeting',
        color: '#BE185D',
        active: true,
        features: ['Budgets', 'Contrôle', 'Écarts']
      },
      {
        id: 'taxation',
        name: 'Fiscalité',
        description: 'Déclarations TVA, IS, télédéclarations fiscales',
        icon: 'FileText',
        route: '/taxation',
        color: '#9333EA',
        active: true,
        features: ['TVA', 'IS', 'Télédéclarations']
      },
      {
        id: 'third-party',
        name: 'Tiers',
        description: 'Clients, fournisseurs, contacts et recouvrement',
        icon: 'Users',
        route: '/third-party',
        color: '#0891B2',
        active: true,
        features: ['Clients', 'Fournisseurs', 'Contacts']
      },
      {
        id: 'reporting',
        name: 'Reporting',
        description: 'Rapports personnalisés, tableaux de bord dynamiques',
        icon: 'BarChart3',
        route: '/reporting',
        color: '#EA580C',
        active: true,
        features: ['Rapports', 'Dashboards', 'Export']
      },
      {
        id: 'security',
        name: 'Sécurité',
        description: 'Utilisateurs, rôles, permissions, audit de sécurité',
        icon: 'Shield',
        route: '/security',
        color: '#1F2937',
        active: true,
        features: ['Utilisateurs', 'Rôles', 'Audit']
      },
    ]
  },

  // KPIs Dashboard
  dashboardKPIs: {
    financial: {
      revenue: 1250000,
      expenses: 875000,
      profit: 375000,
      margin: 30,
    },
    treasury: {
      balance: 450000,
      inflow: 125000,
      outflow: 98000,
      forecast: 477000,
    },
    accounting: {
      entries: 1250,
      pending: 23,
      validated: 1227,
      errors: 0,
    },
  },
};

/**
 * Vérifie si une URL correspond à un endpoint qui a des données mockées
 */
export function hasMockData(url: string): boolean {
  const mockableEndpoints = [
    '/api/system/info',
    '/api/system/stats',
    '/api/system/modules',
    '/api/workspaces/by-role/comptable',
    '/api/v1/dashboard/kpis',
  ];

  return mockableEndpoints.some(endpoint => url.includes(endpoint));
}

/**
 * Récupère les données mockées pour une URL donnée
 */
export function getMockData(url: string): any {
  if (url.includes('/api/system/info')) {
    return MOCK_DATA.systemInfo;
  }

  if (url.includes('/api/system/stats')) {
    return MOCK_DATA.systemStats;
  }

  if (url.includes('/api/system/modules')) {
    return MOCK_DATA.systemModules;
  }

  if (url.includes('/api/workspaces/by-role/comptable')) {
    return MOCK_DATA.workspacesComptable;
  }

  if (url.includes('/api/v1/dashboard/kpis')) {
    return MOCK_DATA.dashboardKPIs;
  }

  return null;
}

/**
 * Vérifie si on est en mode démo
 */
export function isDemoMode(): boolean {
  const token = localStorage.getItem('accessToken');
  return token?.startsWith('demo_token_') || false;
}
