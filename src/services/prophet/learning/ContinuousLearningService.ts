// @ts-nocheck
/**
 * ContinuousLearningService — Apprentissage continu pour PROPH3T.
 *
 * Ce service permet à Proph3t d'apprendre en continu à partir des interactions :
 *
 * 1. **Feedback Loop** : enregistre chaque interaction (question → tools → réponse → feedback)
 * 2. **Pattern Learning** : identifie les patterns récurrents (questions fréquentes, tools efficaces)
 * 3. **Knowledge Refinement** : enrichit la knowledge base avec des corrections/précisions
 * 4. **User Profiling** : adapte le style et la profondeur des réponses au profil utilisateur
 * 5. **Tool Optimization** : apprend quels tools sont les plus pertinents pour chaque type de question
 * 6. **Prompt Enhancement** : injecte les apprentissages dans le system prompt
 *
 * Persistance : localStorage (clé 'proph3t_learning')
 * Capacité : 500 interactions max, 100 patterns max, 50 corrections max
 */

import type { ProphetResponse } from '../ProphetV2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LearningInteraction {
  id: string;
  timestamp: string;
  userQuery: string;
  toolsUsed: string[];
  responseSnippet: string; // first 200 chars
  model: string;
  feedback?: 'positive' | 'negative' | 'neutral';
  feedbackDetails?: string;
  wasReformulated: boolean; // user asked same thing differently = negative signal
  responseTimeMs: number;
  countryCode?: string;
}

export interface LearnedPattern {
  id: string;
  type: 'faq' | 'tool_preference' | 'correction' | 'style' | 'country_specific';
  query_pattern: string; // regex-like pattern or keywords
  optimal_tools: string[];
  optimal_response_style?: 'concise' | 'detailed' | 'step_by_step' | 'with_examples';
  confidence: number; // 0-1, increases with positive feedback
  occurrences: number;
  lastSeen: string;
  avgSatisfaction: number;
}

export interface KnowledgeCorrection {
  id: string;
  timestamp: string;
  originalContent: string;
  correctedContent: string;
  source: 'user_feedback' | 'tool_result' | 'admin';
  category: string;
  keywords: string[];
  validated: boolean;
}

export interface UserLearningProfile {
  userId: string;
  expertise: 'debutant' | 'intermediaire' | 'expert';
  preferredStyle: 'concise' | 'detailed' | 'step_by_step';
  preferredLanguage: 'fr' | 'en';
  frequentTopics: Record<string, number>; // topic → count
  frequentTools: Record<string, number>; // tool → count
  countryCode: string;
  positivePatterns: string[]; // pattern IDs that worked well
  negativePatterns: string[]; // pattern IDs that didn't work
  totalInteractions: number;
  satisfactionScore: number; // running average 0-1
  lastActive: string;
}

