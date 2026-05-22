import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  description?: string;
  group?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface SearchableDropdownProps {
  options: Option[];
  value?: string;
  onChange: (value: string, option?: Option) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  loading?: boolean;
  error?: string;
  required?: boolean;
  label?: string;
  helperText?: string;
  className?: string;
  dropdownClassName?: string;
  optionClassName?: string;
  maxHeight?: number;
  emptyMessage?: string;
  renderOption?: (option: Option) => React.ReactNode;
  filterFunction?: (option: Option, searchTerm: string) => boolean;
  groupBy?: boolean;
  multiple?: boolean;
  selectedValues?: string[];
  onMultiChange?: (values: string[]) => void;
  closeOnSelect?: boolean;
  showSearch?: boolean;
  minSearchLength?: number;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  disabled = false,
  clearable = false,
  loading = false,
  error,
  required = false,
  label,
  helperText,
  className = '',
  dropdownClassName = '',
  optionClassName = '',
  maxHeight = 300,
  emptyMessage = 'Aucun résultat trouvé',
  renderOption,
  filterFunction,
  groupBy = false,
  multiple = false,
  selectedValues = [],
  onMultiChange,
  closeOnSelect = true,
  showSearch = true,
  minSearchLength = 0
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Gestion de la fermeture du dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus sur le champ de recherche quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Fonction de filtrage par défaut
  const defaultFilter = (option: Option, term: string): boolean => {
    if (!term || term.length < minSearchLength) return true;
    
    const searchLower = term.toLowerCase();
    const labelLower = option.label.toLowerCase();
    const valueLower = option.value.toLowerCase();
    const descLower = option.description?.toLowerCase() || '';
    
    // Recherche par début de mot
    if (labelLower.startsWith(searchLower) || valueLower.startsWith(searchLower)) {
      return true;
    }
    
    // Recherche par inclusion
    if (labelLower.includes(searchLower) || valueLower.includes(searchLower) || descLower.includes(searchLower)) {
      return true;
    }
    
    // Recherche multi-mots clés
    const keywords = searchLower.split(' ').filter(k => k.length > 0);
    return keywords.every(keyword => 
      labelLower.includes(keyword) || valueLower.includes(keyword) || descLower.includes(keyword)
    );
  };

  const filter = filterFunction || defaultFilter;

  // Filtrage des options
  const filteredOptions = options.filter(option => filter(option, searchTerm));

  // Groupage des options si nécessaire
  const groupedOptions = groupBy ? filteredOptions.reduce((groups, option) => {
    const group = option.group || 'Sans groupe';
    if (!groups[group]) groups[group] = [];
    groups[group].push(option);
    return groups;
  }, {} as Record<string, Option[]>) : { '': filteredOptions };

  // Obtenir l'option sélectionnée
  const selectedOption = options.find(opt => opt.value === value);

  // Gestion de la sélection
  const handleSelect = (option: Option) => {
    if (option.disabled) return;

    if (multiple) {
      const newValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      onMultiChange?.(newValues);
      if (!closeOnSelect) return;
    } else {
      onChange(option.value, option);
    }

    if (closeOnSelect) {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Gestion du clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Effacer la sélection
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiple) {
      onMultiChange?.([]);
    } else {
      onChange('', undefined);
    }
  };

  // Rendu de l'option par défaut
  const defaultRenderOption = (option: Option) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {option.icon && <span>{option.icon}</span>}
        <div>
          <div className="font-medium">{option.label}</div>
          {option.description && (
            <div className="text-xs text-gray-700">{option.description}</div>
          )}
        </div>
      </div>
      {multiple && selectedValues.includes(option.value) && (
        <span className="text-blue-600">✓</span>
      )}
    </div>
  );

  const render = renderOption || defaultRenderOption;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div
        className={`
          relative w-full px-3 py-2 border rounded-lg cursor-pointer
          flex items-center justify-between
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-400'}
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        ref={inputRef}
      >
        <div className="flex-1 truncate">
          {multiple ? (
            selectedValues.length > 0 ? `${selectedValues.length} sélectionné(s)` : placeholder
          ) : (
            selectedOption ? selectedOption.label : placeholder
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {clearable && (value || (multiple && selectedValues.length > 0)) && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded"
              tabIndex={-1} aria-label="Fermer">
              <X className="w-4 h-4 text-gray-700" />
            </button>
          )}
          {loading ? (
            <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-sm text-gray-700">{helperText}</p>}

      {isOpen && (
        <div
          className={`
            absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg
            ${dropdownClassName}
          `}
          style={{ maxHeight: `${maxHeight}px`, overflowY: 'auto' }}
        >
          {showSearch && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
              </div>
            </div>
          )}

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-gray-700 text-center">{emptyMessage}</div>
            ) : (
              Object.entries(groupedOptions).map(([group, groupOptions]) => (
                <div key={group}>
                  {group && groupBy && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {group}
                    </div>
                  )}
                  {groupOptions.map((option, index) => {
                    const globalIndex = filteredOptions.indexOf(option);
                    return (
                      <div
                        key={option.value}
                        className={`
                          px-3 py-2 cursor-pointer
                          ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
                          ${globalIndex === highlightedIndex ? 'bg-blue-50' : ''}
                          ${(multiple ? selectedValues.includes(option.value) : value === option.value) ? 'bg-blue-50' : ''}
                          ${optionClassName}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(option);
                        }}
                        onMouseEnter={() => setHighlightedIndex(globalIndex)}
                      >
                        {render(option)}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;

// Export des types pour utilisation externe
export type { Option, SearchableDropdownProps };