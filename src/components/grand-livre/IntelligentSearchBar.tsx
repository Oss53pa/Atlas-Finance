import React, { useState, useRef, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  MicrophoneIcon,
  SparklesIcon,
  ClockIcon,
  XMarkIcon,
  ArrowRightIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

interface IntelligentSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  isSearching: boolean;
  suggestions: string[];
  searchHistory: string[];
  placeholder?: string;
}

const IntelligentSearchBar: React.FC<IntelligentSearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isSearching,
  suggestions,
  searchHistory,
  placeholder = "Recherche intelligente..."
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Combinaison suggestions + historique
  const allSuggestions = [
    ...suggestions,
    ...searchHistory.filter(h => h.toLowerCase().includes(value.toLowerCase()) && !suggestions.includes(h))
  ].slice(0, 8);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === 'Enter') {
        onSearch(value);
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev =>
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev =>
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestionIndex >= 0) {
          selectSuggestion(allSuggestions[activeSuggestionIndex]);
        } else {
          onSearch(value);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        break;
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    onSearch(suggestion);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const handleVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Recherche vocale non supportée par ce navigateur');
      return;
    }

    try {
      setIsVoiceRecording(true);

      // Configuration de la reconnaissance vocale
      const SpeechRecognition = (window as unknown as Record<string, unknown>).webkitSpeechRecognition || (window as unknown as Record<string, unknown>).SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onresult = (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
        const transcript = event.results[0][0].transcript;
        onChange(transcript);
        onSearch(transcript);
        setIsVoiceRecording(false);
      };

      recognition.onerror = () => {
        setIsVoiceRecording(false);
      };

      recognition.onend = () => {
        setIsVoiceRecording(false);
      };

      recognition.start();

    } catch (error) {
      console.error('Erreur reconnaissance vocale:', error);
      setIsVoiceRecording(false);
    }
  };

  const renderSuggestionItem = (suggestion: string, index: number, isFromHistory: boolean) => (
    <div
      key={`${suggestion}-${index}`}
      onClick={() => selectSuggestion(suggestion)}
      className={`px-4 py-3 cursor-pointer flex items-center justify-between group ${
        index === activeSuggestionIndex ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center space-x-3">
        {isFromHistory ? (
          <ClockIcon className="h-4 w-4 text-gray-700" />
        ) : (
          <SparklesIcon className="h-4 w-4 text-blue-500" />
        )}
        <span className="text-gray-900">{suggestion}</span>
        {isFromHistory && (
          <span className="text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
            Historique
          </span>
        )}
      </div>
      <ArrowRightIcon className={`h-4 w-4 text-gray-300 group-hover:text-gray-700 ${
        index === activeSuggestionIndex ? 'text-blue-500' : ''
      }`} />
    </div>
  );

  return (
    <div className="relative">
      {/* Barre de recherche principale */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isSearching ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          ) : (
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-700" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
            setActiveSuggestionIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          className="w-full pl-12 pr-20 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors"
          placeholder={placeholder}
          autoComplete="off"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
          {/* Bouton recherche vocale */}
          <button
            onClick={handleVoiceSearch}
            className={`p-2 rounded-lg transition-colors ${
              isVoiceRecording
                ? 'bg-red-100 text-red-600 animate-pulse'
                : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
            }`}
            title="Recherche vocale"
          >
            <MicrophoneIcon className="h-5 w-5" />
          </button>

          {/* Bouton effacer */}
          {value && (
            <button
              onClick={() => {
                onChange('');
                setShowSuggestions(false);
                inputRef.current?.focus();
              }}
              className="p-2 text-gray-700 hover:text-gray-600 rounded-lg hover:bg-gray-50"
              title="Effacer"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Raccourcis clavier */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-700">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <CommandLineIcon className="h-3 w-3" />
            <span>Raccourcis: Ctrl+K (focus), ↑↓ (navigation), Enter (recherche)</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span>Recherche temps réel activée</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Panneau de suggestions */}
      {showSuggestions && (value.length > 0 || allSuggestions.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-96 overflow-hidden"
        >
          {/* En-tête du panneau */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900">
                  Suggestions Intelligentes
                </span>
              </div>
              <div className="text-xs text-gray-700">
                {allSuggestions.length} suggestion(s)
              </div>
            </div>
          </div>

          {/* Liste des suggestions */}
          <div className="max-h-64 overflow-y-auto">
            {allSuggestions.length > 0 ? (
              allSuggestions.map((suggestion, index) => {
                const isFromHistory = searchHistory.includes(suggestion);
                return renderSuggestionItem(suggestion, index, isFromHistory);
              })
            ) : value.length > 0 ? (
              <div className="px-4 py-6 text-center text-gray-700">
                <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune suggestion disponible</p>
                <p className="text-xs text-gray-700 mt-1">
                  Appuyez sur Entrée pour rechercher "{value}"
                </p>
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <h4 className="font-medium mb-2">Exemples de recherche :</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• 512000 (numéro de compte)</li>
                      <li>• banque &gt; 100000 (montant)</li>
                      <li>• janvier 2024 (période)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Recherche avancée :</h4>
                    <ul className="space-y-1 text-gray-700">
                      <li>• "facture client" (exact)</li>
                      <li>• virement OR chèque (OU)</li>
                      <li>• tag:urgent (par tag)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pied du panneau */}
          <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-700">
            <div className="flex justify-between items-center">
              <span>💡 La recherche IA s'améliore avec vos habitudes</span>
              <div className="flex items-center space-x-2">
                <span>Performance:</span>
                <span className="text-green-600 font-medium">⚡ &lt; 1s</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exemples de recherche (si pas de saisie) */}
      {!value && !showSuggestions && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { query: "512000", label: "Compte banque", icon: "🏦" },
            { query: "virement > 500000", label: "Virements importants", icon: "💰" },
            { query: "janvier 2024", label: "Période spécifique", icon: "📅" }
          ].map((example, index) => (
            <button
              key={index}
              onClick={() => {
                onChange(example.query);
                onSearch(example.query);
              }}
              className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
            >
              <span className="text-xl">{example.icon}</span>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                  {example.label}
                </div>
                <div className="text-xs text-gray-700 font-mono">
                  {example.query}
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-500 ml-auto" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default IntelligentSearchBar;