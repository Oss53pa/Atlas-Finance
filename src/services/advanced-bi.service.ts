/**
 * SERVICE PALOMA - Advanced BI & AI Assistant
 *
 * Paloma est l'assistant IA intelligent de WiseBook pour:
 * - Analyse de code
 * - Réponses aux questions métier
 * - Génération de rapports
 * - Analyse de documents
 */

import BaseApiService, { CrudOptions } from '../lib/base-api.service';
import { apiClient } from '../lib/api-client';

// ===== TYPES =====

export interface PalomaQuery {
  question: string;
  context?: string;
  session_id?: string;
  include_code_analysis?: boolean;
}

export interface PalomaResponse {
  reponse: string;
  confiance: number;
  sources: DocumentSource[];
  code_snippets?: CodeSnippet[];
  session_id: string;
  suggestions?: string[];
}

export interface DocumentSource {
  id: string;
  titre: string;
  type: 'documentation' | 'code' | 'database' | 'external';
  contenu: string;
  embeddings?: number[];
  metadata: Record<string, any>;
  date_indexation: string;
}

export interface ConversationSession {
  id: string;
  utilisateur: string;
  date_debut: string;
  date_fin?: string;
  messages_count: number;
  contexte: Record<string, any>;
  statut: 'active' | 'terminee';
}

export interface Message {
  id: string;
  session: string;
  role: 'user' | 'assistant';
  contenu: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CodeAnalysisResult {
  id: string;
  fichier: string;
  langage: string;
  complexite: number;
  lignes_code: number;
  commentaires: number;
  duplications: CodeDuplication[];
  vulnerabilites: Vulnerabilite[];
  suggestions: string[];
  date_analyse: string;
}

export interface CodeDuplication {
  fichier_source: string;
  fichier_cible: string;
  lignes_dupliquees: number;
  pourcentage: number;
}

export interface Vulnerabilite {
  type: string;
  severite: 'low' | 'medium' | 'high' | 'critical';
  ligne: number;
  description: string;
  remediation: string;
}

export interface AnalyticsData {
  total_questions: number;
  taux_satisfaction: number;
  temps_reponse_moyen: number;
  questions_par_categorie: Record<string, number>;
  tendances: TimeseriesData[];
}

export interface TimeseriesData {
  date: string;
  valeur: number;
}

// ===== SERVICES =====

/**
 * Service principal Paloma
 */
class PalomaService extends BaseApiService<any, any, any> {
  protected readonly basePath = '/api/advanced-bi/paloma';
  protected readonly entityName = 'Paloma';

  /**
   * Poser une question à Paloma
   */
  async ask(query: PalomaQuery, options?: CrudOptions): Promise<PalomaResponse> {
    return apiClient.post<PalomaResponse>(
      `${this.basePath}/ask/`,
      query,
      {
        showSuccessToast: false,
      }
    );
  }

  /**
   * Obtenir des suggestions de questions
   */
  async getSuggestions(contexte?: string): Promise<string[]> {
    return apiClient.get<string[]>(`${this.basePath}/suggestions/`, {
      params: { contexte },
    });
  }

