/**
 * HOOKS REACT QUERY - SÉCURITÉ
 *
 * Hooks pour la gestion des utilisateurs, rôles et permissions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';
import type { SecurityQueryParams, QueryParams } from '../types/api.params';

// ========================================
// QUERY KEYS
// ========================================
export const securityKeys = {
  all: ['security'] as const,
  users: (params?: SecurityQueryParams) => [...securityKeys.all, 'users', params] as const,
  user: (id: string) => [...securityKeys.all, 'users', id] as const,
  roles: () => [...securityKeys.all, 'roles'] as const,
  role: (id: string) => [...securityKeys.all, 'roles', id] as const,
  permissions: () => [...securityKeys.all, 'permissions'] as const,
  auditLog: (params?: QueryParams) => [...securityKeys.all, 'audit-log', params] as const,
  sessions: () => [...securityKeys.all, 'sessions'] as const,
  mfaSettings: () => [...securityKeys.all, 'mfa-settings'] as const,
};

// ========================================
// TYPES
// ========================================
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_display: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  permissions: string[];
  groups: string[];
  last_login?: string;
  date_joined: string;
  mfa_enabled: boolean;
  avatar_url?: string;
  phone?: string;
  department?: string;
}

export interface Role {
  id: string;
  name: string;
  code: string;
  description?: string;
  permissions: Permission[];
  user_count: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  codename: string;
  content_type: string;
  description?: string;
  category: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  user_email: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'print' | 'view';
  model: string;
  object_id?: string;
  object_repr: string;
  changes?: Record<string, { old: any; new: any }>;
  ip_address: string;
  user_agent?: string;
  timestamp: string;
}

export interface UserSession {
  id: string;
  user: string;
  ip_address: string;
  user_agent: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  location?: string;
  created_at: string;
  last_activity: string;
  is_current: boolean;
}

export interface MFASettings {
  is_enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  backup_codes_count: number;
  last_used?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active?: boolean;
  permissions?: string[];
  groups?: string[];
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'password'>> {
  new_password?: string;
}

// ========================================
// HOOKS - QUERIES
// ========================================

/**
 * Hook pour récupérer la liste des utilisateurs
 */
export const useUsers = (params?: SecurityQueryParams) => {
  return useQuery({
    queryKey: securityKeys.users(params),
    queryFn: async () => {
      const response = await apiService.get<User[]>('/api/security/users/', params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer un utilisateur spécifique
 */
export const useUser = (id: string) => {
  return useQuery({
    queryKey: securityKeys.user(id),
    queryFn: async () => {
      const response = await apiService.get<User>(`/api/security/users/${id}/`);
      return response;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer la liste des rôles
 */
export const useRoles = () => {
  return useQuery({
    queryKey: securityKeys.roles(),
    queryFn: async () => {
      const response = await apiService.get<Role[]>('/api/security/roles/');
      return response;
    },
    staleTime: 15 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer un rôle spécifique
 */
export const useRole = (id: string) => {
  return useQuery({
    queryKey: securityKeys.role(id),
    queryFn: async () => {
      const response = await apiService.get<Role>(`/api/security/roles/${id}/`);
      return response;
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer toutes les permissions
 */
export const usePermissions = () => {
  return useQuery({
    queryKey: securityKeys.permissions(),
    queryFn: async () => {
      const response = await apiService.get<Permission[]>('/api/security/permissions/');
      return response;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - rarement modifié
  });
};

/**
 * Hook pour récupérer le journal d'audit
 */
export const useAuditLog = (params?: QueryParams) => {
  return useQuery({
    queryKey: securityKeys.auditLog(params),
    queryFn: async () => {
      const response = await apiService.get<AuditLogEntry[]>('/api/security/audit-log/', params);
      return response;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Hook pour récupérer les sessions actives de l'utilisateur
 */
export const useUserSessions = () => {
  return useQuery({
    queryKey: securityKeys.sessions(),
    queryFn: async () => {
      const response = await apiService.get<UserSession[]>('/api/security/sessions/');
      return response;
    },
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook pour récupérer les paramètres MFA
 */
export const useMFASettings = () => {
  return useQuery({
    queryKey: securityKeys.mfaSettings(),
    queryFn: async () => {
      const response = await apiService.get<MFASettings>('/api/security/mfa/settings/');
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });
};

// ========================================
// HOOKS - MUTATIONS
// ========================================

/**
 * Hook pour créer un utilisateur
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserDto) => {
      const response = await apiService.post<User>('/api/security/users/', userData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.users() });
    },
  });
};

/**
 * Hook pour mettre à jour un utilisateur
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserDto }) => {
      const response = await apiService.patch<User>(`/api/security/users/${id}/`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: securityKeys.users() });
      queryClient.invalidateQueries({ queryKey: securityKeys.user(id) });
    },
  });
};

/**
 * Hook pour supprimer un utilisateur
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/api/security/users/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.users() });
    },
  });
};

/**
 * Hook pour activer/désactiver un utilisateur
 */
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const response = await apiService.patch<User>(`/api/security/users/${id}/`, { is_active });
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: securityKeys.users() });
      queryClient.invalidateQueries({ queryKey: securityKeys.user(id) });
    },
  });
};

/**
 * Hook pour réinitialiser le mot de passe d'un utilisateur
 */
export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiService.post(`/api/security/users/${userId}/reset-password/`);
      return response;
    },
  });
};

/**
 * Hook pour créer un rôle
 */
export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleData: Omit<Role, 'id' | 'user_count' | 'is_system' | 'created_at' | 'updated_at'>) => {
      const response = await apiService.post<Role>('/api/security/roles/', roleData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.roles() });
    },
  });
};

/**
 * Hook pour mettre à jour un rôle
 */
export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }) => {
      const response = await apiService.patch<Role>(`/api/security/roles/${id}/`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: securityKeys.roles() });
      queryClient.invalidateQueries({ queryKey: securityKeys.role(id) });
    },
  });
};

/**
 * Hook pour supprimer un rôle
 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.delete(`/api/security/roles/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.roles() });
    },
  });
};

/**
 * Hook pour terminer une session
 */
export const useTerminateSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await apiService.delete(`/api/security/sessions/${sessionId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
    },
  });
};

/**
 * Hook pour terminer toutes les autres sessions
 */
export const useTerminateAllOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiService.post('/api/security/sessions/terminate-all/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.sessions() });
    },
  });
};

/**
 * Hook pour activer le MFA
 */
export const useEnableMFA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (method: 'totp' | 'sms' | 'email') => {
      const response = await apiService.post('/api/security/mfa/enable/', { method });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.mfaSettings() });
    },
  });
};

/**
 * Hook pour désactiver le MFA
 */
export const useDisableMFA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (password: string) => {
      await apiService.post('/api/security/mfa/disable/', { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.mfaSettings() });
    },
  });
};
