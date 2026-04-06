import { test, expect } from '@playwright/test';

test.describe('Saisie et validation d\'une ecriture comptable', () => {

  test.beforeEach(async ({ page }) => {
    // TODO: navigate to the journal entry page and authenticate
    await page.goto('/');
  });

  test('affiche le formulaire de saisie d\'ecriture', async ({ page }) => {
    // TODO: navigate to saisie page
    // TODO: verify form fields are visible (date, journal, piece, libelle)
    // TODO: verify debit/credit line inputs are present
  });

  test('ajoute des lignes debit et credit', async ({ page }) => {
    // TODO: fill in header fields (date, journal, piece, libelle)
    // TODO: add a debit line with account 601000 and amount 100000
    // TODO: add a credit line with account 401000 and amount 100000
    // TODO: verify total debit === total credit
  });

  test('refuse une ecriture desequilibree', async ({ page }) => {
    // TODO: create an entry where debit !== credit
    // TODO: click validate
    // TODO: expect an error message about equilibre debit/credit
  });

  test('valide et enregistre une ecriture equilibree', async ({ page }) => {
    // TODO: create a balanced entry
    // TODO: click validate/save
    // TODO: expect success toast or navigation to journal list
    // TODO: verify the entry appears in the journal
  });

  test('genere un numero de piece automatique', async ({ page }) => {
    // TODO: open saisie form
    // TODO: verify piece number is auto-generated based on journal
    // TODO: verify it increments from the last entry
  });
});
