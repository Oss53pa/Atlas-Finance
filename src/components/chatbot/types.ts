/**
 * Chatbot Types and Interfaces
 */

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type: 'text' | 'quick-reply' | 'action' | 'error';
  metadata?: {
    confidence?: number;
    source?: string;
    actions?: ChatAction[];
    quickReplies?: string[];
  };
}

export interface ChatAction {
  type: 'navigate' | 'open-modal' | 'copy-text' | 'download' | 'external-link';
  label: string;
  payload: any;
  icon?: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: ChatContext;
  startedAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'ended';
}

export interface ChatContext {
  currentPage?: string;
  currentModule?: string;
  userRole?: string;
  userPreferences?: any;
  recentActions?: string[];
  problemCategory?: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  module: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lastUpdated: Date;
  searchKeywords: string[];
}

export interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  fallbackMessage: string;
  maxMessagesPerSession: number;
  responseDelay: number;
  knowledgeBase: KnowledgeBaseEntry[];
  quickReplies: {
    [category: string]: string[];
  };
}

export interface ChatResponse {
  message: string;
  confidence: number;
  source: 'knowledge-base' | 'ai' | 'fallback';
  actions?: ChatAction[];
  quickReplies?: string[];
  suggestedArticles?: KnowledgeBaseEntry[];
}

export interface UserIntent {
  intent: string;
  confidence: number;
  entities: {
    [key: string]: string;
  };
  context: ChatContext;
}