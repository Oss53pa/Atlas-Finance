/**
 * WiseBook ERP - Tests E2E Modales
 *
 * Tests end-to-end pour les modales critiques
 * Focus sur les anti-patterns "toast au lieu de modale"
 */

import { test, expect, Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

// ============================================================================
// Tests - Modales Clients
// ============================================================================

test.describe('Modales - Création Client', () => {
  test.beforeEach(async () => {
    await page.goto('http://localhost:5174/customers-advanced');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-MOD-001: Bouton "Créer client" doit ouvrir une modale', async () => {
    // Trouver le bouton de création
    const createButton = page.getByRole('button', { name: /créer|nouveau|ajouter.*client/i });
    await createButton.click();

    // Vérifier qu'une modale apparaît
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Vérifier les attributs d'accessibilité
    await expect(modal).toHaveAttribute('aria-modal', 'true');

    // Vérifier le titre
    const modalTitle = modal.getByRole('heading', { name: /nouveau client|créer client/i });
    await expect(modalTitle).toBeVisible();
  });

  test('RED FLAG E2E-MOD-002: Aucun toast lors de l\'ouverture de la modale', async () => {
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    // Attendre la modale
    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible', timeout: 3000 });

    // Vérifier qu'AUCUN toast n'apparaît
    const toasts = page.locator('[role="alert"], .toast, [data-toast]');
    const toastCount = await toasts.count();

    if (toastCount > 0) {
      // RED FLAG détecté !
      const toastText = await toasts.first().textContent();
      throw new Error(
        `❌ MISMATCH UI DÉTECTÉ: Un toast est apparu alors qu'une modale était attendue.\n` +
        `Toast text: "${toastText}"\n` +
        `Ceci est un anti-pattern critique identifié dans l'audit.`
      );
    }

    expect(toastCount).toBe(0);
  });

  test('E2E-MOD-003: Modale doit avoir un focus trap', async () => {
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Trouver tous les éléments focusables dans la modale
    const focusableElements = await modal.locator(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    ).all();

    expect(focusableElements.length).toBeGreaterThan(0);

    // Le premier élément devrait être focusé
    const firstElement = focusableElements[0];
    await expect(firstElement).toBeFocused();

    // Naviguer avec Tab jusqu'au dernier élément
    for (let i = 0; i < focusableElements.length - 1; i++) {
      await page.keyboard.press('Tab');
    }

    // Tab depuis le dernier devrait revenir au premier (focus trap)
    await page.keyboard.press('Tab');
    await expect(firstElement).toBeFocused();
  });

  test('E2E-MOD-004: Fermer la modale avec Escape', async () => {
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Appuyer sur Escape
    await page.keyboard.press('Escape');

    // La modale devrait se fermer
    await expect(modal).not.toBeVisible();
  });

  test('E2E-MOD-005: Fermer la modale avec le bouton X', async () => {
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Trouver et cliquer sur le bouton de fermeture
    const closeButton = modal.getByRole('button', { name: /fermer|close/i }).or(
      modal.getByRole('button').filter({ has: page.locator('svg') })
    );
    await closeButton.first().click();

    // La modale devrait se fermer
    await expect(modal).not.toBeVisible();
  });

  test('E2E-MOD-006: Clic sur overlay doit fermer la modale', async () => {
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Trouver l'overlay (parent du modal)
    const overlay = page.locator('.fixed.inset-0').first();

    // Cliquer sur l'overlay (en dehors de la modale)
    await overlay.click({ position: { x: 10, y: 10 } });

    // La modale devrait se fermer
    await expect(modal).not.toBeVisible({ timeout: 1000 });
  });
});

// ============================================================================
// Tests - Soumission de Formulaire dans Modale
// ============================================================================

test.describe('Modales - Soumission Formulaire', () => {
  test.beforeEach(async () => {
    await page.goto('http://localhost:5174/customers-advanced');
    await page.waitForLoadState('networkidle');
  });

  test('E2E-MOD-007: Soumettre un formulaire valide doit afficher un toast SUCCESS', async () => {
    // Ouvrir la modale
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // Remplir le formulaire
    await modal.getByLabel(/nom|name/i).fill('Client Test E2E');
    await modal.getByLabel(/email/i).fill('test@example.com');

    // Soumettre
    const submitButton = modal.getByRole('button', { name: /enregistrer|save|créer/i });
    await submitButton.click();

    // Attendre la fermeture de la modale
    await expect(modal).not.toBeVisible({ timeout: 3000 });

    // Maintenant, un toast SUCCESS devrait apparaître
    const toast = page.locator('[role="alert"]').first();
    await expect(toast).toBeVisible({ timeout: 3000 });

    // Vérifier que c'est un toast de succès
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/succès|success|créé/i);
  });

  test('E2E-MOD-008: Soumettre un formulaire invalide doit afficher un toast ERROR', async () => {
    // Ouvrir la modale
    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    // NE PAS remplir le formulaire (invalide)

    // Soumettre
    const submitButton = modal.getByRole('button', { name: /enregistrer|save|créer/i });
    await submitButton.click();

    // La modale devrait rester ouverte
    await expect(modal).toBeVisible();

    // Un toast d'erreur ou message d'erreur devrait apparaître
    const errorToast = page.locator('[role="alert"]').or(
      modal.locator('.text-red-500, .error')
    );

    const hasError = (await errorToast.count()) > 0;
    expect(hasError).toBe(true);
  });
});

