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
  it('divise correctement par 12', () => {
    const immo = makeImmobilisation();
    const result = DepreciationService.calculerAmortissementMensuel(immo, '2026-06');
    expect(result).toBeCloseTo(1666.67, 1);
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
