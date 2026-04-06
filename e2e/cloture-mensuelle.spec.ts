import { test, expect } from '@playwright/test';

test.describe('Cloture mensuelle', () => {

  test.beforeEach(async ({ page }) => {
    // TODO: navigate to the cloture page and authenticate
    await page.goto('/');
  });

  test('affiche la liste des periodes avec leur statut', async ({ page }) => {
    // TODO: navigate to cloture page
    // TODO: verify each month is displayed with status (ouverte, cloturee)
  });

  test('lance les controles pre-cloture', async ({ page }) => {
    // TODO: select a month that is open
    // TODO: click "Lancer les controles"
    // TODO: verify control results are displayed (equilibre, ecritures provisoires, etc.)
  });

  test('refuse la cloture si des controles echouent', async ({ page }) => {
    // TODO: attempt to close a month with failing controls
    // TODO: expect an error or blocking message
    // TODO: verify the period remains open
  });

  test('cloture une periode valide', async ({ page }) => {
    // TODO: select a month with all controls passing
    // TODO: click "Cloturer"
    // TODO: confirm the action in the modal
    // TODO: verify period status changes to "cloturee"
  });

  test('empeche la modification d\'ecritures dans une periode cloturee', async ({ page }) => {
    // TODO: navigate to a closed period
    // TODO: attempt to modify an entry
    // TODO: expect modification to be blocked
  });
});