  /**
   * Analyser un document
   */
  async analyzeDocument(file: File, options?: CrudOptions) {
    const formData = new FormData();
    formData.append('document', file);

    return apiClient.post(
      `${this.basePath}/analyze-document/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Document en cours d\'analyse',
      }
    );
  }

  /**
   * Générer un rapport
   */
  async generateReport(params: {
    type: string;
    periode?: string;
    format?: 'pdf' | 'excel' | 'json';
  }) {
    return apiClient.post(`${this.basePath}/generate-report/`, params);
  }
}

/**
 * Service Documents Sources
 */
class DocumentSourceService extends BaseApiService<
  DocumentSource,
  Partial<DocumentSource>,
  Partial<DocumentSource>
> {
  protected readonly basePath = '/api/advanced-bi/documents';
  protected readonly entityName = 'document source';

  /**
   * Indexer un nouveau document
   */
  async indexer(document: Partial<DocumentSource>, options?: CrudOptions) {
    return this.create(document, {
      ...options,
      successMessage: 'Document indexé avec succès',
    });
  }

  /**
   * Rechercher dans les documents
   */
  async search(query: string, filters?: { type?: string; limit?: number }) {
    return apiClient.get<DocumentSource[]>(`${this.basePath}/search/`, {
      params: { q: query, ...filters },
    });
  }

  /**
   * Réindexer tous les documents
   */
  async reindexAll(options?: CrudOptions) {
    return apiClient.post(
      `${this.basePath}/reindex-all/`,
      {},
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Réindexation démarrée',
      }
    );
  }
}

/**
 * Service Conversations
 */
class ConversationService extends BaseApiService<
  ConversationSession,
  Partial<ConversationSession>,
  Partial<ConversationSession>
> {
  protected readonly basePath = '/api/advanced-bi/conversations';
  protected readonly entityName = 'conversation';

  /**
   * Démarrer une nouvelle session
   */
  async start(contexte?: Record<string, any>, options?: CrudOptions) {
    return this.create(
      { contexte, statut: 'active' },
      {
        ...options,
        successMessage: 'Session démarrée',
      }
    );
  }

  /**
   * Obtenir les messages d'une session
   */
  async getMessages(sessionId: string): Promise<Message[]> {
    return apiClient.get<Message[]>(`${this.basePath}/${sessionId}/messages/`);
  }

  /**
   * Ajouter un message
   */
  async addMessage(sessionId: string, message: Partial<Message>, options?: CrudOptions) {
    return apiClient.post(
      `${this.basePath}/${sessionId}/messages/`,
      message,
      {
        showSuccessToast: false,
      }
    );
  }

  /**
   * Terminer une session
   */
  async end(sessionId: string, options?: CrudOptions) {
    return this.update(
      sessionId,
      { statut: 'terminee', date_fin: new Date().toISOString() },
      {
        ...options,
        successMessage: 'Session terminée',
      }
    );
  }

  /**
   * Obtenir l'historique de conversations
   */
  async getHistory(limit: number = 10) {
    return apiClient.get<ConversationSession[]>(`${this.basePath}/`, {
      params: { limit, ordering: '-date_debut' },
    });
  }
}

/**
 * Service Analyse de Code
 */
class CodeAnalysisService extends BaseApiService<
  CodeAnalysisResult,
  Partial<CodeAnalysisResult>,
  Partial<CodeAnalysisResult>
> {
  protected readonly basePath = '/api/advanced-bi/code-analysis';
  protected readonly entityName = 'analyse de code';

  /**
   * Analyser un fichier de code
   */
  async analyzeFile(file: File, options?: CrudOptions) {
    const formData = new FormData();
    formData.append('fichier', file);

    return apiClient.post(
      `${this.basePath}/analyze/`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Analyse de code démarrée',
      }
    );
  }

  /**
   * Analyser une arborescence complète
   */
  async analyzeProject(projectPath: string, options?: CrudOptions) {
    return apiClient.post(
      `${this.basePath}/analyze-project/`,
      { path: projectPath },
      {
        showSuccessToast: options?.showSuccessToast ?? true,
        successMessage: 'Analyse du projet démarrée',
      }
    );
  }

  /**
   * Obtenir les duplications de code
   */
  async getDuplications(threshold: number = 50) {
    return apiClient.get<CodeDuplication[]>(`${this.basePath}/duplications/`, {
      params: { threshold },
    });
  }

  /**
   * Obtenir les vulnérabilités
   */
  async getVulnerabilites(severite?: string) {
    return apiClient.get<Vulnerabilite[]>(`${this.basePath}/vulnerabilites/`, {
      params: { severite },
    });
  }
}

/**
 * Service Analytics
 */
class PalomaAnalyticsService extends BaseApiService<any, any, any> {
  protected readonly basePath = '/api/advanced-bi/analytics';
  protected readonly entityName = 'analytics';

  /**
   * Obtenir les statistiques d'utilisation
   */
  async getUsageStats(params?: { date_debut?: string; date_fin?: string }): Promise<AnalyticsData> {
    return apiClient.get<AnalyticsData>(`${this.basePath}/usage/`, { params });
  }

  /**
   * Obtenir les questions fréquentes
   */
  async getTopQuestions(limit: number = 10) {
    return apiClient.get(`${this.basePath}/top-questions/`, {
      params: { limit },
    });
  }

  /**
   * Obtenir le taux de satisfaction
   */
  async getSatisfaction(periode?: string) {
    return apiClient.get(`${this.basePath}/satisfaction/`, {
      params: { periode },
    });
  }

  /**
   * Exporter les analytics
   */
  async export(format: 'csv' | 'json' | 'excel' = 'csv') {
    return apiClient.get(`${this.basePath}/export/`, {
      params: { format },
      responseType: 'blob',
    });
  }
}

// ===== EXPORTS =====

export const palomaService = new PalomaService();
export const documentSourceService = new DocumentSourceService();
export const conversationService = new ConversationService();
export const codeAnalysisService = new CodeAnalysisService();
export const palomaAnalyticsService = new PalomaAnalyticsService();

export default {
  paloma: palomaService,
  documents: documentSourceService,
  conversations: conversationService,
  codeAnalysis: codeAnalysisService,
  analytics: palomaAnalyticsService,
};
