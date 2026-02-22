/**
 * @atlas/shared — Constantes SYSCOHADA
 *
 * Codes postes Bilan/Resultat, taux reglementaires, journaux obligatoires.
 * Source : Acte uniforme OHADA (AUDCIF), annexe B.
 */

// ============================================================================
// POSTES BILAN ACTIF
// ============================================================================

export const BILAN_ACTIF_CODES = {
  AD: { label: 'Frais de developpement et de prospection', comptes: ['211'] },
  AE: { label: 'Brevets, licences, logiciels', comptes: ['212', '213', '214'] },
  AF: { label: 'Fonds commercial et droit au bail', comptes: ['215', '216'] },
  AG: { label: 'Autres immobilisations incorporelles', comptes: ['217', '218', '219'] },
  AH: { label: 'Terrains', comptes: ['22'] },
  AI: { label: 'Batiments', comptes: ['231', '232'] },
  AJ: { label: 'Installations et agencements', comptes: ['233', '234'] },
  AK: { label: 'Materiel, mobilier et actifs biologiques', comptes: ['24'] },
  AL: { label: 'Materiel de transport', comptes: ['245'] },
  AM: { label: 'Avances et acomptes verses sur immobilisations', comptes: ['25'] },
  AN: { label: 'Titres de participation', comptes: ['26'] },
  AP: { label: 'Autres immobilisations financieres', comptes: ['27'] },
  AQ: { label: 'Amortissements incorporels', comptes: ['281'] },
  AR: { label: 'Amortissements corporels', comptes: ['282', '283', '284'] },
  AS: { label: 'Depreciations immobilisations', comptes: ['29'] },
  BA: { label: 'Marchandises', comptes: ['31'] },
  BB: { label: 'Matieres premieres et fournitures', comptes: ['32', '33'] },
  BC: { label: 'En-cours', comptes: ['34', '35'] },
  BD: { label: 'Produits fabriques', comptes: ['36'] },
  BE: { label: 'Depreciations stocks', comptes: ['39'] },
  BF: { label: 'Fournisseurs avances', comptes: ['409'] },
  BG: { label: 'Clients', comptes: ['411', '412'] },
  BH: { label: 'Autres creances', comptes: ['414', '416', '44', '45', '46', '47'] },
  BI: { label: 'Depreciations creances', comptes: ['49'] },
  BJ: { label: 'Titres de placement', comptes: ['50'] },
  BK: { label: 'Valeurs a encaisser', comptes: ['51'] },
  BL: { label: 'Banques', comptes: ['52'] },
  BM: { label: 'Caisses', comptes: ['57'] },
  BN: { label: 'Depreciations tresorerie', comptes: ['59'] },
  BP: { label: 'Charges constatees avance', comptes: ['476'] },
} as const

// ============================================================================
// POSTES BILAN PASSIF
// ============================================================================

export const BILAN_PASSIF_CODES = {
  CA: { label: 'Capital', comptes: ['101', '102', '103', '104'] },
  CB: { label: 'Apporteurs capital non appele (-)', comptes: ['109'] },
  CC: { label: 'Primes liees au capital social', comptes: ['105'] },
  CD: { label: 'Ecarts de reevaluation', comptes: ['106'] },
  CE: { label: 'Reserves indisponibles', comptes: ['111', '112'] },
  CF: { label: 'Reserves libres', comptes: ['118'] },
  CG: { label: 'Report a nouveau (+ ou -)', comptes: ['12'] },
  CH: { label: 'Resultat net de l\'exercice', comptes: ['13'] },
  CI: { label: 'Subventions d\'investissement', comptes: ['14'] },
  CK: { label: 'Provisions reglementees', comptes: ['15'] },
  DA: { label: 'Emprunts et dettes financieres', comptes: ['16'] },
  DB: { label: 'Dettes de credit-bail', comptes: ['17'] },
  DC: { label: 'Dettes liees a des participations', comptes: ['18'] },
  DD: { label: 'Provisions financieres', comptes: ['19'] },
  DF: { label: 'Fournisseurs d\'exploitation', comptes: ['401', '402', '408'] },
  DG: { label: 'Dettes fiscales et sociales', comptes: ['42', '43', '44'] },
  DH: { label: 'Autres dettes', comptes: ['45', '46', '47'] },
  DI: { label: 'Risques provisions', comptes: ['499'] },
  DJ: { label: 'Banques, concours bancaires', comptes: ['56'] },
  DK: { label: 'Produits constates avance', comptes: ['477'] },
} as const

// ============================================================================
// POSTES COMPTE DE RESULTAT
// ============================================================================

