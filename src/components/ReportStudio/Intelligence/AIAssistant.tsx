/**
 * AIAssistant - Assistant IA pour questions en langage naturel
 * Permet de poser des questions sur les données du rapport
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Table2,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  Maximize2,
  Minimize2,
  Clock,
  Bookmark,
  BookmarkCheck,
  History,
  Search,
  Zap,
  Filter,
  HelpCircle,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'text' | 'chart' | 'table' | 'insight';
  data?: any;
  sources?: { label: string; value: string; section?: string }[];
  isLoading?: boolean;
  feedback?: 'positive' | 'negative';
}

export interface SuggestedQuestion {
  id: string;
  question: string;
  category: 'performance' | 'comparison' | 'trend' | 'detail';
  icon: React.ReactNode;
}

interface AIAssistantProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
  suggestedQuestions?: SuggestedQuestion[];
  savedQuestions?: { id: string; question: string; answer: string }[];
  onSaveQuestion?: (messageId: string) => void;
  isProcessing?: boolean;
  reportContext?: {
    title: string;
    sections: string[];
    kpis: { name: string; value: number; unit: string }[];
  };
  className?: string;
}

const defaultSuggestions: SuggestedQuestion[] = [
  {
    id: '1',
    question: 'Quel acteur a la plus forte croissance ce trimestre ?',
    category: 'performance',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: '2',
    question: 'Compare les performances Q4 2024 vs Q4 2023',
    category: 'comparison',
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    id: '3',
    question: 'Quelles sont les tendances principales du marché ?',
    category: 'trend',
    icon: <PieChart className="w-4 h-4" />,
  },
  {
    id: '4',
    question: 'Détaille la répartition du CA par segment',
    category: 'detail',
    icon: <Table2 className="w-4 h-4" />,
  },
];

export const AIAssistant: React.FC<AIAssistantProps> = ({
  messages,
  onSendMessage,
  onFeedback,
  suggestedQuestions = defaultSuggestions,
  savedQuestions = [],
  onSaveQuestion,
  isProcessing = false,
  reportContext,
  className,
}) => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isProcessing) return;
    onSendMessage(input.trim());
    setInput('');
    setShowSuggestions(false);
  }, [input, isProcessing, onSendMessage]);

  const handleSuggestionClick = (question: string) => {
    onSendMessage(question);
    setShowSuggestions(false);
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-primary text-white' : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
        )}>
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Bot className="w-4 h-4" />
          )}
        </div>

        {/* Message content */}
        <div className={cn(
          'flex-1 max-w-[80%]',
          isUser && 'flex flex-col items-end'
        )}>
          <div className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? 'bg-primary text-white rounded-tr-none'
              : 'bg-gray-100 text-gray-900 rounded-tl-none'
          )}>
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-gray-500">Analyse en cours...</span>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Data visualization */}
                {message.type === 'chart' && message.data && (
                  <div className="mt-3 p-3 bg-white rounded-lg">
                    {/* Placeholder for chart */}
                    <div className="h-32 flex items-center justify-center text-gray-400">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                  </div>
                )}

                {message.type === 'table' && message.data && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          {Object.keys(message.data[0] || {}).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {message.data.slice(0, 5).map((row: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100">
                            {Object.values(row).map((val: any, j: number) => (
                              <td key={j} className="px-2 py-1">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200/50">
                    <p className="text-xs text-gray-500 mb-1">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.map((source, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/50 rounded text-xs text-gray-600"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {source.label}: {source.value}
                          {source.section && <span className="text-gray-400">({source.section})</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Message actions */}
          {!isUser && !message.isLoading && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-400 mr-2">
                {formatTimestamp(message.timestamp)}
              </span>
              <button
                onClick={() => handleCopy(message.content, message.id)}
                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                title="Copier"
              >
                {copiedId === message.id ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              {onSaveQuestion && (
                <button
                  onClick={() => onSaveQuestion(message.id)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                  title="Sauvegarder"
                >
                  {savedQuestions.some(q => q.id === message.id) ? (
                    <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <Bookmark className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {onFeedback && (
                <>
                  <button
                    onClick={() => onFeedback(message.id, 'positive')}
                    className={cn(
                      'p-1 hover:bg-gray-100 rounded',
                      message.feedback === 'positive' ? 'text-green-500' : 'text-gray-400 hover:text-gray-600'
                    )}
                    title="Utile"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback(message.id, 'negative')}
                    className={cn(
                      'p-1 hover:bg-gray-100 rounded',
                      message.feedback === 'negative' ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'
                    )}
                    title="Pas utile"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col',
      isExpanded ? 'fixed inset-4 z-50' : 'h-[500px]',
      className
    )}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-2xl text-gray-900">Proph3t</h3>
            <p className="text-xs text-gray-500">Posez vos questions sur le rapport</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              showHistory ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-gray-500'
            )}
            title="Historique"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Report context */}
      {reportContext && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-xs text-gray-500">
            Contexte: <span className="font-medium text-gray-700">{reportContext.title}</span>
            {' • '}{reportContext.kpis.length} KPIs • {reportContext.sections.length} sections
          </p>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h4 className="font-display text-3xl text-gray-900 mb-2">
              Proph3t
            </h4>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Je suis votre assistant IA. Posez-moi vos questions sur les données,
              les tendances, ou les comparaisons.
            </p>
          </div>
        )}

        {/* Suggested questions */}
        {showSuggestions && messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Questions suggérées
            </p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedQuestions.map(suggestion => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion.question)}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    {suggestion.icon}
                  </div>
                  <span className="text-sm text-gray-700">{suggestion.question}</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map(renderMessage)}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-gray-600">Analyse en cours...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-400 flex-shrink-0">
              <Zap className="w-3 h-3 inline mr-1" />
              Actions rapides:
            </span>
            {[
              'Résume les points clés',
              'Identifie les risques',
              'Compare avec la période précédente',
              'Génère des recommandations',
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(action)}
                className="flex-shrink-0 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Posez votre question..."
              className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none text-sm"
              rows={1}
              disabled={isProcessing}
            />
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors',
                showSuggestions ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'
              )}
              title="Suggestions"
            >
              <Lightbulb className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Appuyez sur Entrée pour envoyer • Shift+Entrée pour un saut de ligne
        </p>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-gray-200 shadow-lg flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Historique</h4>
            <button onClick={() => setShowHistory(false)}>
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {savedQuestions.length > 0 ? (
              <div className="space-y-1">
                {savedQuestions.map(q => (
                  <button
                    key={q.id}
                    onClick={() => {
                      handleSuggestionClick(q.question);
                      setShowHistory(false);
                    }}
                    className="w-full p-2 text-left hover:bg-gray-50 rounded-lg"
                  >
                    <p className="text-sm text-gray-700 truncate">{q.question}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{q.answer}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune question sauvegardée</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/30 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default AIAssistant;
