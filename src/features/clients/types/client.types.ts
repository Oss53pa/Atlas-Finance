export interface ClientAddress {
  rue: string;
  ville: string;
  codePostal: string;
  pays: string;
}

export interface ClientContact {
  nom: string;
  fonction?: string;
  email: string;
  telephone: string;
}

export interface ClientComptabilite {
  compteCollectif: string;
  comptesAuxiliaires: string[];
  regimeTVA: 'NORMAL' | 'SIMPLIFIE' | 'FRANCHISE';
  tauxTVADefaut: number;
  exonerationTVA: boolean;
  modeReglement: 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'CARTE';
  conditionsPaiement: string;
  delaiPaiement: number;
  plafondEncours: number;
  deviseFacturation: string;
}

export interface ClientBanque {
  iban: string;
  bic: string;
  domiciliation: string;
  mandatSEPA?: {
    numeroMandat: string;
    dateMandat: string;
  };
}

export interface ClientClassification {
  categorie: 'GRAND_COMPTE' | 'PME' | 'TPE' | 'PARTICULIER';
  zoneGeographique: string;
  responsableCommercial: string;
  notationInterne: 'A' | 'B' | 'C' | 'D';
  clientStrategique: boolean;
}

export interface ClientFinancier {
  chiffreAffairesAnnuel: number;
  encours: number;
  soldeComptable: number;
  impayesEnCours: number;
  delaistMoyenPaiement: number;
  tauxRetard: number;
  scoreSolvabilite: number;
  limiteCredit: number;
  caAnneePrecedente: number;
  evolution: number;
}

export interface ClientDetail {
  id: string;
  code: string;
  nom: string;
  nomCommercial?: string;
  formeJuridique: string;
  siret?: string;
  codeAPE?: string;
  numeroTVA?: string;
  capitalSocial?: number;
  dateCreation: string;
  secteurActivite: string;
  effectif?: number;
  chiffreAffairesConnu?: number;
  adresseFacturation: ClientAddress;
  adresseCorrespondance?: ClientAddress;
  contacts: {
    comptabilite: ClientContact;
    principal: ClientContact;
  };
  comptabilite: ClientComptabilite;
  banque: ClientBanque;
  classification: ClientClassification;
  financier: ClientFinancier;
  statut: 'ACTIF' | 'INACTIF' | 'PROSPECT' | 'SUSPENDU';
  remarques?: string;
}

export interface Facture {
  id: string;
  numero: string;
  date: string;
  echeance: string;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  solde: number;
  statut: 'EN_ATTENTE' | 'PAYEE_PARTIELLEMENT' | 'PAYEE' | 'EN_RETARD';
  retardJours?: number;
}

export interface Paiement {
  id: string;
  date: string;
  montant: number;
  mode: string;
  reference: string;
  factures: string[];
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}