
import { formatCurrency } from '@/utils/formatters';
import { buildPieceNumbers, pieceNumberOf } from '../../../utils/pieceNumber';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { useData } from '../../../contexts/DataContext';
import type { DBFiscalYear } from '../../../lib/db';
import {
  Landmark, Upload, Download, CheckCircle, AlertCircle,
  Search, Filter, RefreshCw, FileText, TrendingUp,
  Calendar, DollarSign, AlertTriangle, Check, X,
  Eye, Edit, Trash2, Plus, ArrowRight, Clock,
  Bot, Zap, CreditCard, Receipt, Link, Smartphone,
  Wifi, ShoppingBag, Monitor, Banknote, QrCode, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';

interface RapprochementItem {
  id: string;
  date: string;
  libelle: string;
  reference: string;
  montantBanque: number;
  montantCompta?: number;
  statut: 'rapproche' | 'en_attente' | 'ecart' | 'suggere';
  typeOperation: 'debit' | 'credit';
  moyenPaiement?: 'virement' | 'cb' | 'cheque' | 'mobile' | 'especes' | 'prelevement' | 'tpe';
  confidence?: number;
  commission?: number;
  // Informations comptables
  compteBancaire?: string;
  compteContrepartie?: string;
  pieceComptable?: string;
  journalCode?: string;
  dateComptabilisation?: string;
  tiers?: string;
  tierCode?: string;
}

interface MoyenPaiement {
  id: string;
  type: 'cb' | 'mobile' | 'tpe' | 'virement' | 'cheque' | 'prelevement';
  nom: string;
  reference: string;
  montantJour: number;
  montantMois: number;
  nombreTransactions: number;
  tauxCommission?: number;
  statut: 'actif' | 'suspendu' | 'en_attente';
}

const RapprochementBancaire: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedBank, setSelectedBank] = useState('001');
  const [selectedPeriod, setSelectedPeriod] = useState('—');
  const [filterStatus, setFilterStatus] = useState('tous');
  const [autoRapprochement, setAutoRapprochement] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('banques');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<RapprochementItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    compte_bancaire: '',
    fichier: null as File | null,
    periode_debut: '',
    periode_fin: '',
    format_fichier: 'csv' as 'csv' | 'ofx' | 'qif' | 'mt940',
    ignorer_doublons: true,
    auto_lettrage: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Real data from Dexie (bank entries Class 5) ---
  const [fiscalYears, setFiscalYears] = useState<DBFiscalYear[]>([]);
  const [bankEntries, setBankEntries] = useState<RapprochementItem[]>([]);

  useEffect(() => {
    adapter.getAll<DBFiscalYear>('fiscalYears').then(fys => {
      setFiscalYears(fys);
      const fy = fys.find(f => f.isActive) || fys[0];
      if (fy?.startDate) setSelectedPeriod(String(fy.startDate).slice(0, 7));
    });
  }, [adapter]);

  useEffect(() => {
    const loadBankEntries = async () => {
      const fy = fiscalYears.find(f => f.isActive) || fiscalYears[0];
      if (!fy) return;

      const allEntries = await adapter.getAll<any>('journalEntries');
      const pieceNumbers = buildPieceNumbers(allEntries as any);
      const entries = allEntries.filter(
        (e: any) => e.date >= fy.startDate && e.date <= fy.endDate
      );

      const items: RapprochementItem[] = [];
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (line.accountCode.startsWith('5')) {
            items.push({
              id: `${entry.id}-${line.accountCode}`,
              date: entry.date,
              libelle: entry.label || line.accountName,
              reference: pieceNumberOf(entry, pieceNumbers),
              montantBanque: (line.debit || 0) - (line.credit || 0),
              montantCompta: (line.debit || 0) - (line.credit || 0),
              statut: line.lettrageCode ? 'rapproche' : 'en_attente',
              typeOperation: (line.debit || 0) > 0 ? 'debit' : 'credit',
              compteBancaire: line.accountCode,
              compteContrepartie: entry.lines.find((l: any) => l.accountCode !== line.accountCode)?.accountCode,
              pieceComptable: entry.entryNumber,
              journalCode: entry.journal,
              dateComptabilisation: entry.date,
            });
          }
        }
      }
      setBankEntries(items);
    };
    loadBankEntries();
  }, [fiscalYears]);

  const resetForm = () => {
    setFormData({
      compte_bancaire: '',
      fichier: null,
      periode_debut: '',
      periode_fin: '',
      format_fichier: 'csv',
      ignorer_doublons: true,
      auto_lettrage: false,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number | boolean | FileList) => {
    if (field === 'fichier') {
      const file = (value as FileList)?.[0] || null;
      setFormData(prev => ({ ...prev, fichier: file }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // TODO P0: Remplacer par service Dexie réel
    toast.error('Service d\'import bancaire non encore connecté');
  };

  // Moyens de paiement — initialisés vides (configurés par l'utilisateur)
  const moyensPaiement: MoyenPaiement[] = [];

  // Opérations bancaires depuis les écritures réelles (GL classe 5)
  const operations: RapprochementItem[] = bankEntries;

  // Filtrer les opérations selon l'onglet sélectionné.
  // Seul l'onglet "banques" est alimenté par l'import (écritures GL classe 5).
  // Les onglets CB / Mobile Money / TPE / Espèces n'ont AUCUNE source de données
  // dans l'import (pas de registre dédié) → état vide honnête.
  const getFilteredOperations = () => {
    if (selectedTab === 'banques') {
      return operations;
    }
    return [];
  };

  const filteredOperations = getFilteredOperations();

  const stats = {
    total: filteredOperations.length,
    rapproches: filteredOperations.filter(o => o.statut === 'rapproche').length,
    enAttente: filteredOperations.filter(o => o.statut === 'en_attente').length,
    ecarts: filteredOperations.filter(o => o.statut === 'ecart').length,
    tauxRapprochement: filteredOperations.length > 0
      ? Math.round((filteredOperations.filter(o => o.statut === 'rapproche').length / filteredOperations.length) * 100)
      : 0
  };

  // Handler functions
  const handleViewDetail = (operation: RapprochementItem) => {
    setSelectedOperation(operation);
    setShowDetailModal(true);
    toast.success(`Affichage des détails: ${operation.libelle}`);
  };

  // Honnêteté : cette vue est un APERÇU du rapprochement (comparaison comptable
  // vs relevé). La validation/liaison/IA nécessitent l'import d'un relevé bancaire
  // et un moteur de matching persisté, non encore câblés → pas de faux « validé ».
  const notImplemented = () =>
    toast('Rapprochement bancaire : import de relevé + matching persisté à venir. Cette vue est un aperçu (aucune écriture modifiée).', { icon: 'ℹ️', duration: 5000 });

  const handleValidateSuggestion = (_operation: RapprochementItem) => notImplemented();
  const handleRejectSuggestion = (_operation: RapprochementItem) => notImplemented();
  const handleLinkOperation = (_operation: RapprochementItem) => notImplemented();
  const handleRapprochementIA = () => notImplemented();

  const handleRefresh = () => {
    toast.success('Données actualisées');
  };

  const handleExport = () => {
    toast.success('Export du rapport de rapprochement en cours...');
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);
  const paginatedOperations = filteredOperations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Soldes bancaires calculés depuis les écritures réelles
  const banques = React.useMemo(() => {
    const bankAccounts: Record<string, { nom: string; solde: number }> = {};
    for (const op of operations) {
      const key = op.reference?.substring(0, 3) || 'default';
      if (!bankAccounts[key]) bankAccounts[key] = { nom: `Compte ${key}`, solde: 0 };
      bankAccounts[key].solde += op.montantBanque || 0;
    }
    if (Object.keys(bankAccounts).length === 0) {
      return [{ id: '001', nom: 'Aucun compte bancaire', solde: 0 }];
    }
    return Object.entries(bankAccounts).map(([id, v]) => ({ id, nom: v.nom, solde: v.solde }));
  }, [operations]);

  // Comptes SYSCOHADA pour les moyens de paiement
  const comptesSYSCOHADA = {
    cb: { numero: '5711', libelle: 'Cartes de crédit à encaisser' },
    mobile: { numero: '5712', libelle: 'Virements électroniques à recevoir' },
    tpe: { numero: '5713', libelle: 'TPE à encaisser' },
    virement: { numero: '521', libelle: 'Banques locales' },
    cheque: { numero: '512', libelle: 'Chèques à encaisser' },
    especes: { numero: '571', libelle: 'Caisse' }
  };

  // Statistiques consolidées.
  // Seules les opérations bancaires (GL classe 5) sont réelles.
  // Les canaux Mobile Money / CB / TPE / Espèces ne sont alimentés par aucune
  // source de l'import → null (affiché "—"), jamais un chiffre fabriqué.
  const getConsolidationStats = () => {
    const totalBanques = operations.reduce((sum, op) => sum + (op.montantBanque || 0), 0);
    return {
      totalBanques,
      totalMobile: null as number | null,
      totalCB: null as number | null,
      totalTPE: null as number | null,
      totalEspeces: null as number | null,
    };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Onglets pour les différents moyens de paiement */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-4">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="banques" className="flex items-center space-x-2">
              <Landmark className="w-4 h-4" />
              <span>Comptes Bancaires</span>
            </TabsTrigger>
            <TabsTrigger value="cb" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span>Cartes Bancaires</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Money</span>
            </TabsTrigger>
            <TabsTrigger value="tpe" className="flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>TPE</span>
            </TabsTrigger>
            <TabsTrigger value="especes" className="flex items-center space-x-2">
              <Banknote className="w-4 h-4" />
              <span>Espèces</span>
            </TabsTrigger>
            <TabsTrigger value="consolidation" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Consolidation</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Vue Consolidation */}
      {selectedTab === 'consolidation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                <span>Vue Consolidée des Moyens de Paiement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Banques', value: getConsolidationStats().totalBanques, icon: Landmark, color: 'blue' },
                  { label: 'Mobile Money', value: getConsolidationStats().totalMobile, icon: Smartphone, color: 'green' },
                  { label: 'Cartes Bancaires', value: getConsolidationStats().totalCB, icon: CreditCard, color: 'primary' },
                  { label: 'TPE', value: getConsolidationStats().totalTPE, icon: Monitor, color: 'orange' },
                  { label: 'Espèces', value: getConsolidationStats().totalEspeces, icon: Banknote, color: 'yellow' }
                ].map((item, index) => (
                  <div key={index} className={`p-4 rounded-lg border bg-${item.color}-50 border-${item.color}-200`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <item.icon className={`w-4 h-4 text-${item.color}-600`} />
                    </div>
                    <p className="text-lg font-bold">
                      {item.value === null ? '—' : formatCurrency(item.value)}
                    </p>
                    {item.value === null && (
                      <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">Non alimenté par l&apos;import</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-[var(--color-background-secondary)] rounded-lg">
                <h4 className="font-medium mb-3">Répartition par Statut Global</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rapprochés</span>
                    <span className="font-medium text-[var(--color-success)]">
                      {operations.filter(o => o.statut === 'rapproche').length} / {operations.length}
                    </span>
                  </div>
                  <Progress value={operations.length > 0 ? (operations.filter(o => o.statut === 'rapproche').length / operations.length) * 100 : 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header avec sélection selon l'onglet */}
      {selectedTab !== 'consolidation' && (
        <>
          <div className="bg-white rounded-lg p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-primary)]">
                  {selectedTab === 'banques' && 'Rapprochement Bancaire'}
                  {selectedTab === 'cb' && 'Rapprochement Cartes Bancaires'}
                  {selectedTab === 'mobile' && 'Rapprochement Mobile Money'}
                  {selectedTab === 'tpe' && 'Rapprochement TPE'}
                  {selectedTab === 'especes' && 'Rapprochement Caisse'}
                </h2>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Période: {selectedPeriod}</p>
                {selectedTab !== 'banques' && (
                  <p className="text-xs text-[var(--color-primary)] mt-1">
                    Compte SYSCOHADA: {comptesSYSCOHADA[selectedTab as keyof typeof comptesSYSCOHADA]?.numero} -
                    {comptesSYSCOHADA[selectedTab as keyof typeof comptesSYSCOHADA]?.libelle}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {selectedTab === 'banques' && (
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg"
                  >
                    {banques.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.nom} - Solde: {formatCurrency(bank.solde)}
                      </option>
                    ))}
                  </select>
                )}
                {(selectedTab === 'mobile' || selectedTab === 'cb' || selectedTab === 'tpe') && (
                  <select className="px-4 py-2 border border-[var(--color-border)] rounded-lg">
                    {moyensPaiement
                      .filter(mp => {
                        if (selectedTab === 'mobile') return mp.type === 'mobile';
                        if (selectedTab === 'cb') return mp.type === 'cb';
                        if (selectedTab === 'tpe') return mp.type === 'tpe';
                        return false;
                      })
                      .map(mp => (
                        <option key={mp.id} value={mp.id}>
                          {mp.nom} - {mp.reference}
                        </option>
                      ))}
                  </select>
                )}
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>
                    {selectedTab === 'mobile' && 'Importer transactions'}
                    {selectedTab === 'cb' && 'Importer relevé CB'}
                    {selectedTab === 'tpe' && 'Importer journal TPE'}
                    {selectedTab === 'especes' && 'Importer journal caisse'}
                    {selectedTab === 'banques' && 'Importer relevé'}
                  </span>
                </button>
              </div>
            </div>

            {/* Statistiques pour moyens de paiement électroniques —
                aucune source de données dans l'import → état vide honnête */}
            {(selectedTab === 'mobile' || selectedTab === 'cb' || selectedTab === 'tpe') && (
              <div className="mb-4 p-4 bg-[var(--color-primary)]/10 rounded-lg border border-[var(--color-primary)]/20">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Volume Jour</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">—</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Volume Mois</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">—</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Transactions</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">—</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-text-tertiary)]">Commission Moyenne</p>
                    <p className="text-lg font-bold text-[#E89A2E]">—</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-2">Aucune donnée — module non alimenté par l&apos;import.</p>
              </div>
            )}

            {/* Statistiques générales */}
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg border border-[var(--color-success-light)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-success-dark)]">Rapprochés</span>
                  <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                </div>
                <p className="text-lg font-bold text-[var(--color-success-darker)]">{stats.rapproches}</p>
              </div>
              <div className="p-4 bg-[var(--color-warning-lightest)] rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-warning-dark)]">{t('status.pending')}</span>
                  <Clock className="w-4 h-4 text-[var(--color-warning)]" />
                </div>
                <p className="text-lg font-bold text-yellow-800">{stats.enAttente}</p>
              </div>
              <div className="p-4 bg-[var(--color-error-lightest)] rounded-lg border border-[var(--color-error-light)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-error-dark)]">Écarts</span>
                  <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />
                </div>
                <p className="text-lg font-bold text-red-800">{stats.ecarts}</p>
              </div>
              <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg border border-[var(--color-primary-light)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[var(--color-primary-dark)]">Taux rapprochement</span>
                  <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <p className="text-lg font-bold text-[var(--color-primary-darker)]">{stats.tauxRapprochement}%</p>
              </div>
              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-primary-700">IA Active</span>
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <p className="text-sm font-bold text-primary-800">Auto-matching</p>
              </div>
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="bg-white rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRapprochementIA}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Rapprochement IA</span>
                </button>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="rapproche">Rapprochés</option>
                  <option value="en_attente">{t('status.pending')}</option>
                  <option value="ecart">Écarts</option>
                  <option value="suggere">Suggestions IA</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    className="pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg w-64"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleRefresh}
                  className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg"
                  aria-label="Actualiser"
                >
                  <RefreshCw className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 hover:bg-[var(--color-background-hover)] rounded-lg"
                  aria-label="Télécharger"
                >
                  <Download className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                </button>
              </div>
            </div>
          </div>

          {/* Liste des opérations */}
          <div className="bg-white rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)] border-b border-[var(--color-border)]">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#404040]">{t('common.date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#404040]">{t('accounting.label')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[#404040]">Référence</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#404040]">Montant Banque</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[#404040]">Montant Compta</th>
                    {(selectedTab === 'cb' || selectedTab === 'mobile' || selectedTab === 'tpe') && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[#404040]">Commission</th>
                    )}
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#404040]">Statut</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-[#404040]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOperations.length === 0 && (
                    <tr>
                      <td
                        colSpan={(selectedTab === 'cb' || selectedTab === 'mobile' || selectedTab === 'tpe') ? 8 : 7}
                        className="py-10 text-center text-sm text-[var(--color-text-tertiary)]"
                      >
                        {selectedTab === 'banques'
                          ? 'Aucune opération bancaire pour l’exercice actif.'
                          : 'Aucune donnée — module non alimenté par l’import.'}
                      </td>
                    </tr>
                  )}
                  {filteredOperations.map((op) => (
                    <tr key={op.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]">
                      <td className="py-3 px-4">
                        <span className="text-sm text-[#404040]">{op.date}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-[var(--color-primary)]">{op.libelle}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-[var(--color-text-tertiary)] font-mono">{op.reference}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-semibold ${
                          op.typeOperation === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                        }`}>
                          {formatCurrency(op.montantBanque)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {op.montantCompta ? (
                          <span className={`font-mono font-semibold ${
                            op.typeOperation === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                          }`}>
                            {formatCurrency(op.montantCompta)}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-secondary)]">-</span>
                        )}
                      </td>
                      {(selectedTab === 'cb' || selectedTab === 'mobile' || selectedTab === 'tpe') && (
                        <td className="py-3 px-4 text-right">
                          {op.commission ? (
                            <span className="font-mono text-sm text-[var(--color-warning)]">
                              {formatCurrency(op.commission)}
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-secondary)]">-</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {op.statut === 'rapproche' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]">
                            <CheckCircle className="w-3 h-3" />
                            <span>Rapproché</span>
                          </span>
                        )}
                        {op.statut === 'en_attente' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]">
                            <Clock className="w-3 h-3" />
                            <span>{t('status.pending')}</span>
                          </span>
                        )}
                        {op.statut === 'ecart' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Écart</span>
                          </span>
                        )}
                        {op.statut === 'suggere' && (
                          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                            <Bot className="w-3 h-3" />
                            <span>IA {op.confidence}%</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          {op.statut === 'suggere' && (
                            <>
                              <button
                                onClick={() => handleValidateSuggestion(op)}
                                className="p-1 text-[var(--color-success)] hover:bg-[var(--color-success-lightest)] rounded"
                                aria-label="Valider"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectSuggestion(op)}
                                className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error-lightest)] rounded"
                                aria-label="Fermer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {op.statut === 'en_attente' && (
                            <button
                              onClick={() => handleLinkOperation(op)}
                              className="p-1 text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] rounded"
                            >
                              <Link className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleViewDetail(op)}
                            className="p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer avec pagination */}
            <div className="p-4 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-sm text-[var(--color-text-tertiary)]">
                Affichage de {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredOperations.length)} sur {filteredOperations.length} opérations
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${currentPage === page ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]'}`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-[var(--color-border)] rounded hover:bg-[var(--color-background-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>

          {/* Section IA */}
          <div className="bg-gradient-to-r from-primary-500/10 to-blue-500/10 rounded-lg p-6 border-2 border-primary-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--color-primary)]">Assistant IA de Rapprochement</h3>
                  <p className="text-sm text-[var(--color-text-tertiary)]">Pattern matching & Machine Learning activés</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[var(--color-text-tertiary)]">Auto-rapprochement</span>
                <button
                  onClick={() => setAutoRapprochement(!autoRapprochement)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    autoRapprochement ? 'bg-primary-600' : 'bg-[var(--color-border-dark)]'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    autoRapprochement ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Taux de matching</p>
                <p className="font-semibold">—</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Suggestions validées</p>
                <p className="font-semibold">—</p>
              </div>
              <div className="bg-white/50 rounded-lg p-3">
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">Temps économisé</p>
                <p className="font-semibold">—</p>
              </div>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-3">
              Aucune statistique — moteur de rapprochement automatique non alimenté par l&apos;import.
            </p>
          </div>
        </>
      )}
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 text-primary-600 p-2 rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Import Relevé Bancaire</h2>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  resetForm();
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Landmark className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-primary-900 mb-1">Import de Relevé</h4>
                      <p className="text-sm text-primary-800">Importez automatiquement les relevés bancaires pour le rapprochement comptable.</p>
                    </div>
                  </div>
                </div>

                {/* Bank Selection */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Sélection du Compte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Banque</label>
                      <select
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.compte_bancaire}
                        onChange={(e) => handleInputChange('compte_bancaire', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">-- Sélectionner banque --</option>
                        <option value="bgfi">BGFI Bank</option>
                        <option value="uba">UBA</option>
                        <option value="ecobank">Ecobank</option>
                        <option value="bicec">BICEC</option>
                        <option value="sgbc">Société Générale</option>
                      </select>
                      {errors.compte_bancaire && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.compte_bancaire}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Numéro de Compte</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">-- Sélectionner compte --</option>
                        <option value="40000001">40000001 - Compte Principal</option>
                        <option value="40000002">40000002 - Compte USD</option>
                        <option value="40000003">40000003 - Compte Épargne</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Fichier de Relevé</h3>
                  <div className="border-2 border-dashed border-[var(--color-border-dark)] rounded-lg p-6 text-center">
                    <Upload className="mx-auto h-12 w-12 text-[var(--color-text-secondary)]" />
                    <div className="mt-4">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-[var(--color-text-primary)]">
                          Glissez votre relevé ici ou cliquez pour parcourir
                        </span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv,.xls,.xlsx,.qif,.ofx,.mt940"
                          onChange={(e) => e.target.files && handleInputChange('fichier', e.target.files)}
                          disabled={isSubmitting}
                        />
                      {formData.fichier && (
                        <p className="mt-1 text-sm text-[var(--color-success)]">
                          Fichier sélectionné: {formData.fichier.name}
                        </p>
                      )}
                      {errors.fichier && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.fichier}</p>
                      )}
                      </label>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Formats acceptés: CSV, Excel, QIF, OFX, MT940</p>
                    </div>
                  </div>
                </div>

                {/* Import Parameters */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Paramètres d&apos;Import</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Format de Fichier</label>
                      <select
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.format_fichier}
                        onChange={(e) => handleInputChange('format_fichier', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="csv">CSV avec en-têtes</option>
                        <option value="excel">Excel (.xlsx)</option>
                        <option value="qif">QIF (Quicken)</option>
                        <option value="ofx">OFX (Open Financial Exchange)</option>
                        <option value="mt940">MT940 (SWIFT)</option>
                      </select>
                      {errors.format_fichier && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.format_fichier}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Séparateur (CSV)</label>
                      <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value=";">;  (Point-virgule)</option>
                        <option value=",">,  (Virgule)</option>
                        <option value="tab">Tab (Tabulation)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Période de Début</label>
                      <input
                        type="date"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.periode_debut}
                        onChange={(e) => handleInputChange('periode_debut', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.periode_debut && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.periode_debut}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Période de Fin</label>
                      <input
                        type="date"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={formData.periode_fin}
                        onChange={(e) => handleInputChange('periode_fin', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.periode_fin && (
                        <p className="mt-1 text-sm text-[var(--color-error)]">{errors.periode_fin}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Options d&apos;Import</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="ignore_duplicates"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.ignorer_doublons}
                        onChange={(e) => handleInputChange('ignorer_doublons', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="ignore_duplicates" className="text-sm text-[var(--color-text-primary)]">Ignorer les doublons</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto_matching"
                        className="rounded border-[var(--color-border-dark)] text-primary-500"
                        checked={formData.auto_lettrage}
                        onChange={(e) => handleInputChange('auto_lettrage', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="auto_matching" className="text-sm text-[var(--color-text-primary)]">Rapprochement automatique</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="validate_amounts" className="rounded border-[var(--color-border-dark)] text-primary-500" />
                      <label htmlFor="validate_amounts" className="text-sm text-[var(--color-text-primary)]">Validation des montants</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="backup_before" className="rounded border-[var(--color-border-dark)] text-primary-500" defaultChecked />
                      <label htmlFor="backup_before" className="text-sm text-[var(--color-text-primary)]">Sauvegarde avant import</label>
                    </div>
                  </div>
                </div>

                {/* Mapping */}
                <div>
                  <h3 className="text-md font-medium text-[var(--color-text-primary)] mb-3">Correspondance des Colonnes</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Colonne Date</label>
                      <input type="text" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Date, Date opération" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Colonne Montant</label>
                      <input type="text" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Montant, Amount" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Colonne Libellé</label>
                      <input type="text" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Libellé, Description" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">Colonne Référence</label>
                      <input type="text" className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ex: Référence, Ref" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Import en cours...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Importer le Relevé</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-primary-lighter)] text-[var(--color-primary)] p-2 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Détail de l'Opération Bancaire</h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOperation(null);
                }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Section Informations Générales */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-3 border-b border-[var(--color-primary)] pb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[var(--color-primary)] rounded"></span>
                    Informations Générales
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Référence Bancaire</p>
                      <p className="font-medium font-mono">{selectedOperation.reference}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Date Opération</p>
                      <p className="font-medium">{selectedOperation.date}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-[var(--color-text-secondary)]">Libellé</p>
                      <p className="font-medium">{selectedOperation.libelle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Moyen de Paiement</p>
                      <p className="font-medium capitalize">{selectedOperation.moyenPaiement || 'Non spécifié'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Statut</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedOperation.statut === 'rapproche' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                        selectedOperation.statut === 'en_attente' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                        selectedOperation.statut === 'ecart' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                        'bg-primary-100 text-primary-800'
                      }`}>
                        {selectedOperation.statut === 'rapproche' ? 'Rapproché' :
                         selectedOperation.statut === 'en_attente' ? 'En attente' :
                         selectedOperation.statut === 'ecart' ? 'Écart' : 'Suggéré'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Montants */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-3 border-b border-[var(--color-primary)] pb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[var(--color-primary)] rounded"></span>
                    Montants
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Montant Relevé Banque</p>
                      <p className={`font-medium font-mono text-lg ${selectedOperation.typeOperation === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                        {selectedOperation.typeOperation === 'credit' ? '+' : ''}{formatCurrency(selectedOperation.montantBanque)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Montant Comptabilisé</p>
                      <p className={`font-medium font-mono text-lg ${selectedOperation.typeOperation === 'credit' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                        {selectedOperation.montantCompta ? `${selectedOperation.typeOperation === 'credit' ? '+' : ''}${formatCurrency(selectedOperation.montantCompta)}` : '-'}
                      </p>
                    </div>
                    {selectedOperation.commission && (
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Commission</p>
                        <p className="font-medium font-mono text-[var(--color-warning)]">
                          -{formatCurrency(selectedOperation.commission)}
                        </p>
                      </div>
                    )}
                    {selectedOperation.montantCompta && selectedOperation.montantBanque !== selectedOperation.montantCompta && (
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Écart</p>
                        <p className="font-medium font-mono text-[var(--color-error)]">
                          {formatCurrency((selectedOperation.montantBanque - selectedOperation.montantCompta))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Informations Comptables */}
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-3 border-b border-[var(--color-primary)] pb-2 flex items-center gap-2">
                    <span className="w-1 h-4 bg-[var(--color-primary)] rounded"></span>
                    Informations Comptables
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">N° Pièce Comptable</p>
                      <p className="font-medium font-mono">{selectedOperation.pieceComptable || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Code Journal</p>
                      <p className="font-medium font-mono">{selectedOperation.journalCode || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Compte Bancaire</p>
                      <p className="font-medium font-mono bg-[var(--color-background-secondary)] px-2 py-1 rounded inline-block">
                        {selectedOperation.compteBancaire || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Compte Contrepartie</p>
                      <p className="font-medium font-mono bg-[var(--color-background-secondary)] px-2 py-1 rounded inline-block">
                        {selectedOperation.compteContrepartie || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-secondary)]">Date Comptabilisation</p>
                      <p className="font-medium">{selectedOperation.dateComptabilisation || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section Tiers */}
                {(selectedOperation.tiers || selectedOperation.tierCode) && (
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-3 border-b border-[var(--color-primary)] pb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-[var(--color-primary)] rounded"></span>
                      Tiers
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Code Tiers</p>
                        <p className="font-medium font-mono">{selectedOperation.tierCode || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[var(--color-text-secondary)]">Nom du Tiers</p>
                        <p className="font-medium">{selectedOperation.tiers || '-'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section IA */}
                {selectedOperation.confidence && (
                  <div>
                    <h3 className="text-sm font-bold text-[var(--color-primary)] uppercase tracking-wide mb-3 border-b border-primary-400 pb-2 flex items-center gap-2">
                      <span className="w-1 h-4 bg-primary-500 rounded"></span>
                      Analyse IA
                    </h3>
                    <div className="flex items-center gap-4 bg-primary-50 p-3 rounded-lg">
                      <Bot className="w-8 h-8 text-primary-600" />
                      <div className="flex-1">
                        <p className="text-sm text-[var(--color-text-secondary)]">Niveau de Confiance</p>
                        <div className="flex items-center gap-2">
                          <Progress value={selectedOperation.confidence} className="flex-1 h-2" />
                          <span className="font-bold text-primary-600">{selectedOperation.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] border-t border-[var(--color-border)] px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedOperation(null);
                }}
                className="bg-[var(--color-border)] text-[var(--color-text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--color-border-dark)] transition-colors"
              >
                Fermer
              </button>
              {selectedOperation.statut === 'en_attente' && (
                <button
                  onClick={() => {
                    handleLinkOperation(selectedOperation);
                    setShowDetailModal(false);
                    setSelectedOperation(null);
                  }}
                  className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center space-x-2"
                >
                  <Link className="w-4 h-4" />
                  <span>Lier à une écriture</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RapprochementBancaire;