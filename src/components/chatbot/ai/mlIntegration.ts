// @ts-nocheck
/**
 * Intégration ML Backend pour Proph3t
 * Connecte Proph3t aux modèles d'apprentissage automatique
 */

import mlService, {
  AccountRecommendation,
  TreasuryForecast,
  RiskScore,
  AnomalyDetection
} from '../../../services/mlService';

export interface MLCapability {
  name: string;
  description: string;
  action: (params: Record<string, unknown>) => Promise<string>;
}

/**
 * Gestionnaire des capacités ML de Proph3t
 */
export class Proph3tMLManager {
  private capabilities: Map<string, MLCapability> = new Map();

  constructor() {
    this.initializeCapabilities();
  }

  /**
   * Initialise toutes les capacités ML de Proph3t
   */
  private initializeCapabilities() {
    // 1. Recommandations de comptes comptables
    this.capabilities.set('account_recommendation', {
      name: 'Recommandation de compte comptable',
      description: 'Suggère les comptes comptables appropriés via Random Forest',
      action: async (params) => this.recommendAccount(params)
    });

    // 2. Prévision de trésorerie
    this.capabilities.set('treasury_forecast', {
      name: 'Prévision de trésorerie',
      description: 'Prédit les flux de trésorerie futurs via LSTM',
      action: async (params) => this.forecastTreasury(params)
    });

    // 3. Analyse de risque client
    this.capabilities.set('risk_analysis', {
      name: 'Analyse de risque client',
      description: 'Évalue le risque de défaut client via XGBoost',
      action: async (params) => this.analyzeRisk(params)
    });

    // 4. Détection d'anomalies
    this.capabilities.set('anomaly_detection', {
      name: 'Détection d\'anomalies',
      description: 'Identifie les transactions suspectes',
      action: async (params) => this.detectAnomalies(params)
    });

    // 5. Dashboard ML
    this.capabilities.set('ml_dashboard', {
      name: 'Dashboard ML',
      description: 'Vue d\'ensemble des modèles ML',
      action: async (params) => this.showMLDashboard(params)
    });
  }

  /**
   * Recommande un compte comptable pour une transaction
   */
  private async recommendAccount(params: {
    libelle: string;
    montant: number;
    tiers?: string;
  }): Promise<string> {
    try {
      const recommendations = await mlService.getAccountRecommendations({
        libelle: params.libelle,
        montant: params.montant,
        tiers: params.tiers
      });

      let response = "Super ! 💰 Proph3t a analysé votre transaction avec son IA Random Forest !\n\n";
      response += "📊 **Recommandations de comptes:**\n\n";

      recommendations.forEach((rec, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        const confidence = Math.round(rec.confidence * 100);
        const bar = '█'.repeat(Math.floor(confidence / 10));

        response += `${emoji} **Compte ${rec.account}**\n`;
        response += `   Confiance: ${confidence}% ${bar}\n\n`;
      });

      response += "✨ Proph3t recommande d'utiliser le premier compte avec la plus haute confiance !\n";
      response += "💡 Astuce: Plus vous validez, plus l'IA apprend et s'améliore !";

      return response;
    } catch (error) {
      return "Oops ! 😅 Proph3t a eu un petit souci avec l'IA... Le modèle Random Forest n'est peut-être pas encore entraîné. Voulez-vous que je lance l'entraînement ?";
    }
  }

  /**
   * Prévoit les flux de trésorerie
   */
  private async forecastTreasury(params: {
    historicalData?: Array<{ date: string; solde: number; entrees: number; sorties: number }>;
    periods?: number;
  }): Promise<string> {
    try {
      // Données historiques simulées si non fournies
      const historical = params.historicalData || this.generateMockHistorical();
      const periods = params.periods || 30;

      const forecasts = await mlService.getTreasuryForecast(historical, periods);

      let response = "Génial ! 📈 Proph3t a prédit votre trésorerie avec son réseau LSTM !\n\n";
      response += `🔮 **Prévisions sur ${periods} jours:**\n\n`;

      // Montre les 7 premiers jours
      forecasts.slice(0, 7).forEach((forecast, index) => {
        const amount = this.formatCurrency(forecast.predicted_amount);
        const trend = forecast.predicted_amount > historical[0].solde ? '📈' : '📉';

        response += `${trend} **Jour ${index + 1} (${forecast.date})**: ${amount}\n`;
      });

      // Résumé
      const avgForecast = forecasts.reduce((sum, f) => sum + f.predicted_amount, 0) / forecasts.length;
      const trend = avgForecast > historical[0].solde ? 'positive' : 'négative';
      const trendEmoji = avgForecast > historical[0].solde ? '🟢' : '🔴';

      response += `\n${trendEmoji} **Tendance ${trend}**: ${this.formatCurrency(avgForecast)} en moyenne\n`;
      response += "\n💡 Proph3t conseille: ";

      if (avgForecast < historical[0].solde * 0.8) {
        response += "Attention, votre trésorerie va baisser ! Prévoyez des rentrées d'argent.";
      } else if (avgForecast > historical[0].solde * 1.2) {
        response += "Excellente nouvelle ! Votre trésorerie va augmenter. Pensez aux investissements.";
      } else {
        response += "Votre trésorerie reste stable. Continue comme ça !";
      }

      return response;
    } catch (error) {
      return "Oh là là ! 🔧 Le modèle LSTM de prédiction n'est pas encore prêt. Voulez-vous que Proph3t le prépare pour vous ?";
    }
  }

