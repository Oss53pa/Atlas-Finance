import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Building2, TrendingDown, TrendingUp, DollarSign } from 'lucide-react';
import { PlanComptableService, CompteComptable } from '../../data/planComptable';

interface CompteComptableSearchProps {
  value?: {
    code: string;
    libelle: string;
  };
  onChange: (compte: { code: string; libelle: string }) => void;
  placeholder?: string;
  searchMode?: 'code' | 'libelle' | 'both';
  className?: string;
  disabled?: boolean;
}

const CompteComptableSearch: React.FC<CompteComptableSearchProps> = ({
  value = { code: '', libelle: '' },
  onChange,
  placeholder = "Rechercher un compte...",
  searchMode = 'both',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<CompteComptable[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [inputMode, setInputMode] = useState<'code' | 'libelle'>('code');

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Rechercher les comptes
  useEffect(() => {
    if (searchQuery.length >= 1) {
      const results = PlanComptableService.searchComptes(searchQuery, 8);
      setSuggestions(results);
      setSelectedIndex(-1);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [searchQuery]);

  // Navigation clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectCompte(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectCompte = (compte: CompteComptable) => {
    onChange({
      code: compte.code,
      libelle: compte.libelle
    });
    setSearchQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (newValue: string) => {
    setSearchQuery(newValue);

    // Si l'utilisateur tape un code de compte exact, remplir automatiquement
    const compteExact = PlanComptableService.getCompteByCode(newValue);
    if (compteExact) {
      onChange({
        code: compteExact.code,
        libelle: compteExact.libelle
      });
    } else {
      // Mise à jour en direct du champ
      if (inputMode === 'code') {
        onChange({
          code: newValue,
          libelle: value.libelle
        });
      } else {
        onChange({
          code: value.code,
          libelle: newValue
        });
      }
    }
  };

  const getCategoryIcon = (categorie: string) => {
    if (categorie.includes('Immobilisation')) return <Building2 className="w-4 h-4 text-blue-500" />;
    if (categorie.includes('Amortissement')) return <TrendingDown className="w-4 h-4 text-orange-500" />;
    if (categorie.includes('Ventes') || categorie.includes('Produits')) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <DollarSign className="w-4 h-4 text-gray-700" />;
  };

  const displayValue = inputMode === 'code' ? value.code : value.libelle;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="flex">
          {/* Champ principal */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery || displayValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (searchQuery === '' && displayValue) {
                  setSearchQuery(displayValue);
                }
                setIsOpen(suggestions.length > 0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className="w-full px-3 py-2 pr-8 border border-[#d4d4d4] rounded-md focus:ring-2 focus:ring-[#171717]/20 focus:border-[#171717] text-sm"
            />
            <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
          </div>

          {/* Bouton de basculement mode */}
          {searchMode === 'both' && (
            <button
              type="button"
              onClick={() => {
                const newMode = inputMode === 'code' ? 'libelle' : 'code';
                setInputMode(newMode);
                setSearchQuery('');
              }}
              className="ml-2 px-3 py-2 bg-[#171717]/10 text-[#171717] border border-[#171717]/30 rounded-md hover:bg-[#171717]/20 transition-colors text-xs font-medium"
            >
              {inputMode === 'code' ? 'Code' : 'Libellé'}
              <ChevronDown className="w-3 h-3 ml-1 inline" />
            </button>
          )}
        </div>

        {/* Affichage de la correspondance */}
        {value.code && value.libelle && !searchQuery && (
          <div className="mt-1 text-xs text-[var(--color-text-secondary)] bg-gray-50 px-2 py-1 rounded">
            <span className="font-mono font-semibold">{value.code}</span> - {value.libelle}
          </div>
        )}
      </div>

      {/* Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {suggestions.map((compte, index) => (
            <div
              key={compte.code}
              onClick={() => selectCompte(compte)}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-blue-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(compte.categorie)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm font-semibold text-[#171717]">
                        {compte.code}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {compte.nature}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mt-0.5">
                      {compte.libelle}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-700 mt-1">
                {compte.categorie}
                {compte.keywords && compte.keywords.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    • {compte.keywords.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompteComptableSearch;