import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSearch, CheckCircle, AlertTriangle, Clock, Filter,
  Download, Eye, ChevronRight, X, FileText, User,
  Calendar, MessageSquare, Edit, Trash2, Plus, Search,
  AlertCircle, CheckSquare, XCircle, Flag, RefreshCw
} from 'lucide-react';

interface RevisionItem {
  id: string;
  compte: string;
  libelleCompte: string;
  type: 'anomalie' | 'correction' | 'ajustement' | 'regularisation';
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  montant: number;
  impact: string;
  description: string;
  dateDetection: string;
  dateEcheance?: string;
  responsable?: string;
  commentaires?: string[];
  documents?: string[];
}

const RevisionsModule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('en-cours');
  const [filterType, setFilterType] = useState('tous');
  const [filterPriorite, setFilterPriorite] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Données de révision
  const [revisions] = useState<RevisionItem[]>([
    {
      id: 'REV-001',
      compte: '401001',
      libelleCompte: 'Fournisseur ABC',
      type: 'anomalie',
      statut: 'en_cours',
      priorite: 'haute',
      montant: 45000,
      impact: 'Impact sur le résultat net',
      description: 'Écart de rapprochement fournisseur non justifié',
      dateDetection: '2025-09-15',
      dateEcheance: '2025-09-25',
      responsable: 'Marie Dupont',
      commentaires: [
        'Facture en attente de réception',
        'Contact fournisseur en cours'
      ],
      documents: ['Releve_fournisseur.pdf']
    },
    {
      id: 'REV-002',
      compte: '512001',
      libelleCompte: 'Banque Principale',
      type: 'correction',
      statut: 'valide',
      priorite: 'moyenne',
      montant: 12500,
      impact: 'Trésorerie',
      description: 'Correction des frais bancaires mal comptabilisés',
      dateDetection: '2025-09-10',
      responsable: 'Jean Martin',
      commentaires: ['Correction effectuée'],
      documents: ['Releve_bancaire_09.pdf']
    },
    {
      id: 'REV-003',
      compte: '607001',
      libelleCompte: 'Achats marchandises',
      type: 'ajustement',
      statut: 'en_attente',
      priorite: 'critique',
      montant: 125000,
      impact: 'Marge commerciale',
      description: 'Ajustement suite à inventaire physique',
      dateDetection: '2025-09-18',
      dateEcheance: '2025-09-20',
      responsable: 'Sophie Bernard',
      commentaires: [],
      documents: ['PV_inventaire.pdf', 'Ecart_stock.xlsx']
    },
    {
      id: 'REV-004',
      compte: '411001',
      libelleCompte: 'Client XYZ',
      type: 'regularisation',
      statut: 'en_cours',
      priorite: 'haute',
      montant: 67800,
      impact: 'Créances clients',
      description: 'Régularisation provision créance douteuse',
      dateDetection: '2025-09-12',
      dateEcheance: '2025-09-28',
      responsable: 'Pierre Leroy',
      commentaires: ['Client en procédure collective'],
      documents: ['Balance_agee.pdf']
    },
    {
      id: 'REV-005',
      compte: '281000',
      libelleCompte: 'Amortissements immobilisations',
      type: 'correction',
      statut: 'rejete',
      priorite: 'basse',
      montant: 5400,
      impact: 'Dotations aux amortissements',
      description: 'Correction calcul amortissement dégressif',
      dateDetection: '2025-09-05',
      responsable: 'Marie Dupont',
      commentaires: ['Calcul initial correct', 'Révision non nécessaire'],
      documents: []
    }
  ]);

  // Statistiques
  const getStatistiques = () => {
    const total = revisions.length;
    const enCours = revisions.filter(r => r.statut === 'en_cours').length;
    const validees = revisions.filter(r => r.statut === 'valide').length;
    const critiques = revisions.filter(r => r.priorite === 'critique').length;
    const montantTotal = revisions.reduce((sum, r) => sum + r.montant, 0);

    return { total, enCours, validees, critiques, montantTotal };
  };

  const stats = getStatistiques();

  // Filtrage des révisions
  const filteredRevisions = revisions.filter(revision => {
    let matchTab = true;
    let matchType = true;
    let matchPriorite = true;
    let matchSearch = true;

    // Filtre par onglet
    if (activeTab === 'en-cours') {
      matchTab = revision.statut === 'en_cours' || revision.statut === 'en_attente';
    } else if (activeTab === 'validees') {
      matchTab = revision.statut === 'valide';
    } else if (activeTab === 'rejetees') {
      matchTab = revision.statut === 'rejete';
    }

    // Filtre par type
    if (filterType !== 'tous') {
      matchType = revision.type === filterType;
    }

    // Filtre par priorité
    if (filterPriorite !== 'tous') {
      matchPriorite = revision.priorite === filterPriorite;
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchSearch =
        revision.compte.toLowerCase().includes(query) ||
        revision.libelleCompte.toLowerCase().includes(query) ||
        revision.description.toLowerCase().includes(query);
    }

    return matchTab && matchType && matchPriorite && matchSearch;
  });

  // Ouvrir le détail
  const openDetail = (revision: RevisionItem) => {
    setSelectedRevision(revision);
    setShowDetailModal(true);
  };

  // Couleurs par type
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'anomalie': return 'text-red-600 bg-red-50 border-red-200';
      case 'correction': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ajustement': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'regularisation': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Couleur priorité
  const getPrioriteColor = (priorite: string) => {
    switch (priorite) {
      case 'critique': return 'bg-red-100 text-red-700';
      case 'haute': return 'bg-orange-100 text-orange-700';
      case 'moyenne': return 'bg-yellow-100 text-yellow-700';
      case 'basse': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Icône statut
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'valide': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejete': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'en_cours': return <Clock className="w-5 h-5 text-blue-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#191919]">Module de Révisions Comptables</h1>
            <p className="text-[#767676]">Gestion des anomalies, corrections et ajustements</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nouvelle révision</span>
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">Total révisions</span>
              <FileSearch className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-orange-700">En cours</span>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">{stats.enCours}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-green-700">Validées</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.validees}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-red-700">Critiques</span>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">{stats.critiques}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-purple-700">Impact total</span>
              <Flag className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-900">{stats.montantTotal.toLocaleString()} €</p>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Onglets */}
            <div className="flex items-center space-x-2">
              {[
                { id: 'tous', label: 'Toutes' },
                { id: 'en-cours', label: 'En cours' },
                { id: 'validees', label: 'Validées' },
                { id: 'rejetees', label: 'Rejetées' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filtres */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="tous">Tous types</option>
              <option value="anomalie">Anomalies</option>
              <option value="correction">Corrections</option>
              <option value="ajustement">Ajustements</option>
              <option value="regularisation">Régularisations</option>
            </select>

            <select
              value={filterPriorite}
              onChange={(e) => setFilterPriorite(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="tous">Toutes priorités</option>
              <option value="critique">Critique</option>
              <option value="haute">Haute</option>
              <option value="moyenne">Moyenne</option>
              <option value="basse">Basse</option>
            </select>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Liste des révisions */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-semibold text-[#191919]">Statut</th>
                <th className="text-left p-4 font-semibold text-[#191919]">Compte</th>
                <th className="text-left p-4 font-semibold text-[#191919]">Type</th>
                <th className="text-left p-4 font-semibold text-[#191919]">Description</th>
                <th className="text-right p-4 font-semibold text-[#191919]">Montant</th>
                <th className="text-left p-4 font-semibold text-[#191919]">Priorité</th>
                <th className="text-left p-4 font-semibold text-[#191919]">Responsable</th>
                <th className="text-center p-4 font-semibold text-[#191919]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRevisions.map((revision) => (
                <tr
                  key={revision.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetail(revision)}
                >
                  <td className="p-4">
                    {getStatutIcon(revision.statut)}
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-mono text-sm text-[#191919]">{revision.compte}</p>
                      <p className="text-xs text-[#767676]">{revision.libelleCompte}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getTypeColor(revision.type)}`}>
                      {revision.type}
                    </span>
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="text-sm text-[#191919] truncate">{revision.description}</p>
                    <p className="text-xs text-[#767676]">{revision.impact}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono font-semibold text-[#191919]">
                      {revision.montant.toLocaleString()} €
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPrioriteColor(revision.priorite)}`}>
                      {revision.priorite}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-[#191919]">{revision.responsable || '-'}</p>
                    {revision.dateEcheance && (
                      <p className="text-xs text-[#767676]">
                        Échéance: {new Date(revision.dateEcheance).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetail(revision);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRevisions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucune révision trouvée</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de détails */}
      {showDetailModal && selectedRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#191919]">Détails de la révision {selectedRevision.id}</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#767676]">Compte</label>
                    <p className="font-mono text-sm text-[#191919]">{selectedRevision.compte}</p>
                    <p className="text-sm text-[#767676]">{selectedRevision.libelleCompte}</p>
                  </div>
                  <div>
                    <label className="text-xs text-[#767676]">Type</label>
                    <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getTypeColor(selectedRevision.type)}`}>
                      {selectedRevision.type}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-[#767676]">Statut</label>
                    <div className="flex items-center space-x-2">
                      {getStatutIcon(selectedRevision.statut)}
                      <span className="text-sm text-[#191919]">
                        {selectedRevision.statut === 'en_cours' ? 'En cours' :
                         selectedRevision.statut === 'valide' ? 'Validé' :
                         selectedRevision.statut === 'rejete' ? 'Rejeté' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#767676]">Montant</label>
                    <p className="text-2xl font-bold text-[#191919]">
                      {selectedRevision.montant.toLocaleString()} €
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-[#767676]">Priorité</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getPrioriteColor(selectedRevision.priorite)}`}>
                      {selectedRevision.priorite}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-[#767676]">Impact</label>
                    <p className="text-sm text-[#191919]">{selectedRevision.impact}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-[#767676]">Description</label>
                <p className="text-sm text-[#191919] mt-1">{selectedRevision.description}</p>
              </div>

              {/* Dates et responsable */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#767676]">Date de détection</label>
                  <p className="text-sm text-[#191919]">
                    {new Date(selectedRevision.dateDetection).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {selectedRevision.dateEcheance && (
                  <div>
                    <label className="text-xs text-[#767676]">Date d'échéance</label>
                    <p className="text-sm text-[#191919]">
                      {new Date(selectedRevision.dateEcheance).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {selectedRevision.responsable && (
                  <div>
                    <label className="text-xs text-[#767676]">Responsable</label>
                    <p className="text-sm text-[#191919]">{selectedRevision.responsable}</p>
                  </div>
                )}
              </div>

              {/* Commentaires */}
              {selectedRevision.commentaires && selectedRevision.commentaires.length > 0 && (
                <div>
                  <label className="text-xs text-[#767676] mb-2 block">Commentaires</label>
                  <div className="space-y-2">
                    {selectedRevision.commentaires.map((comment, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-[#191919]">{comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {selectedRevision.documents && selectedRevision.documents.length > 0 && (
                <div>
                  <label className="text-xs text-[#767676] mb-2 block">Documents associés</label>
                  <div className="space-y-2">
                    {selectedRevision.documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-[#191919]">{doc}</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                {selectedRevision.statut === 'en_attente' && (
                  <>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Valider
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                      Rejeter
                    </button>
                  </>
                )}
                {selectedRevision.statut === 'en_cours' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Marquer comme terminé
                  </button>
                )}
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevisionsModule;