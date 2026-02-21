import { describe, it, expect } from 'vitest';
import { DepreciationService } from '../utils/depreciationService';
import type { Immobilisation, EcritureAmortissement } from '../utils/depreciationService';

const makeImmobilisation = (overrides?: Partial<Immobilisation>): Immobilisation => ({
  id: 'immo-001',
  code: 'MAT-001',
  libelle: 'Matériel informatique',
  compteImmobilisation: '2183',
  compteAmortissement: '2813',
  compteDotation: '6812',
  dateAcquisition: '2026-01-01',
  valeurAcquisition: 100_000,
  dureeAmortissement: 5,
  tauxAmortissement: 20,
  modeAmortissement: 'lineaire',
  valeurResiduelle: 0,
  amortissementsCumules: 0,
  ...overrides,
});

describe('Amortissement linéaire', () => {
  it('calcule correctement: 100 000 sur 5 ans = 20 000/an', () => {
    const result = DepreciationService.calculerAmortissementLineaire(100_000, 5, 0);
    expect(result).toBe(20_000);
  });

  it('prend en compte la valeur résiduelle', () => {
    const result = DepreciationService.calculerAmortissementLineaire(100_000, 5, 10_000);
    expect(result).toBe(18_000);
  });

  it('gère la durée de 1 an', () => {
    const result = DepreciationService.calculerAmortissementLineaire(50_000, 1, 0);
    expect(result).toBe(50_000);
  });
});

describe('Amortissement mensuel', () => {
  it('divise correctement par 12 (arrondi entier FCFA)', () => {
    const immo = makeImmobilisation();
    const result = DepreciationService.calculerAmortissementMensuel(immo, '2026-06');
    // 100 000 / 5 / 12 = 1 666.67 → arrondi FCFA = 1 667
    expect(result).toBe(1_667);
  });
});

describe('Tableau d\'amortissement', () => {
  it('génère le bon nombre de lignes', () => {
    const immo = makeImmobilisation();
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    expect(tableau.length).toBe(5);
  });

  it('la VNC finale est 0 (ou valeur résiduelle)', () => {
    const immo = makeImmobilisation();
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    const lastLine = tableau[tableau.length - 1];
    expect(lastLine.valeurNetteComptable).toBeLessThanOrEqual(0.01);
  });

  it('le cumul des amortissements = valeur amortissable', () => {
    const immo = makeImmobilisation({ valeurResiduelle: 10_000 });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    const totalAmorti = tableau.reduce((sum, l) => sum + l.dotation, 0);
    expect(totalAmorti).toBeCloseTo(90_000, 0);
  });
});

describe('Amortissement — Precision Money class', () => {
  it('lineaire 10 000 000 sur 5 ans = annuite 2 000 000', () => {
    const result = DepreciationService.calculerAmortissementLineaire(10_000_000, 5, 0);
    expect(result).toBe(2_000_000);
  });

  it('mensualite 10 000 000 sur 5 ans = 166 667 FCFA (arrondi entier)', () => {
    const immo = makeImmobilisation({
      valeurAcquisition: 10_000_000,
      dureeAmortissement: 5,
    });
    const result = DepreciationService.calculerAmortissementMensuel(immo, '2026-06');
    expect(result).toBe(166_667);
  });

  it('prorata temporis acquisition 01/07: 6 mois = 1 000 000 pour 10M/5ans', () => {
    const immo = makeImmobilisation({
      valeurAcquisition: 10_000_000,
      dureeAmortissement: 5,
      dateAcquisition: '2026-07-01',
    });
    // 6 mois de dotation = 2 000 000 / 12 * 6 = 1 000 000
    let total = 0;
    for (let m = 7; m <= 12; m++) {
      total += DepreciationService.calculerAmortissementMensuel(
        immo,
        `2026-${String(m).padStart(2, '0')}`
      );
    }
    // 6 * 166 667 = 1 000 002 (arrondi entier mensuel accumule 1 FCFA/mois d'ecart)
    // Tolerance de 6 FCFA pour l'arrondi mensuel
    expect(Math.abs(total - 1_000_000)).toBeLessThanOrEqual(6);
  });

  it('VNC ne devient jamais negative dans le tableau', () => {
    const immo = makeImmobilisation({
      valeurAcquisition: 10_000_000,
      dureeAmortissement: 5,
    });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    for (const ligne of tableau) {
      expect(ligne.valeurNetteComptable).toBeGreaterThanOrEqual(-1); // tolerance 1 FCFA
    }
  });

  it('cumul amortissements = valeur origine en fin de vie (lineaire)', () => {
    const immo = makeImmobilisation({
      valeurAcquisition: 10_000_000,
      dureeAmortissement: 5,
    });
    const tableau = DepreciationService.genererTableauAmortissement(immo);
    const derniereLigne = tableau[tableau.length - 1];
    expect(derniereLigne.amortissementCumule).toBe(10_000_000);
  });
});

describe('Validation conformité SYSCOHADA', () => {
  it('accepte une écriture d\'amortissement correcte', () => {
    const immo = makeImmobilisation({ amortissementsCumules: 40_000 });
    const ecriture: EcritureAmortissement = {
      date: '2026-03-31',
      journal: 'OD',
      piece: 'AMORT-2026-03',
      libelle: 'Dotation amort.',
      lignes: [
        { compte: '6812', libelle: 'Dotation amort.', debit: 20_000, credit: 0 },
        { compte: '2813', libelle: 'Amort. constructions', debit: 0, credit: 20_000 },
      ],
      immobilisationId: immo.id,
      periode: '2026-03',
      montant: 20_000,
    };
    const result = DepreciationService.validerAmortissementConforme(ecriture, immo);
    expect(result.valide).toBe(true);
  });

  it('rejette une écriture déséquilibrée', () => {
    const immo = makeImmobilisation({ amortissementsCumules: 40_000 });
    const ecriture: EcritureAmortissement = {
      date: '2026-03-31',
      journal: 'OD',
      piece: 'AMORT-2026-03',
      libelle: 'Dotation amort.',
      lignes: [
        { compte: '6812', libelle: 'Dotation amort.', debit: 20_000, credit: 0 },
        { compte: '2813', libelle: 'Amort. constructions', debit: 0, credit: 19_000 },
      ],
      immobilisationId: immo.id,
      periode: '2026-03',
      montant: 20_000,
    };
    const result = DepreciationService.validerAmortissementConforme(ecriture, immo);
    expect(result.valide).toBe(false);
  });
});
