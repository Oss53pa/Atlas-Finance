/**
 * Utilitaire de validation TVA renforcé
 * Conforme SYSCOHADA et normes fiscales OHADA
 */

export interface TVAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  montantHT?: number;
  montantTVA?: number;
  tauxTVA?: number;
}

export class TVAValidator {
  // Comptes TVA SYSCOHADA
  private static readonly COMPTES_TVA = {
    TVA_COLLECTEE: ['44571', '445710', '4457'],
    TVA_DEDUCTIBLE: ['44566', '445660', '4456', '44562'],
    TVA_DUE: ['444', '4444'],
    TVA_CREDIT: ['445'],
  };

  // Taux TVA standards zone OHADA
  private static readonly TAUX_TVA_STANDARDS = [
    0,     // Exonéré
    5.5,   // Taux réduit
    10,    // Taux intermédiaire
    18,    // Taux normal (plusieurs pays)
    19,    // Taux normal
    19.25, // Cameroun
    20,    // Taux normal (plusieurs pays)
  ];

  /**
   * Validation complète d'une écriture avec TVA
   */
  static validateEcritureTVA(lignes: LigneEcriture[]): TVAValidationResult {
    const result: TVAValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // 1. Vérifier la présence de lignes TVA
    this.checkLignesTVAPresence(lignes, result);

    // 2. Vérifier la cohérence des montants TVA
    this.checkMontantsTVA(lignes, result);

    // 3. Vérifier la cohérence HT + TVA = TTC
    this.checkCoherenceHTTVATTC(lignes, result);

    // 4. Vérifier les comptes TVA corrects
    this.checkComptesTVA(lignes, result);

    // 5. Vérifier les taux de TVA
    this.checkTauxTVA(lignes, result);

    // 6. Vérifier la correspondance TVA déductible/collectée
    this.checkCorrespondanceTVA(lignes, result);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Vérifier la présence de lignes TVA
   */
  private static checkLignesTVAPresence(lignes: LigneEcriture[], result: TVAValidationResult): void {
    const lignesTVA = lignes.filter(l => this.isCompteTVA(l.compte));

    if (lignesTVA.length === 0) {
      const hasAccountsWithTVA = lignes.some(l =>
        l.montantHT !== undefined || l.montantTVA !== undefined
      );

      if (hasAccountsWithTVA) {
        result.errors.push('Informations TVA présentes mais aucune ligne de TVA trouvée');
      }
    }
  }

  /**
   * Vérifier la cohérence des montants TVA
   */
  private static checkMontantsTVA(lignes: LigneEcriture[], result: TVAValidationResult): void {
    for (const ligne of lignes) {
      if (ligne.montantHT !== undefined && ligne.montantTVA !== undefined && ligne.tauxTVA !== undefined) {
        const tvaCalculee = ligne.montantHT * (ligne.tauxTVA / 100);
        const ecart = Math.abs(tvaCalculee - ligne.montantTVA);

        // Tolérance de 0.01 (centime) pour les arrondis
        if (ecart > 0.01) {
          result.errors.push(
            `Incohérence TVA sur compte ${ligne.compte}: ` +
            `Calculée: ${tvaCalculee.toFixed(2)}, ` +
            `Déclarée: ${ligne.montantTVA.toFixed(2)}`
          );
        } else if (ecart > 0.005) {
          result.warnings.push(
            `Arrondi TVA sur compte ${ligne.compte}: ` +
            `Écart de ${ecart.toFixed(3)}`
          );
        }
      }
    }
  }

  /**
   * Vérifier la cohérence HT + TVA = TTC
   */
  private static checkCoherenceHTTVATTC(lignes: LigneEcriture[], result: TVAValidationResult): void {
    const lignesTVA = lignes.filter(l => this.isCompteTVA(l.compte));
    const lignesNonTVA = lignes.filter(l => !this.isCompteTVA(l.compte));

    for (const ligneTVA of lignesTVA) {
      if (ligneTVA.montantHT !== undefined && ligneTVA.montantTVA !== undefined) {
        const ttcAttendu = ligneTVA.montantHT + ligneTVA.montantTVA;
        const montantLigne = ligneTVA.debit > 0 ? ligneTVA.debit : ligneTVA.credit;

        // Vérifier que le montant de la ligne TVA correspond à la TVA seule
        if (Math.abs(montantLigne - ligneTVA.montantTVA) > 0.01) {
          result.errors.push(
            `Le montant de la ligne TVA (${montantLigne}) ` +
            `ne correspond pas à la TVA calculée (${ligneTVA.montantTVA})`
          );
        }
      }
    }
  }

  /**
   * Vérifier les comptes TVA corrects selon le sens de l'opération
   */
  private static checkComptesTVA(lignes: LigneEcriture[], result: TVAValidationResult): void {
    const lignesTVA = lignes.filter(l => this.isCompteTVA(l.compte));

    for (const ligneTVA of lignesTVA) {
      const estDebit = ligneTVA.debit > 0;
      const estCredit = ligneTVA.credit > 0;

      // TVA déductible doit être au débit
      if (this.isCompteTVADeductible(ligneTVA.compte) && !estDebit) {
        result.errors.push(
          `Le compte TVA déductible ${ligneTVA.compte} doit être au débit`
        );
      }

      // TVA collectée doit être au crédit
      if (this.isCompteTVACollectee(ligneTVA.compte) && !estCredit) {
        result.errors.push(
          `Le compte TVA collectée ${ligneTVA.compte} doit être au crédit`
        );
      }
    }
  }

  /**
   * Vérifier les taux de TVA
   */
  private static checkTauxTVA(lignes: LigneEcriture[], result: TVAValidationResult): void {
    for (const ligne of lignes) {
      if (ligne.tauxTVA !== undefined) {
        // Vérifier que le taux est positif
        if (ligne.tauxTVA < 0) {
          result.errors.push(
            `Taux TVA négatif sur compte ${ligne.compte}: ${ligne.tauxTVA}%`
          );
        }

        // Vérifier que le taux est raisonnable (< 30%)
        if (ligne.tauxTVA > 30) {
          result.errors.push(
            `Taux TVA anormalement élevé sur compte ${ligne.compte}: ${ligne.tauxTVA}%`
          );
        }

        // Avertir si le taux n'est pas standard
        if (!this.TAUX_TVA_STANDARDS.includes(ligne.tauxTVA) && ligne.tauxTVA > 0) {
          result.warnings.push(
            `Taux TVA non standard sur compte ${ligne.compte}: ${ligne.tauxTVA}%. ` +
            `Vérifiez qu'il s'agit bien du taux applicable.`
          );
        }
      }
    }
  }

  /**
   * Vérifier la correspondance entre TVA déductible et collectée
   */
  private static checkCorrespondanceTVA(lignes: LigneEcriture[], result: TVAValidationResult): void {
    const totalTVADeductible = lignes
      .filter(l => this.isCompteTVADeductible(l.compte))
      .reduce((sum, l) => sum + l.debit, 0);

    const totalTVACollectee = lignes
      .filter(l => this.isCompteTVACollectee(l.compte))
      .reduce((sum, l) => sum + l.credit, 0);

    // Suggérer l'équilibre si déséquilibre important
    if (totalTVADeductible > 0 && totalTVACollectee > 0) {
      const ratio = Math.abs(totalTVADeductible / totalTVACollectee);
      if (ratio > 10 || ratio < 0.1) {
        result.warnings.push(
          `Déséquilibre important entre TVA déductible (${totalTVADeductible.toFixed(2)}) ` +
          `et TVA collectée (${totalTVACollectee.toFixed(2)})`
        );
      }
    }
  }

  /**
   * Vérifier si un compte est un compte TVA
   */
  static isCompteTVA(compte: string): boolean {
    return (
      this.isCompteTVADeductible(compte) ||
      this.isCompteTVACollectee(compte) ||
      compte.startsWith('444') ||
      compte.startsWith('445')
    );
  }

  /**
   * Vérifier si un compte est TVA déductible
   */
  static isCompteTVADeductible(compte: string): boolean {
    return this.COMPTES_TVA.TVA_DEDUCTIBLE.some(c => compte.startsWith(c));
  }

  /**
   * Vérifier si un compte est TVA collectée
   */
  static isCompteTVACollectee(compte: string): boolean {
    return this.COMPTES_TVA.TVA_COLLECTEE.some(c => compte.startsWith(c));
  }

  /**
   * Calculer la TVA à partir d'un montant HT et d'un taux
   */
  static calculerTVA(montantHT: number, tauxTVA: number): number {
    return Math.round(montantHT * (tauxTVA / 100) * 100) / 100;
  }

  /**
   * Calculer le montant TTC
   */
  static calculerTTC(montantHT: number, tauxTVA: number): number {
    const montantTVA = this.calculerTVA(montantHT, tauxTVA);
    return montantHT + montantTVA;
  }

  /**
   * Calculer le montant HT à partir du TTC
   */
  static calculerHT(montantTTC: number, tauxTVA: number): number {
    return Math.round((montantTTC / (1 + tauxTVA / 100)) * 100) / 100;
  }

  /**
   * Générer un rapport de validation
   */
  static generateValidationReport(result: TVAValidationResult): string {
    let report = '=== RAPPORT DE VALIDATION TVA ===\n\n';

    if (result.isValid) {
      report += '✅ VALIDATION RÉUSSIE\n\n';
    } else {
      report += '❌ VALIDATION ÉCHOUÉE\n\n';
    }

    if (result.errors.length > 0) {
      report += '🚨 ERREURS:\n';
      result.errors.forEach((error, i) => {
        report += `${i + 1}. ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '⚠️  AVERTISSEMENTS:\n';
      result.warnings.forEach((warning, i) => {
        report += `${i + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    if (result.suggestions.length > 0) {
      report += '💡 SUGGESTIONS:\n';
      result.suggestions.forEach((suggestion, i) => {
        report += `${i + 1}. ${suggestion}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

export default TVAValidator;