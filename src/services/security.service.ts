// Service de sécurité - données mock pour la démonstration
export const securityService = {
  getDashboardStats: async () => {
    return {
      totalUsers: 25,
      activeUsers: 23,
      totalRoles: 8,
      activeRoles: 8,
      recentLogins: 145,
      failedAttempts: 3,
      passwordExpiring: 5
    };
  },

  getUsers: async (filters?: any) => {
    const users = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@wisebook.com',
        firstName: 'Jean',
        lastName: 'Administrateur',
        role: 'Administrateur',
        status: 'active',
        lastLogin: '2024-08-25',
        passwordExpiry: '2024-12-25',
        twoFactorEnabled: true
      },
      {
        id: '2',
        username: 'comptable1',
        email: 'comptable@wisebook.com',
        firstName: 'Marie',
        lastName: 'Kouassi',
        role: 'Comptable',
        status: 'active',
        lastLogin: '2024-08-24',
        passwordExpiry: '2024-11-15',
        twoFactorEnabled: false
      }
    ];
    
    return { users, totalPages: 1, totalCount: users.length, currentPage: 1 };
  },

  getRoles: async (filters?: any) => {
    const roles = [
      {
        id: '1',
        name: 'Administrateur',
        description: 'Accès complet au système',
        permissions: ['create', 'read', 'update', 'delete', 'admin'],
        userCount: 2,
        status: 'active'
      },
      {
        id: '2',
        name: 'Comptable',
        description: 'Accès aux modules comptables',
        permissions: ['read', 'create', 'update'],
        userCount: 8,
        status: 'active'
      }
    ];
    
    return { roles, totalPages: 1, totalCount: roles.length, currentPage: 1 };
  },

  getSecurityEvents: async (filters?: any) => {
    const events = [
      {
        id: '1',
        type: 'login_success',
        user: 'admin',
        timestamp: '2024-08-25 10:30:00',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/126.0'
      },
      {
        id: '2',
        type: 'login_failed',
        user: 'unknown',
        timestamp: '2024-08-25 09:15:00',
        ipAddress: '192.168.1.200',
        userAgent: 'Firefox/128.0'
      }
    ];
    
    return { events, totalPages: 1, totalCount: events.length, currentPage: 1 };
  },

  deleteUser: async (id: string) => {
    return { success: true };
  },

  deleteRole: async (id: string) => {
    return { success: true };
  },

  // Méthodes pour les queries spécifiques
  getSecurityOverview: async () => {
    return {
      totalUsers: 25,
      activeUsers: 23,
      totalRoles: 8,
      recentLogins: 145,
      failedAttempts: 3,
      passwordExpiring: 5,
      systemStatus: 'healthy'
    };
  },

  getUserActivity: async () => {
    return [
      {
        id: '1',
        user: 'admin',
        action: 'login',
        timestamp: '2024-08-25 15:30:00',
        ipAddress: '192.168.1.100',
        status: 'success'
      },
      {
        id: '2',
        user: 'comptable1',
        action: 'create_entry',
        timestamp: '2024-08-25 14:45:00',
        ipAddress: '192.168.1.101',
        status: 'success'
      },
      {
        id: '3',
        user: 'unknown',
        action: 'login_attempt',
        timestamp: '2024-08-25 13:20:00',
        ipAddress: '192.168.1.200',
        status: 'failed'
      }
    ];
  },

  getAlerts: async () => {
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Mots de passe expirant bientôt',
        message: '5 utilisateurs doivent renouveler leur mot de passe',
        timestamp: '2024-08-25 10:00:00',
        severity: 'medium'
      },
      {
        id: '2',
        type: 'info',
        title: 'Connexions multiples détectées',
        message: '3 tentatives de connexion échouées pour le compte admin',
        timestamp: '2024-08-25 09:30:00',
        severity: 'low'
      }
    ];
  },

  // Alias pour compatibilité
  getRecentSecurityEvents: async (limit: number = 10) => {
    const events = [
      {
        id: '1',
        type: 'login_success',
        user: 'admin',
        timestamp: '2024-08-25 15:30:00',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/126.0',
        description: 'Connexion réussie'
      },
      {
        id: '2',
        type: 'login_failed',
        user: 'unknown',
        timestamp: '2024-08-25 13:20:00',
        ipAddress: '192.168.1.200',
        userAgent: 'Firefox/128.0',
        description: 'Tentative de connexion échouée'
      }
    ];
    return events.slice(0, limit);
  },

  getUserActivitySummary: async () => {
    return {
      totalSessions: 1245,
      activeSessions: 23,
      averageSessionDuration: 45,
      peakHour: '14:00',
      topUsers: [
        { username: 'admin', sessionCount: 125 },
        { username: 'comptable1', sessionCount: 98 }
      ]
    };
  },

  getSecurityAlerts: async () => {
    return [
      {
        id: '1',
        type: 'warning',
        title: 'Tentatives de connexion suspectes',
        message: 'Plusieurs tentatives échouées détectées',
        timestamp: '2024-08-25 15:00:00',
        severity: 'high',
        status: 'active'
      },
      {
        id: '2',
        type: 'info',
        title: 'Mise à jour de sécurité disponible',
        message: 'Une nouvelle version de sécurité est disponible',
        timestamp: '2024-08-25 12:00:00',
        severity: 'medium',
        status: 'pending'
      }
    ];
  }
};