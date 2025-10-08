import { AssetData, AssetsFilters, AssetsStats, AssetsSummary } from '../types/assets-list.types';

class AssetsListService {
  async getAssets(filters?: AssetsFilters): Promise<AssetData[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        numeroActif: '235377',
        identifiantActif: 'IMM-2023-001',
        description: 'ARIC TRAVAUX D\'ASSAINISSEMENT',
        numeroPieceComptable: 'PC-2023-001',
        typeActif: 'Equipement',
        categorie: 'Infrastructure',
        codeFiscal: 'FIS-001',
        classe: 'Classe 2',
        dateAcquisition: '2023-01-15',
        dateDerniereTransaction: '2024-03-01',
        coutHistorique: 25000000,
        dureeVieActif: 10,
        valeurResiduelleActif: 2500000,
        coutFiscal: 25000000,
        tauxImposition: 30,
        soldeOuvertureCompteActif: 25000000,
        acquisitions: 0,
        reevaluations: 0,
        cessions: 0,
        depreciation: 2250000,
        soldeClotureCompteActif: 25000000,
        soldeOuvertureAmort: 1000000,
        amortissementCout: 1250000,
        amortissementReevaluation: 0,
        amortissementTotal: 2250000,
        soldeClotureAmort: 2250000,
        valeurNetteComptableCloture: 22750000,
        soldeOuvertureReserves: 0,
        surplusReevaluation: 0,
        soldeClotureReserves: 0,
        amortMoisCout: 208333,
        amortMoisTotal: 208333,
        soldeOuvertureCoutHist: 25000000,
        soldeClotureCoutHist: 25000000,
        soldeOuvertureVNC: 24000000,
        soldeClotureVNC: 22750000,
        mouvementVNCMois: -208333
      }
    ];
  }

  async getAsset(id: string): Promise<AssetData | null> {
    const assets = await this.getAssets();
    return assets.find(a => a.numeroActif === id) || null;
  }

  async getStats(): Promise<AssetsStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      totalAssets: 150,
      totalValue: 3500000000,
      totalDepreciation: 450000000,
      totalNetValue: 3050000000,
      avgAge: 5.2,
      monthlyDepreciation: 31250000
    };
  }

  async getSummary(): Promise<AssetsSummary> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      byCategory: {
        'Infrastructure': 45000000000,
        'Equipements': 25000000000,
        'Mobilier': 5000000000,
        'Vehicules': 15000000000
      },
      byClass: {
        'Classe 2': 70000000000,
        'Classe 3': 20000000000
      },
      byType: {
        'Equipement': 50000000000,
        'Batiment': 30000000000,
        'Materiel': 10000000000
      }
    };
  }

  async exportAssets(format: 'xlsx' | 'pdf', filters?: AssetsFilters): Promise<Blob> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return new Blob(['mock export'], { type: 'application/octet-stream' });
  }
}

export const assetsListService = new AssetsListService();