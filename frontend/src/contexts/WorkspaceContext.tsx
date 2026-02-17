/**
 * WORKSPACE CONTEXT
 *
 * Gestion globale de l'espace de travail sélectionné
 * Permet de persister le workspace actif et de le partager entre les composants
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { workspaceService } from '../services/workspace.service';
import type { Workspace, WorkspaceRole, WorkspaceDashboard } from '../types/workspace.types';

interface WorkspaceContextType {
  // État du workspace
  currentWorkspace: Workspace | null;
  workspaceDashboard: WorkspaceDashboard | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  loadWorkspaceByRole: (role: WorkspaceRole) => Promise<void>;
  loadWorkspaceDashboard: (workspaceId: string) => Promise<void>;
  refreshDashboard: () => Promise<void>;
  clearWorkspace: () => void;

  // Utilitaires
  getWorkspaceUrl: () => string;
  hasWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const WORKSPACE_STORAGE_KEY = 'atlas_finance_current_workspace';

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [currentWorkspace, setCurrentWorkspaceState] = useState<Workspace | null>(null);
  const [workspaceDashboard, setWorkspaceDashboard] = useState<WorkspaceDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger le workspace depuis le localStorage au démarrage
  useEffect(() => {
    const savedWorkspace = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (savedWorkspace && isAuthenticated) {
      try {
        const workspace = JSON.parse(savedWorkspace);
        setCurrentWorkspaceState(workspace);
      } catch (e) {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
      }
    }
  }, [isAuthenticated]);

  // Charger automatiquement le workspace basé sur le rôle de l'utilisateur
  useEffect(() => {
    if (isAuthenticated && user?.role && !currentWorkspace) {
      const role = user.role as WorkspaceRole;
      loadWorkspaceByRole(role).catch(console.error);
    }
  }, [isAuthenticated, user?.role]);

  // Sauvegarder le workspace dans le localStorage
  const setCurrentWorkspace = useCallback((workspace: Workspace | null) => {
    setCurrentWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    } else {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    }
  }, []);

  // Charger un workspace par rôle
  const loadWorkspaceByRole = useCallback(async (role: WorkspaceRole) => {
    setIsLoading(true);
    setError(null);

    try {
      const workspace = await workspaceService.getByRole(role);
      setCurrentWorkspace(workspace);

      // Charger automatiquement le dashboard
      if (workspace?.id) {
        await loadWorkspaceDashboard(workspace.id);
      }
    } catch (err: any) {
      console.error('Erreur chargement workspace:', err);
      setError(err.message || 'Erreur lors du chargement du workspace');

      // En cas d'erreur, créer un workspace par défaut
      const defaultWorkspace: Workspace = {
        id: `default-${role}`,
        role: role,
        role_display: role.charAt(0).toUpperCase() + role.slice(1),
        name: `Espace ${role}`,
        description: `Espace de travail pour ${role}`,
        icon: 'LayoutDashboard',
        color: role === 'admin' ? '#DC2626' : role === 'manager' ? '#B87333' : '#6A8A82',
        is_active: true,
        order: 0,
        widget_count: 0,
        action_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCurrentWorkspace(defaultWorkspace);
    } finally {
      setIsLoading(false);
    }
  }, [setCurrentWorkspace]);

  // Charger le dashboard d'un workspace
  const loadWorkspaceDashboard = useCallback(async (workspaceId: string) => {
    setIsLoading(true);

    try {
      const dashboard = await workspaceService.getDashboard(workspaceId);
      setWorkspaceDashboard(dashboard);
    } catch (err: any) {
      console.error('Erreur chargement dashboard:', err);
      // Ne pas bloquer si le dashboard ne charge pas
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Rafraîchir le dashboard actuel
  const refreshDashboard = useCallback(async () => {
    if (currentWorkspace?.id) {
      await loadWorkspaceDashboard(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, loadWorkspaceDashboard]);

  // Effacer le workspace (déconnexion)
  const clearWorkspace = useCallback(() => {
    setCurrentWorkspaceState(null);
    setWorkspaceDashboard(null);
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  }, []);

  // Obtenir l'URL du workspace actuel
  const getWorkspaceUrl = useCallback(() => {
    if (!currentWorkspace) return '/dashboard';
    return `/workspace/${currentWorkspace.role}`;
  }, [currentWorkspace]);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaceDashboard,
    isLoading,
    error,
    setCurrentWorkspace,
    loadWorkspaceByRole,
    loadWorkspaceDashboard,
    refreshDashboard,
    clearWorkspace,
    getWorkspaceUrl,
    hasWorkspace: !!currentWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

/**
 * Hook pour utiliser le WorkspaceContext
 */
export const useWorkspaceContext = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }
  return context;
};

/**
 * Hook de redirection automatique vers le workspace approprié
 */
export const useWorkspaceRedirect = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { currentWorkspace, loadWorkspaceByRole } = useWorkspaceContext();

  const redirectToWorkspace = useCallback(async () => {
    if (!isAuthenticated || !user?.role) return;

    const role = user.role as WorkspaceRole;

    // Si pas de workspace chargé, le charger d'abord
    if (!currentWorkspace) {
      await loadWorkspaceByRole(role);
    }

    // Rediriger vers le workspace approprié
    navigate(`/workspace/${role}`, { replace: true });
  }, [isAuthenticated, user?.role, currentWorkspace, loadWorkspaceByRole, navigate]);

  return { redirectToWorkspace };
};

export default WorkspaceContext;