export interface LearningStore {
  version: number;
  interactions: LearningInteraction[];
  patterns: LearnedPattern[];
  corrections: KnowledgeCorrection[];
  userProfile: UserLearningProfile;
  globalStats: {
    totalQuestions: number;
    totalToolCalls: number;
    avgSatisfaction: number;
    topTools: Record<string, number>;
    topTopics: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'proph3t_learning';
const MAX_INTERACTIONS = 500;
const MAX_PATTERNS = 100;
const MAX_CORRECTIONS = 50;

export class ContinuousLearningService {
  private store: LearningStore;
  private pendingInteraction: Partial<LearningInteraction> | null = null;

  constructor() {
    this.store = this.load();
  }

  // ── Recording Interactions ──────────────────────────────────────

  /** Start tracking an interaction (called when user sends a message) */
  startInteraction(userQuery: string, countryCode?: string): string {
    const id = crypto.randomUUID();
    this.pendingInteraction = {
      id,
      timestamp: new Date().toISOString(),
      userQuery,
      countryCode,
      wasReformulated: this.isReformulation(userQuery),
      responseTimeMs: Date.now(),
    };
    return id;
  }

  /** Complete the interaction (called when response is received) */
  completeInteraction(response: ProphetResponse): void {
    if (!this.pendingInteraction) return;

    const interaction: LearningInteraction = {
      ...this.pendingInteraction as LearningInteraction,
      toolsUsed: response.toolsUsed,
      responseSnippet: response.content.slice(0, 200),
      model: response.model,
      responseTimeMs: Date.now() - (this.pendingInteraction.responseTimeMs || Date.now()),
    };

    this.store.interactions.push(interaction);
    if (this.store.interactions.length > MAX_INTERACTIONS) {
      this.store.interactions = this.store.interactions.slice(-MAX_INTERACTIONS);
    }

    // Update stats
    this.store.globalStats.totalQuestions++;
    this.store.globalStats.totalToolCalls += response.toolsUsed.length;
    for (const tool of response.toolsUsed) {
      this.store.globalStats.topTools[tool] = (this.store.globalStats.topTools[tool] || 0) + 1;
    }

    // Detect and update topic
    const topic = this.detectTopic(interaction.userQuery);
    if (topic) {
      this.store.globalStats.topTopics[topic] = (this.store.globalStats.topTopics[topic] || 0) + 1;
      this.store.userProfile.frequentTopics[topic] = (this.store.userProfile.frequentTopics[topic] || 0) + 1;
    }
    for (const tool of response.toolsUsed) {
      this.store.userProfile.frequentTools[tool] = (this.store.userProfile.frequentTools[tool] || 0) + 1;
    }
    this.store.userProfile.totalInteractions++;
    this.store.userProfile.lastActive = new Date().toISOString();

    // Learn patterns from tool usage
    this.learnToolPatterns(interaction);

    this.pendingInteraction = null;
    this.save();
  }

  // ── Feedback ──────────────────────────────────────────────────

  /** Record user feedback on the last interaction */
  recordFeedback(interactionId: string, feedback: 'positive' | 'negative' | 'neutral', details?: string): void {
    const interaction = this.store.interactions.find(i => i.id === interactionId);
    if (!interaction) return;

    interaction.feedback = feedback;
    interaction.feedbackDetails = details;

    // Update satisfaction score
    const score = feedback === 'positive' ? 1 : feedback === 'negative' ? 0 : 0.5;
    const profile = this.store.userProfile;
    const n = profile.totalInteractions;
    profile.satisfactionScore = ((profile.satisfactionScore * (n - 1)) + score) / n;

    // Update global satisfaction
    const feedbackInteractions = this.store.interactions.filter(i => i.feedback);
    if (feedbackInteractions.length > 0) {
      this.store.globalStats.avgSatisfaction = feedbackInteractions
        .reduce((sum, i) => sum + (i.feedback === 'positive' ? 1 : i.feedback === 'negative' ? 0 : 0.5), 0)
        / feedbackInteractions.length;
    }

    // Learn from feedback
    if (feedback === 'positive') {
      this.reinforcePattern(interaction);
    } else if (feedback === 'negative') {
      this.weakenPattern(interaction);
    }

    // Update user expertise based on accumulated interactions
    this.updateExpertise();

    this.save();
  }

  // ── Knowledge Corrections ──────────────────────────────────────

  /** Add a user-provided correction to the knowledge base */
  addCorrection(original: string, corrected: string, category: string, keywords: string[]): void {
    const correction: KnowledgeCorrection = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      originalContent: original,
      correctedContent: corrected,
      source: 'user_feedback',
      category,
      keywords,
      validated: false,
    };

    this.store.corrections.push(correction);
    if (this.store.corrections.length > MAX_CORRECTIONS) {
      this.store.corrections = this.store.corrections.slice(-MAX_CORRECTIONS);
    }
    this.save();
  }

  // ── Prompt Enhancement ─────────────────────────────────────────

  /**
   * Generate a learning context block to inject into the system prompt.
   * This is the key method that makes PROPH3T "learn" — it injects learned
   * patterns, user preferences, and corrections into the system prompt so
   * the LLM can use them.
   */
  getLearningContext(): string {
    const profile = this.store.userProfile;
    const patterns = this.getTopPatterns(5);
    const corrections = this.store.corrections.filter(c => c.validated || c.source === 'user_feedback').slice(-5);
    const recentTools = this.getRecentToolSuccesses(5);

    const parts: string[] = [];

    // User profile context
    if (profile.totalInteractions > 3) {
      parts.push(`PROFIL UTILISATEUR APPRIS
───────────────────────
Niveau       : ${profile.expertise}
Style préféré: ${profile.preferredStyle}
Pays habituel: ${profile.countryCode || 'CI'}
Interactions : ${profile.totalInteractions}
Satisfaction : ${Math.round(profile.satisfactionScore * 100)}%`);

      const topTopics = Object.entries(profile.frequentTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([t, n]) => `${t} (${n}x)`);
      if (topTopics.length > 0) {
        parts.push(`Sujets fréquents: ${topTopics.join(', ')}`);
      }
    }

    // Learned tool preferences
    if (recentTools.length > 0) {
      parts.push(`\nTOOLS LES PLUS EFFICACES (par feedback positif)
──────────────────────────────────────────────
${recentTools.map(t => `• ${t.tool} — utilisé pour: "${t.queryHint}" (${t.successRate}% succès)`).join('\n')}`);
    }

    // FAQ patterns
    if (patterns.length > 0) {
      parts.push(`\nPATTERNS APPRIS (questions fréquentes)
──────────────────────────────────────
${patterns.map(p => `• "${p.query_pattern}" → tools: [${p.optimal_tools.join(', ')}] (confiance: ${Math.round(p.confidence * 100)}%)`).join('\n')}`);
    }

    // Knowledge corrections
    if (corrections.length > 0) {
      parts.push(`\nCORRECTIONS APPRISES (à appliquer)
──────────────────────────────────
${corrections.map(c => `• [${c.category}] ${c.correctedContent.slice(0, 100)}`).join('\n')}`);
    }

    return parts.length > 0 ? '\n\n' + parts.join('\n\n') : '';
  }

  /**
   * Get tool suggestions for a given query based on learned patterns.
   * Returns the tools most likely to be useful.
   */
  suggestTools(query: string): string[] {
    const queryLower = query.toLowerCase();
    const matches: Array<{ tools: string[]; score: number }> = [];

    for (const pattern of this.store.patterns) {
      if (pattern.confidence < 0.3) continue;
      const keywords = pattern.query_pattern.toLowerCase().split(/\s+/);
      const matchCount = keywords.filter(k => queryLower.includes(k)).length;
      if (matchCount > 0) {
        matches.push({
          tools: pattern.optimal_tools,
          score: (matchCount / keywords.length) * pattern.confidence,
        });
      }
    }

    if (matches.length === 0) return [];

    matches.sort((a, b) => b.score - a.score);
    // Return unique tools from top matches
    const seen = new Set<string>();
    const result: string[] = [];
    for (const m of matches) {
      for (const tool of m.tools) {
        if (!seen.has(tool)) {
          seen.add(tool);
          result.push(tool);
        }
      }
    }
    return result.slice(0, 5);
  }

  // ── Statistics & Insights ──────────────────────────────────────

  /** Get learning statistics */
  getStats() {
    return {
      totalInteractions: this.store.globalStats.totalQuestions,
      totalToolCalls: this.store.globalStats.totalToolCalls,
      avgSatisfaction: Math.round(this.store.globalStats.avgSatisfaction * 100),
      patternsLearned: this.store.patterns.length,
      corrections: this.store.corrections.length,
      topTools: Object.entries(this.store.globalStats.topTools)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      topTopics: Object.entries(this.store.globalStats.topTopics)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      userExpertise: this.store.userProfile.expertise,
      preferredStyle: this.store.userProfile.preferredStyle,
    };
  }

  /** Reset all learning data */
  reset(): void {
    this.store = this.createEmptyStore();
    this.save();
  }

  // ── Private Methods ──────────────────────────────────────────

  private isReformulation(query: string): boolean {
    if (this.store.interactions.length === 0) return false;
    const last = this.store.interactions[this.store.interactions.length - 1];
    if (!last) return false;
    // Simple check: if >50% of words overlap with last query
    const lastWords = new Set(last.userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const currentWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (currentWords.length === 0) return false;
    const overlap = currentWords.filter(w => lastWords.has(w)).length;
    return overlap / currentWords.length > 0.5;
  }

  private detectTopic(query: string): string | null {
    const q = query.toLowerCase();
    const topicMap: Record<string, string[]> = {
      'fiscalite': ['is ', 'impôt', 'tva', 'irpp', 'fiscal', 'taxe', 'retenue'],
      'paie': ['paie', 'salaire', 'bulletin', 'cotisation', 'cnps', 'css'],
      'comptabilite': ['écriture', 'ecriture', 'balance', 'grand livre', 'journal', 'compte'],
      'audit': ['audit', 'contrôle', 'controle', 'benford', 'fraude', 'anomalie'],
      'tresorerie': ['trésorerie', 'tresorerie', 'banque', 'solde', 'cash'],
      'cloture': ['clôture', 'cloture', 'régularisation', 'amortissement', 'provision'],
      'budget': ['budget', 'prévision', 'prevision', 'forecast'],
      'tiers': ['client', 'fournisseur', 'créance', 'dette', 'aging', 'recouvrement'],
    };
    for (const [topic, keywords] of Object.entries(topicMap)) {
      if (keywords.some(k => q.includes(k))) return topic;
    }
    return null;
  }

  private learnToolPatterns(interaction: LearningInteraction): void {
    if (interaction.toolsUsed.length === 0) return;

    const topic = this.detectTopic(interaction.userQuery);
    const patternId = topic ? `topic_${topic}` : `query_${interaction.toolsUsed.join('_')}`;

    const existing = this.store.patterns.find(p => p.id === patternId);
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date().toISOString();
      // Merge tools
      for (const tool of interaction.toolsUsed) {
        if (!existing.optimal_tools.includes(tool)) {
          existing.optimal_tools.push(tool);
        }
      }
    } else {
      const keywords = interaction.userQuery
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 5)
        .join(' ');

      this.store.patterns.push({
        id: patternId,
        type: 'tool_preference',
        query_pattern: keywords,
        optimal_tools: [...interaction.toolsUsed],
        confidence: 0.5,
        occurrences: 1,
        lastSeen: new Date().toISOString(),
        avgSatisfaction: 0.5,
      });

      if (this.store.patterns.length > MAX_PATTERNS) {
        // Remove least confident patterns
        this.store.patterns.sort((a, b) => b.confidence - a.confidence);
        this.store.patterns = this.store.patterns.slice(0, MAX_PATTERNS);
      }
    }
  }

