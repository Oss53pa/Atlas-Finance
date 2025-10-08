export interface DossierRecouvrement {
  id: string;
  numeroRef: string;
  client: string;
  montantPrincipal: number;
  interets: number;
  frais: number;
  montantTotal: number;
  montantPaye: number;
  nombreFactures: number;
  dsoMoyen: number;
  dateOuverture: string;
  statut: 'actif' | 'suspendu' | 'cloture' | 'juridique';
  typeRecouvrement: 'amiable' | 'judiciaire' | 'huissier';
  responsable: string;
  derniereAction: string;
  dateAction: string;
  typeAction: 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';
  prochainEtape: string;
}

export interface Creance {
  id: string;
  client: string;
  numeroFacture: string;
  montant: number;
  montantRestant: number;
  dateEcheance: string;
  dateCreation: string;
  jourRetard: number;
  statut: string;
  niveauRisque: 'faible' | 'moyen' | 'eleve' | 'critique';
  derniereRelance: string;
  historique: Action[];
}

export interface Action {
  id: string;
  type: 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';
  date: string;
  responsable: string;
  resultat: string;
  notes: string;
}

export interface PlanRemboursement {
  id: string;
  client: string;
  montantTotal: number;
  nombreEcheances: number;
  montantEcheance: number;
  dateDebut: string;
  dateFin: string;
  statut: 'actif' | 'termine' | 'suspendu' | 'rompu';
  echeancesPayees: number;
  prochainePaiement: string;
}

export interface EmailTemplate {
  type: 'rappel_amical' | 'relance_ferme' | 'dernier_avis' | 'mise_demeure' | 'pre_contentieux';
  subject: string;
  body: string;
}

export interface SMSTemplate {
  type: 'rappel_amical' | 'relance_ferme' | 'dernier_avis' | 'mise_demeure' | 'pre_contentieux';
  message: string;
}

export interface RecoveryStats {
  totalCreances: number;
  montantTotal: number;
  tauxRecouvrement: number;
  dossiersActifs: number;
  nouveauxDossiers: number;
  dossiersResolus: number;
}