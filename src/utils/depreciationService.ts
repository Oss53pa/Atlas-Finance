import { money } from './money';

export interface Immobilisation {
  id: string;
  code: string;
  libelle: string;
  compteImmobilisation: string;
  compteAmortissement: string;
  compteDotation: string;
  dateAcquisition: string;
  valeurAcquisition: number;
  dureeAmortissement: number;
  tauxAmortissement: number;
  modeAmortissement: 'lineaire' | 'degressif' | 'soyd';
  valeurResiduelle?: number;
  amortissementsCumules: number;
  dernierAmortissement?: string;
}

export interface EcritureAmortissement {
  date: string;
  journal: string;
  piece: string;
  libelle: string;
  lignes: {
    compte: string;
    libelle: string;
    debit: number;
    credit: number;
  }[];
  immobilisationId: string;
  periode: string;
  montant: number;
}

export class DepreciationService {
  static calculerAmortissementLineaire(
    valeurAcquisition: number,
    dureeAnnees: number,
    valeurResiduelle: number = 0
  ): number {
    const baseAmortissable = money(valeurAcquisition).subtract(valeurResiduelle);
    return baseAmortissable.divide(dureeAnnees).toNumber();
  }

  static calculerAmortissementDegressif(
    valeurAcquisition: number,
    tauxDegressif: number,
    anneesEcoulees: number,
    amortissementsCumules: number
  ): number {
    const valeurNetteComptable = money(valeurAcquisition).subtract(amortissementsCumules);
    return valeurNetteComptable.multiply(tauxDegressif).divide(100).toNumber();
  }

  /**
   * SOYD — Sum of Years Digits (amortissement accéléré)
   * Dotation annee N = (base × (dureeVie - annee + 1)) / sommeChiffres
   */
  static calculerAmortissementSOYD(
    valeurAcquisition: number,
    dureeVie: number,
    annee: number,
    valeurResiduelle: number = 0
  ): number {
    const base = valeurAcquisition - valeurResiduelle;
    const sommeChiffres = (dureeVie * (dureeVie + 1)) / 2;
    const numerateur = dureeVie - annee + 1;
    return money(base).multiply(numerateur).divide(sommeChiffres).toNumber();
  }

  static calculerAmortissementMensuel(
    immobilisation: Immobilisation,
    mois: string
  ): number {
    const anneesEcoulees = this.calculerAnneesEcoulees(immobilisation.dateAcquisition, mois);
    let annuiteAnnuelle: number;
    if (immobilisation.modeAmortissement === 'soyd') {
      const annee = Math.max(1, Math.ceil(anneesEcoulees));
      annuiteAnnuelle = this.calculerAmortissementSOYD(
        immobilisation.valeurAcquisition,
        immobilisation.dureeAmortissement,
        annee,
        immobilisation.valeurResiduelle
      );
    } else if (immobilisation.modeAmortissement === 'lineaire') {
      annuiteAnnuelle = this.calculerAmortissementLineaire(
        immobilisation.valeurAcquisition,
        immobilisation.dureeAmortissement,
        immobilisation.valeurResiduelle
      );
    } else {
      annuiteAnnuelle = this.calculerAmortissementDegressif(
        immobilisation.valeurAcquisition,
        immobilisation.tauxAmortissement,
        anneesEcoulees,
        immobilisation.amortissementsCumules
      );
    }
    const annuiteMensuelle = money(annuiteAnnuelle).divide(12).toNumber();

    return money(annuiteMensuelle).round(0).toNumber();
  }

  static calculerAnneesEcoulees(dateAcquisition: string, dateCourante: string): number {
    const debut = new Date(dateAcquisition);
    const fin = new Date(dateCourante);

    // SYSCOHADA : année commerciale 360 jours (12 × 30)
    const moisDebut = debut.getFullYear() * 12 + debut.getMonth();
    const moisFin = fin.getFullYear() * 12 + fin.getMonth();
    const joursDebut = Math.min(debut.getDate(), 30);
    const joursFin = Math.min(fin.getDate(), 30);

    const totalJours = (moisFin - moisDebut) * 30 + (joursFin - joursDebut);
    return Math.max(0, totalJours) / 360;
  }

