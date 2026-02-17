// ===== CORE TYPES =====

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  twoFactorEnabled: boolean;
  lastLoginDate?: string;
  passwordExpiryDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  societe: Societe;
  permissions: Permission[];
}

export interface Societe {
  id: string;
  code: string;
  raisonSociale: string;
  nomCommercial?: string;
  formeJuridique: FormeJuridique;
  rccm?: string;
  nif?: string;
  niu?: string;
  capital?: number;
  devisePrincipale: Devise;
  adresse: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  secteurActivite: string;
  effectif?: number;
  logo?: string;
  parent?: Societe;
  filiales: Societe[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Devise {
  id: string;
  code: string; // XAF, EUR, USD
  libelle: string;
  symbole: string;
  decimales: number;
  tauxFixe: boolean;
  tauxFixeValeur?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exercice {
  id: string;
  societe: Societe;
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  statut: ExerciceStatut;
  dateCloture?: string;
  clotureParUserId?: string;
  isCurrent: boolean;
  periodes: Periode[];
  createdAt: string;
  updatedAt: string;
}

export interface Periode {
  id: string;
  exercice: Exercice;
  code: string;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  statut: PeriodeStatut;
  dateCloture?: string;
  createdAt: string;
  updatedAt: string;
}

// ===== ACCOUNTING TYPES =====

export interface PlanComptable {
  id: string;
  code: string;
  libelle: string;
  libelleCourl?: string;
  typePlan: TypePlan;
  classe: number; // 1-9 pour SYSCOHADA
  nature: NatureCompte;
  parent?: PlanComptable;
  children: PlanComptable[];
  lettrable: boolean;
  pointable: boolean;
  collectif: boolean;
  analytiqueObligatoire: boolean;
  deviseAutorisee: boolean;
  compteIfrs?: string;
  retraitementAuto: boolean;
  formuleRetraitement?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: TypeJournal;
  compteContrepartie?: PlanComptable;
  numerotationAuto: boolean;
  prefixeNumero: string;
  dernierNumero: number;
  formatNumero: string;
  validationRequise: boolean;
  niveauValidation: number;
  pieceObligatoire: boolean;
  groupesAutorises: string[];
  signatureElectronique: boolean;
  isActive: boolean;
  dateCloture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ecriture {
  id: string;
  numeroPiece: string;
  dateEcriture: string;
  dateValeur?: string;
  journal: Journal;
  exercice: Exercice;
  periode: Periode;
  libelle: string;
  referenceExterne?: string;
  statut: StatutEcriture;
  lignes: LigneEcriture[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdBy: User;
  validatedBy?: User;
  validatedAt?: string;
  piecesJointes: PieceJustificative[];
  createdAt: string;
  updatedAt: string;
}

export interface LigneEcriture {
  id: string;
  ecriture: Ecriture;
  numeroLigne: number;
  compte: PlanComptable;
  tiers?: Tiers;
  debit: number;
  credit: number;
  devise: Devise;
  montantDevise?: number;
  tauxChange?: number;
  lettrage?: string;
  dateLettrage?: string;
  sectionAnalytique: Record<string, string>; // {"axe1": "section1", "axe2": "section2"}
  createdAt: string;
  updatedAt: string;
}

// ===== THIRD PARTY TYPES =====

export interface Tiers {
  id: string;
  code: string;
  type: TypeTiers[];
  raisonSociale: string;
  nomCommercial?: string;
  formeJuridique: FormeJuridique;
  capital?: number;
  rccm?: string;
  nif?: string;
  niu?: string;
  email?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  siteWeb?: string;
  compteComptable: PlanComptable;
  conditionsPaiement: number; // En jours
  modeReglement: ModeReglement;
  limiteCredit: number;
  devise: Devise;
  tauxRemise: number;
  tauxEscompte: number;
  exonereTva: boolean;
  iban?: string;
  bic?: string;
  domiciliation?: string;
  scoreCredit: number;
  encoursActuel: number;
  retardMoyen: number;
  isActive: boolean;
  bloque: boolean;
  motifBlocage?: string;
  contacts: ContactTiers[];
  adresses: AdresseTiers[];
  createdAt: string;
  updatedAt: string;
}

// ===== ENUMS =====

export enum UserRole {
  ADMIN = 'ADMIN',
  CHEF_COMPTABLE = 'CHEF_COMPTABLE',
  COMPTABLE = 'COMPTABLE',
  ASSISTANT_COMPTABLE = 'ASSISTANT_COMPTABLE',
  AUDITEUR = 'AUDITEUR',
  CONSULTANT = 'CONSULTANT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED',
}

export enum FormeJuridique {
  SA = 'SA',
  SARL = 'SARL',
  SAS = 'SAS',
  EI = 'EI',
  ASSOCIATION = 'ASSOCIATION',
  AUTRE = 'AUTRE',
}

export enum ExerciceStatut {
  OUVERT = 'OUVERT',
  CLOTURE = 'CLOTURE',
  ARCHIVE = 'ARCHIVE',
}

export enum PeriodeStatut {
  OUVERT = 'OUVERT',
  CLOTURE = 'CLOTURE',
}

export enum TypePlan {
  SYSCOHADA = 'SYSCOHADA',
  BANK = 'BANK',
  INSURANCE = 'INSURANCE',
  MICROFINANCE = 'MICROFINANCE',
  CUSTOM = 'CUSTOM',
}

export enum NatureCompte {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TypeJournal {
  ACH = 'ACH', // Achats
  VTE = 'VTE', // Ventes
  TRE = 'TRE', // Trésorerie
  OD = 'OD',   // Opérations Diverses
  AN = 'AN',   // À-nouveaux
  SAL = 'SAL', // Salaires
  DEC = 'DEC', // Déclarations
}

export enum StatutEcriture {
  BROUILLON = 'BROUILLON',
  VALIDE = 'VALIDE',
  CLOTURE = 'CLOTURE',
}

export enum TypeTiers {
  CLIENT = 'CLIENT',
  FOURNISSEUR = 'FOURNISSEUR',
  SALARIE = 'SALARIE',
  AUTRE = 'AUTRE',
}

export enum ModeReglement {
  ESPECES = 'ESPECES',
  CHEQUE = 'CHEQUE',
  VIREMENT = 'VIREMENT',
  PRELEVEMENT = 'PRELEVEMENT',
  CARTE = 'CARTE',
  AUTRE = 'AUTRE',
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BookSearchParams {
  title?: string;
  author?: string;
  isbn?: string;
  category?: string;
  publisher?: string;
  language?: string;
  status?: BookStatus;
  page?: number;
  limit?: number;
  orderBy?: 'title' | 'publishedDate' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface LoanSearchParams {
  userId?: string;
  bookId?: string;
  status?: LoanStatus;
  overdue?: boolean;
  page?: number;
  limit?: number;
  orderBy?: 'loanDate' | 'dueDate' | 'returnDate';
  order?: 'asc' | 'desc';
}

export interface DashboardStats {
  totalBooks: number;
  availableBooks: number;
  totalUsers: number;
  activeLoans: number;
  overdueLoans: number;
  totalReservations: number;
  booksAddedThisMonth: number;
  loansThisMonth: number;
}

export interface PopularBook extends Book {
  loanCount: number;
}

export interface RecentActivity {
  id: string;
  type: 'LOAN' | 'RETURN' | 'RESERVATION' | 'REGISTRATION';
  description: string;
  userId: string;
  userName: string;
  bookId?: string;
  bookTitle?: string;
  timestamp: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  reservationAlerts: boolean;
  overdueReminders: boolean;
  newBookAlerts: boolean;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
}