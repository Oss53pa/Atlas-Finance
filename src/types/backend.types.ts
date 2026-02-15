/**
 * Types TypeScript pour l'API Atlas Finance Phase 1
 * Alignés avec le backend Django REST Framework
 *
 * Ces types correspondent EXACTEMENT aux modèles et serializers Django
 */

// ==================== BASE TYPES ====================

export interface BaseModel {
  id: string; // UUID
  created_at: string; // ISO datetime
  updated_at: string; // ISO datetime
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  detail?: string;
  errors?: Record<string, string[]>;
  message?: string;
}

// ==================== AUTHENTICATION ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

export interface User extends BaseModel {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role?: Role;
  role_id?: string;
}

export interface Role extends BaseModel {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface Permission extends BaseModel {
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  first_name: string;
  last_name: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
  new_password_confirmation: string;
}

// ==================== CORE - SOCIETES ====================

export interface Societe extends BaseModel {
  code: string;
  nom: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
}

export interface SocieteCreateRequest {
  code: string;
  nom: string;
  description?: string;
  email?: string;
  telephone?: string;
  address?: string;
}

export interface SocieteUpdateRequest extends Partial<SocieteCreateRequest> {}

// ==================== CORE - DEVISES ====================

export interface Devise extends BaseModel {
  code: string; // ISO 3 letters (XAF, EUR, USD)
  nom: string;
  symbole: string;
  taux_change: number; // decimal as number
  is_active: boolean;
}

export interface DeviseCreateRequest {
  code: string;
  nom: string;
  symbole: string;
  taux_change: number;
  is_active?: boolean;
}

export interface DeviseUpdateRequest extends Partial<DeviseCreateRequest> {}

// ==================== ACCOUNTING - EXERCICES ====================

export interface FiscalYear extends BaseModel {
  company: string; // UUID
  company_name?: string; // populated in responses
  code: string;
  name: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  is_closed: boolean;
  is_active: boolean;
}

export interface FiscalYearCreateRequest {
  company: string;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface FiscalYearUpdateRequest extends Partial<FiscalYearCreateRequest> {
  is_closed?: boolean;
}

// ==================== ACCOUNTING - JOURNAUX ====================

export type JournalType = 'AC' | 'VE' | 'BQ' | 'CA' | 'OD' | 'AN' | 'SAL';

export interface Journal extends BaseModel {
  company: string; // UUID
  company_name?: string;
  code: string;
  name: string;
  journal_type: JournalType;
  numbering_prefix: string;
  is_active: boolean;
  default_debit_account?: string; // UUID
  default_credit_account?: string; // UUID
}

export interface JournalCreateRequest {
  company: string;
  code: string;
  name: string;
  journal_type: JournalType;
  numbering_prefix: string;
  is_active?: boolean;
  default_debit_account?: string;
  default_credit_account?: string;
}

export interface JournalUpdateRequest extends Partial<JournalCreateRequest> {}

// ==================== ACCOUNTING - PLAN COMPTABLE ====================

export type AccountClass = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type AccountType = 'TOTAL' | 'DETAIL';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ChartOfAccounts extends BaseModel {
  company: string; // UUID
  company_name?: string;
  code: string;
  name: string;
  account_class: AccountClass;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_reconcilable: boolean;
  is_auxiliary: boolean;
  is_active: boolean;
  parent_account?: string; // UUID
  parent_account_name?: string;
}

export interface ChartOfAccountsCreateRequest {
  company: string;
  code: string;
  name: string;
  account_class: AccountClass;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_reconcilable?: boolean;
  is_auxiliary?: boolean;
  is_active?: boolean;
  parent_account?: string;
}

export interface ChartOfAccountsUpdateRequest extends Partial<ChartOfAccountsCreateRequest> {}

export interface AccountByClassParams {
  account_class?: AccountClass;
  search?: string;
  is_active?: boolean;
}

// ==================== ACCOUNTING - ECRITURES ====================

export interface JournalEntryLine {
  id?: string; // UUID (optional for create)
  journal_entry?: string; // UUID (auto-filled)
  account: string; // UUID
  account_name?: string; // populated
  label: string;
  debit: number; // decimal
  credit: number; // decimal
  third_party?: string; // UUID
  third_party_name?: string;
  line_order: number;
}

export interface JournalEntry extends BaseModel {
  company: string; // UUID
  company_name?: string;
  fiscal_year: string; // UUID
  fiscal_year_name?: string;
  journal: string; // UUID
  journal_name?: string;
  entry_number: string;
  entry_date: string; // YYYY-MM-DD
  description: string;
  reference?: string;
  is_validated: boolean;
  validated_at?: string; // ISO datetime
  validated_by?: string; // UUID
  validated_by_name?: string;
  lines: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface JournalEntryCreateRequest {
  company: string;
  fiscal_year: string;
  journal: string;
  entry_date: string;
  description: string;
  reference?: string;
  lines: Omit<JournalEntryLine, 'id' | 'journal_entry' | 'account_name' | 'third_party_name'>[];
}

export interface JournalEntryUpdateRequest extends Partial<JournalEntryCreateRequest> {}

export interface JournalEntryValidateResponse {
  success: boolean;
  message: string;
  entry: JournalEntry;
}

export interface JournalEntryStats {
  total_entries: number;
  validated_entries: number;
  pending_entries: number;
  total_debit: number;
  total_credit: number;
  entries_by_journal: Record<string, number>;
  entries_by_month: Record<string, number>;
}

// ==================== THIRD PARTY - TIERS ====================

export type TiersType = 'CLIENT' | 'FOURNISSEUR' | 'CLIENT_FOURNISSEUR';
export type TiersStatut = 'ACTIF' | 'INACTIF' | 'BLOQUE';

export interface Tiers extends BaseModel {
  societe: string; // UUID
  societe_name?: string;
  type_tiers: TiersType;
  raison_sociale: string;
  nif?: string;
  rccm?: string;
  code_tiers?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  site_web?: string;
  statut: TiersStatut;
  date_creation: string; // YYYY-MM-DD
  remarques?: string;
}

export interface TiersCreateRequest {
  societe: string;
  type_tiers: TiersType;
  raison_sociale: string;
  nif?: string;
  rccm?: string;
  code_tiers?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  site_web?: string;
  statut?: TiersStatut;
  date_creation?: string;
  remarques?: string;
}

export interface TiersUpdateRequest extends Partial<TiersCreateRequest> {}

export interface TiersFilterParams {
  type_tiers?: TiersType;
  statut?: TiersStatut;
  search?: string;
}

// ==================== THIRD PARTY - ADRESSES ====================

export type AdresseType = 'PRINCIPALE' | 'FACTURATION' | 'LIVRAISON' | 'AUTRE';

export interface AdresseTiers extends BaseModel {
  tiers: string; // UUID
  tiers_name?: string;
  type_adresse: AdresseType;
  adresse_ligne1: string;
  adresse_ligne2?: string;
  ville: string;
  code_postal?: string;
  region?: string;
  pays: string;
  est_principale: boolean;
}

export interface AdresseTiersCreateRequest {
  tiers: string;
  type_adresse: AdresseType;
  adresse_ligne1: string;
  adresse_ligne2?: string;
  ville: string;
  code_postal?: string;
  region?: string;
  pays: string;
  est_principale?: boolean;
}

export interface AdresseTiersUpdateRequest extends Partial<AdresseTiersCreateRequest> {}

// ==================== THIRD PARTY - CONTACTS ====================

export interface ContactTiers extends BaseModel {
  tiers: string; // UUID
  tiers_name?: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  est_principal: boolean;
  remarques?: string;
}

export interface ContactTiersCreateRequest {
  tiers: string;
  nom: string;
  prenom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  est_principal?: boolean;
  remarques?: string;
}

export interface ContactTiersUpdateRequest extends Partial<ContactTiersCreateRequest> {}

// ==================== QUERY PARAMETERS ====================

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface SortParams {
  ordering?: string; // field name, prefix with '-' for descending
}

export interface SearchParams {
  search?: string;
}

export interface QueryParams extends PaginationParams, SortParams, SearchParams {}

// ==================== API CLIENT TYPES ====================

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface ApiClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
  enableLogging?: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoff?: 'exponential' | 'linear';
  retryableErrors?: number[]; // HTTP status codes to retry
}

// ==================== LOGGING ====================

export interface ApiLogEntry {
  timestamp: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
  requestData?: any;
  responseData?: any;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