  /**
   * Analyse le risque d'un client
   */
  private async analyzeRisk(params: {
    client_id: number;
    client_name?: string;
  }): Promise<string> {
    try {
      // Données simulées pour la démo
      const clientData = {
        client_id: params.client_id,
        historique_paiements: 0,
        montant_creances: 0,
        retards: 0,
        anciennete: 0
      };

      const riskScore = await mlService.analyzeClientRisk(clientData);

      let response = "Analyse terminée ! 🎯 Proph3t a évalué le risque avec XGBoost !\n\n";
      response += `📊 **Client ${params.client_name || params.client_id}:**\n\n`;

      // Score visuel
      const scorePercent = Math.round(riskScore.risk_probability * 100);
      const bars = Math.floor(scorePercent / 10);
      const scoreBar = '█'.repeat(bars) + '░'.repeat(10 - bars);

      response += `**Score de risque**: ${scorePercent}%\n${scoreBar}\n\n`;

      // Catégorie avec émoji
      const categoryEmoji = {
        'Faible': '🟢',
        'Moyen': '🟡',
        'Élevé': '🟠',
        'Critique': '🔴'
      };

      response += `${categoryEmoji[riskScore.risk_category]} **Catégorie**: ${riskScore.risk_category}\n\n`;

      // Recommandations
      response += "💡 **Recommandations Proph3t:**\n";

      switch (riskScore.risk_category) {
        case 'Faible':
          response += "✅ Client fiable ! Vous pouvez accorder des facilités de paiement.\n";
          response += "📝 Aucune action particulière nécessaire.";
          break;
        case 'Moyen':
          response += "⚠️ Surveillez les paiements de ce client.\n";
          response += "📧 Envoyez des rappels avant échéance.";
          break;
        case 'Élevé':
          response += "🚨 Risque important ! Demandez un acompte.\n";
          response += "📞 Contactez le client pour vérifier sa situation.";
          break;
        case 'Critique':
          response += "🛑 ATTENTION ! Ne pas accorder de crédit supplémentaire.\n";
          response += "⚖️ Envisagez une procédure de recouvrement.";
          break;
      }

      return response;
    } catch (error) {
      return "Oups ! 🔍 Le modèle XGBoost d'analyse de risque n'est pas disponible. Voulez-vous l'activer ?";
    }
  }

  /**
   * Détecte et affiche les anomalies récentes
   */
  private async detectAnomalies(params: { days?: number }): Promise<string> {
    try {
      const days = params.days || 7;
      const anomalies = await mlService.getRecentAnomalies(days);

      if (anomalies.length === 0) {
        return `Parfait ! ✅ Aucune anomalie détectée sur les ${days} derniers jours.\n\nProph3t veille sur vos données ! 🛡️`;
      }

      let response = `Attention ! 🚨 Proph3t a détecté ${anomalies.length} anomalie(s) :\n\n`;

      // Groupe par sévérité
      const critical = anomalies.filter(a => a.severite === 'CRITIQUE');
      const high = anomalies.filter(a => a.severite === 'ELEVE');
      const medium = anomalies.filter(a => a.severite === 'MOYEN');

      if (critical.length > 0) {
        response += `🔴 **CRITIQUE** (${critical.length}):\n`;
        critical.slice(0, 3).forEach(a => {
          response += `   • ${a.titre} (Score: ${Math.round(a.score * 100)}%)\n`;
        });
        response += "\n";
      }

      if (high.length > 0) {
        response += `🟠 **ÉLEVÉ** (${high.length}):\n`;
        high.slice(0, 3).forEach(a => {
          response += `   • ${a.titre}\n`;
        });
        response += "\n";
      }

      if (medium.length > 0) {
        response += `🟡 **MOYEN** (${medium.length})\n\n`;
      }

      response += "💡 Proph3t recommande de traiter d'abord les anomalies critiques !";

      return response;
    } catch (error) {
      return "Hmm... 🤔 Proph3t ne peut pas accéder aux détections d'anomalies pour le moment.";
    }
  }

