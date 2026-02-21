/**
 * Analyse de Benford — Détection d'anomalies comptables
 * Loi de Benford : la fréquence du premier chiffre significatif suit log10(1 + 1/d).
 * Utilisé en audit pour détecter les fraudes / manipulations.
 */

// ---------------------------------------------------------------------------
// Distribution théorique de Benford
// ---------------------------------------------------------------------------

const BENFORD_EXPECTED: Record<number, number> = {
  1: 0.30103,
  2: 0.17609,
  3: 0.12494,
  4: 0.09691,
  5: 0.07918,
  6: 0.06695,
  7: 0.05799,
  8: 0.05115,
  9: 0.04576,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BenfordResult {
  totalMontants: number;
  distribution: BenfordDigit[];
  chiSquare: number;
  seuilChiSquare: number;  // df=8, alpha=0.05 → 15.507
  conforme: boolean;
  anomalies: BenfordAnomaly[];
  zScores: Record<number, number>;
}

export interface BenfordDigit {
  digit: number;
  count: number;
  frequenceObservee: number;
  frequenceAttendue: number;
  ecart: number;          // en points de pourcentage
  ecartRelatif: number;   // en %
}

export interface BenfordAnomaly {
  digit: number;
  type: 'sur-representé' | 'sous-representé';
  ecartAbsolu: number;
  zScore: number;
  severite: 'faible' | 'moyen' | 'élevé';
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

/**
 * Extraire le premier chiffre significatif d'un nombre
 */
function premierChiffre(n: number): number | null {
  const abs = Math.abs(n);
  if (abs < 1) return null; // Ignorer les montants < 1
  const s = abs.toString().replace(/^0+\.?0*/, '');
  const d = parseInt(s[0], 10);
  return d >= 1 && d <= 9 ? d : null;
}

/**
 * Analyser un ensemble de montants selon la loi de Benford
 */
export function analyserBenford(montants: number[]): BenfordResult {
  // Compter les premiers chiffres
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let total = 0;

  for (const m of montants) {
    const d = premierChiffre(m);
    if (d !== null) {
      counts[d]++;
      total++;
    }
  }

  if (total === 0) {
    return {
      totalMontants: 0,
      distribution: [],
      chiSquare: 0,
      seuilChiSquare: 15.507,
      conforme: true,
      anomalies: [],
      zScores: {},
    };
  }

  // Distribution observée vs attendue
  const distribution: BenfordDigit[] = [];
  let chiSquare = 0;
  const zScores: Record<number, number> = {};
  const anomalies: BenfordAnomaly[] = [];

  for (let d = 1; d <= 9; d++) {
    const observee = counts[d] / total;
    const attendue = BENFORD_EXPECTED[d];
    const ecart = (observee - attendue) * 100;
    const ecartRelatif = attendue > 0 ? (ecart / (attendue * 100)) * 100 : 0;

    distribution.push({
      digit: d,
      count: counts[d],
      frequenceObservee: parseFloat(observee.toFixed(5)),
      frequenceAttendue: attendue,
      ecart: parseFloat(ecart.toFixed(3)),
      ecartRelatif: parseFloat(ecartRelatif.toFixed(2)),
    });

    // Chi-carré : Σ (O-E)² / E
    const expected = attendue * total;
    if (expected > 0) {
      chiSquare += ((counts[d] - expected) ** 2) / expected;
    }

    // Z-score : (O - E) / sqrt(E * (1-p) / N)
    const stdDev = Math.sqrt(attendue * (1 - attendue) / total);
    const z = stdDev > 0 ? (observee - attendue) / stdDev : 0;
    zScores[d] = parseFloat(z.toFixed(3));

    // Anomalies (|z| > 1.96 pour p < 0.05)
    if (Math.abs(z) > 1.96) {
      anomalies.push({
        digit: d,
        type: z > 0 ? 'sur-representé' : 'sous-representé',
        ecartAbsolu: parseFloat(Math.abs(ecart).toFixed(3)),
        zScore: parseFloat(z.toFixed(3)),
        severite: Math.abs(z) > 3.29 ? 'élevé' : Math.abs(z) > 2.58 ? 'moyen' : 'faible',
      });
    }
  }

  chiSquare = parseFloat(chiSquare.toFixed(4));
  const seuilChiSquare = 15.507; // df=8, alpha=0.05
  const conforme = chiSquare <= seuilChiSquare;

  return {
    totalMontants: total,
    distribution,
    chiSquare,
    seuilChiSquare,
    conforme,
    anomalies,
    zScores,
  };
}

/**
 * Générer un rapport textuel de l'analyse de Benford
 */
export function genererRapportBenford(result: BenfordResult): string {
  let rapport = '=== ANALYSE DE BENFORD ===\n\n';
  rapport += `Montants analysés: ${result.totalMontants}\n`;
  rapport += `Chi² calculé: ${result.chiSquare} (seuil: ${result.seuilChiSquare})\n`;
  rapport += `Conclusion: ${result.conforme ? 'CONFORME à la loi de Benford' : 'NON CONFORME — investigation recommandée'}\n\n`;

  rapport += 'Chiffre | Observé  | Attendu  | Écart   | Z-Score\n';
  rapport += '--------|----------|----------|---------|---------\n';
  for (const d of result.distribution) {
    rapport += `   ${d.digit}    | ${(d.frequenceObservee * 100).toFixed(2).padStart(6)}%  | ${(d.frequenceAttendue * 100).toFixed(2).padStart(6)}%  | ${d.ecart.toFixed(2).padStart(6)}pp | ${(result.zScores[d.digit] || 0).toFixed(2).padStart(6)}\n`;
  }

  if (result.anomalies.length > 0) {
    rapport += '\nANOMALIES DÉTECTÉES:\n';
    for (const a of result.anomalies) {
      rapport += `  - Chiffre ${a.digit}: ${a.type} (z=${a.zScore}, sévérité: ${a.severite})\n`;
    }
  }

  return rapport;
}

/**
 * Filtrer les montants par premier chiffre (pour investigation)
 */
export function filtrerParPremierChiffre(montants: number[], digit: number): number[] {
  return montants.filter(m => premierChiffre(m) === digit);
}