  static genererEcritureAmortissement(
    immobilisation: Immobilisation,
    periode: string,
    exerciceId: string
  ): EcritureAmortissement {
    const montantAmortissement = this.calculerAmortissementMensuel(immobilisation, periode);

    const [annee, mois] = periode.split('-');
    const dernierJourMois = new Date(parseInt(annee), parseInt(mois), 0).getDate();
    const dateEcriture = `${periode}-${dernierJourMois.toString().padStart(2, '0')}`;

    const piece = `AMORT-${periode}-${immobilisation.code}`;

    return {
      date: dateEcriture,
      journal: 'OD - Op\u00e9rations Diverses',
      piece,
      libelle: `Dotation amortissement ${immobilisation.libelle} - ${this.getMoisLibelle(parseInt(mois))} ${annee}`,
      lignes: [
        {
          compte: immobilisation.compteDotation,
          libelle: `Dotation amortissement ${immobilisation.libelle}`,
          debit: montantAmortissement,
          credit: 0
        },
        {
          compte: immobilisation.compteAmortissement,
          libelle: `Amortissement cumul\u00e9 ${immobilisation.libelle}`,
          debit: 0,
          credit: montantAmortissement
        }
      ],
      immobilisationId: immobilisation.id,
      periode,
      montant: montantAmortissement
    };
  }

  static genererEcrituresAmortissementPeriode(
    immobilisations: Immobilisation[],
    periode: string,
    exerciceId: string
  ): EcritureAmortissement[] {
    const ecritures: EcritureAmortissement[] = [];

    for (const immobilisation of immobilisations) {
      if (this.doitEtreAmorti(immobilisation, periode)) {
        const ecriture = this.genererEcritureAmortissement(
          immobilisation,
          periode,
          exerciceId
        );
        ecritures.push(ecriture);
      }
    }

    return ecritures;
  }

  static doitEtreAmorti(immobilisation: Immobilisation, periode: string): boolean {
    const dateAcquisition = new Date(immobilisation.dateAcquisition);
    const [annee, mois] = periode.split('-');
    const datePeriode = new Date(parseInt(annee), parseInt(mois) - 1, 1);

    if (datePeriode < dateAcquisition) {
      return false;
    }

    const valeurNette =
      immobilisation.valeurAcquisition - immobilisation.amortissementsCumules;
    const valeurResiduelle = immobilisation.valeurResiduelle || 0;

    return valeurNette > valeurResiduelle;
  }

  static getComptesDotationParClasse(): { [key: string]: string } {
    return {
      '21': '6811',
      '22': '6812',
      '23': '6813',
      '24': '6814',
      '241': '68141',
      '244': '68144',
      '245': '68145'
    };
  }

  static getComptesAmortissementParClasse(): { [key: string]: string } {
    return {
      '21': '281',
      '22': '282',
      '23': '283',
      '24': '284',
      '241': '2841',
      '244': '2844',
      '245': '2845'
    };
  }

  static getMoisLibelle(mois: number): string {
    const moisLibelles = [
      'Janvier',
      'F\u00e9vrier',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Ao\u00fbt',
      'Septembre',
      'Octobre',
      'Novembre',
      'D\u00e9cembre'
    ];
    return moisLibelles[mois - 1] || '';
  }

