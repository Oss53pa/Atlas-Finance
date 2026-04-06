// @ts-nocheck

/**
 * Système d'Apprentissage et d'Adaptation pour Proph3t
 * Apprentissage automatique et amélioration continue basée sur les interactions utilisateur
 */

// Interfaces pour le système d'apprentissage
interface InteractionContext {
  currentModule?: string;
  userRole?: string;
  [key: string]: unknown;
}

interface ImplicitSignals {
  userResponseTime?: number;
  followUpActions?: string[];
  [key: string]: unknown;
}

interface AdaptedPersonality {
  tone: 'formal' | 'friendly' | 'enthusiastic';
  responseLength: 'short' | 'medium' | 'long';
  style: 'concise' | 'detailed' | 'visual' | 'step-by-step';
  complexity: string;
  focusAreas: string[];
}

interface PersonalizedExperience {
  welcomeMessage: string;
  suggestedTopics: string[];
  interfacePreferences: Record<string, unknown>;
  learningPath: LearningStep[];
  shortcuts: string[];
}

interface LearningStep {
  step: string;
  priority: 'high' | 'medium' | 'low';
}

interface FailureFactor {
  type: string;
  [key: string]: unknown;
}

interface LearningExportData {
  interactionsSummary: {
    total: number;
    averageSatisfaction: number;
    topIntents: string[];
  };
  patterns: LearningPattern[];
  userProfiles: Record<string, unknown>[];
  adaptationHistory: AdaptationEvent[];
  exportTimestamp: string;
}

interface SerializedUserProfile {
  userId: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredCommunicationStyle: 'concise' | 'detailed' | 'visual' | 'step-by-step';
  frequentTopics: [string, number][];
  successfulInteractionPatterns: LearningPattern[];
  problematicAreas: string[];
  optimalResponseLength: 'short' | 'medium' | 'long';
  preferredTone: 'formal' | 'friendly' | 'enthusiastic';
  learningGoals: string[];
  adaptationHistory: AdaptationEvent[];
}

type AdaptationRuleFn = (response: string, context: InteractionContext) => string;

interface UserInteraction {
  id: string;
  timestamp: Date;
  userQuery: string;
  intent: string;
  response: string;
  userSatisfaction?: number; // 0-1 score
  userFeedback?: 'positive' | 'negative' | 'neutral';
  responseTime: number;
  contextAtTime: InteractionContext;
  wasHelpful: boolean;
  followUpActions: string[];
}

interface LearningPattern {
  patternId: string;
  type: 'preference' | 'success' | 'failure' | 'style' | 'content';
  pattern: Record<string, unknown>;
  confidence: number;
  occurrences: number;
  lastSeen: Date;
  effectiveness: number;
}

interface UserProfile {
  userId: string;
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredCommunicationStyle: 'concise' | 'detailed' | 'visual' | 'step-by-step';
  frequentTopics: Map<string, number>;
  successfulInteractionPatterns: LearningPattern[];
  problematicAreas: string[];
  optimalResponseLength: 'short' | 'medium' | 'long';
  preferredTone: 'formal' | 'friendly' | 'enthusiastic';
  learningGoals: string[];
  adaptationHistory: AdaptationEvent[];
}

interface AdaptationEvent {
  timestamp: Date;
  type: 'style_change' | 'content_adjustment' | 'pattern_learning' | 'preference_update';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  trigger: string;
  impact: number;
}

interface LearningInsights {
  totalInteractions: number;
  averageSatisfaction: number;
  improvementTrend: number;
  mostEffectivePatterns: LearningPattern[];
  areasForImprovement: string[];
  adaptationSuggestions: string[];
}

export class PalomaLearningSystem {
  private interactions: UserInteraction[] = [];
  private userProfiles: Map<string, UserProfile> = new Map();
  private globalPatterns: LearningPattern[] = [];
  private adaptationRules: Map<string, AdaptationRuleFn> = new Map();
  private learningEnabled: boolean = true;

  constructor() {
    this.initializeAdaptationRules();
    this.loadPersistentData();
  }

  // === MÉTHODES PRINCIPALES D'APPRENTISSAGE ===

