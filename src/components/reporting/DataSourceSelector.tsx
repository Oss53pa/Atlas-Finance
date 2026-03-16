/**
 * DataSourceSelector - Composant de sélection multi-sources de données
 * Permet de sélectionner plusieurs sources de données pour créer un rapport
 */

import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  Database,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  X,
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Table2,
  Layers,
  Link2,
  AlertCircle,
} from 'lucide-react';

// Types
export interface DataSource {
  id: string;
  name: string;
  type: 'grand-livre' | 'balance' | 'import' | 'api';
  category: string;
  importNumber?: string;
  version?: string;
  period?: string;
  rowCount?: number;
  lastUpdated: string;
  status: 'available' | 'processing' | 'error';
  icon?: React.ElementType;
}

interface DataSourceSelectorProps {
  selectedSources: string[];
  onSelectionChange: (sources: string[]) => void;
  maxSources?: number;
  requiredTypes?: ('grand-livre' | 'balance')[];
}

// Mock data sources
const DEFAULT_DATA_SOURCES: DataSource[] = [
  // Données comptables
  {
    id: 'gl-2024',
    name: 'Grand Livre 2024',
    type: 'grand-livre',
    category: 'Comptabilité',
    importNumber: 'IMP-2024-00089',
    version: 'v2.1',
    period: 'Exercice 2024',
    rowCount: 1245,
    lastUpdated: '2024-12-28',
    status: 'available',
    icon: FileText,
  },
  {
    id: 'bal-2024',
    name: 'Balance Générale 2024',
    type: 'balance',
    category: 'Comptabilité',
    importNumber: 'IMP-2024-00090',
    version: 'v2.1',
    period: 'Exercice 2024',
    rowCount: 156,
    lastUpdated: '2024-12-28',
    status: 'available',
    icon: Table2,
  },
  {
    id: 'gl-2023',
    name: 'Grand Livre 2023',
    type: 'grand-livre',
    category: 'Comptabilité',
    importNumber: 'IMP-2023-00456',
    version: 'v3.0',
    period: 'Exercice 2023',
    rowCount: 1189,
    lastUpdated: '2024-01-15',
    status: 'available',
    icon: FileText,
  },
  {
    id: 'bal-2023',
    name: 'Balance Générale 2023',
    type: 'balance',
    category: 'Comptabilité',
    importNumber: 'IMP-2023-00457',
    version: 'v3.0',
    period: 'Exercice 2023',
    rowCount: 148,
    lastUpdated: '2024-01-15',
    status: 'available',
    icon: Table2,
  },
  // Données importées
  {
    id: 'ventes-q4-2024',
    name: 'Ventes Q4 2024',
    type: 'import',
    category: 'Commercial',
    importNumber: 'IMP-2024-00125',
    version: 'v1.0',
    period: 'Oct - Déc 2024',
    rowCount: 45000,
    lastUpdated: '2024-12-20',
    status: 'available',
    icon: BarChart3,
  },
  {
    id: 'clients-2024',
    name: 'Base Clients 2024',
    type: 'import',
    category: 'Commercial',
    importNumber: 'IMP-2024-00098',
    version: 'v2.3',
    period: 'Année 2024',
    rowCount: 15000,
    lastUpdated: '2024-12-15',
    status: 'available',
    icon: Users,
  },
  {
    id: 'budget-2025',
    name: 'Budget Prévisionnel 2025',
    type: 'import',
    category: 'Finance',
    importNumber: 'IMP-2024-00142',
    version: 'v1.0',
    period: '2025',
    rowCount: 320,
    lastUpdated: '2024-12-22',
    status: 'available',
    icon: FileSpreadsheet,
  },
];

// Catégories
const CATEGORIES = ['Tous', 'Comptabilité', 'Commercial', 'Finance', 'RH'];

