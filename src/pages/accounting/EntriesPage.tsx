import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, BarChart3, CheckCircle, Clock, ArrowLeft, Home,
  Calendar, DollarSign, Edit, Eye, Search, Filter, Download, FileType, ChevronDown, X, Printer
} from 'lucide-react';
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import DataTable, { Column } from '../../components/ui/DataTable';
import SearchableDropdown from '../../components/ui/SearchableDropdown';

interface EcritureBrouillard {
  id: string;
  numero: string;
  journal: string;
  date: string;
  source: 'Manuel' | 'API';
  libelle: string;
  debit: number;
  credit: number;
  equilibre: boolean;
  statut: string;
  type: string;
}

const EntriesPage: React.FC = () => {
  const { t } = useLanguage();
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

  // Données des écritures pour DataTable
  const ecrituresData: EcritureBrouillard[] = [
    // Écritures manuelles équilibrées
    {
      id: 'manual-0',
      numero: 'AC001',
      journal: 'AC',
      date: '10/09/2025',
      source: 'Manuel',
      libelle: 'Achat fournitures bureau',
      debit: 150000,
      credit: 150000,
      equilibre: true,
      statut: 'Brouillon',
      type: 'achats'
    },
    {
      id: 'manual-1',
      numero: 'AC002',
      journal: 'AC',
      date: '10/09/2025',
      source: 'Manuel',
      libelle: 'Achat fournitures bureau',
      debit: 150000,
      credit: 150000,
      equilibre: true,
      statut: 'Brouillon',
      type: 'achats'
    },
    // Écritures automatiques via API
    {
      id: 'auto-0',
      numero: 'VT004',
      journal: 'VT',
      date: '10/09/2025',
      source: 'API',
      libelle: 'Vente marchandises CLIENT D',
      debit: 250000,
      credit: 210000,
      equilibre: true,
      statut: 'Brouillon',
      type: 'ventes'
    },
    {
      id: 'auto-1',
      numero: 'VT005',
      journal: 'VT',
      date: '10/09/2025',
      source: 'API',
      libelle: 'Vente marchandises CLIENT E',
      debit: 250000,
      credit: 210000,
      equilibre: true,
      statut: 'Brouillon',
      type: 'ventes'
    },
    {
      id: 'auto-2',
      numero: 'VT006',
      journal: 'VT',
      date: '10/09/2025',
      source: 'API',
      libelle: 'Vente marchandises CLIENT F',
      debit: 250000,
      credit: 210000,
      equilibre: true,
      statut: 'Brouillon',
      type: 'ventes'
    },
    // Écriture déséquilibrée
    {
      id: 'od-001',
      numero: 'OD001',
      journal: 'OD',
      date: '09/09/2025',
      source: 'Manuel',
      libelle: 'Régularisation charges (à corriger)',
      debit: 120000,
      credit: 100000,
      equilibre: false,
      statut: 'Brouillon',
      type: 'operations'
    }
  ];

  // Configuration des colonnes pour DataTable
  const ecrituresColumns: Column<EcritureBrouillard>[] = [
    {
      key: 'date',
      label: t('common.date'),
      sortable: true,
      filterable: true,
      filterType: 'date',
      width: '100px',
      render: (item) => (
        <span className="text-sm text-[var(--color-text-primary)]">{item.date}</span>
      )
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'Manuel', label: 'Manuel' },
        { value: 'API', label: 'API' }
      ],
      width: '100px',
      render: (item) => (
        <span className={`px-2 py-1 text-xs rounded-full flex items-center w-fit ${
          item.source === 'Manuel'
            ? 'bg-[var(--color-info-light)] text-[var(--color-info)]'
            : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
        }`}>
          {item.source === 'Manuel' ? <Edit className="w-3 h-3 mr-1" /> : <BarChart3 className="w-3 h-3 mr-1" />}
          {item.source}
        </span>
      )
    },
    {
      key: 'journal',
      label: t('accounting.journal'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'VT', label: 'VT' },
        { value: 'AC', label: 'AC' },
        { value: 'BQ', label: 'BQ' },
        { value: 'CA', label: 'CA' },
        { value: 'OD', label: 'OD' }
      ],
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="text-sm font-mono text-[#B87333] font-semibold">{item.journal}</span>
      )
    },
    {
      key: 'numero',
      label: 'N° Pièce',
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '100px',
      render: (item) => (
        <span className="text-sm font-mono text-[var(--color-text-primary)]">{item.numero}</span>
      )
    },
    {
      key: 'libelle',
      label: t('accounting.label'),
      sortable: true,
      filterable: true,
      filterType: 'text',
      width: '250px',
      render: (item) => (
        <span className="text-sm text-[var(--color-text-primary)]">{item.libelle}</span>
      )
    },
    {
      key: 'debit',
      label: t('accounting.debit'),
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '120px',
      align: 'right',
      render: (item) => (
        <span className="text-sm font-mono text-[var(--color-error)]">
          {item.debit.toLocaleString()}
        </span>
      )
    },
    {
      key: 'credit',
      label: t('accounting.credit'),
      sortable: true,
      filterable: true,
      filterType: 'number',
      width: '120px',
      align: 'right',
      render: (item) => (
        <span className="text-sm font-mono text-[var(--color-success)]">
          {item.credit.toLocaleString()}
        </span>
      )
    },
    {
      key: 'equilibre',
      label: 'Équilibre',
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'true', label: 'Équilibrée' },
        { value: 'false', label: 'Déséquilibrée' }
      ],
      width: '120px',
      align: 'center',
      render: (item) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.equilibre
            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
            : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
        }`}>
          {item.equilibre ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
          {item.equilibre ? 'OK' : 'Déséq.'}
        </span>
      )
    },
    {
      key: 'statut',
      label: t('common.status'),
      sortable: true,
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: t('accounting.draft'), label: t('accounting.draft') },
        { value: t('accounting.validated'), label: t('accounting.validated') }
      ],
      width: '100px',
      align: 'center',
      render: (item) => (
        <span className="px-2 py-1 text-xs bg-[var(--color-warning-light)] text-[var(--color-warning)] rounded-full">
          {item.statut}
        </span>
      )
    }
  ];

  // Onglet unique Brouillard
  const tabs = [
    { id: 'brouillard', label: t('accounting.draft'), icon: FileText, badge: '8' },
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
    <div className="h-screen bg-[#ECECEC] flex flex-col overflow-hidden">
      {/* En-tête avec navigation de retour */}
      <div className="bg-white border-b border-[#E8E8E8] px-4 py-3 flex-shrink-0">
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
                <h1 className="text-lg font-bold text-[#191919]">Écritures Comptables</h1>
                <p className="text-sm text-[#767676]">Saisie et gestion des écritures SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[var(--color-warning-light)] text-[var(--color-warning)] px-3 py-1 rounded-full text-sm">
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
                <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--color-surface)] rounded-lg shadow-xl border border-[var(--color-border)] z-50">
                  <div className="p-3 border-b border-[var(--color-border)]">
                    <h4 className="font-medium text-[var(--color-text-primary)]">Modèles disponibles</h4>
                  </div>
                  {modelesSaisie.map((modele) => (
                    <div key={modele.id} className="p-3 hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border-light)]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{modele.nom}</span>
                        <span className="px-2 py-1 bg-[var(--color-info-light)] text-[var(--color-info)] text-xs rounded">{modele.journal}</span>
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

      {/* Navigation par onglets - Pleine largeur */}
      <div className="bg-white border-y border-[#E8E8E8] shadow-sm flex flex-col flex-1 overflow-hidden w-full">
        <div className="px-4 border-b border-[#E8E8E8]">
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
                    <span className="ml-2 px-2 py-1 text-xs bg-[var(--color-error-light)] text-[var(--color-error)] rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé avec scroll - pleine largeur */}
        <div className="flex-1 overflow-auto">

          {/* ONGLET BROUILLARD avec validation intégrée */}
          {activeTab === 'brouillard' && (
            <div className="w-full h-full">
                {/* Liste des écritures avec DataTable - Pleine largeur */}
                <DataTable
                  columns={ecrituresColumns}
                  data={ecrituresData}
                  pageSize={15}
                  searchable={true}
                  exportable={true}
                  refreshable={true}
                  printable={false}
                  selectable={false}
                  actions={(item) => (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewEntry({
                          id: item.id,
                          numero: item.numero,
                          journal: item.journal,
                          date: item.date,
                          libelle: item.libelle,
                          debit: item.debit,
                          credit: item.credit,
                          type: item.type
                        })}
                        className="p-1 hover:bg-[var(--color-info-light)] rounded transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4 text-[var(--color-info)]" />
                      </button>
                      <button
                        onClick={() => handleEditEntry({
                          id: item.id,
                          numero: item.numero,
                          journal: item.journal,
                          date: item.date,
                          libelle: item.libelle,
                          debit: item.debit,
                          credit: item.credit,
                          type: item.type
                        })}
                        className={`p-1 hover:bg-[var(--color-warning-light)] rounded transition-colors ${
                          item.equilibre ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-warning)]'
                        }`}
                        title={item.equilibre ? "Modifier l'écriture" : "Corriger l'écriture"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  emptyMessage="Aucune écriture en brouillard"
                  className="bg-white border-0 data-table w-full rounded-none shadow-none"
                />
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
      <JournalEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
      />

      {/* Modal d'édition d'écriture */}
      <JournalEntryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
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
                    <h2 className="text-lg font-bold text-[#191919]">
                      Détails de l'écriture {selectedEntry.numero}
                    </h2>
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
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
                          <span className="text-sm font-medium text-[var(--color-error)]">
                            {selectedEntry.debit?.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#444444]">Crédit:</span>
                          <span className="text-sm font-medium text-[var(--color-success)]">
                            {selectedEntry.credit?.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-[#444444]">État:</span>
                            {selectedEntry.debit === selectedEntry.credit ? (
                              <span className="px-2 py-1 text-xs bg-[var(--color-success-light)] text-[var(--color-success)] rounded-full">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Équilibrée
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs bg-[var(--color-error-light)] text-[var(--color-error)] rounded-full">
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
                        <thead className="bg-[var(--color-surface-hover)]">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#444444]">{t('accounting.account')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#444444]">{t('accounting.label')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#444444]">{t('accounting.debit')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#444444]">{t('accounting.credit')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr>
                            <td className="px-4 py-2 text-sm">411000</td>
                            <td className="px-4 py-2 text-sm">{t('navigation.clients')}</td>
                            <td className="px-4 py-2 text-sm text-right text-[var(--color-error)]">150,000</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">707000</td>
                            <td className="px-4 py-2 text-sm">Ventes de marchandises</td>
                            <td className="px-4 py-2 text-sm text-right">-</td>
                            <td className="px-4 py-2 text-sm text-right text-[var(--color-success)]">150,000</td>
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
                    className="px-4 py-2 border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-surface-hover)] flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>{t('common.edit')}</span>
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-surface-hover)]"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        handleValidateEntry(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                      className="px-6 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success)] flex items-center space-x-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('actions.validate')}</span>
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
                    <h2 className="text-lg font-bold text-[#191919]">Créer un modèle de saisie</h2>
                    <button
                      onClick={() => setShowTemplateModal(false)}
                      className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-[var(--color-text-tertiary)]" />
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
                    <SearchableDropdown
                      options={[
                        { value: 'AC', label: 'AC - Achats' },
                        { value: 'VE', label: 'VE - Ventes' },
                        { value: 'BQ', label: 'BQ - Banque' },
                        { value: 'CA', label: 'CA - Caisse' },
                        { value: 'OD', label: 'OD - Opérations Diverses' }
                      ]}
                      value=""
                      onChange={() => {}}
                      placeholder="Sélectionnez un journal"
                      searchPlaceholder="Rechercher un journal..."
                      clearable
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Description</label>
                    <textarea
                      rows={3}
                      placeholder="Description du modèle..."
                      className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20"
                    />
                  </div>

                  <div className="border rounded-lg p-4 bg-[var(--color-surface-hover)]">
                    <h3 className="text-sm font-medium text-[#444444] mb-3">Lignes d'écriture par défaut</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="text" placeholder={t('accounting.account')} className="w-24 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder={t('accounting.label')} className="flex-1 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder={t('accounting.debit')} className="w-24 px-2 py-1 border rounded text-sm" />
                        <input type="text" placeholder={t('accounting.credit')} className="w-24 px-2 py-1 border rounded text-sm" />
                      </div>
                    </div>
                    <button className="mt-3 text-sm text-[#6A8A82] hover:text-[#5A7A72] flex items-center space-x-1">
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-[var(--color-border)]" />
                      <span className="text-sm text-[#444444]">Activer ce modèle</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#E8E8E8] flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-[#444444] border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-surface-hover)]"
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