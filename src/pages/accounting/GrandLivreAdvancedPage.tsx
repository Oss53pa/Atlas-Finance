import React, { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon,
  StarIcon,
  ClockIcon,
  ViewColumnsIcon,
  TableCellsIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import IntelligentSearchBar from '../../components/grand-livre/IntelligentSearchBar';
import NavigationViews from '../../components/grand-livre/NavigationViews';
import LedgerEntryDetails from '../../components/grand-livre/LedgerEntryDetails';
import AdvancedFilters from '../../components/grand-livre/AdvancedFilters';
import CollaborativeAnnotations from '../../components/grand-livre/CollaborativeAnnotations';
import ExportTemplates from '../../components/grand-livre/ExportTemplates';
import AIAnalysisPanel from '../../components/grand-livre/AIAnalysisPanel';

interface LedgerEntry {
  id: string;
  account_number: string;
  account_label: string;
  account_class: string;
  entry_date: string;
  debit_amount: string;
  credit_amount: string;
  absolute_amount: string;
  journal_code: string;
  document_reference: string;
  sequence_number: number;
  currency_code: string;
  tags: string[];
  access_count: number;
  last_accessed: string | null;
  searchable_text?: string;
}

interface SearchResult {
  entries: LedgerEntry[];
  total_count: number;
  response_time_ms: number;
  suggestions: string[];
  aggregations: Record<string, any>;
  confidence_score: number;
  query_explanation?: string;
}

type ViewMode = 'table' | 'timeline' | 'hierarchy' | 'analytics' | 'kanban' | 'heatmap';

const GrandLivreAdvancedPage: React.FC = () => {
  // État principal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  // Filtres et paramètres
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    account_classes: [] as string[],
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
    journal_codes: [] as string[],
    tags: [] as string[]
  });

  // Fonctionnalités collaboratives
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);

  // Performance et UX
  const [lastSearchTime, setLastSearchTime] = useState<number>(0);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Recherche intelligente avec debouncing
  const performSearch = useCallback(async (query: string, searchFilters = filters) => {
    if (!query.trim() && Object.values(searchFilters).every(v => !v || (Array.isArray(v) && v.length === 0))) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();

    try {
      // Simulation d'appel API - à remplacer par l'API réelle
      await new Promise(resolve => setTimeout(resolve, 300)); // Simule temps de recherche

      // Données simulées conformes à la structure backend
      const mockResults: SearchResult = {
        entries: [
          {
            id: '1',
            account_number: '512000',
            account_label: 'Banque Principale BCEAO',
            account_class: '5',
            entry_date: '2024-01-15',
            debit_amount: '500000',
            credit_amount: '0',
            absolute_amount: '500000',
            journal_code: 'BQ',
            document_reference: 'VIR-2024-001',
            sequence_number: 1,
            currency_code: 'XOF',
            tags: ['virement', 'banque'],
            access_count: 5,
            last_accessed: '2024-01-20T10:30:00Z',
            searchable_text: 'virement fournisseur prestation services'
          },
          {
            id: '2',
            account_number: '401100',
            account_label: 'Fournisseurs - Factures non parvenues',
            account_class: '4',
            entry_date: '2024-01-15',
            debit_amount: '0',
            credit_amount: '125000',
            absolute_amount: '125000',
            journal_code: 'AC',
            document_reference: 'FACT-2024-045',
            sequence_number: 2,
            currency_code: 'XOF',
            tags: ['facture', 'fournisseur'],
            access_count: 2,
            last_accessed: '2024-01-18T14:15:00Z',
            searchable_text: 'facture fournisseur prestation maintenance'
          },
          {
            id: '3',
            account_number: '606200',
            account_label: 'Services extérieurs - Maintenance',
            account_class: '6',
            entry_date: '2024-01-15',
            debit_amount: '125000',
            credit_amount: '0',
            absolute_amount: '125000',
            journal_code: 'AC',
            document_reference: 'FACT-2024-045',
            sequence_number: 3,
            currency_code: 'XOF',
            tags: ['charge', 'maintenance'],
            access_count: 1,
            last_accessed: null,
            searchable_text: 'maintenance equipement informatique'
          }
        ],
        total_count: 1247,
        response_time_ms: Math.round(performance.now() - startTime),
        suggestions: ['banque principale', 'virement fournisseur', '512000'],
        aggregations: {
          total_debit: '625000',
          total_credit: '125000',
          class_distribution: [
            { account_class: '5', count: 1, total_amount: '500000' },
            { account_class: '4', count: 1, total_amount: '125000' },
            { account_class: '6', count: 1, total_amount: '125000' }
          ]
        },
        confidence_score: 0.92
      };

      setSearchResults(mockResults);
      setLastSearchTime(mockResults.response_time_ms);

      // Mise à jour historique
      if (query.trim() && !searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 9)]);
      }

    } catch (error) {
      console.error('Erreur de recherche:', error);
      setSearchResults(null);
    } finally {
      setIsSearching(false);
    }
  }, [filters, searchHistory]);

  // Recherche avec debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  // Formatage des montants
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Rendu des résultats selon la vue
  const renderSearchResults = () => {
    if (!searchResults) return null;

    switch (viewMode) {
      case 'table':
        return renderTableView();
      case 'timeline':
      case 'hierarchy':
      case 'analytics':
      case 'kanban':
      case 'heatmap':
        return <NavigationViews viewMode={viewMode} searchResults={searchResults} />;
      default:
        return renderTableView();
    }
  };

  const renderTableView = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* En-tête avec stats */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{searchResults!.total_count.toLocaleString()}</span> écritures trouvées
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-green-600">{lastSearchTime}ms</span> temps de réponse
            </div>
            <div className="text-sm text-gray-600">
              Confiance: <span className="font-medium text-blue-600">{(searchResults!.confidence_score * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={`p-2 rounded-md border ${showAnnotations ? 'bg-blue-50 border-blue-300' : 'border-gray-300'} hover:bg-gray-50`}
              title="Annotations collaboratives"
            >
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowAIAnalysis(!showAIAnalysis)}
              className={`p-2 rounded-md border ${showAIAnalysis ? 'bg-purple-50 border-purple-300' : 'border-gray-300'} hover:bg-gray-50`}
              title="Analyse IA"
            >
              <SparklesIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Agrégations rapides */}
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-3 rounded">
            <div className="text-xs text-green-600">Total Débits</div>
            <div className="font-semibold text-green-900">{formatAmount(searchResults!.aggregations.total_debit)}</div>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-xs text-red-600">Total Crédits</div>
            <div className="font-semibold text-red-900">{formatAmount(searchResults!.aggregations.total_credit)}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-xs text-blue-600">Solde Net</div>
            <div className="font-semibold text-blue-900">
              {formatAmount(parseFloat(searchResults!.aggregations.total_debit) - parseFloat(searchResults!.aggregations.total_credit))}
            </div>
          </div>
        </div>
      </div>

      {/* Table des résultats */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Compte
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Libellé
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Débit
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Crédit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Journal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Référence
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchResults!.entries.map((entry, index) => (
              <tr
                key={entry.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 bg-${getClassColor(entry.account_class)}-500`}></div>
                    <span className="text-sm font-medium text-gray-900">{entry.account_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{entry.account_label}</div>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {parseFloat(entry.debit_amount) > 0 ? (
                    <span className="text-green-600 font-medium">{formatAmount(entry.debit_amount)}</span>
                  ) : (
                    <span className="text-gray-700">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  {parseFloat(entry.credit_amount) > 0 ? (
                    <span className="text-red-600 font-medium">{formatAmount(entry.credit_amount)}</span>
                  ) : (
                    <span className="text-gray-700">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {entry.journal_code}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {entry.document_reference}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEntry(entry);
                      }}
                      className="p-1 text-gray-700 hover:text-blue-600"
                      title="Voir détails"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAnnotations(true);
                        setSelectedEntry(entry);
                      }}
                      className="p-1 text-gray-700 hover:text-yellow-600"
                      title="Annoter"
                    >
                      <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${entry.account_number} - ${entry.account_label}`);
                        alert('Copié dans le presse-papiers');
                      }}
                      className="p-1 text-gray-700 hover:text-green-600"
                      title="Partager"
                    >
                      <ShareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-3 border-t bg-gray-50">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Affichage de 1 à {Math.min(50, searchResults!.total_count)} sur {searchResults!.total_count} résultats
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => console.log('Page précédente')}
              disabled
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">1</span>
            <button
              onClick={() => console.log('Page suivante')}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const getClassColor = (accountClass: string) => {
    const colors = {
      '1': 'blue',
      '2': 'green',
      '3': 'yellow',
      '4': 'purple',
      '5': 'indigo',
      '6': 'red',
      '7': 'pink',
      '8': 'gray'
    };
    return colors[accountClass as keyof typeof colors] || 'gray';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BookOpenIcon className="h-8 w-8 mr-3 text-blue-600" />
                Grand Livre Avancé
              </h1>
              <p className="mt-2 text-gray-600">
                Consultation détaillée - Conforme SYSCOHADA - Performance temps réel
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center space-x-2 px-4 py-2 border rounded-md ${
                  showAdvancedFilters ? 'bg-blue-50 border-blue-300' : 'border-gray-300'
                } hover:bg-gray-50`}
              >
                <FunnelIcon className="h-4 w-4" />
                <span>Filtres Avancés</span>
              </button>

              <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche intelligente */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <IntelligentSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={performSearch}
          isSearching={isSearching}
          suggestions={searchResults?.suggestions || []}
          searchHistory={searchHistory}
          placeholder="Recherchez par compte, montant, date, libellé... (ex: 512000, virement > 100000, janvier 2024)"
        />

        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <div className="mt-4">
            <AdvancedFilters
              filters={filters}
              onChange={setFilters}
              onApply={() => performSearch(searchQuery, filters)}
            />
          </div>
        )}

        {/* Sélecteur de vue */}
        <div className="mt-6 flex justify-between items-center">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { mode: 'table', icon: TableCellsIcon, label: 'Tableau' },
              { mode: 'timeline', icon: ClockIcon, label: 'Chronologique' },
              { mode: 'hierarchy', icon: ChartBarIcon, label: 'Hiérarchique' },
              { mode: 'analytics', icon: ChartBarIcon, label: 'Analytique' },
              { mode: 'kanban', icon: ViewColumnsIcon, label: 'Kanban' },
              { mode: 'heatmap', icon: AdjustmentsHorizontalIcon, label: 'Heatmap' }
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as ViewMode)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md ${
                  viewMode === mode
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {searchResults && (
            <div className="flex items-center space-x-4 text-sm text-gray-700">
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-4 w-4" />
                <span>{lastSearchTime}ms</span>
              </div>
              <div className="flex items-center space-x-1">
                <SparklesIcon className="h-4 w-4" />
                <span>IA: {(searchResults.confidence_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions de recherche */}
        {searchResults?.suggestions && searchResults.suggestions.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <SparklesIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Suggestions intelligentes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchResults.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-3 py-1 text-sm bg-white border border-blue-300 text-blue-700 rounded-full hover:bg-blue-100"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex gap-6">
          {/* Résultats principaux */}
          <div className={`flex-1 ${showAnnotations || showAIAnalysis ? 'lg:w-2/3' : ''}`}>
            {isSearching ? (
              <div className="bg-white rounded-lg border p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Recherche en cours...</p>
                <p className="text-xs text-gray-700 mt-1">Analyse intelligente des {searchQuery ? '2,500,000+' : '0'} écritures</p>
              </div>
            ) : searchResults ? (
              renderSearchResults()
            ) : (
              <div className="bg-white rounded-lg border p-12 text-center">
                <BookOpenIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Grand Livre Nouvelle Génération</h3>
                <p className="text-gray-600 mb-6">
                  Recherchez dans plus de 2,5 millions d'écritures avec une performance sub-seconde
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-sm text-gray-700">
                  <div className="flex items-center space-x-2">
                    <MagnifyingGlassIcon className="h-4 w-4 text-blue-500" />
                    <span>Recherche intelligente</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="h-4 w-4 text-purple-500" />
                    <span>IA intégrée</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-green-500" />
                    <span>Collaboration</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ChartBarIcon className="h-4 w-4 text-orange-500" />
                    <span>Analytics avancés</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Panneaux latéraux */}
          {(showAnnotations || showAIAnalysis) && (
            <div className="w-1/3 space-y-6">
              {showAnnotations && selectedEntry && (
                <CollaborativeAnnotations entry={selectedEntry} />
              )}

              {showAIAnalysis && searchResults && (
                <AIAnalysisPanel searchResults={searchResults} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal détails écriture */}
      {selectedEntry && (
        <LedgerEntryDetails
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
};

export default GrandLivreAdvancedPage;