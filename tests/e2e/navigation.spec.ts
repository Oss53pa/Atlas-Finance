/**
 * WiseBook ERP - Tests E2E Navigation
 *
 * Tests end-to-end pour la navigation principale (DoubleSidebar)
 * Couvre les flux critiques identifiés dans l'audit
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Configuration
// ============================================================================

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto('http://localhost:5174');

  // Attendre que l'application charge
  await page.waitForLoadState('networkidle');
});

test.afterAll(async () => {
  await page.close();
});

// ============================================================================
// Tests - Navigation Sidebar Principale
// ============================================================================

test.describe('Navigation - Sidebar Principale', () => {
  test('E2E-001: Ouvrir/fermer la sidebar principale', async () => {
    // Vérifier que la sidebar est ouverte par défaut
    const sidebar = page.locator('.bg-slate-900').first();
    await expect(sidebar).toBeVisible();

    // Vérifier la largeur (256px quand ouverte)
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.width).toBeGreaterThan(200);

    // Cliquer sur le bouton toggle
    const toggleButton = page.getByRole('button', { name: /réduire|menu/i });
    await toggleButton.click();

    // Attendre l'animation
    await page.waitForTimeout(500);

    // Vérifier que la sidebar est réduite (64px)
    const collapsedBox = await sidebar.boundingBox();
    expect(collapsedBox?.width).toBeLessThan(100);

    // Rouvrir
    await toggleButton.click();
    await page.waitForTimeout(500);

    const expandedBox = await sidebar.boundingBox();
    expect(expandedBox?.width).toBeGreaterThan(200);
  });

  test('E2E-002: Naviguer vers Dashboard', async () => {
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await dashboardLink.click();

    // Vérifier l'URL
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Vérifier que le module est actif (classe gradient)
    await expect(dashboardLink).toHaveClass(/bg-gradient/);

    // Vérifier qu'aucune modale ne s'ouvre
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();
  });

  test('E2E-003: Naviguer vers Comptabilité et ouvrir sidebar secondaire', async () => {
    const accountingLink = page.getByRole('link', { name: /comptabilité|accounting/i });
    await accountingLink.click();

    // Vérifier l'URL
    await expect(page).toHaveURL(/.*\/accounting/);

    // Vérifier que la sidebar secondaire s'ouvre automatiquement
    const secondarySidebar = page.locator('.bg-white.border-r').first();
    await expect(secondarySidebar).toBeVisible();

    // Vérifier que des sous-modules sont visibles
    const journalsLink = page.getByRole('link', { name: /journaux/i });
    await expect(journalsLink).toBeVisible();
  });

  test('E2E-004: Naviguer via les sous-modules', async () => {
    // S'assurer qu'on est sur Comptabilité avec sidebar secondaire ouverte
    const accountingLink = page.getByRole('link', { name: /comptabilité|accounting/i });
    await accountingLink.click();

    // Attendre la sidebar secondaire
    await page.waitForSelector('.bg-white.border-r');

    // Cliquer sur "Balance"
    const balanceLink = page.getByRole('link', { name: /balance/i }).first();
    await balanceLink.click();

    // Vérifier l'URL
    await expect(page).toHaveURL(/.*\/accounting\/balance/);

    // Vérifier que le sous-module est actif
    await expect(balanceLink).toHaveClass(/bg-blue-50|border-blue/);

    // Vérifier qu'aucun toast n'apparaît
    const toast = page.locator('[role="alert"]');
    await expect(toast).not.toBeVisible();
  });

  test('E2E-005: Fermer la sidebar secondaire', async () => {
    // S'assurer qu'on est sur Comptabilité
    const accountingLink = page.getByRole('link', { name: /comptabilité|accounting/i });
    await accountingLink.click();

    // Attendre la sidebar secondaire
    const secondarySidebar = page.locator('.bg-white.border-r').first();
    await expect(secondarySidebar).toBeVisible();

    // Cliquer sur le bouton de fermeture (X)
    const closeButton = secondarySidebar.getByRole('button').first();
    await closeButton.click();

    // Vérifier que la sidebar secondaire disparaît
    await expect(secondarySidebar).not.toBeVisible();
  });
});

// ============================================================================
// Tests - Accessibilité Clavier
// ============================================================================

test.describe('Navigation - Accessibilité Clavier', () => {
  test('E2E-006: Navigation au clavier avec Tab', async () => {
    // Recharger la page
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForLoadState('networkidle');

    // Appuyer sur Tab pour naviguer
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Vérifier qu'un élément est focusé
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // L'élément focusé devrait être un lien ou un bouton
    const tagName = await focused.evaluate((el) => el.tagName);
    expect(['A', 'BUTTON']).toContain(tagName);
  });

  test('E2E-007: Activer un lien avec Enter', async () => {
    await page.goto('http://localhost:5174/dashboard');

    // Trouver un lien et le focus
    const treasuryLink = page.getByRole('link', { name: /trésorerie|treasury/i });
    await treasuryLink.focus();

    // Vérifier le focus
    await expect(treasuryLink).toBeFocused();

    // Appuyer sur Enter
    await page.keyboard.press('Enter');

    // Vérifier la navigation
    await expect(page).toHaveURL(/.*\/treasury/);
  });

  test('E2E-008: Fermer sidebar avec Escape (si applicable)', async () => {
    // Pour mobile : tester la fermeture de l'overlay avec Escape
    // Simuler mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174/dashboard');

    // Ouvrir le menu mobile
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();

    // Vérifier que le menu est ouvert
    const sidebar = page.locator('.bg-slate-900').first();
    await expect(sidebar).toBeVisible();

    // Appuyer sur Escape
    await page.keyboard.press('Escape');

    // Le menu devrait se fermer (vérifier l'overlay)
    const overlay = page.locator('.bg-black.bg-opacity-50');
    await expect(overlay).not.toBeVisible();

    // Remettre le viewport desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});

// ============================================================================
// Tests - Responsive
// ============================================================================

test.describe('Navigation - Responsive', () => {
  test('E2E-009: Mode mobile - Overlay doit apparaître', async () => {
    // Simuler mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174/dashboard');

    // Vérifier que la sidebar est cachée par défaut
    const sidebar = page.locator('.bg-slate-900').first();
    await expect(sidebar).not.toBeVisible();

    // Ouvrir le menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();

    // Vérifier que la sidebar apparaît
    await expect(sidebar).toBeVisible();

    // Vérifier que l'overlay apparaît
    const overlay = page.locator('.bg-black.bg-opacity-50');
    await expect(overlay).toBeVisible();

    // Remettre desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('E2E-010: Mode mobile - Clic sur overlay ferme le menu', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5174/dashboard');

    // Ouvrir le menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();

    // Cliquer sur l'overlay
    const overlay = page.locator('.bg-black.bg-opacity-50');
    await overlay.click();

    // Le menu devrait se fermer
    await expect(overlay).not.toBeVisible();

    // Remettre desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});

// ============================================================================
// Tests - Anti-patterns (RED FLAGS)
// ============================================================================

test.describe('Navigation - Détection Anti-patterns', () => {
  test('RED FLAG E2E-011: Aucun toast lors de la navigation', async () => {
    await page.goto('http://localhost:5174/dashboard');

    // Naviguer vers plusieurs modules
    const modules = [
      /comptabilité|accounting/i,
      /tiers|third.party/i,
      /trésorerie|treasury/i,
    ];

    for (const moduleName of modules) {
      const link = page.getByRole('link', { name: moduleName });
      await link.click();

      // Attendre la navigation
      await page.waitForLoadState('networkidle');

      // Vérifier qu'aucun toast n'apparaît
      const toasts = page.locator('[role="alert"], .toast, [data-toast]');
      const toastCount = await toasts.count();
      expect(toastCount).toBe(0);
    }
  });

  test('RED FLAG E2E-012: Aucune modale lors de la navigation', async () => {
    await page.goto('http://localhost:5174/dashboard');

    // Naviguer vers plusieurs modules
    const link = page.getByRole('link', { name: /comptabilité/i });
    await link.click();

    await page.waitForLoadState('networkidle');

    // Vérifier qu'aucune modale n'apparaît
    const modals = page.locator('[role="dialog"]');
    const modalCount = await modals.count();
    expect(modalCount).toBe(0);
  });

  test('RED FLAG E2E-013: Pas de console errors lors de la navigation', async () => {
    const consoleErrors: string[] = [];

    // Capturer les erreurs console
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5174/dashboard');

    // Naviguer vers plusieurs modules
    const accountingLink = page.getByRole('link', { name: /comptabilité/i });
    await accountingLink.click();

    const treasuryLink = page.getByRole('link', { name: /trésorerie/i });
    await treasuryLink.click();

    // Vérifier qu'il n'y a pas d'erreurs console
    expect(consoleErrors).toHaveLength(0);
  });
});

// ============================================================================
// Tests - Performance
// ============================================================================

test.describe('Navigation - Performance', () => {
  test('E2E-014: Navigation doit être rapide (<500ms)', async () => {
    await page.goto('http://localhost:5174/dashboard');

    const startTime = Date.now();

    // Naviguer vers Comptabilité
    const link = page.getByRole('link', { name: /comptabilité/i });
    await link.click();

    // Attendre que l'URL change
    await page.waitForURL(/.*\/accounting/);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // La navigation devrait prendre moins de 500ms
    expect(duration).toBeLessThan(500);
  });

  test('E2E-015: Sidebar secondaire doit s\'ouvrir rapidement (<300ms)', async () => {
    await page.goto('http://localhost:5174/dashboard');

    const startTime = Date.now();

    // Cliquer sur Comptabilité
    const link = page.getByRole('link', { name: /comptabilité/i });
    await link.click();

    // Attendre que la sidebar secondaire soit visible
    const secondarySidebar = page.locator('.bg-white.border-r').first();
    await secondarySidebar.waitFor({ state: 'visible' });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // L'ouverture devrait prendre moins de 300ms
    expect(duration).toBeLessThan(300);
  });
});
