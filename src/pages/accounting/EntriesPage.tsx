import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, BarChart3, CheckCircle, Clock, ArrowLeft, Home,
  Calendar, DollarSign, Edit, Eye, Search, Filter, Download, FileType, ChevronDown, X
} from 'lucide-react';
import TabbedJournalEntry from '../../components/accounting/TabbedJournalEntry';

const EntriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('brouillard');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Onglet unique Brouillard
  const tabs = [
    { id: 'brouillard', label: 'Brouillard', icon: FileText, badge: '8' },
  ];

  // Modèles de saisie
  const modelesSaisie = [
    { id: 1, nom: 'Facture vente standard', journal: 'VT' },
    { id: 2, nom: 'Achat avec TVA', journal: 'AC' },
    { id: 3, nom: 'Paiement fournisseur', journal: 'BQ' },
  ];

  // Fonction pour ouvrir le modal d'édition
  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  // Fonction pour voir les détails d'une écriture
  const handleViewEntry = (entry: any) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  // Fonction pour valider une écriture
  const handleValidateEntry = (entryId: string) => {
    alert(`Écriture ${entryId} validée avec succès`);
    // Ici on ajouterait l'appel API pour valider
  };

  // Fonction pour sélectionner/désélectionner une écriture
  const handleToggleEntry = (entryId: string) => {
    setSelectedEntries(prev =>
      prev.includes(entryId)
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  // Fonction pour tout sélectionner
  const handleSelectAll = () => {
    // Sélectionner seulement les écritures équilibrées (pas les déséquilibrées)
    const allIds = ['manual-0', 'manual-1', 'auto-0', 'auto-1', 'auto-2'];
    setSelectedEntries(prev =>
      prev.length === allIds.length ? [] : allIds
    );
  };

  // Fonction pour valider la sélection
  const handleValidateSelection = () => {
    if (selectedEntries.length > 0) {
      alert(`${selectedEntries.length} écriture(s) validée(s) avec succès`);
      setSelectedEntries([]);
    }
  };

  return (
    <div className="h-screen bg-[#ECECEC] flex flex-col">
      {/* En-tête avec navigation de retour */}
      <div className="bg-white border-b border-[#E8E8E8] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 text-[#767676] hover:text-[#6A8A82] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#6A8A82]/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#6A8A82]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Écritures Comptables</h1>
                <p className="text-sm text-[#767676]">Saisie et gestion des écritures SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>8 en attente</span>
            </div>

            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <FileType className="w-4 h-4" />
              <span className="text-sm">Ajouter un modèle de saisie</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span className="text-sm">Consulter un modèle</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showTemplateDropdown && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <h4 className="font-medium text-gray-800">Modèles disponibles</h4>
                  </div>
                  {modelesSaisie.map((modele) => (
                    <div key={modele.id} className="p-3 hover:bg-gray-50 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{modele.nom}</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{modele.journal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/dashboard/comptable')}
              className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white border border-[#E8E8E8] shadow-sm mx-6 mt-6 flex flex-col max-h-[calc(100vh-120px)]">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 px-2 text-sm font-medium border-b-2 transition-colors
                    ${activeTab === tab.id
                      ? 'border-[#6A8A82] text-[#6A8A82]'
                      : 'border-transparent text-[#767676] hover:text-[#6A8A82] hover:border-[#6A8A82]/30'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé avec scroll */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ONGLET BROUILLARD avec validation intégrée */}
          {activeTab === 'brouillard' && (
            <div className="space-y-4">
              {/* Barre de recherche et actions */}
              <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#767676]" />
                      <input
                        type="text"
                        placeholder="Rechercher des écritures..."
                        className="w-full pl-10 pr-4 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                      />
                    </div>
                    <input type="date" className="px-3 py-2 border border-[#D9D9D9] rounded-lg" />
                    <input type="date" className="px-3 py-2 border border-[#D9D9D9] rounded-lg" />
                    <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
                      <Filter className="w-4 h-4 text-[#767676]" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-2 text-sm border border-[#D9D9D9] rounded-lg hover:bg-gray-50"
                    >
                      {selectedEntries.length === 5 ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <button
                      onClick={handleValidateSelection}
                      disabled={selectedEntries.length === 0}
                      className={`px-3 py-2 text-sm rounded-lg flex items-center space-x-1 ${
                        selectedEntries.length > 0
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Valider la sélection ({selectedEntries.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Liste des écritures */}
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-[#D9D9D9]"
                            checked={selectedEntries.length === 5}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Source</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Journal</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">N° Pièce</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-[#444444]">Libellé</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Débit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-[#444444]">Crédit</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Équilibre</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Statut</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-[#444444]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Écritures saisies manuellement équilibrées */}
                      {[1, 2].map((_, index) => {
                        const entryId = `manual-${index}`;
                        const entry = {
                          id: entryId,
                          numero: `AC${(index + 1).toString().padStart(3, '0')}`,
                          journal: 'AC',
                          date: '10/09/2025',
                          libelle: 'Achat fournitures bureau',
                          debit: 150000,
                          credit: 150000,
                          type: 'achats'
                        };
                        return (
                        <tr key={entryId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-[#D9D9D9]"
                              checked={selectedEntries.includes(entryId)}
                              onChange={() => handleToggleEntry(entryId)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-[#444444]">10/09/2025</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center w-fit">
                              <Edit className="w-3 h-3 mr-1" />
                              Manuel
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-[#B87333]">AC</td>
                          <td className="px-4 py-3 text-sm font-mono text-[#444444]">AC{(index + 1).toString().padStart(3, '0')}</td>
                          <td className="px-4 py-3 text-sm text-[#444444]">Achat fournitures bureau</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-red-600">150,000</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-green-600">150,000</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              OK
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Brouillard
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Voir"
                                onClick={() => handleViewEntry(entry)}
                              >
                                <Eye className="w-4 h-4 text-[#767676]" />
                              </button>
                              <button
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Modifier"
                                onClick={() => handleEditEntry(entry)}
                              >
                                <Edit className="w-4 h-4 text-[#767676]" />
                              </button>
                              <button
                                className="p-1 hover:bg-green-100 rounded"
                                title="Valider"
                                onClick={() => handleValidateEntry(entryId)}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}

                      {/* Écritures automatiques via API */}
                      {[3, 4, 5].map((_, index) => {
                        const entryId = `auto-${index - 3}`;
                        const entry = {
                          id: entryId,
                          numero: `VT${(index + 1).toString().padStart(3, '0')}`,
                          journal: 'VT',
                          date: '10/09/2025',
                          libelle: `Vente marchandises CLIENT ${String.fromCharCode(65 + index)}`,
                          debit: 250000,
                          credit: 210000,
                          type: 'ventes'
                        };
                        return (
                        <tr key={entryId} className="hover:bg-gray-50 bg-green-50/30">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-[#D9D9D9]"
                              checked={selectedEntries.includes(entryId)}
                              onChange={() => handleToggleEntry(entryId)}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-[#444444]">10/09/2025</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center w-fit">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              API
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-[#B87333]">VT</td>
                          <td className="px-4 py-3 text-sm font-mono text-[#444444]">VT{(index + 1).toString().padStart(3, '0')}</td>
                          <td className="px-4 py-3 text-sm text-[#444444]">Vente marchandises CLIENT {String.fromCharCode(65 + index)}</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-red-600">250,000</td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-green-600">210,000</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              OK
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                              Brouillard
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Voir"
                                onClick={() => handleViewEntry(entry)}
                              >
                                <Eye className="w-4 h-4 text-[#767676]" />
                              </button>
                              <button
                                className="p-1 hover:bg-gray-100 rounded"
                                title="Modifier"
                                onClick={() => handleEditEntry(entry)}
                              >
                                <Edit className="w-4 h-4 text-[#767676]" />
                              </button>
                              <button
                                className="p-1 hover:bg-green-100 rounded"
                                title="Valider"
                                onClick={() => handleValidateEntry(entryId)}
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}

                      {/* Écriture déséquilibrée */}
                      <tr className="hover:bg-gray-50 bg-red-50/30">
                        <td className="px-4 py-3">
                          <input type="checkbox" className="rounded border-[#D9D9D9]" disabled />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#444444]">09/09/2025</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center w-fit">
                            <Edit className="w-3 h-3 mr-1" />
                            Manuel
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[#B87333]">OD</td>
                        <td className="px-4 py-3 text-sm font-mono text-[#444444]">OD001</td>
                        <td className="px-4 py-3 text-sm text-[#444444]">Régularisation charges (à corriger)</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-red-600">120,000</td>
                        <td className="px-4 py-3 text-sm text-right font-mono text-green-600">100,000</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                            <X className="w-3 h-3 inline mr-1" />
                            Déséq.
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            Brouillard
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-1">
                            <button className="p-1 hover:bg-gray-100 rounded" title="Voir">
                              <Eye className="w-4 h-4 text-[#767676]" />
                            </button>
                            <button
                              className="p-1 hover:bg-orange-100 rounded"
                              title="Corriger"
                              onClick={() => handleEditEntry({
                                id: 'od-001',
                                numero: 'OD001',
                                journal: 'OD',
                                date: '09/09/2025',
                                libelle: 'Régularisation charges (à corriger)',
                                type: 'operations'
                              })}
                            >
                              <Edit className="w-4 h-4 text-orange-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bouton flottant - Nouvelle Écriture */}
      <button
        onClick={() => setShowEntryModal(true)}
        className="fixed top-1/2 right-8 transform -translate-y-1/2
        w-14 h-14 bg-[#B87333] text-white rounded-full shadow-lg hover:bg-[#A86323] hover:shadow-xl transition-all duration-300 flex items-center
        justify-center z-40 group"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal de nouvelle écriture */}
      <TabbedJournalEntry
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
      />

      {/* Modal d'édition d'écriture */}
      <TabbedJournalEntry
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
        mode="edit"
        editData={editingEntry}
      />

      {/* Modal de détails d'écriture */}
      {showDetailsModal && selectedEntry && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowDetailsModal(false)} />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full relative">
                {/* Header */}
                <div className="p-6 border-b border-[#E8E8E8] bg-gradient-to-r from-[#6A8A82]/10 to-[#B87333]/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#191919]">
                      Détails de l'écriture {selectedEntry.numero}
                    </h2>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Corps du modal */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-[#767676] mb-2">Informations générales</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">N° Pièce:</span>
                          <span className="text-sm font-medium">{selectedEntry.numero}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Journal:</span>
                          <span className="text-sm font-medium">{selectedEntry.journal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Date:</span>
                          <span className="text-sm font-medium">{selectedEntry.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Libellé:</span>
                          <span className="text-sm font-medium">{selectedEntry.libelle}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-[#767676] mb-2">Montants</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Débit:</span>
                          <span className="text-sm font-medium text-red-600">
                            {selectedEntry.debit?.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Crédit:</span>
                          <span className="text-sm font-medium text-green-600">
                            {selectedEntry.credit?.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-[#444444]">État:</span>
                            {selectedEntry.debit === selectedEntry.credit ? (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Équilibrée
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                                <X className="w-3 h-3 inline mr-1" />
                                Déséquilibrée
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lignes d'écriture */}
                  <div>
                    <h3 className="text-sm font-medium text-[#767676] mb-3">Lignes d'écriture</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#444444]">Compte</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#444444]">Libellé</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#444444]">Débit</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#444444]">Crédit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="px-4 py-2 text-sm">411000</td>
                            <td className="px-4 py-2 text-sm">Clients</td>
                            <td className="px-4 py-2 text-sm text-right text-red-600">150,000</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">707000</td>
                            <td className="px-4 py-2 text-sm">Ventes de marchandises</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                            <td className="px-4 py-2 text-sm text-right text-green-600">150,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#E8E8E8] flex justify-between">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEditEntry(selectedEntry);
                    }}
                    className="px-4 py-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Modifier</span>
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-lg hover:bg-gray-50"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        handleValidateEntry(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Valider</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal d'ajout de modèle de saisie */}
      {showTemplateModal && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowTemplateModal(false)} />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full relative">
                {/* Header */}
                <div className="p-6 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#191919]">Créer un modèle de saisie</h2>
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Corps du modal */}
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Nom du modèle *</label>
                    <input
                      type="text"
                      placeholder="Ex: Facture fournisseur avec TVA"
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Type de transaction *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20">
                      <option value="">Sélectionnez un type</option>
                      <option value="achats">Facture d'Achat</option>
                      <option value="ventes">Facture de Vente</option>
                      <option value="reglements">Règlement</option>
                      <option value="operations">Opérations Diverses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Journal par défaut *</label>
                    <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20">
                      <option value="">Sélectionnez un journal</option>
                      <option value="AC">AC - Achats</option>
                      <option value="VE">VE - Ventes</option>
                      <option value="BQ">BQ - Banque</option>
                      <option value="CA">CA - Caisse</option>
                      <option value="OD">OD - Opérations Diverses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Description du modèle..."
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                    />
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="text-sm font-medium text-[#444444] mb-3">Lignes d'écriture par défaut</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="text" placeholder="Compte" className="w-24 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder="Libellé" className="flex-1 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder="Débit" className="w-24 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder="Crédit" className="w-24 px-2 py-1 border rounded text-sm" />
                      </div>
                    </div>
                    <button className="mt-3 text-sm text-[#6A8A82] hover:text-[#5A7A72] flex items-center space-x-1">
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-[#D9D9D9]" />
                      <span className="text-sm text-[#444444]">Activer ce modèle</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#E8E8E8] flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button className="px-6 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323]">
                    Créer le modèle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EntriesPage;