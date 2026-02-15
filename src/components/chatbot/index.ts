/**
 * Atlas Finance Chatbot - Export principal
 * Assistant IA intelligent pour l'aide utilisateur
 */

export { ChatWidget } from './ChatWidget';
export { useChatbot } from './hooks/useChatbot';

// Composants
export { MessageList } from './components/MessageList';
export { MessageBubble } from './components/MessageBubble';
export { MessageInput } from './components/MessageInput';
export { QuickReplies } from './components/QuickReplies';
export { TypingIndicator } from './components/TypingIndicator';

// Types
export type {
  ChatMessage,
  ChatSession,
  ChatContext,
  ChatAction,
  ChatResponse,
  UserIntent,
  KnowledgeBaseEntry,
  ChatbotConfig,
} from './types';

// AI Engine
export { intentRecognizer } from './ai/intentRecognition';
export { responseGenerator } from './ai/responseGenerator';

// Knowledge Base
export {
  knowledgeBase,
  searchKnowledgeBase,
  getEntriesByCategory,
  getEntriesByModule,
  getRandomEntries,
} from './utils/knowledgeBase';

// Styles
import './ChatWidget.css';