const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  selectedSources,
  onSelectionChange,
  maxSources = 10,
  requiredTypes = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Filter sources
  const filteredSources = DEFAULT_DATA_SOURCES.filter(source => {
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.importNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || source.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Check if required types are selected
  const missingRequiredTypes = requiredTypes.filter(
    type => !selectedSources.some(id =>
      DEFAULT_DATA_SOURCES.find(s => s.id === id)?.type === type
    )
  );

  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onSelectionChange(selectedSources.filter(id => id !== sourceId));
    } else if (selectedSources.length < maxSources) {
      onSelectionChange([...selectedSources, sourceId]);
    }
  };

  const getSelectedSourcesInfo = () => {
    return selectedSources.map(id => DEFAULT_DATA_SOURCES.find(s => s.id === id)).filter(Boolean) as DataSource[];
  };

  const getTypeLabel = (type: DataSource['type']) => {
    switch (type) {
      case 'grand-livre': return 'Grand Livre';
      case 'balance': return 'Balance';
      case 'import': return 'Import';
      case 'api': return 'API';
      default: return type;
    }
  };

  const getTypeColor = (type: DataSource['type']) => {
    switch (type) {
      case 'grand-livre': return 'bg-blue-100 text-blue-700';
      case 'balance': return 'bg-primary-100 text-primary-700';
      case 'import': return 'bg-amber-100 text-amber-700';
      case 'api': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with selected count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Sources de données</h3>
          <span className="text-sm text-gray-500">
            ({selectedSources.length}/{maxSources} sélectionnées)
          </span>
        </div>
      </div>

      {/* Required types warning */}
      {missingRequiredTypes.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Sources requises manquantes</p>
            <p className="text-amber-600">
              Veuillez sélectionner : {missingRequiredTypes.map(getTypeLabel).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Selected sources preview */}
      {selectedSources.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Sources sélectionnées :</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {getSelectedSourcesInfo().map(source => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-blue-200"
              >
                {source.icon && <source.icon className="w-4 h-4 text-blue-600" />}
                <span className="text-sm font-medium text-gray-900">{source.name}</span>
                <button
                  onClick={() => toggleSource(source.id)}
                  className="p-0.5 hover:bg-blue-100 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une source..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Data sources list */}
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {filteredSources.map(source => {
          const isSelected = selectedSources.includes(source.id);
          const isExpanded = expandedSource === source.id;
          const Icon = source.icon || Database;

          return (
            <div key={source.id} className="bg-white">
              <div
                className={cn(
                  'flex items-center gap-3 p-3 cursor-pointer transition-colors',
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                )}
                onClick={() => toggleSource(source.id)}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                </div>

                {/* Icon */}
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  getTypeColor(source.type)
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{source.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full', getTypeColor(source.type))}>
                      {getTypeLabel(source.type)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{source.importNumber}</span>
                    <span>•</span>
                    <span>{source.version}</span>
                    <span>•</span>
                    <span>{source.period}</span>
                  </div>
                </div>

                {/* Expand button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedSource(isExpanded ? null : source.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-12 pb-3 text-sm space-y-2 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-gray-500">Lignes :</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {source.rowCount?.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Catégorie :</span>
                      <span className="ml-2 font-medium text-gray-900">{source.category}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Dernière MAJ :</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {new Date(source.lastUpdated).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Statut :</span>
                      <span className={cn(
                        'ml-2 font-medium',
                        source.status === 'available' ? 'text-green-600' :
                        source.status === 'error' ? 'text-red-600' : 'text-amber-600'
                      )}>
                        {source.status === 'available' ? 'Disponible' :
                         source.status === 'error' ? 'Erreur' : 'En cours'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredSources.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune source de données trouvée</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedSources.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span>
              <strong>{selectedSources.length}</strong> source{selectedSources.length > 1 ? 's' : ''} sélectionnée{selectedSources.length > 1 ? 's' : ''}
              {' - '}
              <strong>
                {getSelectedSourcesInfo().reduce((sum, s) => sum + (s.rowCount || 0), 0).toLocaleString('fr-FR')}
              </strong> lignes au total
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceSelector;
export { DEFAULT_DATA_SOURCES };
