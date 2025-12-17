/**
 * SERVICE ML DETECTION - Machine Learning & Détection d'Anomalies
 *
 * Endpoints:
 * - /api/ml/modeles/ - Gestion des modèles ML
 * - /api/ml/detections/ - Détection d'anomalies
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient } from '../lib/api-client';

// Types
export interface ModeleML {
  id: string;
  nom: string;
  type: 'anomaly_detection' | 'prediction' | 'classification';
  version: string;
  statut: 'actif' | 'entraine' | 'archive';
  precision: number;
  date_creation: string;
  derniere_prediction?: string;
  parametres: Record<string, any>;
}

export interface DetectionAnomalie {
  id: string;
  modele: string;
  date_detection: string;
  type_anomalie: string;
  score_confiance: number;
  donnees_analysees: Record<string, any>;
  details: string;
  statut: 'nouvelle' | 'analysee' | 'resolue' | 'faux_positif';
  actions_recommandees?: string[];
}

export interface PredictionRequest {
  modele_id: string;
  donnees: Record<string, any>;
  seuil_confiance?: number;
}

export interface PredictionResponse {
  prediction: any;
  confiance: number;
  anomalies_detectees: DetectionAnomalie[];
  recommandations: string[];
}

// Service Modèles ML
class ModeleMLService extends BaseApiService<ModeleML, Partial<ModeleML>, Partial<ModeleML>> {
  protected readonly basePath = '/api/ml/modeles';
  protected readonly entityName = 'modèle ML';

  /**
   * Entraîner un modèle ML
   */
  async entrainer(modeleId: string, donnees: any, options?: CrudOptions) {
    return apiClient.post(
      `${this.basePath}/${modeleId}/entrainer/`,
      donnees,
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Entraînement du modèle démarré',
      }
    );
  }

  /**
   * Obtenir les performances d'un modèle
   */
  async getPerformances(modeleId: string) {
    return apiClient.get(`${this.basePath}/${modeleId}/performances/`);
  }

  /**
   * Activer/Désactiver un modèle
   */
  async toggleStatut(modeleId: string, actif: boolean, options?: CrudOptions) {
    return apiClient.patch(
      `${this.basePath}/${modeleId}/`,
      { statut: actif ? 'actif' : 'archive' },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: `Modèle ${actif ? 'activé' : 'désactivé'}`,
      }
    );
  }

  /**
   * Exporter un modèle
   */
  async exporter(modeleId: string) {
    return apiClient.get(`${this.basePath}/${modeleId}/export/`, {
      responseType: 'blob',
    });
  }
}

// Service Détection d'Anomalies
class DetectionAnomalieService extends BaseApiService<
  DetectionAnomalie,
  Partial<DetectionAnomalie>,
  Partial<DetectionAnomalie>
> {
  protected readonly basePath = '/api/ml/detections';
  protected readonly entityName = 'détection';

  /**
   * Lancer une détection d'anomalies
   */
  async detecter(request: PredictionRequest, options?: CrudOptions): Promise<PredictionResponse> {
    return apiClient.post<PredictionResponse>(
      `${this.basePath}/detecter/`,
      request,
      {
        showSuccessToast: options?.showSuccessToast ?? false,
      }
    );
  }

  /**
   * Obtenir les anomalies récentes
   */
  async getRecentes(limit: number = 10) {
    return apiClient.get<DetectionAnomalie[]>(`${this.basePath}/`, {
      params: { limit, ordering: '-date_detection' },
    });
  }

  /**
   * Marquer une anomalie comme faux positif
   */
  async marquerFauxPositif(detectionId: string, raison: string, options?: CrudOptions) {
    return apiClient.patch(
      `${this.basePath}/${detectionId}/`,
      { statut: 'faux_positif', details: raison },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Anomalie marquée comme faux positif',
      }
    );
  }

  /**
   * Résoudre une anomalie
   */
  async resoudre(detectionId: string, resolution: string, options?: CrudOptions) {
    return apiClient.patch(
      `${this.basePath}/${detectionId}/`,
      { statut: 'resolue', details: resolution },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Anomalie résolue',
      }
    );
  }

  /**
   * Obtenir les statistiques de détection
   */
  async getStatistiques(params?: { date_debut?: string; date_fin?: string }) {
    return apiClient.get(`${this.basePath}/statistiques/`, { params });
  }

  /**
   * Obtenir les anomalies par type
   */
  async getParType(type: string) {
    return apiClient.get<DetectionAnomalie[]>(`${this.basePath}/`, {
      params: { type_anomalie: type },
    });
  }
}

// Instances exportées
export const modeleMLService = new ModeleMLService();
export const detectionAnomalieService = new DetectionAnomalieService();

// Export par défaut
export default {
  modeles: modeleMLService,
  detections: detectionAnomalieService,
};