  /**
   * Affiche le dashboard ML
   */
  private async showMLDashboard(_params: Record<string, unknown>): Promise<string> {
    try {
      const dashboard = await mlService.getDashboard();

      let response = "Voici le Dashboard IA de Atlas Studio ! 🤖✨\n\n";
      response += "📊 **Vue d'ensemble:**\n";
      response += `   • Modèles actifs: ${dashboard.summary.active_models}/${dashboard.summary.total_models}\n`;
      response += `   • Modèles prêts: ${dashboard.summary.ready_models}\n`;
      response += `   • En entraînement: ${dashboard.summary.training_models}\n`;

      if (dashboard.summary.needs_retraining > 0) {
        response += `   ⚠️ À réentraîner: ${dashboard.summary.needs_retraining}\n`;
      }

      response += "\n🧠 **Modèles par type:**\n";
      Object.entries(dashboard.models_by_type).forEach(([type, count]) => {
        if (count > 0) {
          const emoji = this.getModelEmoji(type);
          response += `   ${emoji} ${type}: ${count}\n`;
        }
      });

      // Derniers entraînements
      if (dashboard.recent_trainings.length > 0) {
        response += "\n🎓 **Derniers entraînements:**\n";
        dashboard.recent_trainings.slice(0, 3).forEach(training => {
          const improvement = training.improvement ? `+${Math.round(training.improvement * 100)}%` : 'N/A';
          response += `   • ${training.modele_nom}: ${Math.round(training.score * 100)}% (${improvement})\n`;
        });
      }

      response += "\n✨ Tous les modèles de Proph3t sont opérationnels !";

      return response;
    } catch (error) {
      return "Oops ! 📊 Proph3t ne peut pas charger le dashboard ML pour le moment.";
    }
  }

  /**
   * Exécute une capacité ML
   */
  async executeCapability(capabilityName: string, params: Record<string, unknown>): Promise<string> {
    const capability = this.capabilities.get(capabilityName);

    if (!capability) {
      return `Désolée ! 😅 Proph3t ne connaît pas cette capacité IA: "${capabilityName}"`;
    }

    try {
      return await capability.action(params);
    } catch (error) {
      return `Oups ! 🔧 Proph3t a rencontré une erreur: ${error}`;
    }
  }

  /**
   * Détecte automatiquement quelle capacité ML utiliser
   */
  detectMLIntent(message: string): { capability: string; params: Record<string, unknown> } | null {
    const lowerMsg = message.toLowerCase();

    // Recommandation de compte
    if (lowerMsg.includes('compte') && (lowerMsg.includes('quel') || lowerMsg.includes('recommand'))) {
      return {
        capability: 'account_recommendation',
        params: {
          libelle: 'Transaction générique',
          montant: 1000
        }
      };
    }

    // Prévision trésorerie
    if (lowerMsg.includes('trésor') || lowerMsg.includes('tresorer') || lowerMsg.includes('prévi')) {
      return {
        capability: 'treasury_forecast',
        params: { periods: 30 }
      };
    }

    // Analyse risque
    if (lowerMsg.includes('risque') && lowerMsg.includes('client')) {
      return {
        capability: 'risk_analysis',
        params: { client_id: 1, client_name: 'Client Exemple' }
      };
    }

    // Anomalies
    if (lowerMsg.includes('anomalie') || lowerMsg.includes('suspect') || lowerMsg.includes('problème')) {
      return {
        capability: 'anomaly_detection',
        params: { days: 7 }
      };
    }

    // Dashboard ML
    if (lowerMsg.includes('dashboard') && lowerMsg.includes('ia')) {
      return {
        capability: 'ml_dashboard',
        params: {}
      };
    }

    return null;
  }

  // Utilitaires
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  private getModelEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      'LSTM': '🧠',
      'RANDOM_FOREST': '🌲',
      'XGBOOST': '🚀',
      'GRADIENT_BOOSTING': '📈',
      'DBSCAN': '🔍',
      'PROPHET': '🔮',
      'ISOLATION_FOREST': '🌳',
      'SVM': '🎯',
      'NETWORK_ANALYSIS': '🕸️',
      'SYSCOHADA_COMPLIANCE': '⚖️'
    };

    return emojiMap[type] || '🤖';
  }

  private generateMockHistorical(): Array<{ date: string; solde: number; entrees: number; sorties: number }> {
    // Génère des données historiques simulées
    const data = [];
    const today = new Date();

    for (let i = 90; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split('T')[0],
        solde: 0,
        entrees: 0,
        sorties: 0
      });
    }

    return data;
  }
}

// Instance singleton
export const palomaMLManager = new Proph3tMLManager();

export default palomaMLManager;