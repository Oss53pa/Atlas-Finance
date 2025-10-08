/**
 * SERVICE IMMOBILISATIONS COMPLET
 *
 * Gestion complète des immobilisations:
 * - Immobilisations (Fixed Assets)
 * - Amortissements (Depreciations)
 * - Plans d'amortissement
 * - Cessions et réformes
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient, QueryParams } from '../lib/api-client';
import {
  FixedAsset,
  Depreciation,
} from '../types/api.types';

/**
 * SERVICE IMMOBILISATIONS
 */
class FixedAssetsService extends BaseApiService<FixedAsset> {
  protected readonly basePath = '/api/immobilisations';
  protected readonly entityName = 'immobilisation';

  /**
   * Obtenir les immobilisations par catégorie
   */
  async getByCategory(categorie: string, params?: QueryParams): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      ...params,
      categorie,
    });
  }

  /**
   * Obtenir les immobilisations par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir les immobilisations actives
   */
  async getActiveAssets(): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      statut: 'en_cours',
    });
  }

  /**
   * Obtenir les immobilisations par fournisseur
   */
  async getBySupplier(fournisseurId: string, params?: QueryParams): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      ...params,
      fournisseur: fournisseurId,
    });
  }

  /**
   * Obtenir les immobilisations par localisation
   */
  async getByLocation(localisation: string, params?: QueryParams): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      ...params,
      localisation,
    });
  }

  /**
   * Obtenir les immobilisations par responsable
   */
  async getByResponsible(responsable: string, params?: QueryParams): Promise<FixedAsset[]> {
    return apiClient.get<FixedAsset[]>(this.basePath + '/', {
      ...params,
      responsable,
    });
  }

  /**
   * Mettre en service une immobilisation
   */
  async putInService(
    id: string,
    dateMiseEnService: string,
    options?: CrudOptions
  ): Promise<FixedAsset> {
    return this.customAction<FixedAsset>(
      'post',
      'put-in-service',
      id,
      { date_mise_en_service: dateMiseEnService },
      {
        ...options,
        successMessage: 'Immobilisation mise en service',
      }
    );
  }

  /**
   * Céder une immobilisation
   */
  async dispose(
    id: string,
    data: {
      date_cession: string;
      prix_cession: number;
      acquereur?: string;
      motif?: string;
    },
    options?: CrudOptions
  ): Promise<{
    immobilisation: FixedAsset;
    plus_value?: number;
    moins_value?: number;
    ecriture_comptable?: any;
  }> {
    return this.customAction<{
      immobilisation: FixedAsset;
      plus_value?: number;
      moins_value?: number;
      ecriture_comptable?: any;
    }>(
      'post',
      'dispose',
      id,
      data,
      {
        ...options,
        successMessage: 'Cession enregistrée avec succès',
      }
    );
  }

  /**
   * Réformer une immobilisation
   */
  async reform(
    id: string,
    data: {
      date_reforme: string;
      motif?: string;
    },
    options?: CrudOptions
  ): Promise<FixedAsset> {
    return this.customAction<FixedAsset>(
      'post',
      'reform',
      id,
      data,
      {
        ...options,
        successMessage: 'Immobilisation réformée',
      }
    );
  }

  /**
   * Calculer le plan d'amortissement
   */
  async calculateDepreciationPlan(
    id: string
  ): Promise<{
    immobilisation: FixedAsset;
    plan: Array<{
      exercice: string;
      date: string;
      montant_dotation: number;
      amortissement_cumule: number;
      valeur_nette_comptable: number;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/${id}/depreciation-plan/`);
  }

  /**
   * Obtenir l'historique des amortissements
   */
  async getDepreciationHistory(id: string): Promise<Depreciation[]> {
    return apiClient.get<Depreciation[]>(`${this.basePath}/${id}/depreciations/`);
  }

  /**
   * Obtenir la valeur nette comptable à une date
   */
  async getNetBookValueAtDate(
    id: string,
    date: string
  ): Promise<{
    valeur_acquisition: number;
    amortissement_cumule: number;
    valeur_nette_comptable: number;
    date: string;
  }> {
    return apiClient.get(`${this.basePath}/${id}/net-book-value/`, { date });
  }

  /**
   * Vérifier si un numéro d'immobilisation existe
   */
  async checkAssetExists(numero: string): Promise<boolean> {
    try {
      const assets = await apiClient.get<FixedAsset[]>(this.basePath + '/', {
        numero,
      });
      return assets.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Dupliquer une immobilisation
   */
  async duplicate(id: string, options?: CrudOptions): Promise<FixedAsset> {
    return this.customAction<FixedAsset>(
      'post',
      'duplicate',
      id,
      {},
      {
        ...options,
        successMessage: 'Immobilisation dupliquée avec succès',
      }
    );
  }

  /**
   * Export des immobilisations
   */
  async exportAssets(
    format: 'excel' | 'pdf' | 'csv',
    params?: QueryParams,
    filename?: string
  ): Promise<void> {
    return this.export(format, params, filename);
  }

  /**
   * Import d'immobilisations
   */
  async importAssets(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: number; errors: any[] }> {
    return apiClient.uploadFile<{ success: number; errors: any[] }>(
      this.basePath + '/import/',
      file,
      {},
      onProgress
        ? (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress(progress);
            }
          }
        : undefined
    );
  }
}

/**
 * SERVICE AMORTISSEMENTS
 */
class DepreciationsService extends BaseApiService<Depreciation> {
  protected readonly basePath = '/api/amortissements';
  protected readonly entityName = 'amortissement';

  /**
   * Obtenir les amortissements par immobilisation
   */
  async getByAsset(immobilisationId: string, params?: QueryParams): Promise<Depreciation[]> {
    return apiClient.get<Depreciation[]>(this.basePath + '/', {
      ...params,
      immobilisation: immobilisationId,
    });
  }

  /**
   * Obtenir les amortissements par exercice
   */
  async getByFiscalYear(exerciceId: string, params?: QueryParams): Promise<Depreciation[]> {
    return apiClient.get<Depreciation[]>(this.basePath + '/', {
      ...params,
      exercice: exerciceId,
    });
  }

  /**
   * Obtenir les amortissements par statut
   */
  async getByStatus(statut: string, params?: QueryParams): Promise<Depreciation[]> {
    return apiClient.get<Depreciation[]>(this.basePath + '/', {
      ...params,
      statut,
    });
  }

  /**
   * Obtenir les amortissements non comptabilisés
   */
  async getUnaccounted(): Promise<Depreciation[]> {
    return apiClient.get<Depreciation[]>(this.basePath + '/', {
      statut: 'calculee',
    });
  }

  /**
   * Calculer les dotations d'un exercice
   */
  async calculateDepreciations(
    exerciceId: string,
    options?: CrudOptions
  ): Promise<{
    count: number;
    dotations: Depreciation[];
    total_montant: number;
  }> {
    return this.customAction<{
      count: number;
      dotations: Depreciation[];
      total_montant: number;
    }>(
      'post',
      'calculate',
      undefined,
      { exercice: exerciceId },
      {
        ...options,
        successMessage: 'Dotations calculées avec succès',
      }
    );
  }

  /**
   * Comptabiliser un amortissement
   */
  async accountDepreciation(
    id: string,
    options?: CrudOptions
  ): Promise<{
    amortissement: Depreciation;
    ecriture_comptable: any;
  }> {
    return this.customAction<{
      amortissement: Depreciation;
      ecriture_comptable: any;
    }>(
      'post',
      'account',
      id,
      {},
      {
        ...options,
        successMessage: 'Amortissement comptabilisé',
      }
    );
  }

  /**
   * Comptabiliser en masse
   */
  async bulkAccount(
    depreciationIds: string[],
    options?: CrudOptions
  ): Promise<{
    success: number;
    ecritures: any[];
    errors: any[];
  }> {
    return this.customAction<{
      success: number;
      ecritures: any[];
      errors: any[];
    }>(
      'post',
      'bulk-account',
      undefined,
      { depreciation_ids: depreciationIds },
      {
        ...options,
        successMessage: `${depreciationIds.length} amortissements comptabilisés`,
      }
    );
  }

  /**
   * Annuler la comptabilisation
   */
  async cancelAccounting(id: string, options?: CrudOptions): Promise<Depreciation> {
    return this.customAction<Depreciation>(
      'post',
      'cancel-accounting',
      id,
      {},
      {
        ...options,
        successMessage: 'Comptabilisation annulée',
      }
    );
  }
}

/**
 * SERVICE RAPPORTS IMMOBILISATIONS
 */
class AssetsReportsService {
  private basePath = '/api/reports/assets';

  /**
   * Générer le tableau des immobilisations
   */
  async generateAssetsTable(params?: {
    exercice?: string;
    categorie?: string;
    statut?: string;
  }): Promise<{
    immobilisations: Array<{
      immobilisation: FixedAsset;
      valeur_brute: number;
      amortissement_cumule: number;
      dotation_exercice: number;
      valeur_nette_comptable: number;
    }>;
    totaux: {
      valeur_brute: number;
      amortissement_cumule: number;
      dotation_exercice: number;
      valeur_nette_comptable: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/table/`, params);
  }

  /**
   * Générer le registre des immobilisations
   */
  async generateAssetsRegister(params?: {
    exercice?: string;
    categorie?: string;
  }): Promise<{
    exercice: string;
    immobilisations: Array<{
      numero: string;
      libelle: string;
      date_acquisition: string;
      valeur_acquisition: number;
      duree: number;
      taux: number;
      amortissements: Array<{
        exercice: string;
        dotation: number;
        cumul: number;
        vnc: number;
      }>;
    }>;
  }> {
    return apiClient.get(`${this.basePath}/register/`, params);
  }

  /**
   * Générer le plan d'amortissement global
   */
  async generateGlobalDepreciationPlan(params?: {
    exercice?: string;
    nb_exercices?: number;
  }): Promise<{
    exercices: Array<{
      exercice: string;
      annee: number;
      dotations: Array<{
        immobilisation: string;
        libelle: string;
        montant: number;
      }>;
      total: number;
    }>;
    total_global: number;
  }> {
    return apiClient.get(`${this.basePath}/depreciation-plan/`, params);
  }

  /**
   * Générer le rapport de cessions
   */
  async generateDisposalReport(params: {
    date_debut: string;
    date_fin: string;
  }): Promise<{
    periode: { debut: string; fin: string };
    cessions: Array<{
      immobilisation: FixedAsset;
      date_cession: string;
      valeur_acquisition: number;
      amortissement_cumule: number;
      vnc: number;
      prix_cession: number;
      resultat: number;
    }>;
    totaux: {
      nombre: number;
      valeur_acquisition: number;
      prix_cession: number;
      plus_values: number;
      moins_values: number;
    };
  }> {
    return apiClient.get(`${this.basePath}/disposals/`, params);
  }

  /**
   * Export tableau des immobilisations
   */
  async exportAssetsTable(
    format: 'excel' | 'pdf' | 'csv',
    params?: { exercice?: string; categorie?: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `immobilisations-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/table/export/`, exportFilename, {
      ...params,
      format,
    });
  }

  /**
   * Export registre des immobilisations
   */
  async exportRegister(
    format: 'excel' | 'pdf' | 'csv',
    params?: { exercice?: string; categorie?: string },
    filename?: string
  ): Promise<void> {
    const exportFilename = filename || `registre-immobilisations-${Date.now()}.${format}`;
    return apiClient.downloadFile(`${this.basePath}/register/export/`, exportFilename, {
      ...params,
      format,
    });
  }
}

/**
 * EXPORTS
 */
export const fixedAssetsService = new FixedAssetsService();
export const depreciationsService = new DepreciationsService();
export const assetsReportsService = new AssetsReportsService();

export default {
  fixedAssets: fixedAssetsService,
  depreciations: depreciationsService,
  reports: assetsReportsService,
};