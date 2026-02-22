/**
 * Tests pour le composant WorkspaceDashboard
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import WorkspaceDashboard from '../../pages/workspace/WorkspaceDashboard';
import { workspaceService } from '../../services/workspace.service';
import type { WorkspaceRole, Workspace, WorkspaceDashboard as WorkspaceDashboardType } from '../../types/workspace.types';

// Mock du service workspace
jest.mock('../../services/workspace.service');

const mockWorkspaceService = workspaceService as jest.Mocked<typeof workspaceService>;

// Mock de useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('WorkspaceDashboard', () => {
  const mockWorkspace = {
    id: '1',
    role: 'comptable' as const,
    role_display: 'Comptable',
    name: 'Espace Comptable',
    description: 'Tableau de bord comptable',
    icon: 'Calculator',
    color: '#4F46E5',
    is_active: true,
    order: 1,
    widget_count: 3,
    action_count: 5,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  } as Workspace;

  const mockDashboard = {
    workspace: mockWorkspace,
    user_preferences: undefined,
    statistics: [
      {
        id: '1',
        workspace: '1',
        stat_key: 'total_entries',
        stat_label: 'Total Écritures',
        stat_value: '1247',
        stat_type: 'number',
        trend: 12.5,
        trend_direction: 'up',
        metadata: {},
        cache_duration: 300,
        last_calculated: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ],
    widgets: [
      {
        id: '1',
        workspace: '1',
        widget_type: 'stat',
        title: 'Test Widget',
        icon: 'FileText',
        color: '#10B981',
        config: {},
        order: 1,
        width: 1,
        height: 1,
        is_visible: true,
        is_required: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ],
    quick_actions: [
      {
        id: '1',
        workspace: '1',
        label: 'Nouvelle Écriture',
        icon: 'Plus',
        color: '#4F46E5',
        action_type: 'navigate',
        action_target: '/accounting/entry/new',
        order: 1,
        is_visible: true,
        show_badge: false,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
    ],
    pending_tasks: 0,
  } as WorkspaceDashboardType;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche le loader pendant le chargement', () => {
    mockWorkspaceService.getMyWorkspace.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/chargement de votre workspace/i)).toBeInTheDocument();
  });

  it('charge et affiche le workspace avec succès', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Espace Comptable')).toBeInTheDocument();
    });

    expect(screen.getByText('Tableau de bord comptable')).toBeInTheDocument();
  });

  it('affiche les statistiques', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Écritures')).toBeInTheDocument();
    });

    expect(screen.getByText('1247')).toBeInTheDocument();
  });

  it('affiche les actions rapides', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nouvelle Écriture')).toBeInTheDocument();
    });
  });

  it('affiche les widgets', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Widget')).toBeInTheDocument();
    });
  });

  it('gère l\'erreur de chargement', async () => {
    mockWorkspaceService.getMyWorkspace.mockRejectedValue(
      new Error('Workspace not found')
    );

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/erreur/i)).toBeInTheDocument();
    });
  });

  it('permet de rafraîchir le dashboard', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Espace Comptable')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText(/actualiser/i);
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockWorkspaceService.getMyWorkspace).toHaveBeenCalledTimes(2);
    });
  });

  it('navigue vers personnalisation au clic sur le bouton', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Espace Comptable')).toBeInTheDocument();
    });

    const customizeButton = screen.getByText(/personnaliser/i);
    fireEvent.click(customizeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/settings/workspace');
  });

  it('navigue vers la route correcte au clic sur une action rapide', async () => {
    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(mockDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Nouvelle Écriture')).toBeInTheDocument();
    });

    const actionButton = screen.getByText('Nouvelle Écriture');
    fireEvent.click(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith('/accounting/entry/new');
  });

  it('affiche un message si aucun contenu disponible', async () => {
    const emptyDashboard = {
      ...mockDashboard,
      statistics: [],
      widgets: [],
      quick_actions: [],
    };

    mockWorkspaceService.getMyWorkspace.mockResolvedValue(mockWorkspace);
    mockWorkspaceService.getDashboard.mockResolvedValue(emptyDashboard);

    render(
      <BrowserRouter>
        <WorkspaceDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/workspace vide/i)).toBeInTheDocument();
    });
  });
});
