export interface BilanActif {
  immobilisationsIncorporelles: number;
  immobilisationsCorporelles: number;
  immobilisationsFinancieres: number;
  totalActifImmobilise: number;
  stocks: number;
  creancesClients: number;
  autresCreances: number;
  tresorerieActif: number;
  totalActifCirculant: number;
  totalActif: number;
}

export interface BilanPassif {
  capitalSocial: number;
  reserves: number;
  resultatExercice: number;
  capitauxPropres: number;
  emprunts: number;
  dettesFinancieres: number;
  dettesFournisseurs: number;
  autresDettes: number;
  totalPassif: number;
}

export interface Bilan {
  actif: BilanActif;
  passif: BilanPassif;
  exercice: string;
  dateEtablissement: string;
}

export interface CompteResultat {
  chiffreAffaires: number;
  productionVendue: number;
  productionStockee: number;
  productionImmobilisee: number;
  subventionsExploitation: number;
  autresProduitsExploitation: number;
  totalProduitsExploitation: number;
  achatsConsommes: number;
  servicesExterieurs: number;
  chargesPersonnel: number;
  dotationsAmortissements: number;
  autresChargesExploitation: number;
  totalChargesExploitation: number;
  resultatExploitation: number;
  produitsFinanciers: number;
  chargesFinancieres: number;
  resultatFinancier: number;
  resultatCourant: number;
  produitsExceptionnels: number;
  chargesExceptionnelles: number;
  resultatExceptionnel: number;
  impotsSocietes: number;
  resultatNet: number;
  exercice: string;
}

export interface SIG {
  margeCommerciale: number;
  productionExercice: number;
  valeurAjoutee: number;
  excedentBrutExploitation: number;
  resultatExploitation: number;
  resultatCourant: number;
  resultatExceptionnel: number;
  resultatNet: number;
  capaciteAutofinancement: number;
  exercice: string;
}

export interface RatiosFinanciers {
  autonomieFinanciere: number;
  endettement: number;
  couvertureEmplois: number;
  liquiditeGenerale: number;
  liquiditeReduite: number;
  liquiditeImmediate: number;
  rentabiliteCommerciale: number;
  rentabiliteEconomique: number;
  rentabiliteFinanciere: number;
  roa: number;
  roe: number;
  rotationStocks: number;
  delaiReglementClients: number;
  delaiReglementFournisseurs: number;
  rotationActifs: number;
}

export interface BilanFonctionnel {
  emploisStables: number;
  actifCirculantExploitation: number;
  actifCirculantHorsExploitation: number;
  tresorerieActive: number;
  ressourcesStables: number;
  passifCirculantExploitation: number;
  passifCirculantHorsExploitation: number;
  tresoreriePassive: number;
  fondRoulementNet: number;
  besoinFondRoulement: number;
  tresorerieNette: number;
}

export interface FinancialStatementsData {
  bilan: Bilan;
  compteResultat: CompteResultat;
  sig: SIG;
  ratios: RatiosFinanciers;
  bilanFonctionnel?: BilanFonctionnel;
}

export interface FinancialComparison {
  current: FinancialStatementsData;
  previous?: FinancialStatementsData;
  variations: Record<string, number>;
  variationsPercent: Record<string, number>;
}