  private reinforcePattern(interaction: LearningInteraction): void {
    for (const pattern of this.store.patterns) {
      const hasToolOverlap = pattern.optimal_tools.some(t => interaction.toolsUsed.includes(t));
      if (hasToolOverlap) {
        pattern.confidence = Math.min(1, pattern.confidence + 0.1);
        pattern.avgSatisfaction = (pattern.avgSatisfaction * (pattern.occurrences - 1) + 1) / pattern.occurrences;
      }
    }
    // Also track positive patterns for user
    const topic = this.detectTopic(interaction.userQuery);
    if (topic) {
      const patternId = `topic_${topic}`;
      if (!this.store.userProfile.positivePatterns.includes(patternId)) {
        this.store.userProfile.positivePatterns.push(patternId);
      }
    }
  }

  private weakenPattern(interaction: LearningInteraction): void {
    for (const pattern of this.store.patterns) {
      const hasToolOverlap = pattern.optimal_tools.some(t => interaction.toolsUsed.includes(t));
      if (hasToolOverlap) {
        pattern.confidence = Math.max(0, pattern.confidence - 0.15);
        pattern.avgSatisfaction = (pattern.avgSatisfaction * (pattern.occurrences - 1) + 0) / pattern.occurrences;
      }
    }
    const topic = this.detectTopic(interaction.userQuery);
    if (topic) {
      const patternId = `topic_${topic}`;
      if (!this.store.userProfile.negativePatterns.includes(patternId)) {
        this.store.userProfile.negativePatterns.push(patternId);
      }
    }
  }

