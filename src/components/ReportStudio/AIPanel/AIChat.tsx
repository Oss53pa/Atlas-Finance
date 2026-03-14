import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ChatMessage } from '@/types/reportStudio';

interface AIChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSubmit: (message: string) => void;
  onAction: (action: { type: string; data: any }) => void;
  suggestedQueries: string[];
}

export const AIChat: React.FC<AIChatProps> = ({
  messages,
  isLoading,
  onSubmit,
  onAction,
  suggestedQueries,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit(input.trim());
      setInput('');
    }
  };

  const handleSuggestionClick = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-64">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 mb-3">
              Posez une question sur le rapport ou demandez de l&apos;aide pour l&apos;édition.
            </p>
            <div className="space-y-2">
              {suggestedQueries.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(query)}
                  className="w-full px-3 py-2 text-xs text-left text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                  {/* Action buttons for assistant messages */}
                  {message.role === 'assistant' && message.actions && (
                    <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => onAction(action)}
                          className="px-2 py-1 text-xs bg-white text-primary rounded hover:bg-gray-50 transition-colors"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <p className={cn(
                    'text-xs mt-1',
                    message.role === 'user' ? 'text-primary-100' : 'text-gray-400'
                  )}>
                    {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question..."
          disabled={isLoading}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            'px-3 py-2 rounded-lg transition-colors',
            input.trim() && !isLoading
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};
