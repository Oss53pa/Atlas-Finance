export type ClotureType = 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'SPECIALE';
export type ClotureStatus = 'EN_COURS' | 'VALIDEE' | 'CLOTUREE' | 'ANNULEE';
export type ProvisionStatus = 'PROPOSEE' | 'VALIDEE' | 'REJETEE';

export interface ClotureSession {
  id: string | number;
  type: ClotureType;
  periode: string;
  exercice: string;
  dateDebut: string;
  dateFin: string;
  dateCreation: string;
  statut: ClotureStatus;
  creePar: string;
  progression: number;
}

export interface BalanceAccount {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  soldeDebiteur: number;
  soldeCrediteur: number;
}

export interface Provision {
  id: string | number;
  compteClient: string;
  client: string;
  solde: number;
  anciennete: number;
  tauxProvision: number;
  montantProvision: number;
  statut: ProvisionStatus;
  dateProposition: string;
  dateValidation?: string;
}

export interface EcritureCloture {
  id: string | number;
  numero: string;
  date: string;
  libelle: string;
  compteDebit: string;
  compteCredit: string;
  montant: number;
  statut: 'BROUILLON' | 'VALIDEE' | 'COMPTABILISEE';
  typeOperation: 'PROVISION' | 'AMORTISSEMENT' | 'REGULARISATION' | 'AUTRE';
  validation?: {
    validePar: string;
    dateValidation: string;
  };
}

export interface Amortissement {
  id: string | number;
  immobilisation: string;
  libelleImmobilisation: string;
  valeurAcquisition: number;
  amortissementCumule: number;
  dotationExercice: number;
  tauxAmortissement: number;
  statut: 'CALCULE' | 'VALIDE' | 'COMPTABILISE';
}

export interface ClotureStats {
  totalProvisions: number;
  totalAmortissements: number;
  totalRegularisations: number;
  totalEcritures: number;
  ecrituresValidees: number;
  ecrituresEnAttente: number;
}