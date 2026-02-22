/**
 * @atlas/shared — Types comptables unifies pour Atlas Finance
 *
 * Types source-of-truth pour le DataAdapter.
 * Compatibles avec les DBxxxx interfaces existantes de Dexie
 * ET avec le schema Supabase (snake_case en DB, camelCase en TS).
 */

// ============================================================================
// JOURNAL / ECRITURES
// ============================================================================

export interface JournalEntry {
  id: string
  entryNumber: string
  journal: string               // AC, VE, BQ, CA, OD, AN, CL
  date: string                  // ISO date
  reference: string
  label: string
  status: 'draft' | 'validated' | 'posted'
  lines: JournalEntryLine[]
  totalDebit: number
  totalCredit: number
  reversed?: boolean
  reversedBy?: string
  reversedAt?: string
  reversalOf?: string
  reversalReason?: string
  hash?: string
  previousHash?: string
  createdAt: string
  updatedAt: string
  createdBy?: string            // 'manual:<userId>' | 'proph3t:<userId>'
  exerciceId?: string
  tenantId?: string
}

export interface JournalEntryLine {
  id: string
  accountCode: string
  accountName: string
  thirdPartyCode?: string
  thirdPartyName?: string
  label: string
  debit: number
  credit: number
  analyticalCode?: string
  lettrageCode?: string
  dateEcheance?: string
}

// ============================================================================
// PLAN COMPTABLE
// ============================================================================

export interface Account {
  id: string
  code: string
  name: string
  accountClass: string          // '1'-'9'
  accountType: string           // 'bilan' | 'gestion' | 'special' | 'analytique'
  parentCode?: string
  level: number
  normalBalance: 'debit' | 'credit'
  isReconcilable: boolean
  isActive: boolean
}

// ============================================================================
// TIERS
// ============================================================================

export interface ThirdParty {
  id: string
  code: string
  name: string
  type: 'customer' | 'supplier' | 'both'
  email?: string
  phone?: string
  address?: string
  taxId?: string
  balance: number
  isActive: boolean
  tenantId?: string
}

// ============================================================================
// IMMOBILISATIONS
// ============================================================================

export interface Asset {
  id: string
  code: string
  name: string
  category: string
  acquisitionDate: string
  acquisitionValue: number
  residualValue: number
  depreciationMethod: 'linear' | 'declining'
  usefulLifeYears: number
  accountCode: string
  depreciationAccountCode: string
  status: 'active' | 'disposed' | 'scrapped'
  tenantId?: string
}

// ============================================================================
// EXERCICE
// ============================================================================

export interface FiscalYear {
  id: string
  code: string
  name: string
  startDate: string
  endDate: string
  isClosed: boolean
  isActive: boolean
  clotureDate?: string
  clotureBy?: string
  tenantId?: string
}

// ============================================================================
// BUDGET
// ============================================================================

export interface BudgetLine {
  id: string
  accountCode: string
  fiscalYear: string
  period: string
  budgeted: number
  actual: number
}

// ============================================================================
// CLOTURE
// ============================================================================

export interface ClosureSession {
  id: string
  type: 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'SPECIALE'
  periode: string
  exercice: string
  dateDebut: string
  dateFin: string
  dateCreation: string
  statut: 'EN_COURS' | 'VALIDEE' | 'CLOTUREE' | 'ANNULEE'
  creePar: string
  progression: number
}

export interface Provision {
  id: string
  sessionId: string
  compteClient: string
  client: string
  solde: number
  anciennete: number
  tauxProvision: number
  montantProvision: number
  statut: 'PROPOSEE' | 'VALIDEE' | 'REJETEE'
  dateProposition: string
  dateValidation?: string
}

// ============================================================================
// DEVISES / COUVERTURE
// ============================================================================

export interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  date: string
  provider: string
  createdAt: string
}

export interface HedgingPosition {
  id: string
  currency: string
  type: 'forward' | 'option' | 'swap'
  amount: number
  strikeRate: number
  currentRate: number
  maturityDate: string
  unrealizedPnL: number
  status: 'active' | 'expired' | 'exercised'
  createdAt: string
}

