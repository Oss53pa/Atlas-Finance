/**
 * Tests Fichier 6 — Amortissements SYSCOHADA
 *
 * Vérifie :
 *  1. Annuité linéaire = valeur / durée (1 000 000 / 5 = 200 000)
 *  2. Annuité dégressif = VNC × (coeff / durée)
 *  3. L'écriture de dotation est créée sur les bons comptes (681x / 28x)
 *  4. postDepreciations insère des écritures équilibrées dans la base
 *  5. computeDepreciations ignore les immobilisations expirées
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../lib/db';
import { DepreciationService } from '../utils/depreciationService';
import {
  computeDepreciations,
  postDepreciations,
  runDepreciation,
} from '../features/assets/services/depreciationPostingService';
import type { DBAsset } from '../lib/db';
import { createTestAdapter } from '../test/createTestAdapter';

const adapter = createTestAdapter();

// ============================================================================
// HELPERS
// ============================================================================

function makeAsset(overrides: Partial<DBAsset> = {}): DBAsset {
  return {
    id: 'asset-001',
    code: 'IMM-001',
    name: 'Matériel industriel',
    category: 'materiel_industriel',
    acquisitionDate: '2026-01-01',
    acquisitionValue: 1_000_000,
    residualValue: 0,
    depreciationMethod: 'linear',
    usefulLifeYears: 5,
    accountCode: '2183',
    depreciationAccountCode: '2813',
    status: 'active',
    cumulDepreciation: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  await db.journalEntries.clear();
  await db.assets.clear();
  await db.auditLogs.clear();
  await db.fiscalYears.clear();

  await db.fiscalYears.bulkPut([
    { id: 'FY2026', code: '2026', name: 'Exercice 2026', startDate: '2026-01-01', endDate: '2026-12-31', isClosed: false, isActive: true },
  ]);
});

// ============================================================================
// TESTS — Amortissement linéaire
// ============================================================================

describe('Amortissement linéaire', () => {
  it('annuité = 1 000 000 / 5 = 200 000 FCFA', () => {
    const annuite = DepreciationService.calculerAmortissementLineaire(1_000_000, 5, 0);
    expect(annuite).toBe(200_000);
  });

  it('annuité = 600 000 / 3 = 200 000 FCFA (valeur résiduelle 0)', () => {
    const annuite = DepreciationService.calculerAmortissementLineaire(600_000, 3, 0);
    expect(annuite).toBe(200_000);
  });

  it('prend en compte la valeur résiduelle : (1 000 000 - 100 000) / 5 = 180 000', () => {
    const annuite = DepreciationService.calculerAmortissementLineaire(1_000_000, 5, 100_000);
    expect(annuite).toBe(180_000);
  });

  it('durée 1 an = valeur totale amortie la 1ère année', () => {
    const annuite = DepreciationService.calculerAmortissementLineaire(500_000, 1, 0);
    expect(annuite).toBe(500_000);
  });

  it('mensualité = annuité / 12 (arrondi entier FCFA)', () => {
    const immo = makeImmobilisation({ valeurAcquisition: 1_000_000, dureeAmortissement: 5 });
    const mensualite = DepreciationService.calculerAmortissementMensuel(immo, '2026-06');
    // 200 000 / 12 = 16 666.67 → 16 667
    expect(mensualite).toBe(16_667);
  });
});

// ============================================================================
// TESTS — Amortissement dégressif
// ============================================================================

describe('Amortissement dégressif', () => {
  it('1ère année : 1 000 000 × (2.0 / 5) = 400 000 FCFA', () => {
    // Coefficient dégressif SYSCOHADA pour durée 5 ans = 2.0
    // Taux dégressif = taux linéaire × coeff = (1/5) × 2 × 100 = 40%
    const annuite = DepreciationService.calculerAmortissementDegressif(
      1_000_000,  // valeurAcquisition
      40,         // tauxDegressif (%)
      0,          // anneesEcoulees
      0           // amortissementsCumules
    );
    // VNC × 40% = 1 000 000 × 0.40 = 400 000
    expect(annuite).toBe(400_000);
  });

  it('2ème année : (1 000 000 - 400 000) × 40% = 240 000 FCFA', () => {
    const annuite = DepreciationService.calculerAmortissementDegressif(
      1_000_000,
      40,
      1,          // 1 an écoulé
      400_000     // amortissementsCumules
    );
    // VNC = 600 000 ; dotation = 600 000 × 40% = 240 000
    expect(annuite).toBe(240_000);
  });

  it('3ème année : (1 000 000 - 640 000) × 40% = 144 000 FCFA', () => {
    const annuite = DepreciationService.calculerAmortissementDegressif(
      1_000_000,
      40,
      2,
      640_000     // 400k + 240k
    );
    // VNC = 360 000 ; dotation = 360 000 × 40% = 144 000
    expect(annuite).toBe(144_000);
  });
});

// ============================================================================
// TESTS — Tableau d'amortissement
// ============================================================================

describe('Tableau d\'amortissement linéaire', () => {
  it('génère 5 lignes pour une durée de 5 ans', () => {
    const immo = makeImmobilisation({ valeurAcquisition: 1_000_000, dureeAmortissement: 5 });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    expect(tableau.length).toBe(5);
  });

  it('la VNC finale est <= 0 (totalement amorti)', () => {
    const immo = makeImmobilisation({ valeurAcquisition: 1_000_000, dureeAmortissement: 5 });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    const dernier = tableau[tableau.length - 1];
    expect(dernier.valeurNetteComptable).toBeLessThanOrEqual(0.01); // tolérance arrondi
  });

  it('le cumul des dotations = valeur amortissable', () => {
    const immo = makeImmobilisation({ valeurAcquisition: 1_000_000, dureeAmortissement: 5 });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    const totalDotations = tableau.reduce((s, l) => s + l.dotation, 0);
    expect(totalDotations).toBeCloseTo(1_000_000, 0);
  });

  it('la VNC ne devient jamais négative', () => {
    const immo = makeImmobilisation({ valeurAcquisition: 1_000_000, dureeAmortissement: 5 });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    for (const ligne of tableau) {
      expect(ligne.valeurNetteComptable).toBeGreaterThanOrEqual(-1); // tolérance 1 FCFA
    }
  });
});

// ============================================================================
// TESTS — Écriture comptable de dotation (681x / 28x)
// ============================================================================

describe('Écriture comptable de dotation SYSCOHADA', () => {
  it('génère une écriture avec D 6812 et C 2813', () => {
    const immo = makeImmobilisation({
      compteDotation: '6812',
      compteAmortissement: '2813',
      valeurAcquisition: 1_000_000,
      dureeAmortissement: 5,
    });

    const ecriture = DepreciationService.genererEcritureAmortissement(immo, '2026-12', 'FY2026');

    expect(ecriture.lignes).toHaveLength(2);

    const dotation = ecriture.lignes.find(l => l.compte === '6812');
    const amortissement = ecriture.lignes.find(l => l.compte === '2813');

    expect(dotation).toBeDefined();
    expect(dotation!.debit).toBeGreaterThan(0);
    expect(dotation!.credit).toBe(0);

    expect(amortissement).toBeDefined();
    expect(amortissement!.credit).toBeGreaterThan(0);
    expect(amortissement!.debit).toBe(0);
  });

  it('l\'écriture est équilibrée (D dotation = C amortissement)', () => {
    const immo = makeImmobilisation({
      compteDotation: '6812',
      compteAmortissement: '2813',
      valeurAcquisition: 1_000_000,
      dureeAmortissement: 5,
    });

    const ecriture = DepreciationService.genererEcritureAmortissement(immo, '2026-12', 'FY2026');

    const totalD = ecriture.lignes.reduce((s, l) => s + l.debit, 0);
    const totalC = ecriture.lignes.reduce((s, l) => s + l.credit, 0);
    expect(totalD).toBe(totalC);
    expect(totalD).toBeGreaterThan(0);
  });

  it('le montant mensuel est correct : 1 000 000 / 5 / 12 = 16 667 FCFA', () => {
    const immo = makeImmobilisation({
      valeurAcquisition: 1_000_000,
      dureeAmortissement: 5,
    });

    const ecriture = DepreciationService.genererEcritureAmortissement(immo, '2026-06', 'FY2026');
    expect(ecriture.montant).toBe(16_667);
  });
});

// ============================================================================
// TESTS — postDepreciations / computeDepreciations
// ============================================================================

describe('postDepreciations — intégration base de données', () => {
  it('insère des écritures de dotation équilibrées dans journalEntries', async () => {
    const asset = makeAsset();
    await db.assets.add(asset);

    const depreciations = computeDepreciations([asset], '2026-12-31');
    expect(depreciations.length).toBe(1);

    // Vérifier l'annuité annuelle : (1 000 000 - 0) / 5 = 200 000
    expect(depreciations[0].amount).toBe(200_000);

    const ids = await postDepreciations(adapter, depreciations);
    expect(ids).toHaveLength(1);

    const entry = await db.journalEntries.get(ids[0]);
    expect(entry).toBeDefined();
    expect(entry!.totalDebit).toBe(entry!.totalCredit);
    expect(entry!.totalDebit).toBe(200_000);
  });

  it('le compte de dotation (681x) est débité', async () => {
    const asset = makeAsset({ accountCode: '2183' });
    await db.assets.add(asset);

    const deps = computeDepreciations([asset], '2026-12-31');
    const ids = await postDepreciations(adapter, deps);
    const entry = await db.journalEntries.get(ids[0]);

    // dotationAccountCode = '681' + accountCode[0] = '6812' (compte de charge 6)
    const ligneCharge = entry!.lines.find(l => l.accountCode.startsWith('681'));
    expect(ligneCharge).toBeDefined();
    expect(ligneCharge!.debit).toBe(200_000);
    expect(ligneCharge!.credit).toBe(0);
  });

  it('le compte d\'amortissement (28x) est crédité', async () => {
    const asset = makeAsset({ accountCode: '2183', depreciationAccountCode: '2813' });
    await db.assets.add(asset);

    const deps = computeDepreciations([asset], '2026-12-31');
    const ids = await postDepreciations(adapter, deps);
    const entry = await db.journalEntries.get(ids[0]);

    const ligneAmort = entry!.lines.find(l => l.accountCode === '2813');
    expect(ligneAmort).toBeDefined();
    expect(ligneAmort!.credit).toBe(200_000);
    expect(ligneAmort!.debit).toBe(0);
  });

  it('ignore les immobilisations déjà totalement amorties', async () => {
    // Acquisition il y a 6 ans (durée utile 5 ans) → déjà amortie
    const asset = makeAsset({
      acquisitionDate: '2020-01-01',
      usefulLifeYears: 5,
    });
    await db.assets.add(asset);

    const deps = computeDepreciations([asset], '2026-12-31');
    // yearsElapsed ≥ usefulLifeYears → ignoré
    expect(deps).toHaveLength(0);
  });

  it('ignore les immobilisations avec statut non-active', async () => {
    const asset = makeAsset({ status: 'disposed' });
    await db.assets.add(asset);

    const deps = computeDepreciations([asset], '2026-12-31');
    expect(deps).toHaveLength(0);
  });

  it('runDepreciation traite toutes les immobilisations actives', async () => {
    const asset1 = makeAsset({ id: 'asset-001', code: 'MAT-001', name: 'Machine 1', acquisitionValue: 2_000_000, usefulLifeYears: 5 });
    const asset2 = makeAsset({ id: 'asset-002', code: 'MAT-002', name: 'Machine 2', acquisitionValue: 1_000_000, usefulLifeYears: 4, acquisitionDate: '2026-01-01' });
    await db.assets.bulkAdd([asset1, asset2]);

    const ids = await runDepreciation(adapter, '2026-12-31');
    expect(ids).toHaveLength(2);

    // Vérifier les montants : asset1 = 400 000, asset2 = 250 000
    const entry1 = await db.journalEntries.get(ids[0]);
    const entry2 = await db.journalEntries.get(ids[1]);
    const amounts = [entry1!.totalDebit, entry2!.totalDebit].sort((a, b) => a - b);
    expect(amounts[0]).toBe(250_000); // asset2 : 1M/4
    expect(amounts[1]).toBe(400_000); // asset1 : 2M/5
  });
});

// ============================================================================
// TESTS — Conformité SYSCOHADA (via DepreciationService.validerAmortissementConforme)
// ============================================================================

describe('Conformité SYSCOHADA', () => {
  it('accepte une écriture de dotation correcte', () => {
    const immo = makeImmobilisation({ amortissementsCumules: 200_000 });
    const ecriture: import('../utils/depreciationService').EcritureAmortissement = {
      date: '2026-12-31',
      journal: 'OD',
      piece: 'AMORT-2026-12-IMM-001',
      libelle: 'Dotation amortissement Matériel industriel',
      lignes: [
        { compte: '6812', libelle: 'Dotation', debit: 200_000, credit: 0 },
        { compte: '2813', libelle: 'Amortissement', debit: 0, credit: 200_000 },
      ],
      immobilisationId: 'immo-001',
      periode: '2026-12',
      montant: 200_000,
    };

    const result = DepreciationService.validerAmortissementConforme(ecriture, immo);
    expect(result.valide).toBe(true);
  });

  it('rejette une écriture déséquilibrée', () => {
    const immo = makeImmobilisation({ amortissementsCumules: 200_000 });
    const ecriture: import('../utils/depreciationService').EcritureAmortissement = {
      date: '2026-12-31',
      journal: 'OD',
      piece: 'AMORT-BAD',
      libelle: 'Dotation incorrecte',
      lignes: [
        { compte: '6812', libelle: 'Dotation', debit: 200_000, credit: 0 },
        { compte: '2813', libelle: 'Amortissement', debit: 0, credit: 150_000 }, // Écart 50k
      ],
      immobilisationId: 'immo-001',
      periode: '2026-12',
      montant: 200_000,
    };

    const result = DepreciationService.validerAmortissementConforme(ecriture, immo);
    expect(result.valide).toBe(false);
  });
});

// ============================================================================
// HELPER LOCAL (réutilisé dans les tests DepreciationService)
// ============================================================================

function makeImmobilisation(overrides: Partial<import('../utils/depreciationService').Immobilisation> = {}): import('../utils/depreciationService').Immobilisation {
  return {
    id: 'immo-001',
    code: 'IMM-001',
    libelle: 'Matériel industriel',
    compteImmobilisation: '2183',
    compteAmortissement: '2813',
    compteDotation: '6812',
    dateAcquisition: '2026-01-01',
    valeurAcquisition: 1_000_000,
    dureeAmortissement: 5,
    tauxAmortissement: 20,
    modeAmortissement: 'lineaire',
    valeurResiduelle: 0,
    amortissementsCumules: 0,
    ...overrides,
  };
}
