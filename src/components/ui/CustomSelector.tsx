import React, { useState, useEffect } from 'react';

interface CustomSelectorOption {
  id: number;
  value: number;
  label: string;
}

interface CustomSelectorProps {
  optionsInitial: CustomSelectorOption[];
  className?: string;
  onSelect: (selectedValue: number) => void;
  loading?: boolean;
  defaultSelectedValue?: string | number;
  placeholder?: string;
}

export const CustomSelector: React.FC<CustomSelectorProps> = ({
  optionsInitial,
  className = '',
  onSelect,
  loading = false,
  defaultSelectedValue,
  placeholder = "Sélectionner une option..."
}) => {
  const [selectedValue, setSelectedValue] = useState<string | number>(defaultSelectedValue || '');
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = optionsInitial.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option: CustomSelectorOption) => {
    setSelectedValue(option.value);
    onSelect(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = optionsInitial.find(option => option.value == selectedValue);

  if (loading) {
    return (
      <div className={`form-select ${className}`} style={{ opacity: 0.7 }}>
        <span>Chargement...</span>
      </div>
    );
  }

  return (
    <div className={`dropdown ${className}`}>
      <button
        className="btn btn-outline-secondary dropdown-toggle w-100 text-start"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ textAlign: 'left' }}
      >
        {selectedOption ? selectedOption.label : placeholder}
      </button>

      {isOpen && (
        <div className="dropdown-menu show w-100" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <div className="px-2 mb-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filteredOptions.length === 0 ? (
            <div className="dropdown-item-text text-muted">Aucune option trouvée</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                className={`dropdown-item ${selectedValue == option.value ? 'active' : ''}`}
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};