  static genererTableauAmortissement(
    immobilisation: Immobilisation
  ): {
    annee: number;
    baseAmortissable: number;
    dotation: number;
    amortissementCumule: number;
    valeurNetteComptable: number;
  }[] {
    const tableau = [];
    let amortissementCumule = 0;

    for (let annee = 1; annee <= immobilisation.dureeAmortissement; annee++) {
      let dotation: number;
      if (immobilisation.modeAmortissement === 'soyd') {
        dotation = this.calculerAmortissementSOYD(
          immobilisation.valeurAcquisition,
          immobilisation.dureeAmortissement,
          annee,
          immobilisation.valeurResiduelle
        );
      } else if (immobilisation.modeAmortissement === 'lineaire') {
        dotation = this.calculerAmortissementLineaire(
          immobilisation.valeurAcquisition,
          immobilisation.dureeAmortissement,
          immobilisation.valeurResiduelle
        );
      } else {
        dotation = this.calculerAmortissementDegressif(
          immobilisation.valeurAcquisition,
          immobilisation.tauxAmortissement,
          annee - 1,
          amortissementCumule
        );
      }

      // AF-I04: Bascule dégressif → linéaire quand annuité linéaire > annuité dégressive
      if (immobilisation.modeAmortissement === 'degressif') {
        const vnc = immobilisation.valeurAcquisition - amortissementCumule;
        const anneesRestantes = immobilisation.dureeAmortissement - annee + 1;
        if (anneesRestantes > 0) {
          const annuiteLineaire = money(vnc).divide(anneesRestantes).toNumber();
          if (annuiteLineaire > dotation) {
            dotation = annuiteLineaire;
          }
        }
      }

      amortissementCumule += dotation;
      const valeurNetteComptable = immobilisation.valeurAcquisition - amortissementCumule;

      tableau.push({
        annee: parseInt(immobilisation.dateAcquisition.substring(0, 4)) + annee - 1,
        baseAmortissable: immobilisation.valeurAcquisition,
        dotation: money(dotation).round(0).toNumber(),
        amortissementCumule: money(amortissementCumule).round(0).toNumber(),
        valeurNetteComptable: money(valeurNetteComptable).round(0).toNumber()
      });

      if (valeurNetteComptable <= (immobilisation.valeurResiduelle || 0)) {
        break;
      }
    }

    // AF-I09: Contrôle de bouclage — ajuster dernière annuité pour que Σ = base amortissable
    if (tableau.length > 0) {
      const totalDotations = tableau.reduce((s, t) => s + t.dotation, 0);
      const baseAmortissable = immobilisation.valeurAcquisition - (immobilisation.valeurResiduelle || 0);
      const ecart = baseAmortissable - totalDotations;
      if (Math.abs(ecart) > 0 && Math.abs(ecart) < 100) {
        tableau[tableau.length - 1].dotation += ecart;
        tableau[tableau.length - 1].amortissementCumule += ecart;
        tableau[tableau.length - 1].valeurNetteComptable -= ecart;
      }
    }

    return tableau;
  }

  static validerAmortissementConforme(
    ecriture: EcritureAmortissement,
    immobilisation: Immobilisation
  ): { valide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];

    const totalDebit = ecriture.lignes.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = ecriture.lignes.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      erreurs.push('\u00c9criture non \u00e9quilibr\u00e9e');
    }

    const ligneDotation = ecriture.lignes.find(l =>
      l.compte.startsWith('681')
    );
    if (!ligneDotation) {
      erreurs.push('Ligne de dotation manquante (compte 681x)');
    }

    const ligneAmortissement = ecriture.lignes.find(l =>
      l.compte.startsWith('28')
    );
    if (!ligneAmortissement) {
      erreurs.push('Ligne d\'amortissement cumul\u00e9 manquante (compte 28x)');
    }

    if (ligneDotation && ligneDotation.debit === 0) {
      erreurs.push('La dotation doit \u00eatre au d\u00e9bit');
    }

    if (ligneAmortissement && ligneAmortissement.credit === 0) {
      erreurs.push('L\'amortissement cumul\u00e9 doit \u00eatre au cr\u00e9dit');
    }

    const valeurNette =
      immobilisation.valeurAcquisition -
      immobilisation.amortissementsCumules -
      ecriture.montant;

    if (valeurNette < (immobilisation.valeurResiduelle || 0) - 0.01) {
      erreurs.push('L\'amortissement d\u00e9passe la valeur amortissable');
    }

    return { valide: erreurs.length === 0, erreurs };
  }
}

export default DepreciationService;