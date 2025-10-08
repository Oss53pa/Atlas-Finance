import {
  Bilan,
  CompteResultat,
  SIG,
  RatiosFinanciers,
  BilanFonctionnel,
  FinancialStatementsData,
  FinancialComparison,
} from '../types/financialStatements.types';

class FinancialStatementsService {
  async getFinancialStatements(exercice: string): Promise<FinancialStatementsData> {
    return Promise.resolve({
      bilan: {
        actif: {
          immobilisationsIncorporelles: 500000,
          immobilisationsCorporelles: 15000000,
          immobilisationsFinancieres: 2000000,
          totalActifImmobilise: 17500000,
          stocks: 8000000,
          creancesClients: 12000000,
          autresCreances: 3000000,
          tresorerieActif: 5000000,
          totalActifCirculant: 28000000,
          totalActif: 45500000,
        },
        passif: {
          capitalSocial: 10000000,
          reserves: 5000000,
          resultatExercice: 8500000,
          capitauxPropres: 23500000,
          emprunts: 10000000,
          dettesFinancieres: 2000000,
          dettesFournisseurs: 8000000,
          autresDettes: 2000000,
          totalPassif: 45500000,
        },
        exercice,
        dateEtablissement: new Date().toISOString(),
      },
      compteResultat: {
        chiffreAffaires: 85000000,
        productionVendue: 85000000,
        productionStockee: 500000,
        productionImmobilisee: 0,
        subventionsExploitation: 1000000,
        autresProduitsExploitation: 2500000,
        totalProduitsExploitation: 89000000,
        achatsConsommes: 45000000,
        servicesExterieurs: 12000000,
        chargesPersonnel: 15000000,
        dotationsAmortissements: 3000000,
        autresChargesExploitation: 2000000,
        totalChargesExploitation: 77000000,
        resultatExploitation: 12000000,
        produitsFinanciers: 500000,
        chargesFinancieres: 1500000,
        resultatFinancier: -1000000,
        resultatCourant: 11000000,
        produitsExceptionnels: 0,
        chargesExceptionnelles: 500000,
        resultatExceptionnel: -500000,
        impotsSocietes: 2000000,
        resultatNet: 8500000,
        exercice,
      },
      sig: {
        margeCommerciale: 0,
        productionExercice: 85500000,
        valeurAjoutee: 28500000,
        excedentBrutExploitation: 13500000,
        resultatExploitation: 12000000,
        resultatCourant: 11000000,
        resultatExceptionnel: -500000,
        resultatNet: 8500000,
        capaciteAutofinancement: 11500000,
        exercice,
      },
      ratios: this.calculateRatios({
        actif: {
          immobilisationsIncorporelles: 500000,
          immobilisationsCorporelles: 15000000,
          immobilisationsFinancieres: 2000000,
          totalActifImmobilise: 17500000,
          stocks: 8000000,
          creancesClients: 12000000,
          autresCreances: 3000000,
          tresorerieActif: 5000000,
          totalActifCirculant: 28000000,
          totalActif: 45500000,
        },
        passif: {
          capitalSocial: 10000000,
          reserves: 5000000,
          resultatExercice: 8500000,
          capitauxPropres: 23500000,
          emprunts: 10000000,
          dettesFinancieres: 2000000,
          dettesFournisseurs: 8000000,
          autresDettes: 2000000,
          totalPassif: 45500000,
        },
        exercice,
        dateEtablissement: new Date().toISOString(),
      }, {
        chiffreAffaires: 85000000,
        productionVendue: 85000000,
        productionStockee: 500000,
        productionImmobilisee: 0,
        subventionsExploitation: 1000000,
        autresProduitsExploitation: 2500000,
        totalProduitsExploitation: 89000000,
        achatsConsommes: 45000000,
        servicesExterieurs: 12000000,
        chargesPersonnel: 15000000,
        dotationsAmortissements: 3000000,
        autresChargesExploitation: 2000000,
        totalChargesExploitation: 77000000,
        resultatExploitation: 12000000,
        produitsFinanciers: 500000,
        chargesFinancieres: 1500000,
        resultatFinancier: -1000000,
        resultatCourant: 11000000,
        produitsExceptionnels: 0,
        chargesExceptionnelles: 500000,
        resultatExceptionnel: -500000,
        impotsSocietes: 2000000,
        resultatNet: 8500000,
        exercice,
      }),
    });
  }

  async getBilan(exercice: string): Promise<Bilan> {
    const data = await this.getFinancialStatements(exercice);
    return data.bilan;
  }

  async getCompteResultat(exercice: string): Promise<CompteResultat> {
    const data = await this.getFinancialStatements(exercice);
    return data.compteResultat;
  }

  async getSIG(exercice: string): Promise<SIG> {
    const data = await this.getFinancialStatements(exercice);
    return data.sig;
  }

  async getRatios(exercice: string): Promise<RatiosFinanciers> {
    const data = await this.getFinancialStatements(exercice);
    return data.ratios;
  }

  async compareExercices(current: string, previous: string): Promise<FinancialComparison> {
    const [currentData, previousData] = await Promise.all([
      this.getFinancialStatements(current),
      this.getFinancialStatements(previous),
    ]);

    return {
      current: currentData,
      previous: previousData,
      variations: {},
      variationsPercent: {},
    };
  }

  private calculateRatios(bilan: Bilan, cr: CompteResultat): RatiosFinanciers {
    const { actif, passif } = bilan;

    return {
      autonomieFinanciere: (passif.capitauxPropres / passif.totalPassif) * 100,
      endettement: ((passif.emprunts + passif.dettesFinancieres) / passif.capitauxPropres) * 100,
      couvertureEmplois: (passif.capitauxPropres / actif.totalActifImmobilise) * 100,
      liquiditeGenerale: (actif.totalActifCirculant / (passif.dettesFournisseurs + passif.autresDettes)) * 100,
      liquiditeReduite: ((actif.creancesClients + actif.tresorerieActif) / (passif.dettesFournisseurs + passif.autresDettes)) * 100,
      liquiditeImmediate: (actif.tresorerieActif / (passif.dettesFournisseurs + passif.autresDettes)) * 100,
      rentabiliteCommerciale: (cr.resultatNet / cr.chiffreAffaires) * 100,
      rentabiliteEconomique: (cr.resultatExploitation / actif.totalActif) * 100,
      rentabiliteFinanciere: (cr.resultatNet / passif.capitauxPropres) * 100,
      roa: (cr.resultatNet / actif.totalActif) * 100,
      roe: (cr.resultatNet / passif.capitauxPropres) * 100,
      rotationStocks: cr.achatsConsommes / actif.stocks,
      delaiReglementClients: (actif.creancesClients / cr.chiffreAffaires) * 360,
      delaiReglementFournisseurs: (passif.dettesFournisseurs / cr.achatsConsommes) * 360,
      rotationActifs: cr.chiffreAffaires / actif.totalActif,
    };
  }

  async exportStatements(
    format: 'excel' | 'pdf',
    exercice: string
  ): Promise<Blob> {
    return Promise.resolve(
      new Blob(['Mock export data'], { type: 'application/octet-stream' })
    );
  }
}

export const financialStatementsService = new FinancialStatementsService();