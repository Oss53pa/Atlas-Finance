import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';
import {
  Search, Filter, Save, RefreshCw, CheckCircle, XCircle,
  Link2, Unlink, Calendar, Download, Eye, AlertTriangle,
  Users, FileText, TrendingUp, ArrowUpDown, Hash, Calculator,
  Clock, Check, X, ChevronRight, ChevronDown, Info,
  History, Settings, Database, Zap, FileSpreadsheet, BarChart3,
  DollarSign, Activity, Lock, Unlock, AlertCircle, ChevronUp
} from 'lucide-react';

interface LettrageEntry {
  id: string;
  compte: string;
  libelle: string;
  date: string;
  piece: string;
  journal: string;
  debit: number;
  credit: number;
  solde: number;
  lettrage?: string;
  lettragePartiel?: boolean;
  selected?: boolean;
  tiers?: string;
  echeance?: string;
  reference?: string;
  devise?: string;
  status?: 'pending' | 'partial' | 'complete';
}

interface LettrageStats {
  totalComptes: number;
  totalEcritures: number;
  ecrituresLettrees: number;
  ecrituresNonLettrees: number;
  tauxLettrage: number;
  montantNonLettre: number;
  plusAncienneNonLettree?: Date;
  dernierLettrage?: Date;
}

interface LettrageHistory {
  id: string;
  date: Date;
  user: string;
  action: 'create' | 'delete' | 'modify';
  code: string;
  ecritures: string[];
  montant: number;
}

