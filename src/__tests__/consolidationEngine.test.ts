/**
 * Consolidation v2 — écart d'acquisition (goodwill), conversion IAS 21, groupe.
 */

import { describe, it, expect } from 'vitest';
import {
  computeEcartAcquisition,
  convertirBalanceIAS21,
  consoliderGroupe,
  type EntityBalance,
  type ParticipationConso,
} from '../services/cdg/consolidationEngine';

// ============================================================================
// Écart d'acquisition
// ============================================================================

describe('écart d’acquisition (goodwill)', () => {
  it('goodwill = coût − quote-part de l’actif net réévalué', () => {
    const r = computeEcartAcquisition({
      coutAcquisition: 10_000_000,
      actifNetComptable: 8_000_000,
      ajustementsJusteValeur: 2_000_000, // actif net réévalué = 10M
      pourcentageDetention: 80,
    });
    expect(r.actifNetReevalue).toBe(10_000_000);
    expect(r.quotePartAcquise).toBe(8_000_000); // 80% de 10M
    expect(r.ecartAcquisition).toBe(2_000_000); // 10M − 8M
    expect(r.sens).toBe('goodwill');
  });

  it('badwill quand le coût est inférieur à la quote-part', () => {
    const r = computeEcartAcquisition({
      coutAcquisition: 5_000_000, actifNetComptable: 10_000_000, pourcentageDetention: 100,
    });
    expect(r.ecartAcquisition).toBe(-5_000_000);
    expect(r.sens).toBe('badwill');
  });
});

// ============================================================================
// Conversion IAS 21
// ============================================================================

describe('conversion IAS 21 (cours de clôture)', () => {
  it('convertit bilan au clôture, résultat au moyen, capital à l’historique, et équilibre par l’écart de conversion', () => {
    // Balance locale équilibrée (Σ signés = 0) :
    //   Actif : immobilisations 1000, trésorerie 500  (débit +)
    //   Capital 800 (crédit −), résultat = produits 900 − charges 600 = 300 (crédit net −300)
    //   Dettes 400 (crédit −)
    // Σ = 1000 + 500 − 800 − 400 + 600 − 900 = 0
    const r = convertirBalanceIAS21({
      balanceLocale: [
        { compte: '21', montant: 1000 },
        { compte: '52', montant: 500 },
        { compte: '10', montant: -800 },   // capital → historique
        { compte: '40', montant: -400 },   // dettes → clôture
        { compte: '60', montant: 600 },    // charges → moyen
        { compte: '70', montant: -900 },   // produits → moyen
      ],
      coursCloture: 650,
      coursMoyen: 655,
      coursHistorique: 600,
    });

    // Capital converti à l'historique.
    const capital = r.lignesConverties.find(l => l.compte === '10')!;
    expect(capital.montant).toBe(-800 * 600);
    // Charges au cours moyen.
    const charges = r.lignesConverties.find(l => l.compte === '60')!;
    expect(charges.montant).toBe(600 * 655);

    // La balance convertie + écart de conversion = 0 (équilibre rétabli).
    const sommeConvertie = r.lignesConverties.reduce((s, l) => s + l.montant, 0);
    expect(sommeConvertie + r.ecartConversion).toBe(0);
    // L'écart de conversion est non nul (cours différents).
    expect(r.ecartConversion).not.toBe(0);
  });
});

// ============================================================================
// Consolidation de groupe
// ============================================================================

describe('consolidation de groupe', () => {
  const mere: EntityBalance = {
    societeId: 'M',
    soldes: { '21': 5_000_000, '52': 2_000_000, '10': -6_000_000, '41': 1_000_000, '70': -3_000_000, '60': 1_000_000 },
    resultat: 2_000_000,
  };
  const filiale: EntityBalance = {
    societeId: 'F',
    soldes: { '21': 2_000_000, '52': 500_000, '10': -1_500_000, '40': -1_000_000, '70': -1_000_000, '60': 1_000_000 },
    resultat: 1_000_000,
  };

  it('intégration globale : agrège 100 % + intérêts minoritaires sur la part hors groupe', () => {
    const participations: ParticipationConso[] = [
      { filialId: 'F', pourcentageDetention: 80, methode: 'integration_globale' },
    ];
    const r = consoliderGroupe({ mere, filiales: [filiale], participations });

    // Compte 21 consolidé = 5M (mère) + 2M (filiale 100%) = 7M.
    const c21 = r.lignes.find(l => l.compte === '21')!;
    expect(c21.montantConsolide).toBe(7_000_000);

    // Intérêts minoritaires = 20 % du résultat filiale = 200 000.
    expect(r.interetsMinoritaires).toBe(200_000);
    // Résultat part groupe = 2M (mère) + 80 % × 1M = 2,8M.
    expect(r.resultatPartGroupe).toBe(2_800_000);
  });

  it('élimine une opération intra-groupe (créance/dette réciproque)', () => {
    const participations: ParticipationConso[] = [
      { filialId: 'F', pourcentageDetention: 100, methode: 'integration_globale' },
    ];
    // La mère a une créance 41 de 1M sur la filiale (dette 40 de -1M) → réciproques.
    const r = consoliderGroupe({
      mere, filiales: [filiale], participations,
      eliminations: [
        { compte: '41', montant: 1_000_000, nature: 'creance_intra' },
        { compte: '40', montant: -1_000_000, nature: 'dette_intra' },
      ],
    });
    const c41 = r.lignes.find(l => l.compte === '41')!;
    expect(c41.eliminations).toBe(1_000_000);
    expect(c41.montantConsolide).toBe(0); // 1M mère − 1M éliminé
    const c40 = r.lignes.find(l => l.compte === '40')!;
    expect(c40.montantConsolide).toBe(0); // -1M filiale − (-1M) éliminé
  });

  it('mise en équivalence : une seule ligne « titres mis en équivalence »', () => {
    const participations: ParticipationConso[] = [
      { filialId: 'F', pourcentageDetention: 30, methode: 'mise_en_equivalence', situationNette: 2_500_000 },
    ];
    const r = consoliderGroupe({ mere, filiales: [filiale], participations });
    // Pas d'agrégation des comptes de la filiale (21 = mère seule).
    const c21 = r.lignes.find(l => l.compte === '21')!;
    expect(c21.montantConsolide).toBe(5_000_000);
    // Ligne MEE = 30 % de 2,5M = 750 000.
    const mee = r.lignes.find(l => l.compte === '26-MEE')!;
    expect(mee.montantConsolide).toBe(750_000);
    // Résultat part groupe inclut 30 % du résultat filiale.
    expect(r.resultatPartGroupe).toBe(2_000_000 + 300_000);
  });
});
