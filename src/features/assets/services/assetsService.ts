import {
  Asset,
  AssetStats,
  AssetCategory,
  AssetClass,
  AssetMaintenance,
  AssetTransaction,
  AssetDisposal,
} from '../types/assets.types';

class AssetsService {
  async getAssets(filters?: {
    status?: string;
    class?: string;
    category?: string;
    location?: string;
  }): Promise<Asset[]> {
    return Promise.resolve([
      {
        id: 1,
        assetNumber: 'AST-2024-001',
        description: 'Ordinateur portable Dell XPS 15',
        assetClass: 'IT',
        assetCategory: 'Informatique',
        location: 'Siège Dakar',
        technician: '',
        capitalizationDate: '2024-01-15',
        acquisitionDate: '2024-01-10',
        acquisitionCost: 2500000,
        historicalApc: 500000,
        netBookValue: 2000000,
        historicalNbc: 2000000,
        ordinaryDepreciation: 500000,
        status: 'active',
        condition: 'excellent',
        manufacturer: 'Dell',
        model: 'XPS 15',
        serialNumber: 'DL-XPS-2024-001',
      },
    ]);
  }

  async getAsset(id: string | number): Promise<Asset> {
    return Promise.resolve({
      id,
      assetNumber: 'AST-2024-001',
      description: 'Ordinateur portable Dell XPS 15',
      assetClass: 'IT',
      assetCategory: 'Informatique',
      location: 'Siège Dakar',
      technician: '',
      capitalizationDate: '2024-01-15',
      acquisitionDate: '2024-01-10',
      acquisitionCost: 2500000,
      historicalApc: 500000,
      netBookValue: 2000000,
      historicalNbc: 2000000,
      ordinaryDepreciation: 500000,
      status: 'active',
      condition: 'excellent',
    });
  }

  async createAsset(asset: Omit<Asset, 'id'>): Promise<Asset> {
    return Promise.resolve({
      ...asset,
      id: Date.now(),
    });
  }

  async updateAsset(id: string | number, updates: Partial<Asset>): Promise<Asset> {
    return Promise.resolve({
      id,
      ...updates,
    } as Asset);
  }

  async deleteAsset(id: string | number): Promise<void> {
    return Promise.resolve();
  }

  async getStats(): Promise<AssetStats> {
    return Promise.resolve({
      totalAssets: 1543,
      totalValue: 8500000000,
      totalDepreciation: 1200000000,
      netBookValue: 7300000000,
      activeAssets: 1421,
      disposedAssets: 92,
      maintenanceAssets: 30,
    });
  }

  async getCategories(): Promise<AssetCategory[]> {
    return Promise.resolve([
      {
        id: 1,
        code: 'IT',
        name: 'Informatique',
        description: 'Équipements informatiques',
        depreciationRate: 20,
        usefulLife: 5,
        count: 450,
      },
      {
        id: 2,
        code: 'FURNITURE',
        name: 'Mobilier',
        description: 'Mobilier de bureau',
        depreciationRate: 10,
        usefulLife: 10,
        count: 320,
      },
      {
        id: 3,
        code: 'VEHICLE',
        name: 'Véhicules',
        description: 'Véhicules de service',
        depreciationRate: 20,
        usefulLife: 5,
        count: 85,
      },
    ]);
  }

  async getClasses(): Promise<AssetClass[]> {
    return Promise.resolve([
      {
        id: 1,
        code: 'TANGIBLE',
        name: 'Immobilisations Corporelles',
        description: 'Biens physiques',
      },
      {
        id: 2,
        code: 'INTANGIBLE',
        name: 'Immobilisations Incorporelles',
        description: 'Biens immatériels',
      },
    ]);
  }

  async getMaintenances(assetId?: string | number): Promise<AssetMaintenance[]> {
    return Promise.resolve([
      {
        id: 1,
        assetId: 1,
        assetNumber: 'AST-2024-001',
        maintenanceType: 'preventive',
        description: 'Maintenance préventive trimestrielle',
        scheduledDate: '2025-01-15',
        technician: '',
        cost: 150000,
        status: 'scheduled',
      },
    ]);
  }

  async createMaintenance(
    maintenance: Omit<AssetMaintenance, 'id'>
  ): Promise<AssetMaintenance> {
    return Promise.resolve({
      ...maintenance,
      id: Date.now(),
    });
  }

  async updateMaintenance(
    id: string | number,
    updates: Partial<AssetMaintenance>
  ): Promise<AssetMaintenance> {
    return Promise.resolve({
      id,
      ...updates,
    } as AssetMaintenance);
  }

  async getTransactions(assetId?: string | number): Promise<AssetTransaction[]> {
    return Promise.resolve([
      {
        id: 1,
        assetId: 1,
        assetNumber: 'AST-2024-001',
        transactionType: 'acquisition',
        date: '2024-01-10',
        amount: 2500000,
        description: 'Achat initial',
        performedBy: 'Admin',
        status: 'completed',
      },
    ]);
  }

  async getDisposals(): Promise<AssetDisposal[]> {
    return Promise.resolve([
      {
        id: 1,
        assetId: 123,
        assetNumber: 'AST-2023-500',
        assetDescription: 'Ancien ordinateur HP',
        disposalDate: '2024-12-15',
        disposalMethod: 'sale',
        disposalValue: 300000,
        netBookValue: 250000,
        gainLoss: 50000,
        approvedBy: 'Directeur Financier',
      },
    ]);
  }

  async disposeAsset(disposal: Omit<AssetDisposal, 'id'>): Promise<AssetDisposal> {
    return Promise.resolve({
      ...disposal,
      id: Date.now(),
    });
  }

  async exportAssets(format: 'xlsx' | 'pdf' | 'csv', filters?: Record<string, unknown>): Promise<Blob> {
    return Promise.resolve(
      new Blob(['Mock export data'], { type: 'application/octet-stream' })
    );
  }

  async importAssets(
    file: File
  ): Promise<{ success: boolean; imported: number; errors?: string[] }> {
    return Promise.resolve({
      success: true,
      imported: 50,
      errors: [],
    });
  }
}

export const assetsService = new AssetsService();