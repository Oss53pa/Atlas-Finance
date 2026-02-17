/**
 * Tests pour DoubleSidebar
 *
 * Teste tous les éléments cliquables identifiés dans l'audit:
 * - Bouton toggle sidebar principale (ligne 281)
 * - Liens de navigation modules (ligne 285-320)
 * - Bouton fermeture sidebar secondaire (ligne 337)
 * - Liens sous-modules (ligne 357-378)
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import DoubleSidebar from '../DoubleSidebar';
import { NavigationProvider } from '../../../contexts/NavigationContext';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import {
  findButtonByLabel,
  findLinkByLabel,
  assertNoModal,
  useClickableAction,
  testKeyboardNavigation,
} from '../../../test/helpers/clickable-assertions';

// ============================================================================
// Helpers de Rendu
// ============================================================================

const renderWithProviders = (ui: React.ReactElement, { route = '/' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider>
        <NavigationProvider>{ui}</NavigationProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

// ============================================================================
// Tests - Bouton Toggle Sidebar Principale
// ============================================================================

describe('DoubleSidebar - Toggle Sidebar Principale', () => {
  test('CLICKABLE-001: Bouton toggle doit être accessible et fonctionnel (souris)', async () => {
    renderWithProviders(<DoubleSidebar />);

    const toggleButton = findButtonByLabel(/réduire|étendre/i);
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('title');

    // Clic devrait changer l'état
    const user = userEvent.setup();
    await user.click(toggleButton);

    // Vérifier qu'aucune modale ne s'ouvre (state change uniquement)
    await assertNoModal({ timeout: 500 });
  });

  test('CLICKABLE-001: Bouton toggle doit être accessible au clavier (Enter)', async () => {
    renderWithProviders(<DoubleSidebar />);

    const toggleButton = findButtonByLabel(/réduire|étendre/i);

    await testKeyboardNavigation(toggleButton);
  });

  test('CLICKABLE-001: Bouton toggle doit avoir un label accessible', () => {
    renderWithProviders(<DoubleSidebar />);

    const toggleButton = findButtonByLabel(/réduire|étendre/i);

    // Doit avoir soit textContent, soit aria-label, soit title
    expect(toggleButton).toHaveAccessibleLabel();
  });
});

// ============================================================================
// Tests - Navigation Modules (Sidebar Principale)
// ============================================================================

describe('DoubleSidebar - Navigation Modules', () => {
  const modules = [
    { label: /dashboard/i, route: '/dashboard' },
    { label: /comptabilité|accounting/i, route: '/accounting' },
    { label: /tiers|third.party/i, route: '/third-party' },
    { label: /trésorerie|treasury/i, route: '/treasury' },
    { label: /immobilisations|assets/i, route: '/assets' },
  ];

  modules.forEach(({ label, route }) => {
    test(`CLICKABLE-002: Module "${String(label)}" doit naviguer vers ${route}`, async () => {
      renderWithProviders(<DoubleSidebar />);

      await useClickableAction({
        selector: { type: 'role', value: 'link', name: label },
        expected: 'navigation',
        navigationOptions: {
          expectedUrl: route,
        },
      });
    });

    test(`CLICKABLE-002: Module "${String(label)}" accessible au clavier`, async () => {
      renderWithProviders(<DoubleSidebar />);

      const moduleLink = findLinkByLabel(label);
      await testKeyboardNavigation(moduleLink);
    });
  });

  test('CLICKABLE-002: Module avec sous-modules doit ouvrir la sidebar secondaire', async () => {
    renderWithProviders(<DoubleSidebar />);

    const user = userEvent.setup();

    // Module "Comptabilité" a des sous-modules
    const comptaModule = findLinkByLabel(/comptabilité|accounting/i);
    await user.click(comptaModule);

    // Attendre que la sidebar secondaire apparaisse
    await waitFor(() => {
      const secondarySidebar = screen.getByText(/journaux|balance|grand livre/i);
      expect(secondarySidebar).toBeInTheDocument();
    });

    // Pas de modale
    await assertNoModal({ timeout: 500 });
  });

  test('CLICKABLE-002: Module actif doit avoir le style approprié', () => {
    renderWithProviders(<DoubleSidebar />, { route: '/dashboard' });

    const dashboardModule = findLinkByLabel(/dashboard/i);

    // Doit avoir les classes de module actif
    expect(dashboardModule).toHaveClass(/bg-gradient/);
  });
});

// ============================================================================
// Tests - Sidebar Secondaire
// ============================================================================

describe('DoubleSidebar - Sidebar Secondaire', () => {
  test('CLICKABLE-003: Bouton fermeture sidebar secondaire doit fonctionner', async () => {
    renderWithProviders(<DoubleSidebar />, { route: '/accounting' });

    const user = userEvent.setup();

    // La sidebar secondaire devrait être visible (route /accounting a des sous-modules)
    await waitFor(() => {
      expect(screen.getByText(/journaux|balance/i)).toBeInTheDocument();
    });

    // Trouver le bouton de fermeture (icône X)
    const closeButton = screen.getAllByRole('button').find((btn) =>
      btn.querySelector('svg')
    );
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton!);

    // La sidebar secondaire devrait disparaître
    await waitFor(() => {
      expect(screen.queryByText(/journaux|balance/i)).not.toBeInTheDocument();
    });
  });

  test('CLICKABLE-004: Liens sous-modules doivent naviguer correctement', async () => {
    renderWithProviders(<DoubleSidebar />, { route: '/accounting' });

    // Attendre que les sous-modules soient visibles
    await waitFor(() => {
      expect(screen.getByText(/journaux/i)).toBeInTheDocument();
    });

    await useClickableAction({
      selector: { type: 'role', value: 'link', name: /journaux/i },
      expected: 'navigation',
      navigationOptions: {
        expectedUrl: /accounting\/journals/,
      },
    });
  });

  test('CLICKABLE-004: Sous-module actif doit avoir le style approprié', () => {
    renderWithProviders(<DoubleSidebar />, { route: '/accounting/balance' });

    // Trouver le lien "Balance"
    const balanceLink = screen.getByRole('link', { name: /balance/i });

    // Doit avoir les classes de sous-module actif
    expect(balanceLink).toHaveClass(/bg-blue-50|border-blue/);
  });

  test('CLICKABLE-004: Badge de notification doit être visible si présent', () => {
    renderWithProviders(<DoubleSidebar />, { route: '/third-party' });

    // Le module "Clients" a un badge avec la valeur 3
    const clientsLink = screen.getByRole('link', { name: /clients/i });
    const badge = within(clientsLink).queryByText('3');

    if (badge) {
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(/bg-red-500/);
    }
  });
});

// ============================================================================
// Tests - Responsive et Mobile
// ============================================================================

describe('DoubleSidebar - Responsive', () => {
  test('Mobile: Overlay doit se fermer au clic', async () => {
    // Simuler mobile (isMobile = true)
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 1023px)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProviders(<DoubleSidebar />);

    const user = userEvent.setup();

    // Ouvrir la sidebar mobile
    const menuButton = findButtonByLabel(/menu|open/i);
    await user.click(menuButton);

    // Trouver l'overlay (div avec bg-black bg-opacity-50)
    const overlay = document.querySelector('.bg-black.bg-opacity-50');
    expect(overlay).toBeInTheDocument();

    // Cliquer sur l'overlay
    await user.click(overlay as HTMLElement);

    // L'overlay devrait disparaître
    await waitFor(() => {
      expect(document.querySelector('.bg-black.bg-opacity-50')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// Tests - Accessibilité Globale
// ============================================================================

describe('DoubleSidebar - Accessibilité', () => {
  test('Tous les boutons doivent avoir des labels accessibles', () => {
    renderWithProviders(<DoubleSidebar />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleLabel();
    });
  });

  test('Tous les liens doivent être accessibles au clavier', () => {
    renderWithProviders(<DoubleSidebar />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link).toBeKeyboardAccessible();
    });
  });

  test('Navigation doit être possible avec Tab uniquement', async () => {
    renderWithProviders(<DoubleSidebar />);

    const user = userEvent.setup();
    const links = screen.getAllByRole('link');

    // Focus sur le premier lien
    links[0].focus();
    expect(document.activeElement).toBe(links[0]);

    // Tab devrait naviguer vers le lien suivant
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(links[1]);
  });
});

// ============================================================================
// Tests - Anti-patterns identifiés dans l'audit
// ============================================================================

describe('DoubleSidebar - Anti-patterns', () => {
  test('RED FLAG: Aucun toast ne devrait apparaître lors de la navigation', async () => {
    renderWithProviders(<DoubleSidebar />);

    const user = userEvent.setup();
    const moduleLink = findLinkByLabel(/dashboard/i);

    await user.click(moduleLink);

    // Vérifier qu'aucun toast n'apparaît
    await waitFor(() => {
      const toasts = document.querySelectorAll('[role="alert"], .toast, [data-toast]');
      expect(toasts.length).toBe(0);
    });
  });

  test('RED FLAG: Aucune modale ne devrait apparaître lors de la navigation', async () => {
    renderWithProviders(<DoubleSidebar />);

    const user = userEvent.setup();
    const moduleLink = findLinkByLabel(/accounting/i);

    await user.click(moduleLink);

    // Vérifier qu'aucune modale n'apparaît
    await assertNoModal({ timeout: 500 });
  });
});