  private updateExpertise(): void {
    const profile = this.store.userProfile;
    const n = profile.totalInteractions;
    const advancedTopics = ['audit', 'cloture', 'fiscalite'].filter(t =>
      (profile.frequentTopics[t] || 0) > 3
    ).length;

    if (n > 50 && advancedTopics >= 2) {
      profile.expertise = 'expert';
    } else if (n > 15 || advancedTopics >= 1) {
      profile.expertise = 'intermediaire';
    } else {
      profile.expertise = 'debutant';
    }

    // Detect preferred style from feedback patterns
    const recentPositive = this.store.interactions
      .filter(i => i.feedback === 'positive')
      .slice(-10);
    if (recentPositive.length >= 3) {
      const avgLength = recentPositive.reduce((s, i) => s + i.responseSnippet.length, 0) / recentPositive.length;
      if (avgLength < 80) profile.preferredStyle = 'concise';
      else if (avgLength > 150) profile.preferredStyle = 'detailed';
      else profile.preferredStyle = 'step_by_step';
    }
  }

  private getTopPatterns(n: number): LearnedPattern[] {
    return [...this.store.patterns]
      .filter(p => p.confidence > 0.3 && p.occurrences > 1)
      .sort((a, b) => (b.confidence * b.occurrences) - (a.confidence * a.occurrences))
      .slice(0, n);
  }

