export type RegimeType = 'RSI' | 'RNI' | 'CGU' | 'REEL' | 'MICRO';

export type DeclarationFrequence = 'MENSUELLE' | 'BIMESTRIELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'EXCEPTIONNELLE';

export type DeclarationStatut = 'OBLIGATOIRE' | 'FACULTATIVE' | 'CONDITIONNELLE';

export type DeclarationStatus = 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'TRANSMISE' | 'ACCEPTEE' | 'REJETEE' | 'PAYEE';

export type ObligationStatut = 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';

export type AlerteType = 'ECHEANCE_PROCHE' | 'RETARD_DECLARATION' | 'RETARD_PAIEMENT' | 'CHANGEMENT_REGLEMENTATION' | 'CONTROLE_FISCAL' | 'SEUIL_DEPASSE' | 'AUTRE';

export type AlerteNiveau = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type AlerteStatut = 'ACTIVE' | 'ACQUITTEE' | 'RESOLUE' | 'IGNOREE';

export type ImpotType = 'TVA' | 'IS' | 'PATENTE' | 'CENTIMES_ADDITIONNELS';

export interface RegimeFiscal {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  type_regime: RegimeType;
  taux_is: number;
  taux_tva_standard: number;
  taux_tva_reduit: number;
  seuil_ca_annual: number;
  plafond_deduc_charges: number;
  declarations_obligatoires: string[];
  date_debut_validite: string;
  date_fin_validite?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TypeDeclaration {
  id: number;
  code: string;
  libelle: string;
  description?: string;
  frequence: DeclarationFrequence;
  statut: DeclarationStatut;
  jour_echeance: number;
  mois_offset: number;
  formule_calcul?: string;
  comptes_base_calcul: number[];
  comptes_detail: Array<{
    id: number;
    numero: string;
    intitule: string;
  }>;
  taux_penalite_retard: number;
  penalite_fixe: number;
  is_active: boolean;
  ordre_affichage: number;
  created_at: string;
  updated_at: string;
}

export interface LigneDeclaration {
  id: number;
  code_ligne: string;
  libelle: string;
  description?: string;
  montant_base: number;
  taux_applique: number;
  montant_calcule: number;
  obligatoire: boolean;
  calculee_auto: boolean;
  formule?: string;
  ordre: number;
  compte?: number;
  compte_detail?: {
    numero: string;
    intitule: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DeclarationFiscale {
  id: number;
  numero_declaration: string;
  reference_administration?: string;
  exercice: number;
  periode_debut: string;
  periode_fin: string;
  date_limite_depot: string;
  date_limite_paiement: string;
  base_imposable: number;
  montant_impot: number;
  credit_impot: number;
  acompte_verse: number;
  montant_du: number;
  penalite_retard: number;
  majorations: number;
  statut: DeclarationStatus;
  date_validation?: string;
  date_transmission?: string;
  date_paiement?: string;
  valide_par?: number;
  transmise_par?: number;
  valide_par_detail?: {
    username: string;
    email: string;
  };
  transmise_par_detail?: {
    username: string;
    email: string;
  };
  fichier_declaration?: string;
  accuse_reception?: string;
  donnees_declaration: Record<string, any>;
  observations?: string;
  commentaires_administration?: string;
  type_declaration: number;
  regime_fiscal: number;
  type_declaration_detail: TypeDeclaration;
  regime_fiscal_detail: RegimeFiscal;
  lignes: LigneDeclaration[];
  is_en_retard: boolean;
  jours_retard: number;
  created_at: string;
  updated_at: string;
}

export interface ObligationFiscale {
  id: number;
  debut_obligation: string;
  fin_obligation?: string;
  rappel_actif: boolean;
  nb_jours_rappel: number;
  responsable?: number;
  responsable_detail?: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  statut: ObligationStatut;
  observations?: string;
  type_declaration: number;
  regime_fiscal: number;
  type_declaration_detail: TypeDeclaration;
  regime_fiscal_detail: RegimeFiscal;
  prochaines_echeances: string[];
  created_at: string;
  updated_at: string;
}

export interface AlerteFiscale {
  id: number;
  type_alerte: AlerteType;
  niveau: AlerteNiveau;
  titre: string;
  message: string;
  date_echeance?: string;
  montant_concerne?: number;
  statut: AlerteStatut;
  date_creation: string;
  date_acquittement?: string;
  acquittee_par?: number;
  acquittee_par_detail?: {
    username: string;
    email: string;
  };
  actions_recommandees: string[];
  commentaires?: string;
  declaration?: number;
  obligation?: number;
  declaration_detail?: {
    numero_declaration: string;
    type: string;
  };
  obligation_detail?: {
    type: string;
    statut: string;
  };
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_declarations: number;
  declarations_pending: number;
  declarations_overdue: number;
  vat_due: number;
  upcoming_deadlines: number;
  compliance_rate: number;
  total_amount: number;
  total_paid: number;
  pending_amount: number;
  overdue_count: number;
  by_status: Record<string, number>;
  monthly_evolution: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

export interface RapportConformite {
  periode: {
    debut: string;
    fin: string;
  };
  societe: string;
  regime_fiscal: string;
  declarations: Array<{
    type: string;
    periode: string;
    statut: string;
    date_depot?: string;
    en_retard: boolean;
    penalites: number;
  }>;
  obligations_respectees: number;
  obligations_en_retard: number;
  montant_penalites: number;
  score_conformite: number;
  recommandations: string[];
}

export interface CalculImpotRequest {
  type_impot: ImpotType;
  base_calcul: number;
  periode: string;
  parametres_specifiques?: Record<string, any>;
}

export interface CalculImpotResponse {
  montant: number;
  details: Record<string, any>;
  date_calcul: string;
  regime: string;
}

export interface DeclarationCreateRequest {
  type_declaration: number;
  exercice: number;
  periode_debut: string;
  periode_fin: string;
}

export interface Echeance {
  obligation_id: number;
  type_declaration: string;
  date_echeance: string;
  jours_restants: number;
  responsable?: string;
}

export interface DeclarationFilters {
  type_declaration?: number;
  exercice?: number;
  statut?: DeclarationStatus;
  search?: string;
}