const Lettrage: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [selectedCompte, setSelectedCompte] = useState<string>('411001');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyNonLettrage, setShowOnlyNonLettrage] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'manual' | 'automatic' | 'analysis' | 'history' | 'config'>('manual');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set(['411001']));
  const [lettrageMode, setLettrageMode] = useState<'complete' | 'partial'>('complete');
  const [showStats, setShowStats] = useState(true);
  const [tolerance, setTolerance] = useState(0.01);
  const [autoLettrageConfig, setAutoLettrageConfig] = useState({
    parMontant: true,
    parReference: true,
    parDate: false,
    parTiers: true,
    tolerance: 0.01,
    periodeMax: 90
  });
  const [lettrageHistory, setLettrageHistory] = useState<LettrageHistory[]>([]);
  const [stats, setStats] = useState<LettrageStats>({
    totalComptes: 0,
    totalEcritures: 0,
    ecrituresLettrees: 0,
    ecrituresNonLettrees: 0,
    tauxLettrage: 0,
    montantNonLettre: 0
  });

  // Données simulées des écritures
  const mockEntries: LettrageEntry[] = [
    {
      id: '1',
      compte: '411001',
      libelle: 'Facture client A SARL - Vente marchandises',
      date: '2024-01-15',
      piece: 'FAC-2024-001',
      journal: 'VTE',
      debit: 1500000,
      credit: 0,
      solde: 1500000,
      tiers: 'Client A SARL',
      echeance: '2024-02-15'
    },
    {
      id: '2',
      compte: '411001',
      libelle: 'Règlement partiel client A SARL',
      date: '2024-01-25',
      piece: 'CHQ-001',
      journal: 'BQ1',
      debit: 0,
      credit: 800000,
      solde: 700000,
      tiers: 'Client A SARL'
    },
    {
      id: '3',
      compte: '411001',
      libelle: 'Facture client A SARL - Services',
      date: '2024-02-01',
      piece: 'FAC-2024-015',
      journal: 'VTE',
      debit: 2200000,
      credit: 0,
      solde: 2900000,
      tiers: 'Client A SARL',
      echeance: '2024-03-01'
    },
    {
      id: '4',
      compte: '411001',
      libelle: 'Règlement solde facture FAC-2024-001',
      date: '2024-02-10',
      piece: 'VIR-055',
      journal: 'BQ1',
      debit: 0,
      credit: 700000,
      solde: 2200000,
      tiers: 'Client A SARL'
    },
    {
      id: '5',
      compte: '411002',
      libelle: 'Facture client B SA',
      date: '2024-01-20',
      piece: 'FAC-2024-008',
      journal: 'VTE',
      debit: 3500000,
      credit: 0,
      solde: 3500000,
      lettrage: 'A001',
      tiers: 'Client B SA',
      echeance: '2024-02-20'
    },
    {
      id: '6',
      compte: '411002',
      libelle: 'Règlement client B SA',
      date: '2024-02-15',
      piece: 'CHQ-125',
      journal: 'BQ1',
      debit: 0,
      credit: 3500000,
      solde: 0,
      lettrage: 'A001',
      tiers: 'Client B SA'
    },
    {
      id: '7',
      compte: '401001',
      libelle: 'Facture fournisseur X',
      date: '2024-01-10',
      piece: 'ACH-2024-050',
      journal: 'ACH',
      debit: 0,
      credit: 1200000,
      solde: -1200000,
      tiers: 'Fournisseur X',
      echeance: '2024-02-10'
    },
    {
      id: '8',
      compte: '401001',
      libelle: 'Paiement fournisseur X',
      date: '2024-02-05',
      piece: 'CHQ-200',
      journal: 'BQ1',
      debit: 1200000,
      credit: 0,
      solde: 0,
      tiers: 'Fournisseur X'
    }
  ];

  // Grouper les écritures par compte
  const groupedEntries = useMemo(() => {
    const filtered = mockEntries.filter(entry => {
      if (showOnlyNonLettrage && entry.lettrage) return false;
      if (searchTerm && !entry.libelle.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !entry.piece.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const grouped = filtered.reduce((acc, entry) => {
      if (!acc[entry.compte]) {
        acc[entry.compte] = {
          compte: entry.compte,
          entries: [],
          totalDebit: 0,
          totalCredit: 0,
          solde: 0,
          nonLettres: 0
        };
      }
      acc[entry.compte].entries.push(entry);
      acc[entry.compte].totalDebit += entry.debit;
      acc[entry.compte].totalCredit += entry.credit;
      acc[entry.compte].solde = acc[entry.compte].totalDebit - acc[entry.compte].totalCredit;
      if (!entry.lettrage) acc[entry.compte].nonLettres++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped);
  }, [mockEntries, showOnlyNonLettrage, searchTerm]);

  const toggleAccountExpansion = (compte: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(compte)) {
      newExpanded.delete(compte);
    } else {
      newExpanded.add(compte);
    }
    setExpandedAccounts(newExpanded);
  };

  const toggleEntrySelection = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleLettrage = useCallback(() => {
    const selectedEntriesData = mockEntries.filter(e => selectedEntries.has(e.id));
    const totalDebit = selectedEntriesData.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = selectedEntriesData.reduce((sum, e) => sum + e.credit, 0);

    // Générer un nouveau code de lettrage
    const generateCode = () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const existing = mockEntries.filter(e => e.lettrage).map(e => e.lettrage);
      let code = 'AA';
      let counter = 0;

      while (existing.includes(code) && counter < 1000) {
        const firstChar = Math.floor(counter / 26) % 26;
        const secondChar = counter % 26;
        code = letters[firstChar] + letters[secondChar];
        counter++;
      }
      return code;
    };

    const newCode = generateCode();

    // Enregistrer dans l'historique
    const newHistory: LettrageHistory = {
      id: Date.now().toString(),
      date: new Date(),
      user: 'Utilisateur actuel',
      action: 'create',
      code: newCode,
      ecritures: Array.from(selectedEntries),
      montant: Math.max(totalDebit, totalCredit)
    };

    setLettrageHistory(prev => [newHistory, ...prev]);

    // Notification de succès
    console.log(`Lettrage ${newCode} appliqué avec succès`);
    setSelectedEntries(new Set());
  }, [selectedEntries, mockEntries]);

  const handleDelettrage = useCallback((code: string) => {
    const ecritures = mockEntries.filter(e => e.lettrage === code);

    const newHistory: LettrageHistory = {
      id: Date.now().toString(),
      date: new Date(),
      user: 'Utilisateur actuel',
      action: 'delete',
      code: code,
      ecritures: ecritures.map(e => e.id),
      montant: ecritures.reduce((sum, e) => sum + (e.debit || e.credit), 0)
    };

    setLettrageHistory(prev => [newHistory, ...prev]);
    console.log(`Délettrage du code ${code} effectué`);
  }, [mockEntries]);

  const runAutoLettrage = useCallback(() => {
    console.log('Lancement du lettrage automatique avec config:', autoLettrageConfig);
    // Logique de lettrage automatique ici
    // Simulation d'un résultat
    setTimeout(() => {
      alert('Lettrage automatique terminé: 12 écritures lettrées');
    }, 1000);
  }, [autoLettrageConfig]);

  const canLettrage = useMemo(() => {
    if (selectedEntries.size < 2) return { valid: false, reason: 'Sélectionnez au moins 2 écritures' };
    const selectedEntriesData = mockEntries.filter(e => selectedEntries.has(e.id));
    const totalDebit = selectedEntriesData.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = selectedEntriesData.reduce((sum, e) => sum + e.credit, 0);
    const difference = Math.abs(totalDebit - totalCredit);

    if (lettrageMode === 'complete') {
      if (difference > tolerance) {
        return { valid: false, reason: `Écart de ${difference.toLocaleString('fr-FR')} FCFA` };
      }
      return { valid: true, reason: 'Équilibré' };
    } else {
      // Lettrage partiel
      if (totalDebit === 0 && totalCredit === 0) {
        return { valid: false, reason: 'Aucun montant à lettrer' };
      }
      return { valid: true, reason: 'Lettrage partiel possible', partial: true };
    }
  }, [selectedEntries, lettrageMode, tolerance]);

  // Calcul des statistiques
  useEffect(() => {
    const calculateStats = () => {
      const totalEcritures = mockEntries.length;
      const ecrituresLettrees = mockEntries.filter(e => e.lettrage).length;
      const ecrituresNonLettrees = totalEcritures - ecrituresLettrees;
      const montantNonLettre = mockEntries
        .filter(e => !e.lettrage)
        .reduce((sum, e) => sum + (e.debit || e.credit), 0);

      const comptes = new Set(mockEntries.map(e => e.compte));

      setStats({
        totalComptes: comptes.size,
        totalEcritures,
        ecrituresLettrees,
        ecrituresNonLettrees,
        tauxLettrage: totalEcritures > 0 ? (ecrituresLettrees / totalEcritures) * 100 : 0,
        montantNonLettre,
        plusAncienneNonLettree: mockEntries
          .filter(e => !e.lettrage)
          .map(e => new Date(e.date))
          .sort((a, b) => a.getTime() - b.getTime())[0],
        dernierLettrage: new Date()
      });
    };

    calculateStats();
  }, [mockEntries]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* En-tête */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link2 className="w-8 h-8 text-[#6A8A82]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Module de Lettrage</h1>
              <p className="text-sm text-gray-600">Rapprochement et lettrage des comptes - Conforme SYSCOHADA</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Calendar className="w-4 h-4 mr-2 inline" />
              Période
            </button>
            <button className="px-4 py-2 text-sm bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]">
              <Download className="w-4 h-4 mr-2 inline" />
              Exporter
            </button>
          </div>
        </div>

        {/* Onglets de mode */}
        <div className="flex space-x-1 mt-4 overflow-x-auto">
          <button
            onClick={() => setViewMode('manual')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'manual'
                ? 'bg-[#6A8A82] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Link2 className="w-4 h-4 mr-2 inline" />
            Lettrage Manuel
          </button>
          <button
            onClick={() => setViewMode('automatic')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'automatic'
                ? 'bg-[#6A8A82] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Zap className="w-4 h-4 mr-2 inline" />
            Lettrage Automatique
          </button>
          <button
            onClick={() => setViewMode('analysis')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'analysis'
                ? 'bg-[#6A8A82] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Analyse & Statistiques
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'history'
                ? 'bg-[#6A8A82] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <History className="w-4 h-4 mr-2 inline" />
            Historique
          </button>
          <button
            onClick={() => setViewMode('config')}
            className={`px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
              viewMode === 'config'
                ? 'bg-[#6A8A82] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            Configuration
          </button>
        </div>
      </div>

      {/* Mode Lettrage Manuel */}
      {viewMode === 'manual' && (
        <div className="flex-1 p-6 space-y-6">
          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par libellé ou numéro de pièce..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
                  />
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showOnlyNonLettrage}
                    onChange={(e) => setShowOnlyNonLettrage(e.target.checked)}
                    className="rounded border-gray-300 text-[#6A8A82] focus:ring-[#6A8A82]"
                  />
                  <span className="text-sm text-gray-600">Écritures non lettrées uniquement</span>
                </label>

                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">Tous les comptes</option>
                  <option value="411">411 - Clients</option>
                  <option value="401">401 - Fournisseurs</option>
                  <option value="42">42 - Personnel</option>
                  <option value="44">44 - État et collectivités</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                {/* Toggle lettrage partiel */}
                <label className="flex items-center space-x-2 mr-4">
                  <input
                    type="checkbox"
                    checked={lettrageMode === 'partial'}
                    onChange={(e) => setLettrageMode(e.target.checked ? 'partial' : 'complete')}
                    className="rounded border-gray-300 text-[#6A8A82] focus:ring-[#6A8A82]"
                  />
                  <span className="text-sm text-gray-600">Lettrage partiel</span>
                </label>

                <button
                  onClick={handleLettrage}
                  disabled={!canLettrage.valid}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    canLettrage.valid
                      ? canLettrage.partial
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-700 cursor-not-allowed'
                  }`}
                  title={canLettrage.reason} aria-label="Valider">
                  {canLettrage.partial ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 inline" />
                      Lettrage Partiel
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2 inline" />
                      Lettrer
                    </>
                  )}
                  ({selectedEntries.size})
                </button>
                <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">
                  <Unlink className="w-4 h-4 mr-2 inline" />
                  Délettrer
                </button>
              </div>
            </div>
          </div>

          {/* Indicateurs améliorés */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total comptes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalComptes}</p>
                  <p className="text-xs text-gray-700 mt-1">{stats.totalEcritures} écritures</p>
                </div>
                <Database className="w-8 h-8 text-gray-700" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Non lettrées</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.ecrituresNonLettrees}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    {stats.montantNonLettre.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Lettrées</p>
                  <p className="text-2xl font-bold text-green-600">{stats.ecrituresLettrees}</p>
                  <p className="text-xs text-green-500 mt-1">Complètement</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taux lettrage</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.tauxLettrage.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${stats.tauxLettrage}%` }}
                    />
                  </div>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Plus ancienne</p>
                  <p className="text-lg font-bold text-red-600">
                    {stats.plusAncienneNonLettree
                      ? Math.floor((Date.now() - stats.plusAncienneNonLettree.getTime()) / (1000 * 60 * 60 * 24))
                      : 0} jours
                  </p>
                  <p className="text-xs text-gray-700 mt-1">Non lettrée</p>
                </div>
                <Clock className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Liste des comptes et écritures */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              {groupedEntries.map((group) => (
                <div key={group.compte} className="border-b border-gray-200 last:border-b-0">
                  {/* En-tête du compte */}
                  <div
                    className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleAccountExpansion(group.compte)}
                  >
                    <div className="flex items-center space-x-3">
                      {expandedAccounts.has(group.compte) ? (
                        <ChevronDown className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      )}
                      <div>
                        <span className="font-mono font-bold text-[#6A8A82]">{group.compte}</span>
                        <span className="ml-2 text-gray-700">
                          {group.compte.startsWith('411') ? t('thirdParty.customers') :
                           group.compte.startsWith('401') ? t('thirdParty.suppliers') :
                           'Compte tiers'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-sm">
                        <span className="text-gray-600">Solde:</span>
                        <span className={`ml-2 font-bold ${group.solde > 0 ? 'text-red-600' : group.solde < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {Math.abs(group.solde).toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="ml-1 text-gray-700">
                          {group.solde > 0 ? '(Débiteur)' : group.solde < 0 ? '(Créditeur)' : '(Soldé)'}
                        </span>
                      </div>
                      {group.nonLettres > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                          {group.nonLettres} non lettrées
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Écritures du compte */}
                  {expandedAccounts.has(group.compte) && (
                    <div className="bg-white">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300"
                                onChange={(e) => {
                                  const accountEntries = group.entries.filter((e: LettrageEntry) => !e.lettrage);
                                  if (e.target.checked) {
                                    const newSelected = new Set(selectedEntries);
                                    accountEntries.forEach((entry: LettrageEntry) => newSelected.add(entry.id));
                                    setSelectedEntries(newSelected);
                                  } else {
                                    const newSelected = new Set(selectedEntries);
                                    accountEntries.forEach((entry: LettrageEntry) => newSelected.delete(entry.id));
                                    setSelectedEntries(newSelected);
                                  }
                                }}
                              />
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('common.date')}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.piece')}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.label')}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Tiers</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{t('accounting.journal')}</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t('accounting.debit')}</th>
                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">{t('accounting.credit')}</th>
                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">{t('thirdParty.matching')}</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Échéance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.entries.map((entry: LettrageEntry, index: number) => (
                            <tr
                              key={entry.id}
                              className={`border-t hover:bg-gray-50 ${
                                selectedEntries.has(entry.id) ? 'bg-blue-50' : ''
                              }`}
                            >
                              <td className="px-4 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedEntries.has(entry.id)}
                                  onChange={() => toggleEntrySelection(entry.id)}
                                  disabled={!!entry.lettrage}
                                  className="rounded border-gray-300 disabled:opacity-50"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {new Date(entry.date).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-2 text-sm font-mono text-gray-800">{entry.piece}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{entry.libelle}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{entry.tiers}</td>
                              <td className="px-4 py-2 text-center">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                                  {entry.journal}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-red-600 font-medium">
                                {entry.debit > 0 ? entry.debit.toLocaleString('fr-FR') : '-'}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-green-600 font-medium">
                                {entry.credit > 0 ? entry.credit.toLocaleString('fr-FR') : '-'}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {entry.lettrage ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                                    {entry.lettrage}
                                  </span>
                                ) : (
                                  <span className="text-gray-700">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600">
                                {entry.echeance ? new Date(entry.echeance).toLocaleDateString('fr-FR') : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Barre d'information sur la sélection */}
          {selectedEntries.size > 0 && (
            <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedEntries.size} écritures sélectionnées
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {canLettrage ? (
                      <span className="text-green-600 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Équilibré - Prêt pour le lettrage
                      </span>
                    ) : (
                      <span className="text-orange-600 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Non équilibré - Sélectionnez d'autres écritures
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEntries(new Set())}
                  className="text-gray-700 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode Lettrage Automatique */}
      {viewMode === 'automatic' && (
        <div className="flex-1 p-6 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lettrage Automatique</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critères de rapprochement
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2 rounded border-gray-300 text-[#6A8A82]" />
                    <span className="text-sm">Par montant exact</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2 rounded border-gray-300 text-[#6A8A82]" />
                    <span className="text-sm">Par numéro de pièce</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-[#6A8A82]" />
                    <span className="text-sm">Par référence client/fournisseur</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-[#6A8A82]" />
                    <span className="text-sm">Lettrage partiel autorisé</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de rapprochement
                </label>
                <div className="flex space-x-4">
                  <input
                    type="date"
                    defaultValue="2024-01-01"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="date"
                    defaultValue="2024-12-31"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comptes à traiter
                </label>
                <select multiple className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-32">
                  <option value="411" selected>411 - Clients</option>
                  <option value="401" selected>401 - Fournisseurs</option>
                  <option value="42">42 - Personnel</option>
                  <option value="44">44 - État et collectivités</option>
                  <option value="46">46 - Débiteurs et créditeurs divers</option>
                </select>
              </div>

              <div className="pt-4 flex space-x-3">
                <button className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]">
                  <RefreshCw className="w-4 h-4 mr-2 inline" />
                  Lancer le lettrage automatique
                </button>
                <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Eye className="w-4 h-4 mr-2 inline" />
                  Aperçu
                </button>
              </div>
            </div>
          </div>

          {/* Résultats du lettrage automatique */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Résultats de la simulation</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900">
                    Simulation du lettrage automatique sur les comptes sélectionnés
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-blue-800">
                    <li>• 12 écritures peuvent être lettrées automatiquement</li>
                    <li>• 3 rapprochements par montant exact</li>
                    <li>• 2 rapprochements par numéro de pièce</li>
                    <li>• 4 écritures restent non lettrées</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Analyse */}
      {viewMode === 'analysis' && (
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Statistiques par compte */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse par compte</h3>
              <div className="space-y-3">
                {groupedEntries.map((group) => {
                  const lettrees = group.entries.filter((e: LettrageEntry) => e.lettrage).length;
                  const total = group.entries.length;
                  const percentage = total > 0 ? (lettrees / total) * 100 : 0;

                  return (
                    <div key={group.compte} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-mono text-gray-700">{group.compte}</span>
                          <span className="text-sm text-gray-600">
                            {lettrees}/{total} ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Écritures en attente */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Écritures anciennes non lettrées</h3>
              <div className="space-y-2">
                {mockEntries
                  .filter(e => !e.lettrage)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.piece}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(entry.date).toLocaleDateString('fr-FR')} - {entry.libelle.substring(0, 30)}...
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {(entry.debit || entry.credit).toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-xs text-gray-700">
                          {Math.floor((Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24))} jours
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Recommandations */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommandations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Écritures anciennes</p>
                <p className="text-xs text-gray-600 mt-1">
                  4 écritures de plus de 60 jours nécessitent une attention particulière
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Info className="w-6 h-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Lettrage partiel possible</p>
                <p className="text-xs text-gray-600 mt-1">
                  Activez le lettrage partiel pour traiter les règlements partiels
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Bon taux de lettrage</p>
                <p className="text-xs text-gray-600 mt-1">
                  Le taux de lettrage global de 75% est satisfaisant
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Historique */}
      {viewMode === 'history' && (
        <div className="flex-1 p-6 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Historique des opérations de lettrage</h3>
              <div className="flex items-center space-x-3">
                <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  <option>Toutes les actions</option>
                  <option>Lettrages créés</option>
                  <option>Lettrages supprimés</option>
                  <option>Modifications</option>
                </select>
                <input
                  type="date"
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
                <button className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <Filter className="w-4 h-4 mr-2 inline" />
                  Filtrer
                </button>
              </div>
            </div>

            {/* Tableau historique */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Date/Heure</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Code Lettrage</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">{t('navigation.entries')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700">Montant</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lettrageHistory.map((history) => (
                    <tr key={history.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {history.date.toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{history.user}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          history.action === 'create' ? 'bg-green-100 text-green-800' :
                          history.action === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {history.action === 'create' ? 'Création' :
                           history.action === 'delete' ? 'Suppression' : 'Modification'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{history.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{history.ecritures.length} écritures</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {history.montant.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3 text-center">
                        <CheckCircle className="w-4 h-4 text-green-500 inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Affichage de 1 à {lettrageHistory.length} sur {lettrageHistory.length} résultats
              </p>
              <div className="flex space-x-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Précédent
                </button>
                <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded">1</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Suivant
                </button>
              </div>
            </div>
          </div>

          {/* Statistiques historiques */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Activité mensuelle</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lettrages créés</span>
                  <span className="text-sm font-bold text-green-600">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Lettrages supprimés</span>
                  <span className="text-sm font-bold text-red-600">15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Modifications</span>
                  <span className="text-sm font-bold text-blue-600">23</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">Utilisateurs actifs</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Marie Durand</span>
                  </div>
                  <span className="text-sm font-bold">45</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gray-300 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-600">Jean Martin</span>
                  </div>
                  <span className="text-sm font-bold">38</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">{t('dashboard.performance')}</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Temps moyen</span>
                    <span className="font-bold">2.3s</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Taux de succès</span>
                    <span className="font-bold">98.5%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Configuration */}
      {viewMode === 'config' && (
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuration du lettrage automatique */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Configuration du lettrage automatique</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Critères de rapprochement
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parMontant}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parMontant: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                      />
                      <span className="text-sm">Par montant exact</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parReference}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parReference: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                      />
                      <span className="text-sm">Par référence de pièce</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parTiers}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parTiers: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                      />
                      <span className="text-sm">Par tiers</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={autoLettrageConfig.parDate}
                        onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, parDate: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                      />
                      <span className="text-sm">Par proximité de date</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tolérance d'écart (FCFA)
                  </label>
                  <input
                    type="number"
                    value={autoLettrageConfig.tolerance}
                    onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, tolerance: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période maximale (jours)
                  </label>
                  <input
                    type="number"
                    value={autoLettrageConfig.periodeMax}
                    onChange={(e) => setAutoLettrageConfig({...autoLettrageConfig, periodeMax: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <button
                  onClick={() => console.log('Configuration sauvegardée:', autoLettrageConfig)}
                  className="w-full px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]"
                >
                  <Save className="w-4 h-4 mr-2 inline" />
                  Sauvegarder la configuration
                </button>
              </div>
            </div>

            {/* Paramètres généraux */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Paramètres généraux</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format des codes de lettrage
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Alphabétique (AA, AB, AC...)</option>
                    <option>Numérique (001, 002, 003...)</option>
                    <option>Alphanumérique (A01, A02...)</option>
                    <option>Date + Séquence (20240101...)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prochain code disponible
                  </label>
                  <input
                    type="text"
                    value="AA"
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                    />
                    <span className="text-sm">Autoriser le lettrage partiel</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mr-2 rounded border-gray-300 text-[#6A8A82]"
                    />
                    <span className="text-sm">Envoyer des notifications pour les écritures anciennes</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seuil d'alerte (jours)
                  </label>
                  <input
                    type="number"
                    defaultValue="60"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Droits et permissions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Droits et permissions</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Rôle</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Consulter</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Lettrer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Délettrer</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">Lettrage Auto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700">{t('settings.configuration')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Administrateur</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Comptable</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Assistant</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Consultant</td>
                    <td className="px-4 py-3 text-center">
                      <CheckCircle className="w-5 h-5 text-green-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <XCircle className="w-5 h-5 text-red-500 inline" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

    {/* Modal de sélection de période */}
    <PeriodSelectorModal
      isOpen={showPeriodModal}
      onClose={() => setShowPeriodModal(false)}
      onApply={(range) => setDateRange(range)}
      initialDateRange={dateRange}
    />
  </div>
  );
};

export default Lettrage;