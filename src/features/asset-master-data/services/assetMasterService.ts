import { AssetMasterData, AssetFilters, AssetStats } from '../types/asset-master.types';

class AssetMasterService {
  async getAssets(filters?: AssetFilters): Promise<AssetMasterData[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return [
      {
        id: '1',
        asset_number: '235377',
        capital_appropriation_number: 'CAR-2024-001',
        description: 'ARIC TRAVAUX D\'ASSAINISSEMENT',
        status: 'EN_SERVICE',
        condition: 'BON',
        general: {
          asset_class: 'Equipements',
          location: 'Site Principal',
          department: 'Infrastructure',
          responsible_person: 'Jean Dupont'
        },
        acquisition: {
          acquisition_date: new Date('2023-01-15'),
          acquisition_cost: 25000000,
          supplier: 'Fournisseur XYZ'
        },
        immobilisation: {
          account_number: '2154',
          depreciation_method: 'LINEAR',
          useful_life_years: 10,
          salvage_value: 2500000,
          depreciation_start_date: new Date('2023-02-01'),
          accumulated_depreciation: 2250000,
          net_book_value: 22750000
        },
        maintenance: {
          last_maintenance_date: new Date('2024-01-10'),
          next_maintenance_date: new Date('2024-07-10'),
          maintenance_frequency: 'Semestrielle',
          maintenance_cost_ytd: 150000
        },
        components: [],
        attachments: []
      }
    ];
  }

  async getAsset(id: string): Promise<AssetMasterData | null> {
    const assets = await this.getAssets();
    return assets.find(a => a.id === id) || null;
  }

  async createAsset(asset: Partial<AssetMasterData>): Promise<AssetMasterData> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return asset as AssetMasterData;
  }

  async updateAsset(id: string, updates: Partial<AssetMasterData>): Promise<AssetMasterData> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const asset = await this.getAsset(id);
    if (!asset) throw new Error('Asset not found');
    return { ...asset, ...updates };
  }

  async deleteAsset(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async getStats(): Promise<AssetStats> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      total: 150,
      en_service: 120,
      en_maintenance: 15,
      hors_service: 15,
      total_value: 3500000000,
      avg_age: 5.2
    };
  }

  async generateQRCode(assetNumber: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return `data:image/png;base64,QR_CODE_${assetNumber}`;
  }
}

export const assetMasterService = new AssetMasterService();