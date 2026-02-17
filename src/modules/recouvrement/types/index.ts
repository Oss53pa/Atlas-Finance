// Types pour le module de recouvrement

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
  statut: StatutDossier;
  typeRecouvrement: TypeRecouvrement;
  responsable: string;
  derniereAction: string;
  dateAction: string;
  typeAction: TypeAction;
  prochainEtape: string;
}

export type StatutDossier = 'actif' | 'suspendu' | 'cloture' | 'juridique';
export type TypeRecouvrement = 'amiable' | 'judiciaire' | 'huissier';
export type TypeAction = 'APPEL' | 'EMAIL' | 'COURRIER' | 'SMS' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';

export interface ActionFormData {
  typeAction: Exclude<TypeAction, 'PROCEDURE_JUDICIAIRE'>;
  date: string;
  heure: string;
  responsable: string;
  details: string;
  montantPromis: string;
  datePromesse: string;
}

export interface TransferDetails {
  destinataire: string;
  motif: string;
  notes: string;
  validationStatus: 'pending' | 'approved' | 'rejected';
}

export interface EmailTemplate {
  rappel_amical: string;
  relance_ferme: string;
  dernier_avis: string;
  mise_demeure: string;
  pre_contentieux: string;
}

export interface SmsTemplate {
  rappel_amical: string;
  relance_ferme: string;
  dernier_avis: string;
  mise_demeure: string;
}

export type TabType = 'creances' | 'dossiers' | 'analytics' | 'parametres';
export type DossierTabType = 'dashboard' | 'relances' | 'actions' | 'documents';
export type ParametresTabType = 'configuration' | 'templates' | 'workflows';
export type RelanceSubTabType = 'historique' | 'planifiees' | 'modeles';
export type TemplateType = 'rappel_amical' | 'relance_ferme' | 'dernier_avis' | 'mise_demeure' | 'pre_contentieux';