export const COMPTE_RESULTAT_CODES = {
  TA: { label: 'Ventes de marchandises', comptes: ['701'] },
  RA: { label: 'Achats de marchandises', comptes: ['601'] },
  RB: { label: 'Variation de stocks de marchandises', comptes: ['6031'] },
  TB: { label: 'Ventes de produits fabriques', comptes: ['702', '703', '704'] },
  TC: { label: 'Travaux, services vendus', comptes: ['705', '706'] },
  TD: { label: 'Produits accessoires', comptes: ['707'] },
  RC: { label: 'Achats de matieres premieres', comptes: ['602'] },
  RD: { label: 'Variation de stocks matieres', comptes: ['6032'] },
  RE: { label: 'Autres achats', comptes: ['604', '605', '608'] },
  RF: { label: 'Transports', comptes: ['61'] },
  RG: { label: 'Services exterieurs', comptes: ['62', '63'] },
  RH: { label: 'Impots et taxes', comptes: ['64'] },
  RI: { label: 'Autres charges', comptes: ['65'] },
  RJ: { label: 'Charges de personnel', comptes: ['66'] },
  RK: { label: 'Dotations amortissements et provisions', comptes: ['68', '69'] },
  TH: { label: 'Revenus financiers', comptes: ['77'] },
  TI: { label: 'Reprises provisions financieres', comptes: ['797'] },
  TJ: { label: 'Transferts de charges financieres', comptes: ['787'] },
  RL: { label: 'Frais financiers', comptes: ['67'] },
  RM: { label: 'Dotations provisions financieres', comptes: ['697'] },
  TK: { label: 'Produits des cessions', comptes: ['82'] },
  TL: { label: 'Produits HAO', comptes: ['84', '86', '88'] },
  RN: { label: 'Valeurs comptables des cessions', comptes: ['81'] },
  RO: { label: 'Charges HAO', comptes: ['83', '85'] },
  RP: { label: 'Participation des travailleurs', comptes: ['87'] },
  RS: { label: 'Impots sur le resultat', comptes: ['89'] },
} as const

// ============================================================================
// TAUX REGLEMENTAIRES PAR PAYS OHADA
// ============================================================================

export const TAUX_PAR_PAYS: Record<string, {
  tvaStandard: number
  isStandard: number
  isPme?: number
  patente?: boolean
}> = {
  CI: { tvaStandard: 0.18, isStandard: 0.25, isPme: 0.20 },
  SN: { tvaStandard: 0.18, isStandard: 0.30 },
  CM: { tvaStandard: 0.1925, isStandard: 0.33 },
  GA: { tvaStandard: 0.18, isStandard: 0.30 },
  ML: { tvaStandard: 0.18, isStandard: 0.30 },
  BF: { tvaStandard: 0.18, isStandard: 0.275 },
  NE: { tvaStandard: 0.19, isStandard: 0.30 },
  TG: { tvaStandard: 0.18, isStandard: 0.27 },
  BJ: { tvaStandard: 0.18, isStandard: 0.30 },
  GW: { tvaStandard: 0.15, isStandard: 0.25 },
  CG: { tvaStandard: 0.185, isStandard: 0.30 },
  TD: { tvaStandard: 0.18, isStandard: 0.35 },
  CF: { tvaStandard: 0.19, isStandard: 0.30 },
  GQ: { tvaStandard: 0.15, isStandard: 0.35 },
  KM: { tvaStandard: 0.10, isStandard: 0.35 },
  CD: { tvaStandard: 0.16, isStandard: 0.30 },
  GN: { tvaStandard: 0.18, isStandard: 0.35 },
}

// ============================================================================
// JOURNAUX OBLIGATOIRES SYSCOHADA
// ============================================================================

export const JOURNAUX_OBLIGATOIRES = [
  { code: 'AC', label: 'Journal des achats' },
  { code: 'VE', label: 'Journal des ventes' },
  { code: 'BQ', label: 'Journal de banque' },
  { code: 'CA', label: 'Journal de caisse' },
  { code: 'OD', label: 'Journal des operations diverses' },
  { code: 'AN', label: 'Journal des a-nouveaux' },
  { code: 'CL', label: 'Journal de cloture' },
] as const

// ============================================================================
// CLASSES SYSCOHADA
// ============================================================================

export const CLASSES_SYSCOHADA = {
  1: { name: 'Capitaux propres et ressources assimilees', normalBalance: 'credit' as const, type: 'bilan' as const },
  2: { name: 'Immobilisations', normalBalance: 'debit' as const, type: 'bilan' as const },
  3: { name: 'Stocks', normalBalance: 'debit' as const, type: 'bilan' as const },
  4: { name: 'Tiers', normalBalance: 'debit' as const, type: 'bilan' as const },
  5: { name: 'Tresorerie', normalBalance: 'debit' as const, type: 'bilan' as const },
  6: { name: 'Charges', normalBalance: 'debit' as const, type: 'gestion' as const },
  7: { name: 'Produits', normalBalance: 'credit' as const, type: 'gestion' as const },
  8: { name: 'Comptes speciaux', normalBalance: 'debit' as const, type: 'special' as const },
  9: { name: 'Comptes analytiques', normalBalance: 'debit' as const, type: 'analytique' as const },
} as const