  private getRecentToolSuccesses(n: number): Array<{ tool: string; queryHint: string; successRate: number }> {
    const toolStats: Record<string, { total: number; positive: number; queryHint: string }> = {};

    for (const interaction of this.store.interactions.slice(-100)) {
      for (const tool of interaction.toolsUsed) {
        if (!toolStats[tool]) toolStats[tool] = { total: 0, positive: 0, queryHint: '' };
        toolStats[tool].total++;
        if (interaction.feedback === 'positive') toolStats[tool].positive++;
        toolStats[tool].queryHint = interaction.userQuery.slice(0, 40);
      }
    }

    return Object.entries(toolStats)
      .map(([tool, stats]) => ({
        tool,
        queryHint: stats.queryHint,
        successRate: stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 50,
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, n);
  }

  // ── Persistence ────────────────────────────────────────────────

  private load(): LearningStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.version === 1) return data;
      }
    } catch (e) {
      console.warn('[PROPH3T Learning] Failed to load:', e);
    }
    return this.createEmptyStore();
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch (e) {
      console.warn('[PROPH3T Learning] Failed to save:', e);
    }
  }

  private createEmptyStore(): LearningStore {
    return {
      version: 1,
      interactions: [],
      patterns: [],
      corrections: [],
      userProfile: {
        userId: 'default',
        expertise: 'debutant',
        preferredStyle: 'detailed',
        preferredLanguage: 'fr',
        frequentTopics: {},
        frequentTools: {},
        countryCode: 'CI',
        positivePatterns: [],
        negativePatterns: [],
        totalInteractions: 0,
        satisfactionScore: 0.5,
        lastActive: new Date().toISOString(),
      },
      globalStats: {
        totalQuestions: 0,
        totalToolCalls: 0,
        avgSatisfaction: 0.5,
        topTools: {},
        topTopics: {},
      },
    };
  }
}

/** Singleton */
export const continuousLearning = new ContinuousLearningService();
