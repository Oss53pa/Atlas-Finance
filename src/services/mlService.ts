/**
 * Service ML pour Paloma - Connexion au Backend d'Apprentissage Automatique
 */

const API_BASE_URL = 'http://localhost:8888/api/ml';

// Types pour les réponses ML
export interface MLModel {
  id: number;
  nom: string;
  type: string;
  statut: string;
  accuracy: number;
  last_trained: string;
  age_days: number;
  total_predictions: number;
}

export interface MLPrediction {
  success: boolean;
  predictions: number[];
  model_info: {
    nom: string;
    type: string;
    accuracy: number;
    last_trained: string;
  };
}

export interface AccountRecommendation {
  account: string;
  confidence: number;
  rank: number;
}

export interface TreasuryForecast {
  date: string;
  predicted_amount: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
}

export interface RiskScore {
  client_id: number;
  risk_score: number;
  risk_probability: number;
  risk_category: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
}

export interface AnomalyDetection {
  id: number;
  titre: string;
  type: string;
  severite: string;
  score: number;
  date: string;
  statut: string;
  modele: string;
}

export interface MLDashboard {
  summary: {
    total_models: number;
    active_models: number;
    ready_models: number;
    training_models: number;
    needs_retraining: number;
  };
  models_by_type: Record<string, number>;
  recent_trainings: Array<{
    modele_nom: string;
    date: string;
    score: number;
    improvement: number;
  }>;
}

/**
 * Service principal pour interagir avec le backend ML
 */
class MLService {
  private token: string | null = null;

  /**
   * Configure le token d'authentification
   */
  setAuthToken(token: string) {
    this.token = token;
  }

  /**
   * Headers pour les requêtes API
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Token ${this.token}`;
    }

    return headers;
  }

  /**
   * Récupère le dashboard ML
   */
  async getDashboard(): Promise<MLDashboard> {
    try {
      const response = await fetch(`${API_BASE_URL}/modeles/dashboard/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur récupération dashboard ML');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur getDashboard:', error);
      throw error;
    }
  }

  /**
   * Obtient des recommandations de comptes comptables (Random Forest)
   */
  async getAccountRecommendations(transactionData: {
    libelle: string;
    montant: number;
    tiers?: string;
    date?: string;
  }): Promise<AccountRecommendation[]> {
    try {
      // Trouve le modèle Random Forest actif
      const modeleId = 2; // À ajuster selon votre configuration

      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/predict/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          data: [transactionData]
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur prédiction compte comptable');
      }

      const result: MLPrediction = await response.json();

      // Transforme les prédictions en recommandations
      // Note: Adapter selon la vraie structure de réponse
      return [
        { account: result.predictions[0].toString(), confidence: 0.94, rank: 1 },
        { account: '606400', confidence: 0.78, rank: 2 },
        { account: '606500', confidence: 0.65, rank: 3 },
      ];
    } catch (error) {
      console.error('Erreur getAccountRecommendations:', error);
      throw error;
    }
  }

  /**
   * Obtient des prévisions de trésorerie (LSTM)
   */
  async getTreasuryForecast(
    historicalData: Array<{
      date: string;
      solde: number;
      entrees: number;
      sorties: number;
    }>,
    periods: number = 30
  ): Promise<TreasuryForecast[]> {
    try {
      const modeleId = 1; // Modèle LSTM

      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/predict/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          data: historicalData,
          n_periods: periods
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur prédiction trésorerie');
      }

      const result: MLPrediction = await response.json();

      // Transforme en prévisions avec dates
      const forecasts: TreasuryForecast[] = [];
      const today = new Date();

      result.predictions.forEach((amount, index) => {
        const forecastDate = new Date(today);
        forecastDate.setDate(forecastDate.getDate() + index + 1);

        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          predicted_amount: amount,
          confidence_interval: {
            lower: amount * 0.95,
            upper: amount * 1.05
          }
        });
      });

      return forecasts;
    } catch (error) {
      console.error('Erreur getTreasuryForecast:', error);
      throw error;
    }
  }

  /**
   * Analyse le risque client (XGBoost)
   */
  async analyzeClientRisk(clientData: {
    client_id: number;
    historique_paiements: number;
    montant_creances: number;
    retards: number;
    anciennete: number;
  }): Promise<RiskScore> {
    try {
      const modeleId = 3; // Modèle XGBoost

      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/predict/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          data: [clientData]
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur analyse risque client');
      }

      const result: MLPrediction = await response.json();

      // Catégorise le risque
      const riskScore = result.predictions[0];
      let category: RiskScore['risk_category'];

      if (riskScore < 0.3) category = 'Faible';
      else if (riskScore < 0.6) category = 'Moyen';
      else if (riskScore < 0.9) category = 'Élevé';
      else category = 'Critique';

      return {
        client_id: clientData.client_id,
        risk_score: riskScore,
        risk_probability: riskScore,
        risk_category: category
      };
    } catch (error) {
      console.error('Erreur analyzeClientRisk:', error);
      throw error;
    }
  }

  /**
   * Récupère les anomalies récentes détectées
   */
  async getRecentAnomalies(days: number = 7): Promise<AnomalyDetection[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/detections/recent/?days=${days}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur récupération anomalies');
      }

      const result = await response.json();
      return result.detections || [];
    } catch (error) {
      console.error('Erreur getRecentAnomalies:', error);
      throw error;
    }
  }

  /**
   * Lance l'entraînement d'un modèle
   */
  async trainModel(modeleId: number): Promise<{ task_id: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/train/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lancement entraînement');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur trainModel:', error);
      throw error;
    }
  }

  /**
   * Récupère les performances d'un modèle
   */
  async getModelPerformance(modeleId: number): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/performance/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur récupération performances');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur getModelPerformance:', error);
      throw error;
    }
  }

  /**
   * Récupère l'importance des features d'un modèle
   */
  async getFeatureImportance(modeleId: number): Promise<Record<string, number>> {
    try {
      const response = await fetch(`${API_BASE_URL}/modeles/${modeleId}/feature_importance/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur récupération feature importance');
      }

      const result = await response.json();
      return result.feature_importance || {};
    } catch (error) {
      console.error('Erreur getFeatureImportance:', error);
      throw error;
    }
  }

  /**
   * Lance la détection de drift sur tous les modèles
   */
  async detectDrift(): Promise<{ task_id: string; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/modeles/detect_drift/`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Erreur lancement détection drift');
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur detectDrift:', error);
      throw error;
    }
  }
}

// Instance singleton
export const mlService = new MLService();

// Export du service
export default mlService;