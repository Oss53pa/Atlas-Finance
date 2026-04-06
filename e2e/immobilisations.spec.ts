import { test, expect } from '@playwright/test';

test.describe('Immobilisations - Acquisition, dotations et cession', () => {

  test.beforeEach(async ({ page }) => {
    // TODO: navigate to the immobilisations module and authenticate
    await page.goto('/');
  });

  test('affiche la liste des immobilisations', async ({ page }) => {
    // TODO: navigate to immobilisations page
    // TODO: verify the table displays existing assets
    // TODO: verify columns: code, libelle, date acquisition, valeur, amortissement cumule
  });

  test('enregistre une nouvelle acquisition', async ({ page }) => {
    // TODO: click "Nouvelle immobilisation"
    // TODO: fill in: libelle, compte (2xxxx), date acquisition, valeur d'origine
    // TODO: select methode d'amortissement (lineaire)
    // TODO: set duree d'amortissement (5 ans)
    // TODO: save
    // TODO: verify the asset appears in the list
    // TODO: verify the ecriture d'acquisition is generated (D: 2xxxx / C: 404 or 52x)
  });

  test('calcule les dotations aux amortissements', async ({ page }) => {
    // TODO: select an existing asset
    // TODO: click "Calculer dotations"
    // TODO: verify the plan d'amortissement is displayed
    // TODO: verify annual dotation = valeur_origine / duree
    // TODO: verify cumul amortissement is correct
  });

  test('genere les ecritures de dotation', async ({ page }) => {
    // TODO: navigate to dotation generation
    // TODO: select period
    // TODO: click "Generer les ecritures"
    // TODO: verify ecritures are created (D: 681x / C: 28xx)
    // TODO: verify amounts match the plan d'amortissement
  });

  test('enregistre une cession d\'immobilisation', async ({ page }) => {
    // TODO: select an existing asset
    // TODO: click "Cession"
    // TODO: fill in: date cession, prix de cession
    // TODO: confirm
    // TODO: verify VNC (valeur nette comptable) is calculated correctly
    // TODO: verify cession ecritures are generated:
    //   - Sortie de l'actif (D: 28xx / C: 2xxxx)
    //   - Encaissement (D: 52x / C: 775)
    //   - Plus/moins-value
  });
});
