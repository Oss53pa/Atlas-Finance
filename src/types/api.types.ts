/**
 * TYPES TYPESCRIPT POUR TOUTES LES ENTITÉS API
 *
 * Types complets pour assurer la cohérence entre frontend et backend
 */

/**
 * ========================================
 * TYPES DE BASE
 * ========================================
 */

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TimestampedEntity {
  created_at: string;
  updated_at: string;
}

/**
 * ========================================
 * CORE - Entités de base
 * ========================================
 */

export interface Company extends BaseEntity {
  nom: string;
  code: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
  logo?: string;
  numero_rc?: string;
  numero_if?: string;
  actif: boolean;
}

export interface FiscalYear extends BaseEntity {
  code: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'cloture' | 'archive';
  societe: string;
  actif: boolean;
}

export interface Currency extends BaseEntity {
  code: string;
  libelle: string;
  symbole: string;
  taux_change: number;
  devise_reference: boolean;
  actif: boolean;
}

/**
 * ========================================
 * AUTHENTICATION
 * ========================================
 */

export interface User extends BaseEntity {
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role?: string;
  permissions?: string[];
  last_login?: string;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserProfile extends User {
  phone?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

/**
 * ========================================
 * ACCOUNTING - Comptabilité
 * ========================================
 */

export interface ChartOfAccount extends BaseEntity {
  numero: string;
  libelle: string;
  classe: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  sous_classe?: string;
  compte_principal?: string;
  parent?: string;
  type: 'detail' | 'total';
  nature: 'debit' | 'credit';
  actif: boolean;
  societe: string;
}

export interface Journal extends BaseEntity {
  code: string;
  libelle: string;
  type: 'ACH' | 'VTE' | 'BQ' | 'OD' | 'PAIE' | 'AN';
  compte_contrepartie?: string;
  actif: boolean;
  societe: string;
}

export interface AccountingEntry extends BaseEntity {
  numero_piece: string;
  date_piece: string;
  journal: string;
  libelle: string;
  reference_externe?: string;
  statut: 'brouillon' | 'valide' | 'lettree' | 'contrepasse';
  lignes: AccountingEntryLine[];
  total_debit: number;
  total_credit: number;
  exercice: string;
  societe: string;
  validee_par?: string;
  date_validation?: string;
}

export interface AccountingEntryLine extends BaseEntity {
  ecriture: string;
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
  tiers?: string;
  axe_analytique?: string;
  centre_analytique?: string;
  piece_jointe?: string;
  numero_ligne: number;
}

/**
 * ========================================
 * THIRD PARTY - Tiers
 * ========================================
 */

export interface ThirdParty extends BaseEntity {
  code: string;
  nom: string;
  type: 'client' | 'fournisseur' | 'client_fournisseur' | 'autre';
  compte_comptable?: string;
  adresse?: string;
  ville?: string;
  code_postal?: string;
  pays?: string;
  telephone?: string;
  email?: string;
  contact_principal?: string;
  numero_rc?: string;
  numero_if?: string;
  conditions_reglement?: string;
  delai_paiement?: number;
  plafond_credit?: number;
  actif: boolean;
  societe: string;
}

export interface Contact extends BaseEntity {
  tiers: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
  principal: boolean;
  actif: boolean;
}

/**
 * ========================================
 * TREASURY - Trésorerie
 * ========================================
 */

export interface BankAccount extends BaseEntity {
  numero_compte: string;
  libelle: string;
  banque: string;
  agence?: string;
  iban?: string;
  bic_swift?: string;
  compte_comptable: string;
  devise: string;
  solde_initial: number;
  solde_actuel: number;
  date_ouverture: string;
  date_fermeture?: string;
  actif: boolean;
  societe: string;
}

export interface BankTransaction extends BaseEntity {
  compte_bancaire: string;
  date_operation: string;
  date_valeur: string;
  libelle: string;
  reference?: string;
  montant: number;
  sens: 'debit' | 'credit';
  solde_apres: number;
  type_operation: 'virement' | 'cheque' | 'carte' | 'prelevement' | 'depot' | 'autre';
  statut: 'en_attente' | 'rapproche' | 'lettree';
  ecriture_comptable?: string;
  piece_jointe?: string;
}

/**
 * ========================================
 * ASSETS - Immobilisations
 * ========================================
 */

export interface FixedAsset extends BaseEntity {
  numero: string;
  libelle: string;
  categorie: string;
  compte_immobilisation: string;
  compte_amortissement: string;
  date_acquisition: string;
  date_mise_en_service?: string;
  valeur_acquisition: number;
  valeur_residuelle?: number;
  duree_amortissement: number;
  methode_amortissement: 'lineaire' | 'degressif' | 'variable';
  taux_amortissement: number;
  valeur_nette_comptable: number;
  statut: 'en_cours' | 'amorti' | 'cede' | 'reforme';
  localisation?: string;
  responsable?: string;
  fournisseur?: string;
  societe: string;
}

export interface Depreciation extends BaseEntity {
  immobilisation: string;
  exercice: string;
  date_dotation: string;
  montant_dotation: number;
  amortissement_cumule: number;
  valeur_nette_comptable: number;
  ecriture_comptable?: string;
  statut: 'calculee' | 'comptabilisee';
}

/**
 * ========================================
 * ANALYTICS - Comptabilité analytique
 * ========================================
 */

export interface AnalyticalAxis extends BaseEntity {
  code: string;
  libelle: string;
  description?: string;
  obligatoire: boolean;
  actif: boolean;
  societe: string;
}

export interface AnalyticalCenter extends BaseEntity {
  code: string;
  libelle: string;
  axe: string;
  parent?: string;
  niveau: number;
  actif: boolean;
  responsable?: string;
}

/**
 * ========================================
 * BUDGETING - Budget
 * ========================================
 */

export interface Budget extends BaseEntity {
  code: string;
  libelle: string;
  exercice: string;
  type: 'previsionnel' | 'initial' | 'modifie';
  date_debut: string;
  date_fin: string;
  statut: 'brouillon' | 'valide' | 'cloture';
  montant_total: number;
  societe: string;
}

export interface BudgetControl extends BaseEntity {
  budget: string;
  compte: string;
  centre_analytique?: string;
  montant_budgete: number;
  montant_realise: number;
  montant_engage: number;
  ecart: number;
  taux_realisation: number;
  periode: string;
}

/**
 * ========================================
 * TAXATION - Fiscalité
 * ========================================
 */

export interface TaxDeclaration extends BaseEntity {
  numero: string;
  type: 'tva' | 'is' | 'irpp' | 'tpl' | 'autre';
  exercice: string;
  periode_debut: string;
  periode_fin: string;
  date_declaration?: string;
  date_limite_depot: string;
  montant_taxe: number;
  montant_paye?: number;
  statut: 'brouillon' | 'depose' | 'paye';
  fichier_declaration?: string;
  societe: string;
}

/**
 * ========================================
 * REPORTING - Rapports
 * ========================================
 */

export interface Report extends BaseEntity {
  code: string;
  libelle: string;
  type: 'balance' | 'grand_livre' | 'bilan' | 'resultat' | 'tresorerie' | 'autre';
  description?: string;
  parametres?: Record<string, any>;
  genere_par?: string;
  date_generation?: string;
  fichier?: string;
  statut: 'en_cours' | 'genere' | 'erreur';
  societe: string;
}

export interface Dashboard {
  id: string;
  nom: string;
  widgets: DashboardWidget[];
  periode: {
    debut: string;
    fin: string;
  };
  data: Record<string, any>;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'gauge';
  titre: string;
  donnees: any;
  configuration?: Record<string, any>;
}

/**
 * ========================================
 * SECURITY - Sécurité
 * ========================================
 */

export interface Role extends BaseEntity {
  nom: string;
  code: string;
  description?: string;
  permissions: Permission[];
  utilisateurs_count: number;
}

export interface Permission {
  id: string;
  nom: string;
  code: string;
  module: string;
  description?: string;
}

/**
 * ========================================
 * DTOs - Data Transfer Objects
 * ========================================
 */

// Create DTOs
export type CreateCompanyDto = Omit<Company, keyof BaseEntity | 'actif'>;
export type CreateFiscalYearDto = Omit<FiscalYear, keyof BaseEntity | 'actif'>;
export type CreateAccountingEntryDto = Omit<AccountingEntry, keyof BaseEntity | 'numero_piece' | 'total_debit' | 'total_credit' | 'statut' | 'validee_par' | 'date_validation'>;
export type CreateThirdPartyDto = Omit<ThirdParty, keyof BaseEntity | 'actif'>;
export type CreateBankAccountDto = Omit<BankAccount, keyof BaseEntity | 'solde_actuel' | 'actif'>;
export type CreateFixedAssetDto = Omit<FixedAsset, keyof BaseEntity | 'valeur_nette_comptable' | 'statut'>;

// Update DTOs
export type UpdateCompanyDto = Partial<CreateCompanyDto>;
export type UpdateFiscalYearDto = Partial<CreateFiscalYearDto>;
export type UpdateAccountingEntryDto = Partial<CreateAccountingEntryDto>;
export type UpdateThirdPartyDto = Partial<CreateThirdPartyDto>;
export type UpdateBankAccountDto = Partial<CreateBankAccountDto>;
export type UpdateFixedAssetDto = Partial<CreateFixedAssetDto>;

/**
 * ========================================
 * QUERY PARAMS SPÉCIALISÉS
 * ========================================
 */

export interface AccountingQueryParams {
  exercice?: string;
  journal?: string;
  compte?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
}

export interface TreasuryQueryParams {
  compte_bancaire?: string;
  date_debut?: string;
  date_fin?: string;
  type_operation?: string;
  statut?: string;
  page?: number;
  page_size?: number;
}

export interface ReportQueryParams {
  exercice?: string;
  date_debut?: string;
  date_fin?: string;
  format?: 'pdf' | 'excel' | 'csv';
  type?: string;
}

/**
 * ========================================
 * RESPONSES SPÉCIALISÉES
 * ========================================
 */

export interface BalanceResponse {
  comptes: Array<{
    numero: string;
    libelle: string;
    solde_debiteur: number;
    solde_crediteur: number;
    total_debit: number;
    total_credit: number;
  }>;
  totaux: {
    total_debit: number;
    total_credit: number;
    solde_debiteur: number;
    solde_crediteur: number;
  };
}

export interface DashboardDataResponse {
  kpis: {
    chiffre_affaires: number;
    resultat_net: number;
    tresorerie: number;
    creances_clients: number;
    dettes_fournisseurs: number;
  };
  graphiques: {
    evolution_ca: Array<{ date: string; montant: number }>;
    repartition_charges: Array<{ categorie: string; montant: number }>;
    evolution_tresorerie: Array<{ date: string; solde: number }>;
  };
}

/**
 * ========================================
 * UTILITY TYPES
 * ========================================
 */

export type EntityStatus = 'actif' | 'inactif' | 'archive';
export type AccountingStatus = 'brouillon' | 'valide' | 'lettree' | 'contrepasse';
export type AssetStatus = 'en_cours' | 'amorti' | 'cede' | 'reforme';
export type BudgetStatus = 'brouillon' | 'valide' | 'cloture';
export type TaxStatus = 'brouillon' | 'depose' | 'paye';

export type JournalType = 'ACH' | 'VTE' | 'BQ' | 'OD' | 'PAIE' | 'AN';
export type ThirdPartyType = 'client' | 'fournisseur' | 'client_fournisseur' | 'autre';
export type DepreciationMethod = 'lineaire' | 'degressif' | 'variable';

/**
 * ========================================
 * API ERROR TYPES
 * ========================================
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  errors?: Record<string, string[]>;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * ========================================
 * EXPORT DEFAULT
 * ========================================
 */

export default {};