  recordInteraction(interaction: UserInteraction): void {
    if (!this.learningEnabled) return;

    this.interactions.push(interaction);
    this.updateUserProfile(interaction);
    this.analyzePatterns(interaction);
    this.adaptBasedOnFeedback(interaction);

    // Limiter l'historique pour les performances
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-800);
    }

    this.saveInteractionData();
  }

  analyzeUserSatisfaction(
    userQuery: string,
    response: string,
    userFeedback?: 'positive' | 'negative' | 'neutral',
    implicitSignals?: ImplicitSignals
  ): number {
    let satisfaction = 0.5; // Score de base

    // Analyse du feedback explicite
    if (userFeedback === 'positive') satisfaction = 0.9;
    if (userFeedback === 'negative') satisfaction = 0.1;

    // Analyse des signaux implicites
    if (implicitSignals) {
      // Temps de réponse utilisateur (plus court = plus satisfait généralement)
      if (implicitSignals.userResponseTime < 5000) satisfaction += 0.1;

      // Actions de suivi (clic sur liens, navigation) = satisfaction
      if (implicitSignals.followUpActions?.length > 0) satisfaction += 0.2;

      // Reformulation de la question = insatisfaction
      if (this.isReformulatedQuestion(userQuery)) satisfaction -= 0.2;
    }

    // Analyse linguistique du feedback
    satisfaction += this.analyzeLinguisticSatisfaction(userQuery);

    return Math.max(0, Math.min(1, satisfaction));
  }

  adaptPersonalityToUser(userId: string): AdaptedPersonality {
    const profile = this.userProfiles.get(userId);
    if (!profile) return this.getDefaultPersonality();

    const adaptedPersonality = {
      tone: profile.preferredTone,
      responseLength: profile.optimalResponseLength,
      style: profile.preferredCommunicationStyle,
      complexity: this.mapExpertiseToComplexity(profile.expertiseLevel),
      focusAreas: Array.from(profile.frequentTopics.keys()).slice(0, 3)
    };

    // Enregistrer l'adaptation
    this.recordAdaptation(userId, 'style_change', null, adaptedPersonality, 'user_profile_analysis');

    return adaptedPersonality;
  }

  learnFromSuccess(interaction: UserInteraction): void {
    if (interaction.userSatisfaction < 0.7) return;

    // Identifier les éléments qui ont contribué au succès
    const successPattern: LearningPattern = {
      patternId: `success_${Date.now()}`,
      type: 'success',
      pattern: {
        intent: interaction.intent,
        responseStructure: this.analyzeResponseStructure(interaction.response),
        contextFactors: this.extractContextFactors(interaction.contextAtTime),
        timing: interaction.responseTime
      },
      confidence: interaction.userSatisfaction,
      occurrences: 1,
      lastSeen: new Date(),
      effectiveness: interaction.userSatisfaction
    };

    this.addOrUpdatePattern(successPattern);
  }

  learnFromFailure(interaction: UserInteraction): void {
    if (interaction.userSatisfaction > 0.4) return;

    // Analyser les causes d'échec
    const failureFactors = this.analyzeFailureFactors(interaction);

    // Créer des règles d'adaptation pour éviter les échecs similaires
    failureFactors.forEach(factor => {
      const adaptationRule = this.createAdaptationRule(factor, interaction);
      this.adaptationRules.set(`avoid_${factor.type}`, adaptationRule);
    });

    // Marquer les zones problématiques
    const userId = this.inferUserId(interaction);
    if (userId) {
      const profile = this.userProfiles.get(userId);
      if (profile) {
        profile.problematicAreas.push(interaction.intent);
      }
    }
  }

  // === ADAPTATION DYNAMIQUE ===

  adaptResponseInRealTime(
    baseResponse: string,
    context: InteractionContext | undefined,
    userHistory: Partial<UserInteraction>[]
  ): string {
    let adaptedResponse = baseResponse;
    const safeContext: InteractionContext = context ?? {};

    // Adapter selon les patterns appris
    const relevantPatterns = this.findRelevantPatterns(safeContext, userHistory);

    for (const pattern of relevantPatterns) {
      adaptedResponse = this.applyPattern(adaptedResponse, pattern);
    }

    // Adapter selon les règles d'adaptation
    for (const [ruleName, rule] of this.adaptationRules) {
      if (this.shouldApplyRule(ruleName, safeContext)) {
        adaptedResponse = rule(adaptedResponse, safeContext);
      }
    }

    return adaptedResponse;
  }

  suggestResponseImprovements(
    originalResponse: string,
    userFeedback: { satisfaction: number; emotionalState?: string },
    context: InteractionContext
  ): string[] {
    const suggestions: string[] = [];

    // Analyser ce qui n'a pas fonctionné
    if (userFeedback.satisfaction < 0.5) {
      if (originalResponse.length > 200) {
        suggestions.push('Réponse plus concise recommandée');
      }
      if (!this.hasActionableContent(originalResponse)) {
        suggestions.push('Ajouter des étapes concrètes');
      }
      if (!this.hasEmotionalSupport(originalResponse) && userFeedback.emotionalState === 'frustrated') {
        suggestions.push('Ajouter de l\'empathie et du support émotionnel');
      }
    }

    // Suggestions basées sur les patterns réussis
    const successfulPatterns = this.globalPatterns
      .filter(p => p.type === 'success' && p.effectiveness > 0.7)
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 3);

    successfulPatterns.forEach(pattern => {
      suggestions.push(`Appliquer le pattern réussi: ${pattern.patternId}`);
    });

    return suggestions;
  }

  // === PERSONNALISATION AVANCÉE ===

  personalizeExperience(userId: string): PersonalizedExperience | Record<string, never> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return {};

    const personalization = {
      welcomeMessage: this.generatePersonalizedWelcome(profile),
      suggestedTopics: this.generatePersonalizedSuggestions(profile),
      interfacePreferences: this.generateInterfacePreferences(profile),
      learningPath: this.generateLearningPath(profile),
      shortcuts: this.generatePersonalizedShortcuts(profile)
    };

    return personalization;
  }

  generateLearningPath(profile: UserProfile): LearningStep[] {
    const path: LearningStep[] = [];

    // Basé sur le niveau d'expertise
    if (profile.expertiseLevel === 'beginner') {
      path.push(
        { step: 'Bases de Atlas Studio', priority: 'high' },
        { step: 'Navigation principale', priority: 'high' },
        { step: 'Fonctions essentielles', priority: 'medium' }
      );
    }

    // Basé sur les domaines problématiques
    profile.problematicAreas.forEach(area => {
      path.push({ step: `Approfondir: ${area}`, priority: 'high' });
    });

    // Basé sur les objectifs
    profile.learningGoals.forEach(goal => {
      path.push({ step: goal, priority: 'medium' });
    });

    return path.slice(0, 5); // Limiter à 5 étapes
  }

  // === ANALYSE ET INSIGHTS ===

  generateLearningInsights(): LearningInsights {
    const recentInteractions = this.interactions.slice(-100);

    return {
      totalInteractions: this.interactions.length,
      averageSatisfaction: this.calculateAverageSatisfaction(recentInteractions),
      improvementTrend: this.calculateImprovementTrend(),
      mostEffectivePatterns: this.getMostEffectivePatterns(),
      areasForImprovement: this.identifyAreasForImprovement(),
      adaptationSuggestions: this.generateAdaptationSuggestions()
    };
  }

  exportLearningData(): LearningExportData {
    return {
      interactionsSummary: {
        total: this.interactions.length,
        averageSatisfaction: this.calculateAverageSatisfaction(this.interactions),
        topIntents: this.getTopIntents()
      },
      patterns: this.globalPatterns.slice(0, 20), // Top 20 patterns
      userProfiles: Array.from(this.userProfiles.values()).map(profile => ({
        ...profile,
        frequentTopics: Array.from(profile.frequentTopics.entries())
      })),
      adaptationHistory: this.getAllAdaptationHistory(),
      exportTimestamp: new Date().toISOString()
    };
  }

  // === MÉTHODES PRIVÉES ===

  private initializeAdaptationRules(): void {
    // Règle pour adapter la longueur des réponses
    this.adaptationRules.set('adjust_length', (response: string, context: InteractionContext) => {
      const userPref = context['userPreference'] as Record<string, unknown> | undefined;
      if (userPref?.responseLength === 'short') {
        return this.shortenResponse(response);
      }
      return response;
    });

    // Règle pour ajouter de l'empathie
    this.adaptationRules.set('add_empathy', (response: string, context: InteractionContext) => {
      if (context['emotionalState'] === 'frustrated') {
        return `🤗 Je comprends votre frustration. ${response}`;
      }
      return response;
    });

    // Règle pour adapter le niveau technique
    this.adaptationRules.set('adjust_technical_level', (response: string, context: InteractionContext) => {
      if (context['expertiseLevel'] === 'beginner') {
        return this.simplifyTechnicalTerms(response);
      }
      return response;
    });
  }

  private updateUserProfile(interaction: UserInteraction): void {
    const userId = this.inferUserId(interaction);
    if (!userId) return;

    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = this.createNewUserProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Mettre à jour les topics fréquents
    const currentCount = profile.frequentTopics.get(interaction.intent) || 0;
    profile.frequentTopics.set(interaction.intent, currentCount + 1);

    // Mettre à jour le niveau d'expertise basé sur les interactions
    profile.expertiseLevel = this.inferExpertiseLevel(profile, interaction);

    // Mettre à jour les préférences basées sur les interactions réussies
    if (interaction.userSatisfaction > 0.7) {
      this.updatePreferencesFromSuccess(profile, interaction);
    }
  }

  private analyzePatterns(interaction: UserInteraction): void {
    // Analyser les patterns temporels
    this.analyzeTemporalPatterns(interaction);

    // Analyser les patterns de contenu
    this.analyzeContentPatterns(interaction);

    // Analyser les patterns contextuels
    this.analyzeContextualPatterns(interaction);
  }

  private analyzeTemporalPatterns(interaction: UserInteraction): void {
    const hour = interaction.timestamp.getHours();
    const dayOfWeek = interaction.timestamp.getDay();

    const temporalPattern: LearningPattern = {
      patternId: `temporal_${hour}_${dayOfWeek}`,
      type: 'preference',
      pattern: {
        timeOfDay: hour,
        dayOfWeek: dayOfWeek,
        intent: interaction.intent,
        satisfaction: interaction.userSatisfaction
      },
      confidence: 0.6,
      occurrences: 1,
      lastSeen: new Date(),
      effectiveness: interaction.userSatisfaction || 0.5
    };

    this.addOrUpdatePattern(temporalPattern);
  }

  private analyzeContentPatterns(interaction: UserInteraction): void {
    const contentFeatures = {
      length: interaction.response.length,
      hasEmojis: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(interaction.response),
      hasSteps: /\d+\.|\*|\-/.test(interaction.response),
      hasExamples: /exemple|par exemple|comme/i.test(interaction.response),
      hasTechnicalTerms: this.countTechnicalTerms(interaction.response)
    };

    const contentPattern: LearningPattern = {
      patternId: `content_${interaction.intent}`,
      type: 'content',
      pattern: {
        intent: interaction.intent,
        features: contentFeatures,
        satisfaction: interaction.userSatisfaction
      },
      confidence: 0.7,
      occurrences: 1,
      lastSeen: new Date(),
      effectiveness: interaction.userSatisfaction || 0.5
    };

    this.addOrUpdatePattern(contentPattern);
  }

  private analyzeContextualPatterns(interaction: UserInteraction): void {
    if (!interaction.contextAtTime) return;

    const contextPattern: LearningPattern = {
      patternId: `context_${interaction.intent}`,
      type: 'style',
      pattern: {
        intent: interaction.intent,
        module: interaction.contextAtTime.currentModule,
        userRole: interaction.contextAtTime.userRole,
        satisfaction: interaction.userSatisfaction
      },
      confidence: 0.6,
      occurrences: 1,
      lastSeen: new Date(),
      effectiveness: interaction.userSatisfaction || 0.5
    };

    this.addOrUpdatePattern(contextPattern);
  }

  private adaptBasedOnFeedback(interaction: UserInteraction): void {
    if (!interaction.userSatisfaction) return;

    if (interaction.userSatisfaction < 0.4) {
      // Interaction échouée - apprendre pour éviter
      this.learnFromFailure(interaction);
    } else if (interaction.userSatisfaction > 0.7) {
      // Interaction réussie - apprendre pour reproduire
      this.learnFromSuccess(interaction);
    }
  }

  private addOrUpdatePattern(pattern: LearningPattern): void {
    const existingIndex = this.globalPatterns.findIndex(p => p.patternId === pattern.patternId);

    if (existingIndex >= 0) {
      const existing = this.globalPatterns[existingIndex];
      existing.occurrences += 1;
      existing.lastSeen = pattern.lastSeen;
      // Mise à jour pondérée de l'efficacité
      existing.effectiveness = (existing.effectiveness * 0.8) + (pattern.effectiveness * 0.2);
      existing.confidence = Math.min(existing.confidence + 0.05, 1.0);
    } else {
      this.globalPatterns.push(pattern);
    }

    // Nettoyer les anciens patterns
    this.cleanupOldPatterns();
  }

  private cleanupOldPatterns(): void {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.globalPatterns = this.globalPatterns.filter(pattern =>
      pattern.lastSeen > oneMonthAgo && pattern.occurrences > 1
    );
  }

  // Méthodes utilitaires...

  private inferUserId(interaction: UserInteraction): string | null {
    // Simuler l'inférence d'ID utilisateur
    return 'user_current'; // À remplacer par la vraie logique
  }

  private createNewUserProfile(userId: string): UserProfile {
    return {
      userId,
      expertiseLevel: 'beginner',
      preferredCommunicationStyle: 'detailed',
      frequentTopics: new Map(),
      successfulInteractionPatterns: [],
      problematicAreas: [],
      optimalResponseLength: 'medium',
      preferredTone: 'friendly',
      learningGoals: [],
      adaptationHistory: []
    };
  }

  private calculateAverageSatisfaction(interactions: UserInteraction[]): number {
    const withSatisfaction = interactions.filter(i => i.userSatisfaction !== undefined);
    if (withSatisfaction.length === 0) return 0.5;

    const sum = withSatisfaction.reduce((acc, i) => acc + (i.userSatisfaction || 0), 0);
    return sum / withSatisfaction.length;
  }

  private loadPersistentData(): void {
    try {
      const stored = localStorage.getItem('paloma_learning_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.globalPatterns = data.patterns || [];
        // Reconstituer les user profiles
        if (data.userProfiles) {
          data.userProfiles.forEach((profileData: SerializedUserProfile) => {
            const profile = {
              ...profileData,
              frequentTopics: new Map(profileData.frequentTopics || [])
            };
            this.userProfiles.set(profile.userId, profile);
          });
        }
      }
    } catch (error) {
    }
  }

  private saveInteractionData(): void {
    try {
      const dataToSave = {
        patterns: this.globalPatterns.slice(-100), // Garder seulement les 100 derniers patterns
        userProfiles: Array.from(this.userProfiles.values()).map(profile => ({
          ...profile,
          frequentTopics: Array.from(profile.frequentTopics.entries())
        })),
        lastUpdate: new Date().toISOString()
      };
      localStorage.setItem('paloma_learning_data', JSON.stringify(dataToSave));
    } catch (error) {
    }
  }

  // Méthodes d'analyse et de calcul supplémentaires...

  private countTechnicalTerms(text: string): number {
    const technicalTerms = [
      'api', 'base de données', 'configuration', 'paramétrage', 'synchronisation',
      'authentification', 'autorisation', 'débit', 'crédit', 'comptabilité'
    ];
    return technicalTerms.filter(term =>
      text.toLowerCase().includes(term)
    ).length;
  }

  private shortenResponse(response: string): string {
    const sentences = response.split(/[.!?]+/);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private simplifyTechnicalTerms(response: string): string {
    const replacements = {
      'authentification': 'connexion',
      'paramétrage': 'configuration',
      'synchronisation': 'mise à jour'
    };

    let simplified = response;
    for (const [technical, simple] of Object.entries(replacements)) {
      simplified = simplified.replace(new RegExp(technical, 'gi'), simple);
    }
    return simplified;
  }

  // Méthodes publiques pour l'interface externe

  public enableLearning(): void {
    this.learningEnabled = true;
  }

  public disableLearning(): void {
    this.learningEnabled = false;
  }

  public resetLearningData(): void {
    this.interactions = [];
    this.userProfiles.clear();
    this.globalPatterns = [];
    localStorage.removeItem('paloma_learning_data');
  }

  public getPersonalizationSuggestions(userId: string): string[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    const suggestions: string[] = [];

    if (profile.problematicAreas.length > 0) {
      suggestions.push(`Formation recommandée sur: ${profile.problematicAreas[0]}`);
    }

    if (profile.frequentTopics.size > 0) {
      const topTopic = Array.from(profile.frequentTopics.entries())
        .sort((a, b) => b[1] - a[1])[0][0];
      suggestions.push(`Ressources avancées sur: ${topTopic}`);
    }

    return suggestions;
  }
}

// Instance globale
export const palomaLearningSystem = new PalomaLearningSystem();