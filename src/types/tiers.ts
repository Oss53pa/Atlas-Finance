// ===== THIRD-PARTY MANAGEMENT TYPES =====

export interface ThirdParty {
  id: string;
  code: string;
  nom: string;
  type: ThirdPartyType;
  statut: ThirdPartyStatus;
  formeJuridique?: FormeJuridique;
  numeroRC?: string;
  numeroNIF?: string;
  numeroNIU?: string;
  secteurActivite?: string;
  adresse: Address;
  contacts: Contact[];
  informationsFinancieres: FinancialInfo;
  informationsCommerciales: CommercialInfo;
  historique: HistoryEntry[];
  notes: Note[];
  documents: Document[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

export interface Client extends ThirdParty {
  type: 'CLIENT';
  categorieClient: ClientCategory;
  segmentClient: ClientSegment;
  risqueClient: RiskLevel;
  chiffreAffaires?: number;
  potentielCommercial?: number;
  datePremiereVente?: string;
  dateDerniereVente?: string;
  delaiPaiementHabituel?: number;
  limiteCreditAutorisee?: number;
  encours: number;
  soldeComptable: number;
  impayesEnCours: number;
  dso: number; // Days Sales Outstanding
  crm: CRMData;
}

export interface Supplier extends ThirdParty {
  type: 'FOURNISSEUR';
  categorieFournisseur: SupplierCategory;
  evaluationFournisseur: SupplierEvaluation;
  certifications: Certification[];
  delaiLivraison?: number;
  qualiteProduits?: QualityRating;
  fiabilite?: ReliabilityRating;
  conditionsPaiement: PaymentTerms;
  contactCommercial?: Contact;
  contactTechnique?: Contact;
}

export interface Contact {
  id: string;
  tiersId: string;
  civilite: Civility;
  prenom: string;
  nom: string;
  fonction?: string;
  departement?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  linkedin?: string;
  isPrincipal: boolean;
  isActif: boolean;
  languePrefere?: string;
  dateNaissance?: string;
  notes?: string;
  interactions: Interaction[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  rue: string;
  ville: string;
  codePostal?: string;
  region?: string;
  pays: string;
  coordonneesGPS?: {
    latitude: number;
    longitude: number;
  };
}

export interface FinancialInfo {
  chiffreAffaires?: number;
  resultatNet?: number;
  totalActif?: number;
  capitalSocial?: number;
  devisePrincipale: string;
  conditionsPaiement: PaymentTerms;
  modePaiementPrefere?: PaymentMethod;
  comptesBancaires: BankAccount[];
  situationFinanciere?: FinancialSituation;
}

export interface CommercialInfo {
  sourceProspection?: string;
  responsableCommercial?: string;
  objectifVente?: number;
  remiseHabituelle?: number;
  conditions: string;
  categoriePrice?: PriceCategory;
  territoireCommercial?: string;
  canaux: SalesChannel[];
}

export interface CRMData {
  scoreProspection: number;
  stadeProspection: ProspectStage;
  probabiliteVente: number;
  valeurOpportunite?: number;
  dateDerniereInteraction?: string;
  prochaineSuivi?: string;
  campagnesMarketing: MarketingCampaign[];
  interactions: Interaction[];
  opportunites: Opportunity[];
  devis: Quote[];
  projets: Project[];
}

export interface Interaction {
  id: string;
  type: InteractionType;
  date: string;
  sujet: string;
  description: string;
  statut: InteractionStatus;
  responsable: string;
  contactId?: string;
  prochaineSuivi?: string;
  resultats?: string;
  fichesJoints: string[];
  createdAt: string;
}

export interface Opportunity {
  id: string;
  nom: string;
  valeur: number;
  probabilite: number;
  stade: OpportunityStage;
  dateCreation: string;
  dateClotureEstimee: string;
  dateCloture?: string;
  produits: OpportunityProduct[];
  concurrents: Competitor[];
  description: string;
  responsable: string;
}

export interface Quote {
  id: string;
  numero: string;
  date: string;
  validiteJusquau: string;
  montantHT: number;
  montantTTC: number;
  statut: QuoteStatus;
  lignes: QuoteLine[];
  conditions: string;
  validePar?: string;
  dateValidation?: string;
}

export interface Reconciliation {
  id: string;
  tiersId: string;
  referenceDocument: string;
  typeDocument: DocumentType;
  montant: number;
  montantLettré: number;
  dateLettrage: string;
  utilisateur: string;
  statut: ReconciliationStatus;
  commentaires?: string;
}

export interface DebtCollection {
  id: string;
  clientId: string;
  factures: InvoiceDebt[];
  montantTotal: number;
  joursRetard: number;
  niveauRelance: CollectionLevel;
  derniereRelance?: string;
  prochaineRelance?: string;
  relances: CollectionAction[];
  statut: CollectionStatus;
  assigneA?: string;
  commentaires?: string;
}

export interface CollectionAction {
  id: string;
  type: CollectionActionType;
  date: string;
  description: string;
  montant?: number;
  moyenCommunication: CommunicationChannel;
  responsable: string;
  resultat?: string;
  prochaineSuivi?: string;
}

export interface Message {
  id: string;
  expediteur: string;
  destinataires: string[];
  tiersId?: string;
  sujet: string;
  contenu: string;
  type: MessageType;
  priorite: MessagePriority;
  statut: MessageStatus;
  lue: boolean;
  reponduA?: string;
  fichesJoints: MessageAttachment[];
  dateEnvoi: string;
  dateLecture?: string;
}

export interface Collaboration {
  id: string;
  tiersId: string;
  participants: CollaborationParticipant[];
  sujet: string;
  description: string;
  statut: CollaborationStatus;
  dateDebut: string;
  dateFinPrevue?: string;
  dateFin?: string;
  taches: CollaborationTask[];
  documents: SharedDocument[];
  discussions: Discussion[];
}

// ===== ENUMS =====

export type ThirdPartyType = 'CLIENT' | 'FOURNISSEUR' | 'PROSPECT' | 'PARTENAIRE';

export type ThirdPartyStatus = 'ACTIF' | 'INACTIF' | 'SUSPENDU' | 'BLACKLISTE';

export type ClientCategory = 'PARTICULIER' | 'PROFESSIONNEL' | 'ENTREPRISE' | 'ADMINISTRATION';

export type ClientSegment = 'VIP' | 'PREMIUM' | 'STANDARD' | 'PROSPECT';

export type SupplierCategory = 'MATIERE_PREMIERE' | 'SERVICE' | 'EQUIPEMENT' | 'CONSOMMABLE';

export type RiskLevel = 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';

export type Civility = 'M' | 'MME' | 'MLLE' | 'DR' | 'PR';

export type InteractionType = 'APPEL' | 'EMAIL' | 'RENCONTRE' | 'VISITE' | 'DEMONSTRATION' | 'NEGOTIATION';

export type InteractionStatus = 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'REPORTE' | 'ANNULE';

export type ProspectStage = 'SUSPECT' | 'PROSPECT' | 'QUALIFIE' | 'OPPORTUNITE' | 'PROPOSITION' | 'NEGOTIATION' | 'CLOSURE';

export type OpportunityStage = 'QUALIFICATION' | 'BESOINS' | 'PROPOSITION' | 'NEGOTIATION' | 'DECISION' | 'GAGNE' | 'PERDU';

export type QuoteStatus = 'BROUILLON' | 'ENVOYE' | 'ACCEPTE' | 'REFUSE' | 'EXPIRE';

export type DocumentType = 'FACTURE' | 'AVOIR' | 'DEVIS' | 'COMMANDE' | 'CONTRAT' | 'PAIEMENT';

export type ReconciliationStatus = 'OUVERT' | 'LETTRE' | 'PARTIELLEMENT_LETTRE';

export type CollectionLevel = 'AUCUNE' | 'RELANCE_1' | 'RELANCE_2' | 'RELANCE_3' | 'MISE_EN_DEMEURE' | 'CONTENTIEUX';

export type CollectionStatus = 'EN_COURS' | 'RESOLU' | 'CONTENTIEUX' | 'IRRECUPERABLE';

export type CollectionActionType = 'APPEL' | 'EMAIL' | 'COURRIER' | 'VISITE' | 'MISE_EN_DEMEURE' | 'PROCEDURE_JUDICIAIRE';

export type CommunicationChannel = 'TELEPHONE' | 'EMAIL' | 'COURRIER' | 'SMS' | 'FACE_A_FACE';

export type MessageType = 'EMAIL' | 'CHAT' | 'NOTIFICATION' | 'ANNONCE';

export type MessagePriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';

export type MessageStatus = 'BROUILLON' | 'ENVOYE' | 'RECU' | 'LU' | 'ARCHIVE';

export type CollaborationStatus = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE';

export type PaymentMethod = 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE_BANCAIRE' | 'MOBILE_MONEY';

export type FinancialSituation = 'EXCELLENT' | 'BON' | 'MOYEN' | 'DIFFICILE' | 'CRITIQUE';

export type QualityRating = 'EXCELLENT' | 'BON' | 'MOYEN' | 'INSUFFISANT';

export type ReliabilityRating = 'TRÈS_FIABLE' | 'FIABLE' | 'MOYEN' | 'PEU_FIABLE';

export type SalesChannel = 'DIRECT' | 'DISTRIBUTEUR' | 'PARTENAIRE' | 'ONLINE' | 'RETAIL';

export type PriceCategory = 'STANDARD' | 'PREFERENTIEL' | 'VIP' | 'PROMOTIONNEL';

export type FormeJuridique = 'SARL' | 'SA' | 'SAS' | 'EURL' | 'SNC' | 'SCI' | 'ASSOCIATION' | 'PARTICULIER';

// ===== SUPPORTING INTERFACES =====

export interface PaymentTerms {
  delaiPaiement: number; // en jours
  conditionsSpeciales?: string;
  escompte?: number;
  penaliteRetard?: number;
}

export interface BankAccount {
  banque: string;
  numeroCompte: string;
  iban?: string;
  swift?: string;
  isPrincipal: boolean;
}

export interface SupplierEvaluation {
  scoreGlobal: number;
  qualite: number;
  delais: number;
  prix: number;
  service: number;
  dateEvaluation: string;
  evaluePar: string;
  commentaires?: string;
}

export interface Certification {
  nom: string;
  organisme: string;
  dateObtention: string;
  dateExpiration?: string;
  numeroReference?: string;
  isValid: boolean;
}

export interface MarketingCampaign {
  id: string;
  nom: string;
  type: string;
  dateDebut: string;
  dateFin?: string;
  budget?: number;
  objectif: string;
  resultats?: CampaignResults;
}

export interface CampaignResults {
  touchesGeneres: number;
  conversions: number;
  chiffreAffaires: number;
  roi: number;
}

export interface OpportunityProduct {
  produitId: string;
  nom: string;
  quantite: number;
  prixUnitaire: number;
  remise?: number;
  total: number;
}

export interface Competitor {
  nom: string;
  avantages?: string;
  inconvenients?: string;
  prixEstime?: number;
}

export interface QuoteLine {
  produitId: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  remise?: number;
  montantHT: number;
  tauxTVA: number;
  montantTVA: number;
  montantTTC: number;
}

export interface InvoiceDebt {
  factureId: string;
  numero: string;
  date: string;
  dateEcheance: string;
  montantOriginal: number;
  montantRestant: number;
  joursRetard: number;
}

export interface MessageAttachment {
  nom: string;
  url: string;
  taille: number;
  type: string;
}

export interface CollaborationParticipant {
  userId: string;
  nom: string;
  role: string;
  dateAjout: string;
  permissions: string[];
}

export interface CollaborationTask {
  id: string;
  titre: string;
  description: string;
  assigneA: string;
  dateCreation: string;
  dateEcheance?: string;
  dateFin?: string;
  statut: TaskStatus;
  priorite: TaskPriority;
}

export interface SharedDocument {
  id: string;
  nom: string;
  url: string;
  type: string;
  taille: number;
  uploadePar: string;
  dateUpload: string;
  permissions: DocumentPermissions;
}

export interface Discussion {
  id: string;
  sujet: string;
  messages: DiscussionMessage[];
  participants: string[];
  dateCreation: string;
  isArchive: boolean;
}

export interface DiscussionMessage {
  id: string;
  auteur: string;
  contenu: string;
  timestamp: string;
  fichesJoints?: MessageAttachment[];
  reponduA?: string;
}

export interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  ancienneValeur?: unknown;
  nouvelleValeur?: unknown;
  utilisateur: string;
  timestamp: string;
}

export interface Note {
  id: string;
  titre?: string;
  contenu: string;
  auteur: string;
  dateCreation: string;
  dateModification?: string;
  isPrivate: boolean;
  tags: string[];
}

export interface Document {
  id: string;
  nom: string;
  type: string;
  url: string;
  taille: number;
  dateUpload: string;
  uploadePar: string;
  description?: string;
  tags: string[];
}

export interface Project {
  id: string;
  nom: string;
  description: string;
  budget?: number;
  dateDebut: string;
  dateFinPrevue: string;
  dateFin?: string;
  statut: ProjectStatus;
  responsable: string;
  progression: number;
}

export type TaskStatus = 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
export type TaskPriority = 'BASSE' | 'NORMALE' | 'HAUTE' | 'URGENTE';
export type ProjectStatus = 'PLANIFIE' | 'EN_COURS' | 'SUSPENDU' | 'TERMINE' | 'ANNULE';

export interface DocumentPermissions {
  lecture: string[];
  ecriture: string[];
  admin: string[];
}

// ===== DASHBOARD TYPES =====

export interface TiersKPI {
  totalClients: number;
  totalFournisseurs: number;
  totalContacts: number;
  chiffreAffairesTotal: number;
  encoursClients: number;
  impayesTotal: number;
  dsoMoyen: number;
  nouveauxClientsMois: number;
  croissanceCA: number;
  tauxRecouvrement: number;
}

export interface ClientAnalytics {
  repartitionParSegment: SegmentData[];
  evolutionCA: ChartData[];
  topClients: TopClientData[];
  risqueClients: RiskData[];
  dsoEvolution: ChartData[];
}

export interface SupplierAnalytics {
  repartitionParCategorie: CategoryData[];
  evaluations: EvaluationData[];
  delaisLivraison: DeliveryData[];
  volumeAchats: PurchaseData[];
}

export interface SegmentData {
  segment: ClientSegment;
  nombre: number;
  ca: number;
  pourcentage: number;
}

export interface TopClientData {
  id: string;
  nom: string;
  ca: number;
  encours: number;
  dso: number;
  statut: FinancialSituation;
}

export interface RiskData {
  niveau: RiskLevel;
  nombre: number;
  montant: number;
}

export interface ChartData {
  date: string;
  valeur: number;
  label?: string;
}

export interface CategoryData {
  categorie: SupplierCategory;
  nombre: number;
  montant: number;
}

export interface EvaluationData {
  fournisseur: string;
  scoreGlobal: number;
  qualite: number;
  delais: number;
  service: number;
}

export interface DeliveryData {
  fournisseur: string;
  delaiMoyen: number;
  respectDelais: number;
}

export interface PurchaseData {
  mois: string;
  montant: number;
  nombreCommandes: number;
}