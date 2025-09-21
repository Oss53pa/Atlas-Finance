// Configuration de l'API WiseBook
const API_CONFIG = {
  // Utiliser le port 5000 pour le serveur API
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  API_PREFIX: '/api',

  // Endpoints
  ENDPOINTS: {
    // Auth
    AUTH: {
      LOGIN: '/auth/login',
      LOGOUT: '/auth/logout',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh'
    },

    // Company
    COMPANY: {
      CURRENT: '/companies/current',
      UPDATE: '/companies/update',
      LIST: '/companies'
    },

    // Accounting
    ACCOUNTING: {
      ACCOUNTS: '/accounting/accounts',
      JOURNALS: '/accounting/journals',
      ENTRIES: '/accounting/entries',
      BALANCE: '/accounting/balance',
      LEDGER: '/accounting/ledger'
    },

    // Settings
    SETTINGS: {
      GET: '/settings',
      UPDATE: '/settings/update',
      TAXES: '/settings/taxes',
      FISCAL: '/settings/fiscal'
    },

    // WiseFM (legacy endpoints)
    WISEFM: {
      CONTRACTS: '/wisefm/contracts',
      CONTRACTS_CURRENT: '/wisefm/contracts/current'
    }
  },

  // Request configuration
  REQUEST: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000 // 1 second
  },

  // Headers par défaut
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Helper pour construire les URLs complètes
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}${endpoint}`;
};

// Helper pour les requêtes avec gestion d'erreur
export const apiRequest = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_CONFIG.HEADERS,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
};

export default API_CONFIG;