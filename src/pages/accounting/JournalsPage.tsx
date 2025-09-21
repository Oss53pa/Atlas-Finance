import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, FileText, Plus, Search, Filter, Edit, Eye,
  ArrowLeft, Home, Download, RefreshCw, Calculator, Settings,
  Archive, Printer, FileSpreadsheet, ChevronUp, ChevronDown, ChevronRight
} from 'lucide-react';
import JournalDashboard from '../../components/accounting/JournalDashboard';

interface Journal {
  id: string;
  code: string;
  libelle: string;
  type: 'VT' | 'AC' | 'BQ' | 'CA' | 'OD';
  entries: number;
  totalDebit: number;
  totalCredit: number;
  lastEntry: string;
  color: string;
}

const JournalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('journaux');
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecapTable, setShowRecapTable] = useState(true);
  const [showEditEntryModal, setShowEditEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showSubJournals, setShowSubJournals] = useState<{[key: string]: boolean}>({});

  // Onglets principaux
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'journaux', label: 'Journaux', icon: BookOpen },
    ...(selectedJournal ? [{ id: 'journal-view', label: `📚 ${selectedJournal.code}`, icon: Eye }] : [])
  ];

  // Données journaux SYSCOHADA
  const journaux: Journal[] = [
    {
      id: '1',
      code: 'VT',
      libelle: 'Journal des Ventes',
      type: 'VT',
      entries: 156,
      totalDebit: 0,
      totalCredit: 2450000,
      lastEntry: '2025-09-10',
      color: '#B87333'
    },
    {
      id: '2',
      code: 'AC',
      libelle: 'Journal des Achats',
      type: 'AC',
      entries: 89,
      totalDebit: 1890000,
      totalCredit: 0,
      lastEntry: '2025-09-09',
      color: '#6A8A82'
    },
    {
      id: '3',
      code: 'BQ',
      libelle: 'Journal de Banque',
      type: 'BQ',
      entries: 234,
      totalDebit: 890000,
      totalCredit: 1230000,
      lastEntry: '2025-09-11',
      color: '#7A99AC'
    },
    {
      id: '4',
      code: 'CA',
      libelle: 'Journal de Caisse',
      type: 'CA',
      entries: 45,
      totalDebit: 120000,
      totalCredit: 85000,
      lastEntry: '2025-09-08',
      color: '#A86323'
    },
    {
      id: '5',
      code: 'OD',
      libelle: 'Journal Opérations Diverses',
      type: 'OD',
      entries: 67,
      totalDebit: 340000,
      totalCredit: 340000,
      lastEntry: '2025-09-07',
      color: '#5A7A72'
    }
  ];

  // Sous-journaux par journal principal
  const sousJournaux = {
    'VT': [
      { id: 'VT01', code: 'VT01', libelle: 'Ventes Export', entries: 45, color: '#B87333' },
      { id: 'VT02', code: 'VT02', libelle: 'Ventes Locales', entries: 78, color: '#B87333' }
    ],
    'AC': [
      { id: 'AC01', code: 'AC01', libelle: 'Achats Locaux', entries: 32, color: '#6A8A82' },
      { id: 'AC02', code: 'AC02', libelle: 'Achats Import', entries: 25, color: '#6A8A82' }
    ],
    'BQ': [
      { id: 'BQ01', code: 'BQ01', libelle: 'Banque SGBC', entries: 156, color: '#7A99AC' },
      { id: 'BQ02', code: 'BQ02', libelle: 'Banque BOA', entries: 89, color: '#7A99AC' }
    ]
  };

  const toggleSubJournals = (journalCode: string) => {
    setShowSubJournals(prev => ({
      ...prev,
      [journalCode]: !prev[journalCode]
    }));
  };

  const handleDoubleClickEntry = (entry: any) => {
    setSelectedEntry(entry);
    setShowEditEntryModal(true);
  };

  // Données d'écritures par journal
  const getEcrituresJournal = (journalCode: string) => {
    switch (journalCode) {
      case 'VT':
        return [
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Produit 01 de ma société', debit: '', credit: '100,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Produit 01 de ma société', debit: '', credit: '20,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '06/03/19', compte: '411', compteLib: 'Clients', libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Vente CLIENT XYZ', debit: '', credit: '200,00' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Vente CLIENT XYZ', debit: '', credit: '40,00' },
          { mvt: '6', jnl: 'VT', date: '05/03/19', piece: 'FCT3', echeance: '10/03/19', compte: '411', compteLib: 'Clients', libelle: 'Vente CLIENT XYZ', debit: '240,00', credit: '' }
        ];
      case 'AC':
        return [
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat FOURNISSEUR A', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat FOURNISSEUR A', debit: '24,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '22/11/19', compte: '401', compteLib: 'Fournisseurs', libelle: 'Achat FOURNISSEUR A', debit: '', credit: '144,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat planches', debit: '133,33', credit: '' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: 'Fournisseurs', libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat planches', debit: '26,67', credit: '' }
        ];
      case 'BQ':
        return [
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: 'Fournisseurs', libelle: 'Paiement fournisseur', debit: '160,00', credit: '' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Paiement fournisseur', debit: '', credit: '160,00' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '411', compteLib: 'Clients', libelle: 'Encaissement client', debit: '', credit: '120,00' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Encaissement client', debit: '120,00', credit: '' }
        ];
      case 'CA':
        return [
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '571', compteLib: 'Caisse', libelle: 'Vente comptant produit 02', debit: '50,00', credit: '' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Vente comptant produit 02', debit: '', credit: '42,00' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Vente comptant produit 02', debit: '', credit: '8,00' }
        ];
      case 'OD':
        return [
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '681', compteLib: 'Dotations aux amortissements', libelle: 'Amortissement matériel', debit: '15,00', credit: '' },
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '281', compteLib: 'Amortissements matériel', libelle: 'Amortissement matériel', debit: '', credit: '15,00' }
        ];
      case 'TOUS':
      default:
        return [
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '701', compteLib: 'Ventes de produits finis', libelle: 'Produit 01 de ma société', debit: '', credit: '100,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '', compte: '4457', compteLib: 'TVA collectée', libelle: 'Produit 01 de ma société', debit: '', credit: '20,00' },
          { mvt: '1', jnl: 'VT', date: '01/03/19', piece: 'FCT2', echeance: '06/03/19', compte: '411', compteLib: 'Clients', libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Produit 01 de ma société', debit: '120,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Produit 01 de ma société', debit: '24,00', credit: '' },
          { mvt: '2', jnl: 'AC', date: '15/11/19', piece: 'FFR1', echeance: '22/11/19', compte: '401', compteLib: 'Fournisseurs', libelle: 'Produit 01 de ma société', debit: '', credit: '144,00' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: 'Fournisseurs', libelle: 'Achat planches', debit: '160,00', credit: '' },
          { mvt: '3', jnl: 'BQ', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '512', compteLib: 'Banques', libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '601', compteLib: 'Achats stockés - Matières premières', libelle: 'Achat planches', debit: '133,33', credit: '' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '401', compteLib: 'Fournisseurs', libelle: 'Achat planches', debit: '', credit: '160,00' },
          { mvt: '4', jnl: 'AC', date: '21/02/19', piece: 'ECR3', echeance: '', compte: '44566', compteLib: 'TVA déductible sur achats', libelle: 'Achat planches', debit: '26,67', credit: '' },
          { mvt: '5', jnl: 'BQ', date: '03/03/19', piece: 'FCT2', echeance: '', compte: '411', compteLib: 'Clients', libelle: 'Rgt FC 2 - Produit 01 de ma société', debit: '', credit: '120,00' },
          { mvt: '7', jnl: 'CA', date: '10/01/19', piece: 'CA001', echeance: '', compte: '571', compteLib: 'Caisse', libelle: 'Vente comptant produit 02', debit: '50,00', credit: '' },
          { mvt: '8', jnl: 'OD', date: '31/12/19', piece: 'OD001', echeance: '', compte: '681', compteLib: 'Dotations aux amortissements', libelle: 'Amortissement matériel', debit: '15,00', credit: '' }
        ];
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Comptabilité</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Journaux Comptables</h1>
                <p className="text-sm text-[#767676]">Gestion des journaux SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau sous-journal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#B87333] text-[#B87333]'
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {/* Dashboard */}
          {activeTab === 'dashboard' && <JournalDashboard />}

          {/* Journaux avec switch */}
          {activeTab === 'journaux' && (
            <div className="space-y-4">
              {/* Header avec switch */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-[#191919]">📚 Gestion des Journaux</h2>
                  <div className="flex items-center space-x-3">
                    {/* Switch vue */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('cards')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                          viewMode === 'cards'
                            ? 'bg-white text-[#B87333] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Cartes</span>
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                          viewMode === 'table'
                            ? 'bg-white text-[#B87333] shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Table</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vue Cartes */}
              {viewMode === 'cards' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Carte spéciale Journal tous mouvements */}
                  <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg border-2 border-[#6A8A82] p-6 hover:shadow-lg transition-all cursor-pointer text-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-lg backdrop-blur">
                          <Archive className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-sm">Journal tous mouvements</h3>
                          <p className="text-xs text-white/80">Vue consolidée</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 rounded-lg bg-white/10 backdrop-blur">
                          <p className="text-lg font-bold text-white">
                            {journaux.reduce((sum, j) => sum + j.entries, 0)}
                          </p>
                          <p className="text-xs text-white/80">Total écritures</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-white/10 backdrop-blur">
                          <p className="text-lg font-bold text-white">944,00€</p>
                          <p className="text-xs text-white/80">Équilibré</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span className="text-xs text-white/70">Consolidation en temps réel</span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Créer un journal spécial pour la vue consolidée
                              const journalTousMovements = {
                                id: 'tous',
                                code: 'TOUS',
                                libelle: 'Journal tous mouvements',
                                type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit: 944,
                                totalCredit: 944,
                                lastEntry: '2025-09-11',
                                color: '#6A8A82'
                              };
                              setSelectedJournal(journalTousMovements);
                              setActiveTab('journal-view');
                            }}
                            className="text-white/80 hover:text-white transition-colors"
                            title="Voir le journal consolidé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const journalTousMovements = {
                                id: 'tous',
                                code: 'TOUS',
                                libelle: 'Journal tous mouvements',
                                type: 'OD' as const,
                                entries: journaux.reduce((sum, j) => sum + j.entries, 0),
                                totalDebit: 944,
                                totalCredit: 944,
                                lastEntry: '2025-09-11',
                                color: '#6A8A82'
                              };
                              setSelectedJournal(journalTousMovements);
                              setActiveTab('journal-view');
                            }}
                            className="text-white/80 hover:text-white transition-colors"
                            title="Modifier les écritures"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cartes des journaux existants */}
                  {journaux.map((journal) => (
                    <div
                      key={journal.id}
                      className="bg-white rounded-lg border-2 border-[#E8E8E8] p-6 hover:border-[#B87333] hover:shadow-lg transition-all cursor-pointer"
                      style={{borderLeftColor: journal.color, borderLeftWidth: '4px'}}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                            style={{backgroundColor: journal.color}}
                          >
                            {journal.code}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#191919] text-sm">{journal.libelle}</h3>
                            <p className="text-xs text-[#767676]">Type: {journal.type}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 rounded-lg bg-gray-50">
                            <p className="text-lg font-bold text-[#191919]">{journal.entries}</p>
                            <p className="text-xs text-[#767676]">Écritures</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-gray-50">
                            <p className="text-lg font-bold text-[#B87333]">
                              {journal.totalCredit.toLocaleString()}€
                            </p>
                            <p className="text-xs text-[#767676]">Crédit</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                          <span className="text-xs text-[#767676]">Dernière écriture: {journal.lastEntry}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedJournal(journal);
                                setActiveTab('journal-view');
                              }}
                              className="text-[#6A8A82] hover:text-[#5A7A72] transition-colors"
                              title="Voir le journal"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedJournal(journal);
                                setActiveTab('journal-view');
                              }}
                              className="text-[#B87333] hover:text-[#A86323] transition-colors"
                              title="Modifier les écritures"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Vue Table */}
              {viewMode === 'table' && (
                <div className="bg-white rounded-lg border border-[#E8E8E8]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#6A8A82]/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Libellé</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Écritures</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Débit</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Crédit</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Dernière écriture</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {journaux.map((journal) => (
                          <React.Fragment key={journal.id}>
                            {/* Ligne du journal principal */}
                            <tr className="hover:bg-[#6A8A82]/5">
                              <td className="px-4 py-4">
                                <div className="flex items-center space-x-3">
                                  {sousJournaux[journal.code as keyof typeof sousJournaux] && (
                                    <button
                                      onClick={() => toggleSubJournals(journal.code)}
                                      className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      {showSubJournals[journal.code] ? (
                                        <ChevronDown className="w-4 h-4" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}
                                  <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                    style={{backgroundColor: journal.color}}
                                  >
                                    {journal.code}
                                  </div>
                                  <span className="font-mono font-bold text-[#B87333]">{journal.code}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="font-medium text-[#191919]">{journal.libelle}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="font-semibold">{journal.entries}</span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalDebit > 0 && (
                                  <span className="text-sm font-mono text-red-600">
                                    {journal.totalDebit.toLocaleString()}€
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {journal.totalCredit > 0 && (
                                  <span className="text-sm font-mono text-green-600">
                                    {journal.totalCredit.toLocaleString()}€
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="text-xs text-[#767676]">{journal.lastEntry}</span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => {
                                      setSelectedJournal(journal);
                                      setActiveTab('journal-view');
                                    }}
                                    className="text-[#6A8A82] hover:text-[#5A7A72] transition-colors"
                                    title="Voir le journal"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedJournal(journal);
                                      setActiveTab('journal-view');
                                    }}
                                    className="text-[#B87333] hover:text-[#A86323] transition-colors"
                                    title="Modifier les écritures"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Sous-journaux */}
                            {showSubJournals[journal.code] && sousJournaux[journal.code as keyof typeof sousJournaux]?.map((sousJournal) => (
                              <tr key={sousJournal.id} className="bg-gray-50 hover:bg-gray-100">
                                <td className="px-4 py-3 pl-16">
                                  <div className="flex items-center space-x-3">
                                    <div
                                      className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs"
                                      style={{backgroundColor: sousJournal.color}}
                                    >
                                      {sousJournal.code.slice(-2)}
                                    </div>
                                    <span className="font-mono text-sm text-gray-700">{sousJournal.code}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-sm text-gray-700">{sousJournal.libelle}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm">{sousJournal.entries}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs text-gray-500">-</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="text-xs text-gray-500">-</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs text-gray-500">-</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center space-x-2">
                                    <button
                                      onClick={() => {
                                        const sousJournalAsJournal = {
                                          ...journal,
                                          id: sousJournal.id,
                                          code: sousJournal.code,
                                          libelle: sousJournal.libelle,
                                          entries: sousJournal.entries
                                        };
                                        setSelectedJournal(sousJournalAsJournal);
                                        setActiveTab('journal-view');
                                      }}
                                      className="text-[#6A8A82] hover:text-[#5A7A72] transition-colors"
                                      title="Voir le sous-journal"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const sousJournalAsJournal = {
                                          ...journal,
                                          id: sousJournal.id,
                                          code: sousJournal.code,
                                          libelle: sousJournal.libelle,
                                          entries: sousJournal.entries
                                        };
                                        setSelectedJournal(sousJournalAsJournal);
                                        setActiveTab('journal-view');
                                      }}
                                      className="text-[#B87333] hover:text-[#A86323] transition-colors"
                                      title="Modifier le sous-journal"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Journal sélectionné avec reproduction de l'image */}
          {activeTab === 'journal-view' && selectedJournal && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-[#E8E8E8]">
                {/* Header du journal réorganisé */}
                <div className="bg-gradient-to-r from-[#6A8A82]/10 to-[#7A99AC]/10 border-b border-gray-200">
                  {/* Ligne 1: Titre + Actions principales */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-xl font-bold text-[#191919]">
                        <Archive className="w-5 h-5 mr-2" />
                        {selectedJournal?.code === 'TOUS' ? 'Journal tous mouvements' : `Journal ${selectedJournal?.code} - ${selectedJournal?.libelle}`}
                      </h3>
                      <div className="px-3 py-1 bg-[#7A99AC] text-white rounded-lg text-sm font-medium">
                        Devise: EUR
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab('journaux')}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        ← Retour
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center space-x-2">
                        <Printer className="w-4 h-4" />
                        <span>Imprimer</span>
                      </button>
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exporter</span>
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2: Filtres + Totaux */}
                  <div className="flex items-center justify-between px-4 pb-4 border-t border-gray-200 pt-3">
                    {/* Filtres à gauche */}
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Du</label>
                        <input
                          type="date"
                          defaultValue="2019-01-01"
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">au</label>
                        <input
                          type="date"
                          defaultValue="2019-12-31"
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Journal</label>
                        <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82]">
                          <option>&lt;tout&gt;</option>
                          <option>VT</option>
                          <option>AC</option>
                          <option>BQ</option>
                          <option>CA</option>
                          <option>OD</option>
                        </select>
                      </div>
                      <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg text-sm hover:bg-[#5A7A72] transition-colors font-medium">
                        Filtrer
                      </button>
                    </div>

                    {/* Totaux à droite */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2 bg-red-50 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Débit:</span>
                        <span className="text-lg font-bold text-red-600">944,00</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Crédit:</span>
                        <span className="text-lg font-bold text-green-600">944,00</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Équilibre:</span>
                        <span className="text-lg font-bold text-blue-600">✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table des écritures reproduite de l'image */}
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-[#6A8A82]/20 sticky top-0">
                      <tr className="text-xs">
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">N° Mvt</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Jnl</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Date</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">N° pièce</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Échéance</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Compte</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Libellé compte</th>
                        <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Libellé</th>
                        <th className="px-2 py-2 text-right font-semibold border-r border-gray-300">Débit</th>
                        <th className="px-2 py-2 text-right font-semibold">Crédit</th>
                      </tr>
                    </thead>
                  </table>
                  <div className="overflow-y-auto max-h-80">
                    <table className="w-full text-sm border-collapse">
                      <tbody>
                        {getEcrituresJournal(selectedJournal?.code || 'TOUS').map((ligne, index) => (
                          <tr
                            key={index}
                            className="hover:bg-[#6A8A82]/5 border-b border-gray-200 cursor-pointer"
                            onDoubleClick={() => handleDoubleClickEntry(ligne)}
                            title="Double-cliquer pour modifier cette écriture"
                          >
                            <td className="px-2 py-1 text-xs font-mono border-r border-gray-300">{ligne.mvt}</td>
                            <td className="px-2 py-1 text-xs font-bold text-[#B87333] border-r border-gray-300">{ligne.jnl}</td>
                            <td className="px-2 py-1 text-xs border-r border-gray-300">{ligne.date}</td>
                            <td className="px-2 py-1 text-xs font-mono border-r border-gray-300">{ligne.piece}</td>
                            <td className="px-2 py-1 text-xs border-r border-gray-300">{ligne.echeance}</td>
                            <td className="px-2 py-1 text-xs font-mono text-[#6A8A82] font-semibold border-r border-gray-300">{ligne.compte}</td>
                            <td className="px-2 py-1 text-xs border-r border-gray-300">{ligne.compteLib}</td>
                            <td className="px-2 py-1 text-xs border-r border-gray-300">{ligne.libelle}</td>
                            <td className="px-2 py-1 text-xs text-right font-medium text-red-600 border-r border-gray-300">{ligne.debit}</td>
                            <td className="px-2 py-1 text-xs text-right font-medium text-green-600">{ligne.credit}</td>
                          </tr>
                        ))}
                        <tr className="bg-[#B87333]/10 font-bold border-t-2 border-[#B87333]">
                          <td colSpan={8} className="px-2 py-2 text-sm font-bold text-[#B87333] border-r border-gray-300">TOTAL</td>
                          <td className="px-2 py-2 text-right text-sm font-bold text-red-600 border-r border-gray-300">944,00</td>
                          <td className="px-2 py-2 text-right text-sm font-bold text-green-600">944,00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table récapitulative par compte (comme dans l'image) */}
                <div className="mt-6 border-t border-gray-300">
                  <div className="flex items-center justify-between p-3 bg-[#7A99AC]/10">
                    <h4 className="text-sm font-medium text-[#7A99AC] flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Récapitulatif par compte</span>
                    </h4>
                    <button
                      onClick={() => setShowRecapTable(!showRecapTable)}
                      className="px-3 py-1 bg-[#7A99AC] text-white rounded text-xs hover:bg-[#6A8A9C] transition-colors flex items-center space-x-1"
                    >
                      <span>{showRecapTable ? 'Masquer' : 'Afficher'}</span>
                      {showRecapTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {showRecapTable && (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full text-sm border-collapse">
                        <thead className="bg-[#7A99AC]/20 sticky top-0">
                          <tr className="text-xs">
                            <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Compte</th>
                            <th className="px-2 py-2 text-left font-semibold border-r border-gray-300">Libellé du compte</th>
                            <th className="px-2 py-2 text-right font-semibold border-r border-gray-300">Débit</th>
                            <th className="px-2 py-2 text-right font-semibold border-r border-gray-300">Crédit</th>
                            <th className="px-2 py-2 text-right font-semibold border-r border-gray-300">Solde débit</th>
                            <th className="px-2 py-2 text-right font-semibold">Solde crédit</th>
                          </tr>
                        </thead>
                      </table>
                      <div className="overflow-y-auto max-h-60">
                        <table className="w-full text-sm border-collapse">
                          <tbody>
                            {[
                              { compte: '401', libelle: 'Fournisseurs', debit: '160,00', credit: '304,00', soldeDebit: '', soldeCredit: '144,00' },
                              { compte: '411', libelle: 'Clients', debit: '120,00', credit: '360,00', soldeDebit: '', soldeCredit: '240,00' },
                              { compte: '44566', libelle: 'TVA déductible sur achats de biens et services', debit: '50,67', credit: '', soldeDebit: '50,67', soldeCredit: '' },
                              { compte: '4457', libelle: 'TVA collectée', debit: '', credit: '20,00', soldeDebit: '', soldeCredit: '20,00' },
                              { compte: '512', libelle: 'Banques', debit: '360,00', credit: '160,00', soldeDebit: '200,00', soldeCredit: '' },
                              { compte: '601', libelle: 'Achats stockés - Matières premières (et fournitures)', debit: '253,33', credit: '', soldeDebit: '253,33', soldeCredit: '' },
                              { compte: '701', libelle: 'Ventes de produits finis', debit: '', credit: '100,00', soldeDebit: '', soldeCredit: '100,00' }
                            ].map((compte, index) => (
                              <tr key={index} className="hover:bg-[#7A99AC]/5 border-b border-gray-200">
                                <td className="px-2 py-1 text-xs font-mono text-[#B87333] font-bold border-r border-gray-300">{compte.compte}</td>
                                <td className="px-2 py-1 text-xs border-r border-gray-300">{compte.libelle}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-red-600 border-r border-gray-300">{compte.debit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-green-600 border-r border-gray-300">{compte.credit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-red-600 border-r border-gray-300">{compte.soldeDebit}</td>
                                <td className="px-2 py-1 text-xs text-right font-medium text-green-600">{compte.soldeCredit}</td>
                              </tr>
                            ))}
                            <tr className="bg-[#7A99AC]/20 font-bold border-t-2 border-[#7A99AC]">
                              <td colSpan={2} className="px-2 py-2 text-sm font-bold text-[#7A99AC] border-r border-gray-300">TOTAL</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-red-600 border-r border-gray-300">944,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-green-600 border-r border-gray-300">944,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-red-600 border-r border-gray-300">504,00</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-green-600">504,00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer avec clôture comptable */}
                <div className="p-2 bg-gray-50 border-t border-gray-300 text-right">
                  <span className="text-xs text-gray-600">Clôture comptable au 31/12</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Création */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-semibold text-tuatara flex items-center space-x-2">
                  <Plus className="w-5 h-5" />
                  <span>Création d'un Sous-journal</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">Les 5 journaux principaux SYSCOHADA sont déjà créés</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              alert('Sous-journal créé avec succès !');
              setShowCreateModal(false);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Journal parent *</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333]" required>
                    <option value="">Choisir le journal principal</option>
                    <option value="VT">VT - Journal des Ventes</option>
                    <option value="AC">AC - Journal des Achats</option>
                    <option value="BQ">BQ - Journal de Banque</option>
                    <option value="CA">CA - Journal de Caisse</option>
                    <option value="OD">OD - Opérations Diverses</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Code journal *</label>
                    <input
                      type="text"
                      placeholder="ex. VT01, AC01"
                      maxLength={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333] font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom du journal *</label>
                    <input
                      type="text"
                      placeholder="ex. Ventes Export"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B87333]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors"
                >
                  Créer le sous-journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Édition Écriture */}
      {showEditEntryModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-tuatara flex items-center space-x-2">
                <Edit className="w-5 h-5" />
                <span>Modifier l'écriture {selectedEntry.piece}</span>
              </h3>
              <button
                onClick={() => setShowEditEntryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            {/* Informations de l'écriture */}
            <div className="bg-gradient-to-r from-[#6A8A82]/10 to-[#7A99AC]/10 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° Mouvement</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.mvt}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Journal</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.jnl}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° Pièce</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.piece}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Échéance</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.echeance}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  />
                </div>
              </div>
            </div>

            {/* Détails du compte */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-4">Détails du compte</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compte</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.compte}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Libellé compte</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.compteLib}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Libellé de l'opération</label>
                <input
                  type="text"
                  defaultValue={selectedEntry.libelle}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Débit</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.debit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-red-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Crédit</label>
                  <input
                    type="text"
                    defaultValue={selectedEntry.credit}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-green-600"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditEntryModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Supprimer l'écriture
              </button>
              <button className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalsPage;