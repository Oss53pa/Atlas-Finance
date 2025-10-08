export interface AssetData {
  numeroActif: string;
  identifiantActif: string;
  description: string;
  numeroPieceComptable: string;
  typeActif: string;
  categorie: string;
  codeFiscal: string;
  classe: string;
  dateAcquisition: string;
  dateDerniereTransaction: string;
  dateCession?: string;
  coutHistorique: number;
  dureeVieActif: number;
  valeurResiduelleActif: number;
  coutFiscal: number;
  tauxImposition: number;
  produitCession?: number;
  soldeOuvertureCompteActif: number;
  acquisitions: number;
  reevaluations: number;
  cessions: number;
  depreciation: number;
  soldeClotureCompteActif: number;
  soldeOuvertureAmort: number;
  amortissementCout: number;
  amortissementReevaluation: number;
  amortissementTotal: number;
  soldeClotureAmort: number;
  valeurNetteComptableCloture: number;
  soldeOuvertureReserves: number;
  surplusReevaluation: number;
  soldeClotureReserves: number;
  profitPerteCession?: number;
  amortMoisCout: number;
  amortMoisTotal: number;
  soldeOuvertureCoutHist: number;
  soldeClotureCoutHist: number;
  soldeOuvertureVNC: number;
  soldeClotureVNC: number;
  mouvementVNCMois: number;
}

export interface AssetsFilters {
  search?: string;
  typeActif?: string[];
  categorie?: string[];
  classe?: string[];
  dateRange?: { from: Date; to: Date };
}

export interface AssetsStats {
  totalAssets: number;
  totalValue: number;
  totalDepreciation: number;
  totalNetValue: number;
  avgAge: number;
  monthlyDepreciation: number;
}

export interface AssetsSummary {
  byCategory: { [key: string]: number };
  byClass: { [key: string]: number };
  byType: { [key: string]: number };
}