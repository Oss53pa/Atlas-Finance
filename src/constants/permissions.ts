/**
 * Route-based permissions configuration for WiseBook ERP
 *
 * This file defines role-based access control (RBAC) for all application routes.
 * Each route pattern can specify allowed roles and/or required permissions.
 */

export type UserRole = 'admin' | 'manager' | 'comptable' | 'accountant' | 'user' | 'viewer';

export interface RoutePermission {
  roles?: UserRole[];
  permissions?: string[];
}

/**
 * Route permission mappings
 * - Use wildcard (*) for matching all sub-routes
 * - More specific routes take precedence over wildcards
 * - If both roles and permissions are defined, user must satisfy either condition (OR logic)
 */
export const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  // Accounting module
  '/accounting/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['accounting.read', 'accounting.write']
  },

  // Closures module
  '/closures/*': {
    roles: ['admin', 'comptable', 'accountant'],
    permissions: ['closures.read', 'closures.validate']
  },

  // Security module (admin only)
  '/security/*': {
    roles: ['admin'],
    permissions: ['security.manage']
  },

  // Settings (admin only)
  '/settings/*': {
    roles: ['admin']
  },

  // Treasury module
  '/treasury/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['treasury.read', 'treasury.write']
  },

  // Taxation module
  '/taxation/*': {
    roles: ['admin', 'comptable', 'accountant'],
    permissions: ['taxation.read', 'taxation.write']
  },

  // Budgeting module
  '/budgeting/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['budgeting.read', 'budgeting.write']
  },

  // Third parties (Tiers)
  '/tiers/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['tiers.read', 'tiers.write']
  },
  '/third-party/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager']
  },

  // Fixed assets
  '/assets/*': {
    roles: ['admin', 'comptable', 'accountant'],
    permissions: ['assets.read', 'assets.write']
  },

  // Reporting module
  '/reporting/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['reporting.read']
  },
  '/reports/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager']
  },

  // Analytics module
  '/analytics/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['analytics.read']
  },
  '/financial-analysis-advanced': {
    roles: ['admin', 'comptable', 'accountant', 'manager']
  },

  // Inventory module
  '/inventory/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['inventory.read', 'inventory.write']
  },

  // Financial statements
  '/financial-statements/*': {
    roles: ['admin', 'comptable', 'accountant', 'manager'],
    permissions: ['financial.read']
  },

  // Configuration (admin + comptable)
  '/config/*': {
    roles: ['admin', 'comptable', 'accountant']
  },

  // Core settings
  '/core/*': {
    roles: ['admin']
  },

  // Dashboards (all authenticated users)
  '/dashboard/*': {
    roles: ['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']
  },
  '/executive': {
    roles: ['admin', 'manager']
  },

  // Workspaces
  '/workspace/admin': {
    roles: ['admin']
  },
  '/workspace/manager': {
    roles: ['admin', 'manager']
  },
  '/workspace/comptable': {
    roles: ['admin', 'comptable', 'accountant']
  },
  '/workspace': {
    roles: ['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']
  },
};

/**
 * Permission categories for granular access control
 * These can be assigned to users in addition to roles
 */
export const PERMISSION_CATEGORIES = {
  ACCOUNTING: [
    'accounting.read',
    'accounting.write',
    'accounting.validate',
    'accounting.delete',
  ],
  CLOSURES: [
    'closures.read',
    'closures.write',
    'closures.validate',
    'closures.approve',
  ],
  TREASURY: [
    'treasury.read',
    'treasury.write',
    'treasury.validate',
    'treasury.approve',
  ],
  TAXATION: [
    'taxation.read',
    'taxation.write',
    'taxation.submit',
  ],
  ASSETS: [
    'assets.read',
    'assets.write',
    'assets.dispose',
  ],
  REPORTING: [
    'reporting.read',
    'reporting.create',
    'reporting.export',
  ],
  SECURITY: [
    'security.manage',
    'security.users.read',
    'security.users.write',
    'security.roles.manage',
  ],
  BUDGETING: [
    'budgeting.read',
    'budgeting.write',
    'budgeting.approve',
  ],
  TIERS: [
    'tiers.read',
    'tiers.write',
    'tiers.delete',
  ],
  INVENTORY: [
    'inventory.read',
    'inventory.write',
    'inventory.adjust',
  ],
  ANALYTICS: [
    'analytics.read',
    'analytics.configure',
  ],
  FINANCIAL: [
    'financial.read',
    'financial.export',
  ],
} as const;

/**
 * Helper function to check if a path matches a route pattern
 */
export function matchRoutePattern(path: string, pattern: string): boolean {
  if (pattern === path) return true;

  if (pattern.endsWith('/*')) {
    const basePattern = pattern.slice(0, -2);
    return path.startsWith(basePattern);
  }

  return false;
}

/**
 * Get route permissions for a given path
 * Returns the most specific matching route permission
 */
export function getRoutePermissions(path: string): RoutePermission | null {
  // First, check for exact match
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  // Then, check for wildcard matches, prioritizing longer (more specific) patterns
  const wildcardMatches = Object.entries(ROUTE_PERMISSIONS)
    .filter(([pattern]) => matchRoutePattern(path, pattern))
    .sort((a, b) => b[0].length - a[0].length);

  if (wildcardMatches.length > 0) {
    return wildcardMatches[0][1];
  }

  return null;
}

/**
 * Role hierarchy for privilege escalation checks
 * Higher number = higher privilege level
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'viewer': 1,
  'user': 2,
  'accountant': 3,
  'comptable': 3, // Same level as accountant
  'manager': 4,
  'admin': 5,
};