// ============================================================================
// AUDIT
// ============================================================================

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  entityType: string
  entityId: string
  userId?: string
  details: string
  hash: string
  previousHash: string
  initiatedBy?: string          // 'manual:<userId>' | 'proph3t:<userId>'
  tenantId?: string
}

// ============================================================================
// REVISION
// ============================================================================

export interface RevisionItem {
  id: string
  sessionId: string
  accountCode: string
  accountName: string
  isaAssertion: string
  riskLevel: 'low' | 'medium' | 'high'
  testType: string
  status: 'en_attente' | 'en_cours' | 'valide' | 'revise' | 'approuve'
  findings: string
  conclusion: string
  reviewer: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// INVENTAIRE
// ============================================================================

export interface InventoryItem {
  id: string
  code: string
  name: string
  category: string
  location: string
  quantity: number
  unitCost: number
  totalValue: number
  minStock: number
  maxStock: number
  unit: string
  lastMovementDate: string
  status: 'active' | 'inactive' | 'discontinued'
  createdAt: string
  updatedAt: string
}

// ============================================================================
// ALIAS TIERS
// ============================================================================

export interface AliasTiers {
  id: string
  alias: string
  prefix: string
  label: string
  comptesComptables: string[]
  createdAt: string
}

export interface AliasPrefixConfig {
  id: string
  sousCompteCode: string
  prefix: string
  typeLabel: string
}

// ============================================================================
// SOCIETE
// ============================================================================

export interface Company {
  id: string
  name: string
  rccm?: string
  ifu?: string
  regime: 'reel_normal' | 'reel_simplifie' | 'synthetique'
  paysOhada: PaysOHADA
  devise: 'XOF' | 'XAF' | 'EUR' | 'USD'
  exerciceDebutMois: number     // 1 = janvier
  tenantId?: string
}

export type PaysOHADA =
  | 'CI' | 'SN' | 'ML' | 'BF' | 'NE' | 'TG' | 'BJ' | 'GW'  // UEMOA - XOF
  | 'CM' | 'GA' | 'CG' | 'TD' | 'CF' | 'GQ'                   // CEMAC - XAF
  | 'KM' | 'CD' | 'GN'                                          // Autres OHADA

// ============================================================================
// PARAMETRES
// ============================================================================

export interface Setting {
  key: string
  value: string
  updatedAt: string
}

// ============================================================================
// TYPES CALCULS
// ============================================================================

export interface AccountBalance {
  debit: number
  credit: number
  solde: number
  lignes: number
}

export interface TrialBalanceRow {
  accountCode: string
  accountName: string
  debitOuverture: number
  creditOuverture: number
  debitMouvement: number
  creditMouvement: number
  debitSolde: number
  creditSolde: number
}

export interface AgedBalanceRow {
  tiersId: string
  tiersName: string
  total: number
  current: number          // 0-30 jours
  days31to60: number
  days61to90: number
  over90: number
}

// ============================================================================
// CONTROLES CLOTURE
// ============================================================================

export interface ControleResult {
  id: string
  label: string
  categorie: 'equilibre' | 'tresorerie' | 'tiers' | 'stocks'
           | 'immos' | 'fiscal' | 'cloture'
  status: 'conforme' | 'non_conforme' | 'warning'
        | 'non_applicable' | 'en_cours'
  valeurAttendue: number | string | null
  valeurConstatee: number | string | null
  ecart: number | null
  message: string
  bloquant: boolean
  suggestion?: string
}

export type ClotureMode = 'manual' | 'proph3t'

export interface ClotureContext {
  exerciceId: string
  mode: ClotureMode
  userId: string
  onProgress?: (step: ClotureStep) => void
  onError?: (step: ClotureStep, error: Error) => void
}

export interface ClotureStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped'
  message?: string
  timestamp?: string
}

// ============================================================================
// SYNC
// ============================================================================

export interface ChangeRecord {
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  table: string
  id: string
  data?: any
  timestamp: string
  synced: boolean
}

export interface ChangeSet {
  changes: ChangeRecord[]
  since?: string
}

export interface SyncResult {
  pushed: number
  conflicts: number
  errors: string[]
}
