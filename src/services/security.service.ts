/**
 * WiseBook ERP - Security Service (Refactoré)
 *
 * Gestion des utilisateurs, rôles et permissions.
 * Utilise les endpoints backend: /api/users/, /api/roles/, /api/permissions/
 *
 * @version 3.0.0 - Refactored
 * @date 2025-10-18
 */

import { apiClient } from '@/lib/api';
import API_ENDPOINTS from '@/config/apiEndpoints';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined?: string;
  last_login?: string;
  roles?: string[];
  permissions?: string[];
  company?: string;
  company_name?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions?: string[];
  is_active: boolean;
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: string;
  name: string;
  codename: string;
  content_type?: string;
  content_type_name?: string;
  description?: string;
  module?: string;
}

interface ApiResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results: T[];
}

// ============================================================================
// SECURITY SERVICE
// ============================================================================

export const securityService = {
  // ==========================================================================
  // USERS
  // ==========================================================================

  async getUsers(params?: {
    search?: string;
    is_active?: boolean;
    is_staff?: boolean;
    company?: string;
    role?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: User[]; count?: number }> {
    try {
      const response = await apiClient.get<ApiResponse<User>>(
        API_ENDPOINTS.USERS.LIST,
        params
      );
      return { results: response.results || [], count: response.count };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  async getUser(id: string): Promise<User> {
    try {
      return await apiClient.get<User>(API_ENDPOINTS.USERS.DETAIL(id));
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  async createUser(data: Partial<User> & { password?: string }): Promise<User> {
    try {
      return await apiClient.post<User>(API_ENDPOINTS.USERS.CREATE, data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    try {
      return await apiClient.put<User>(API_ENDPOINTS.USERS.UPDATE(id), data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  async deleteUser(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.USERS.DELETE(id));
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // ==========================================================================
  // ROLES
  // ==========================================================================

  async getRoles(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Role[]; count?: number }> {
    try {
      const response = await apiClient.get<ApiResponse<Role>>(
        API_ENDPOINTS.ROLES.LIST,
        params
      );
      return { results: response.results || [], count: response.count };
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  },

  async getRole(id: string): Promise<Role> {
    try {
      return await apiClient.get<Role>(API_ENDPOINTS.ROLES.DETAIL(id));
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
    }
  },

  async createRole(data: Partial<Role>): Promise<Role> {
    try {
      return await apiClient.post<Role>(API_ENDPOINTS.ROLES.CREATE, data);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  },

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    try {
      return await apiClient.put<Role>(API_ENDPOINTS.ROLES.UPDATE(id), data);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  },

  async deleteRole(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.ROLES.DELETE(id));
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  },

  // ==========================================================================
  // PERMISSIONS
  // ==========================================================================

  async getPermissions(params?: {
    search?: string;
    content_type?: string;
    module?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ results: Permission[]; count?: number }> {
    try {
      const response = await apiClient.get<ApiResponse<Permission>>(
        API_ENDPOINTS.PERMISSIONS.LIST,
        params
      );
      return { results: response.results || [], count: response.count };
    } catch (error) {
      console.error('Error fetching permissions:', error);
      throw error;
    }
  },

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  hasPermission(user: User, permissionCode: string): boolean {
    if (user.is_superuser) return true;
    return user.permissions?.includes(permissionCode) || false;
  },

  hasRole(user: User, roleCode: string): boolean {
    return user.roles?.includes(roleCode) || false;
  },

  hasAnyRole(user: User, roleCodes: string[]): boolean {
    if (user.is_superuser) return true;
    return roleCodes.some((code) => this.hasRole(user, code));
  },

  // ==========================================================================
  // COMPATIBILITY METHODS (pour backward compatibility avec ancien code)
  // Ces méthodes seront supprimées dans une version future
  // ==========================================================================

  async getDashboardStats() {
    // TODO: Créer un vrai endpoint backend pour ces stats
    const users = await this.getUsers({ page_size: 1000 });
    const roles = await this.getRoles({ page_size: 1000 });

    return {
      totalUsers: users.count || 0,
      activeUsers: users.results.filter(u => u.is_active).length,
      totalRoles: roles.count || 0,
      activeRoles: roles.results.filter(r => r.is_active).length,
      recentLogins: 0, // TODO: Implémenter quand endpoint backend existe
      failedAttempts: 0, // TODO: Implémenter quand endpoint backend existe
      passwordExpiring: 0, // TODO: Implémenter quand endpoint backend existe
    };
  },

  async getSecurityOverview() {
    return this.getDashboardStats();
  },

  async getUserActivity() {
    // TODO: Créer endpoint backend /api/user-activity/
    console.warn('getUserActivity: endpoint backend pas encore implémenté');
    return [];
  },

  async getSecurityEvents(filters?: any) {
    // TODO: Créer endpoint backend /api/security-events/
    console.warn('getSecurityEvents: endpoint backend pas encore implémenté');
    return { events: [], totalPages: 0, totalCount: 0, currentPage: 1 };
  },

  async getRecentSecurityEvents(limit: number = 10) {
    // TODO: Créer endpoint backend /api/security-events/recent/
    console.warn('getRecentSecurityEvents: endpoint backend pas encore implémenté');
    return [];
  },

  async getAlerts() {
    // TODO: Créer endpoint backend /api/security-alerts/
    console.warn('getAlerts: endpoint backend pas encore implémenté');
    return [];
  },

  async getSecurityAlerts() {
    return this.getAlerts();
  },

  async getUserActivitySummary() {
    // TODO: Créer endpoint backend /api/user-activity/summary/
    console.warn('getUserActivitySummary: endpoint backend pas encore implémenté');
    return {
      totalSessions: 0,
      activeSessions: 0,
      averageSessionDuration: 0,
      peakHour: '00:00',
      topUsers: []
    };
  },
};

export default securityService;