// ============================================================================
// Tests - Modale de Confirmation/Suppression
// ============================================================================

test.describe('Modales - Confirmation Suppression', () => {
  test('E2E-MOD-009: Modale de confirmation doit avoir role="alertdialog"', async () => {
    await page.goto('http://localhost:5174/customers-advanced');
    await page.waitForLoadState('networkidle');

    // Trouver un bouton de suppression (icône poubelle ou texte "Supprimer")
    const deleteButton = page.getByRole('button', { name: /supprimer|delete/i }).first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Vérifier qu'une modale de confirmation apparaît
      const alertDialog = page.locator('[role="alertdialog"]').or(
        page.locator('[role="dialog"]').filter({ hasText: /confirmer|êtes-vous sûr/i })
      );

      await expect(alertDialog).toBeVisible({ timeout: 3000 });

      // Vérifier le contenu
      const confirmText = await alertDialog.textContent();
      expect(confirmText).toMatch(/supprimer|delete|confirmer|confirm/i);
    }
  });

  test('E2E-MOD-010: Annuler une suppression ferme la modale sans action', async () => {
    await page.goto('http://localhost:5174/customers-advanced');
    await page.waitForLoadState('networkidle');

    const deleteButton = page.getByRole('button', { name: /supprimer|delete/i }).first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      const modal = page.locator('[role="dialog"], [role="alertdialog"]');
      await modal.waitFor({ state: 'visible' });

      // Cliquer sur "Annuler"
      const cancelButton = modal.getByRole('button', { name: /annuler|cancel/i });
      await cancelButton.click();

      // La modale devrait se fermer
      await expect(modal).not.toBeVisible();

      // Aucun toast ne devrait apparaître
      const toast = page.locator('[role="alert"]');
      const toastCount = await toast.count();
      expect(toastCount).toBe(0);
    }
  });
});

// ============================================================================
// Tests - Performance des Modales
// ============================================================================

test.describe('Modales - Performance', () => {
  test('E2E-MOD-011: Modale doit s\'ouvrir en moins de 300ms', async () => {
    await page.goto('http://localhost:5174/customers-advanced');

    const createButton = page.getByRole('button', { name: /créer|nouveau.*client/i });

    const startTime = Date.now();
    await createButton.click();

    const modal = page.locator('[role="dialog"]');
    await modal.waitFor({ state: 'visible' });

    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(300);
  });
});
