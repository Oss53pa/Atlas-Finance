import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  rapprochementAutomatique,
  genererEtatRapprochement,
  appliquerRapprochement,
  parseBankStatementCSV,
} from '../../services/rapprochementBancaireService';
import type {
  RapprochementResult,
  BankTransaction,
  EtatRapprochement,
} from '../../services/rapprochementBancaireService';
import {
  GitCompare,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Zap
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox
} from '../../components/ui';
import { useBankAccounts } from '../../hooks';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import type { DBJournalEntry, DBBankStatement, DBBankStatementLine } from '../../lib/db';
import {
  getBankStatements,
  getBankStatementLines,
  createBankStatement,
  deleteBankStatement,
  type BankStatementSetupInfo,
} from '../../services/bankStatementService';

interface ReconciliationItem {
  id: string;
  date: string;
  date_valeur?: string;
  type_mouvement: string;
  libelle: string;
  description?: string;
  reference_comptable?: string;
  reference_banque?: string;
  montant_comptable: number;
  montant_banque: number;
  ecart_montant: number | null;
  type_ecart?: string;
  statut: string;
}

interface ReconciliationFilters {
  compte: string;
  periode_debut: string;
  periode_fin: string;
  statut: string;
  type_ecart: string;
}

const ReconciliationPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rapprochementResult, setRapprochementResult] = useState<RapprochementResult | null>(null);
  const [etatRapprochement, setEtatRapprochement] = useState<EtatRapprochement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [filters, setFilters] = useState<ReconciliationFilters>({
    compte: '',
    periode_debut: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periode_fin: new Date().toISOString().split('T')[0],
    statut: '',
    type_ecart: ''
  });
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reconciliationMode, setReconciliationMode] = useState<'manual' | 'auto'>('manual');

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: filters.periode_debut,
    end: filters.periode_fin
  });

  // États pour le modal de détail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);

  // Onglet principal : Rapprochement / Journal des relevés / Historique rapprochés validés
  const [mainTab, setMainTab] = useState<'rapprochement' | 'releves' | 'historique'>('rapprochement');

  // Journal des relevés bancaires importés
  const [statements, setStatements] = useState<DBBankStatement[]>([]);
  const [expandedStatementId, setExpandedStatementId] = useState<string | null>(null);
  const [statementLines, setStatementLines] = useState<DBBankStatementLine[]>([]);
  // Historique : toutes les lignes de relevé RAPPROCHÉES (validées), tous relevés confondus.
  const [reconciledHistory, setReconciledHistory] = useState<Array<DBBankStatementLine & { _stmt?: string }>>([]);
  const [showImportSetup, setShowImportSetup] = useState(false);
  const emptySetup: BankStatementSetupInfo = {
    accountCode: '521',
    accountLabel: 'Banque',
    bankName: '',
    periodStart: filters.periode_debut,
    periodEnd: filters.periode_fin,
    openingBalance: 0,
    closingBalance: 0,
    currency: 'XOF',
    fileName: '',
  };
  const [setupInfo, setSetupInfo] = useState<BankStatementSetupInfo>(emptySetup);

  const refreshStatements = useCallback(async () => {
    try {
      setStatements(await getBankStatements(adapter));
    } catch (error) {
      console.error('[ReconciliationPage] Erreur chargement relevés bancaires:', error);
    }
  }, [adapter]);

  useEffect(() => { refreshStatements(); }, [refreshStatements]);

  // Historique : charge toutes les lignes RAPPROCHÉES de tous les relevés (onglet actif).
  useEffect(() => {
    if (mainTab !== 'historique') return;
    let cancelled = false;
    (async () => {
      try {
        const all: Array<DBBankStatementLine & { _stmt?: string }> = [];
        for (const st of statements) {
          const lines = await getBankStatementLines(adapter, st.id);
          for (const ln of lines) {
            if (ln.reconciled) all.push({ ...ln, _stmt: st.fileName || st.id });
          }
        }
        if (!cancelled) setReconciledHistory(all.sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))));
      } catch (error) {
        console.error('[ReconciliationPage] Erreur chargement historique rapproché:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [mainTab, statements, adapter]);

  const toggleStatementDetail = useCallback(async (id: string) => {
    if (expandedStatementId === id) {
      setExpandedStatementId(null);
      setStatementLines([]);
      return;
    }
    setExpandedStatementId(id);
    try {
      setStatementLines(await getBankStatementLines(adapter, id));
    } catch (error) {
      console.error('[ReconciliationPage] Erreur chargement lignes relevé:', error);
      setStatementLines([]);
    }
  }, [adapter, expandedStatementId]);

  const handleDeleteStatement = useCallback(async (id: string) => {
    if (!confirm('Supprimer ce relevé et toutes ses lignes ?')) return;
    try {
      await deleteBankStatement(adapter, id);
      if (expandedStatementId === id) { setExpandedStatementId(null); setStatementLines([]); }
      await refreshStatements();
      toast.success('Relevé supprimé');
    } catch (error) {
      console.error('[ReconciliationPage] Erreur suppression relevé:', error);
      toast.error('Erreur lors de la suppression du relevé');
    }
  }, [adapter, expandedStatementId, refreshStatements]);

  const { data: bankAccounts } = useBankAccounts({
    page: 1,
    page_size: 100,
  });

  // Derive display data from rapprochementResult
  const reconciliationItems: ReconciliationItem[] = rapprochementResult
    ? [
        ...rapprochementResult.matches.map((m) => ({
          id: m.bankTransactionId,
          date: bankTransactions.find((tx) => tx.id === m.bankTransactionId)?.date || '',
          type_mouvement: m.bankAmount >= 0 ? 'Crédit' : 'Débit',
          libelle: bankTransactions.find((tx) => tx.id === m.bankTransactionId)?.label || '',
          reference_comptable: m.entryIds.join(', '),
          reference_banque: m.bankTransactionId,
          montant_comptable: m.comptaAmount,
          montant_banque: m.bankAmount,
          ecart_montant: m.ecart,
          type_ecart: m.ecart > 0 ? 'montant' : undefined,
          statut: 'rapproche' as const,
        })),
        ...rapprochementResult.unmatchedBank.map((tx) => ({
          id: tx.id,
          date: tx.date,
          type_mouvement: tx.amount >= 0 ? 'Crédit' : 'Débit',
          libelle: tx.label,
          reference_banque: tx.reference,
          montant_comptable: 0,
          montant_banque: tx.amount,
          ecart_montant: Math.abs(tx.amount),
          type_ecart: 'absent_comptable',
          statut: 'non_rapproche' as const,
        })),
        ...rapprochementResult.unmatchedCompta.map((cl) => ({
          id: cl.lineId,
          date: cl.date,
          type_mouvement: cl.amount >= 0 ? 'Crédit' : 'Débit',
          libelle: cl.label,
          reference_comptable: cl.entryId,
          montant_comptable: cl.amount,
          montant_banque: 0,
          ecart_montant: Math.abs(cl.amount),
          type_ecart: 'absent_banque',
          statut: 'non_rapproche' as const,
        })),
      ]
    : [];

  // Appliquer les filtres statut et type_ecart sur les items (warnings 18/19)
  const PAGE_SIZE = 50;
  const filteredItems = reconciliationItems.filter(item => {
    if (filters.statut && item.statut !== filters.statut) return false;
    if (filters.type_ecart && item.type_ecart !== filters.type_ecart) return false;
    return true;
  });
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reconciliationData = {
    count: filteredItems.length,
    results: paginatedItems,
    matched_count: rapprochementResult?.matches.length || 0,
    unmatched_count: (rapprochementResult?.unmatchedBank.length || 0) + (rapprochementResult?.unmatchedCompta.length || 0),
    total_difference: rapprochementResult?.ecart || 0,
    match_rate: rapprochementResult?.tauxRapprochement ? Math.round(rapprochementResult.tauxRapprochement) : 0,
  };

  // CSV Import handler
  const handleImportCSV = useCallback(async (csvContent: string) => {
    const transactions = parseBankStatementCSV(csvContent);
    if (transactions.length === 0) {
      toast.error('Aucune transaction trouvée dans le fichier CSV');
      return;
    }
    setBankTransactions(transactions);
    toast.success(`${transactions.length} transactions bancaires importées`);
    // Auto-run rapprochement
    setIsLoading(true);
    try {
      const result = await rapprochementAutomatique(adapter, transactions);
      setRapprochementResult(result);
      // Generate état de rapprochement uniquement si un compte est identifié
      const compte = setupInfo.accountCode || filters.compte || '';
      if (compte) {
        const etat = await genererEtatRapprochement(compte, transactions, result);
        setEtatRapprochement(etat);
      }

      // Persister le relevé dans le journal des relevés
      try {
        // Reporter le statut de rapprochement sur les transactions persistées
        const matchedIds = new Set(result.matches.map(m => m.bankTransactionId));
        const persisted = transactions.map(tx => ({
          ...tx,
          matched: matchedIds.has(tx.id),
          matchedEntryIds: result.matches.find(m => m.bankTransactionId === tx.id)?.entryIds,
        }));
        await createBankStatement(adapter, setupInfo, persisted);
        await refreshStatements();
      } catch (persistError) {
        console.error('[ReconciliationPage] Erreur persistance relevé (best-effort):', persistError);
      }

      toast.success(`Rapprochement terminé : ${result.matches.length} correspondances trouvées`);
    } catch (error) {
      console.error('[ReconciliationPage] Erreur rapprochement automatique:', error);
      toast.error('Erreur lors du rapprochement automatique');
    } finally {
      setIsLoading(false);
      setShowImportSetup(false);
    }
  }, [adapter, filters.compte, setupInfo, refreshStatements]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSetupInfo(prev => ({ ...prev, fileName: file.name }));
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvContent = event.target?.result as string;
      if (csvContent) handleImportCSV(csvContent);
    };
    reader.readAsText(file);
    // Reset file input so the same file can be re-imported
    e.target.value = '';
  }, [handleImportCSV]);

  const handleFilterChange = (key: keyof ReconciliationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      compte: '',
      periode_debut: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periode_fin: new Date().toISOString().split('T')[0],
      statut: '',
      type_ecart: ''
    });
    setPage(1);
  };

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === reconciliationData?.results?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(reconciliationData?.results?.map(item => item.id) || []));
    }
  };

  const handleAutoReconciliation = async () => {
    if (bankTransactions.length === 0) {
      toast.error('Veuillez d\'abord importer un relevé bancaire (CSV)');
      return;
    }
    if (!confirm('Lancer le rapprochement automatique pour ce compte ?')) return;
    setIsLoading(true);
    try {
      const result = await rapprochementAutomatique(adapter, bankTransactions);
      setRapprochementResult(result);
      // Utiliser le code du compte sélectionné ; si absent, utiliser celui du setup info
      // Ne pas avoir recours au hardcode '512' si on n'a pas de compte sélectionné
      const compte = filters.compte || setupInfo.accountCode || '';
      if (compte) {
        const etat = await genererEtatRapprochement(compte, bankTransactions, result);
        setEtatRapprochement(etat);
      }
      toast.success(`Rapprochement terminé : ${result.matches.length} correspondances`);
    } catch (error) {
      console.error('[ReconciliationPage] Erreur rapprochement automatique:', error);
      toast.error('Erreur lors du rapprochement automatique');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualReconciliation = async () => {
    if (selectedItems.size === 0) {
      toast.error('Veuillez sélectionner au moins un élément');
      return;
    }
    if (!rapprochementResult) {
      toast.error('Aucun résultat de rapprochement disponible');
      return;
    }
    if (!confirm(`Rapprocher ${selectedItems.size} élément(s) sélectionné(s) ?`)) return;

    // Filter matches that correspond to selected items
    const selectedMatches = rapprochementResult.matches.filter(m =>
      selectedItems.has(m.bankTransactionId)
    );

    if (selectedMatches.length === 0) {
      toast.error('Aucune correspondance trouvée pour les éléments sélectionnés');
      return;
    }

    try {
      const applied = await appliquerRapprochement(adapter, selectedMatches);
      toast.success(`${applied} écritures rapprochées avec succès`);
      setSelectedItems(new Set());
      // Refresh rapprochement
      if (bankTransactions.length > 0) {
        const result = await rapprochementAutomatique(adapter, bankTransactions);
        setRapprochementResult(result);
        const compte = filters.compte || setupInfo.accountCode || '';
        if (compte) {
          const etat = await genererEtatRapprochement(compte, bankTransactions, result);
          setEtatRapprochement(etat);
        }
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur rapprochement manuel:', error);
      toast.error('Erreur lors du rapprochement');
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'rapproche': return 'bg-green-100 text-green-800';
      case 'non_rapproche': return 'bg-red-100 text-red-800';
      case 'ecart': return 'bg-yellow-100 text-yellow-800';
      case 'en_attente': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'rapproche': return 'Rapproché';
      case 'non_rapproche': return 'Non rapproché';
      case 'ecart': return 'Écart';
      case 'en_attente': return 'En attente';
      default: return statut;
    }
  };

  const getEcartTypeColor = (type: string) => {
    switch (type) {
      case 'montant': return 'bg-red-100 text-red-800';
      case 'date': return 'bg-yellow-100 text-yellow-800';
      case 'reference': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
      case 'absent_comptable': return 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]';
      case 'absent_banque': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handlers pour les actions
  const handleViewDetail = (item: ReconciliationItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleReconcileSingle = async (item: ReconciliationItem) => {
    if (!rapprochementResult) return;
    if (!confirm(`Confirmer le rapprochement de l'élément "${item.libelle}" ?`)) return;

    // L'item peut venir de matches (rapproché) ou de unmatchedBank/unmatchedCompta (non rapproché).
    // Pour les items non rapprochés, on cherche d'abord dans les matches existants,
    // puis dans les non-rapprochés banque et comptabilité.
    const matchFromMatches = rapprochementResult.matches.find(m => m.bankTransactionId === item.id);
    const isUnmatchedBank = rapprochementResult.unmatchedBank.some(tx => tx.id === item.id);
    const isUnmatchedCompta = rapprochementResult.unmatchedCompta.some(cl => cl.lineId === item.id);

    if (!matchFromMatches) {
      if (isUnmatchedBank || isUnmatchedCompta) {
        toast.error(
          'Cet élément est non rapproché — aucune correspondance automatique disponible. ' +
          'Utilisez le rapprochement manuel pour l\'associer à une écriture.'
        );
      } else {
        toast.error('Aucune correspondance trouvée pour cet élément');
      }
      return;
    }

    try {
      const applied = await appliquerRapprochement(adapter, [matchFromMatches]);
      toast.success(`${applied} écriture(s) rapprochée(s) pour "${item.libelle}"`);
      // Refresh
      if (bankTransactions.length > 0) {
        const result = await rapprochementAutomatique(adapter, bankTransactions);
        setRapprochementResult(result);
        const compte = filters.compte || setupInfo.accountCode || '';
        if (compte) {
          const etat = await genererEtatRapprochement(compte, bankTransactions, result);
          setEtatRapprochement(etat);
        }
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur rapprochement individuel:', error);
      toast.error('Erreur lors du rapprochement');
    }
  };

  const handleCancelReconciliation = async (item: ReconciliationItem) => {
    if (!confirm(`Annuler le rapprochement de l'élément "${item.libelle}" ?`)) return;
    if (!rapprochementResult) {
      toast.error('Aucun résultat de rapprochement disponible');
      return;
    }

    // Find the match for this item to know which entry/line IDs to unletter
    const match = rapprochementResult.matches.find(m => m.bankTransactionId === item.id);
    if (!match) {
      toast.error('Correspondance introuvable — impossible d\'annuler');
      return;
    }

    try {
      let modified = 0;
      const lineIdSet = new Set(match.lineIds);
      const entryIdSet = new Set(match.entryIds);
      for (const entryId of entryIdSet) {
        const entry = await adapter.getById<DBJournalEntry>('journalEntries', entryId);
        if (!entry) continue;
        // Créer une copie des lignes pour ne pas muter l'objet du cache adaptateur avant
        // que la mise à jour soit confirmée en base (évite la corruption de l'état si update échoue)
        const updatedLines = entry.lines.map(line => {
          if (lineIdSet.has(line.id) && line.lettrageCode) {
            return { ...line, lettrageCode: undefined };
          }
          return line;
        });
        const changed = updatedLines.some((l, i) => l !== entry.lines[i]);
        if (changed) {
          await adapter.update('journalEntries', entryId, { lines: updatedLines, updatedAt: new Date().toISOString() });
          modified++;
        }
      }

      toast.success(`Rapprochement annulé pour "${item.libelle}" (${modified} écriture(s) mise(s) à jour)`);

      // Refresh result
      if (bankTransactions.length > 0) {
        const result = await rapprochementAutomatique(adapter, bankTransactions);
        setRapprochementResult(result);
        const compte = filters.compte || setupInfo.accountCode || '';
        if (compte) {
          const etat = await genererEtatRapprochement(compte, bankTransactions, result);
          setEtatRapprochement(etat);
        }
      }
    } catch (error) {
      console.error('[ReconciliationPage] Erreur annulation rapprochement:', error);
      toast.error('Erreur lors de l\'annulation du rapprochement');
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <GitCompare className="mr-3 h-7 w-7" />
              Rapprochement Bancaire
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Rapprochement entre la comptabilité et les relevés bancaires
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setReconciliationMode(reconciliationMode === 'manual' ? 'auto' : 'manual')}
            >
              {reconciliationMode === 'manual' ? (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Mode Auto
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Mode Manuel
                </>
              )}
            </Button>
            <ExportMenu
              data={(reconciliationData?.results || []) as unknown as Record<string, unknown>[]}
              filename="rapprochement_bancaire"
              columns={{
                date: 'Date',
                type_mouvement: 'Type',
                libelle: 'Libellé',
                reference_comptable: 'Réf. Comptable',
                reference_banque: 'Réf. Banque',
                montant_comptable: 'Montant Comptable',
                montant_banque: 'Montant Banque',
                ecart_montant: 'Écart',
                statut: 'Statut',
                type_ecart: 'Type Écart'
              }}
              buttonText="Exporter"
              buttonVariant="outline"
            />
            <Button variant="outline" onClick={() => { setSetupInfo(emptySetup); setShowImportSetup(true); }}>
              <Upload className="mr-2 h-4 w-4" />
              Importer Relevé
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Onglets : Rapprochement / Journal des relevés / Historique rapprochés validés */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-2 overflow-x-auto">
        {([
          { id: 'rapprochement', label: 'Rapprochement' },
          { id: 'releves', label: 'Journal des relevés bancaires' },
          { id: 'historique', label: 'Historique rapprochés (validés)' },
        ] as const).map(tb => (
          <button
            key={tb.id}
            onClick={() => setMainTab(tb.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${mainTab === tb.id ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {mainTab === 'rapprochement' && (<>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-3">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rapprochés</p>
                <p className="text-lg font-bold text-green-700">
                  {reconciliationData?.matched_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-3">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-full">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Non rapprochés</p>
                <p className="text-lg font-bold text-red-700">
                  {reconciliationData?.unmatched_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-3">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Écarts</p>
                <p className="text-lg font-bold text-yellow-700">
                  {formatCurrency(Math.abs(reconciliationData?.total_difference || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-3">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-full">
                <GitCompare className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Taux Rapprochement</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">
                  {reconciliationData?.match_rate ? `${reconciliationData.match_rate}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres et Actions
            </div>
            <div className="flex space-x-2">
              {reconciliationMode === 'auto' && (
                <Button
                  onClick={handleAutoReconciliation}
                  disabled={isLoading}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Rapprochement...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Rapprochement Auto
                    </>
                  )}
                </Button>
              )}
              {reconciliationMode === 'manual' && selectedItems.size > 0 && (
                <Button
                  onClick={handleManualReconciliation}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Rapprocher ({selectedItems.size})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Select value={filters.compte} onValueChange={(value) => handleFilterChange('compte', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les comptes</SelectItem>
                {bankAccounts?.results?.map((account) => {
                  const code = (account as any).account_number || (account as any).numero_compte || account.id;
                  const nom = (account as any).label || (account as any).bank?.name || (account as any).libelle_compte || '';
                  return (
                    <SelectItem key={account.id} value={account.id}>
                      {nom ? `${code} — ${nom}` : code}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <div className="md:col-span-2">
              <Button
                variant="outline"
                onClick={() => setShowPeriodModal(true)}
                className="w-full justify-start"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.start && dateRange.end
                  ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Sélectionner une période'
                }
              </Button>
            </div>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="rapproche">Rapproché</SelectItem>
                <SelectItem value="non_rapproche">Non rapproché</SelectItem>
                <SelectItem value="ecart">Écart</SelectItem>
                <SelectItem value="en_attente">{t('status.pending')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type_ecart} onValueChange={(value) => handleFilterChange('type_ecart', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les écarts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les écarts</SelectItem>
                <SelectItem value="montant">Écart de montant</SelectItem>
                <SelectItem value="date">Écart de date</SelectItem>
                <SelectItem value="reference">Référence différente</SelectItem>
                <SelectItem value="absent_comptable">Absent en comptabilité</SelectItem>
                <SelectItem value="absent_banque">Absent en banque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Éléments de Rapprochement</span>
            <div className="flex items-center space-x-4">
              {reconciliationMode === 'manual' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === (reconciliationData?.results?.length || 0) && selectedItems.size > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Tout sélectionner</span>
                </div>
              )}
              <span className="text-sm text-gray-600">
                Du {formatDate(filters.periode_debut)} au {formatDate(filters.periode_fin)}
              </span>
              {reconciliationData && (
                <Badge variant="outline">
                  {reconciliationData.count} élément(s)
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des données de rapprochement..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reconciliationMode === 'manual' && <TableHead className="w-12">Sél.</TableHead>}
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>{t('accounting.label')}</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>{t('accounting.title')}</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Écart</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationData?.results?.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={`hover:bg-gray-50 ${
                          selectedItems.has(item.id) ? 'bg-[var(--color-primary)]/5' : ''
                        }`}
                      >
                        {reconciliationMode === 'manual' && (
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleItemSelect(item.id)}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-700 mr-2" />
                            {formatDate(item.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {item.montant_comptable > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              {item.type_mouvement}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)] text-sm">
                              {item.libelle}
                            </p>
                            {item.description && (
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.reference_comptable && (
                              <p className="font-mono text-xs">
                                Compta: {item.reference_comptable}
                              </p>
                            )}
                            {item.reference_banque && (
                              <p className="font-mono text-xs">
                                Banque: {item.reference_banque}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.montant_comptable !== null ? (
                            <span className={`font-semibold ${
                              item.montant_comptable >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(item.montant_comptable)}
                            </span>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.montant_banque !== null ? (
                            <span className={`font-semibold ${
                              item.montant_banque >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(item.montant_banque)}
                            </span>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.ecart_montant !== null && Math.abs(item.ecart_montant) > 0.01 ? (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <div>
                                <span className="font-semibold text-red-700 text-sm">
                                  {formatCurrency(Math.abs(item.ecart_montant))}
                                </span>
                                {item.type_ecart && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEcartTypeColor(item.type_ecart)}`}>
                                    {item.type_ecart}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-700 text-sm">OK</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.statut)}>
                            {getStatusLabel(item.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Voir les détails"
                              onClick={() => handleViewDetail(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.statut === 'non_rapproche' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                aria-label="Rapprocher"
                                onClick={() => handleReconcileSingle(item)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {item.statut === 'rapproche' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                aria-label="Annuler rapprochement"
                                onClick={() => handleCancelReconciliation(item)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination fonctionnelle sur les données filtrées */}
              {filteredItems.length > PAGE_SIZE && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(filteredItems.length / PAGE_SIZE)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!reconciliationData?.results || reconciliationData.results.length === 0) && (
                <div className="text-center py-12">
                  <GitCompare className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun élément trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {bankTransactions.length > 0 && reconciliationItems.length > 0
                      ? 'Aucun élément ne correspond aux filtres sélectionnés.'
                      : bankTransactions.length > 0
                      ? 'Aucun élément de rapprochement sur cette période.'
                      : 'Importez un relevé bancaire (CSV) pour lancer le rapprochement.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* État de Rapprochement SYSCOHADA */}
      {etatRapprochement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              État de Rapprochement Bancaire — SYSCOHADA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Côté Banque */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Relevé Bancaire</h3>
                <div className="flex justify-between">
                  <span>Solde du relevé</span>
                  <span className="font-semibold">{formatCurrency(etatRapprochement.soldeReleve)}</span>
                </div>
                {etatRapprochement.operationsNonComptabilisees.length > 0 && (
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium text-red-600">
                      − Opérations non comptabilisées ({etatRapprochement.operationsNonComptabilisees.length})
                    </p>
                    {etatRapprochement.operationsNonComptabilisees.map((op, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{formatDate(op.date)} — {op.label}</span>
                        <span>{formatCurrency(op.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Solde banque corrigé</span>
                  <span>{formatCurrency(etatRapprochement.soldeBanqueCorrige)}</span>
                </div>
              </div>

              {/* Côté Comptabilité */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Comptabilité</h3>
                <div className="flex justify-between">
                  <span>Solde comptable</span>
                  <span className="font-semibold">{formatCurrency(etatRapprochement.soldeComptable)}</span>
                </div>
                {etatRapprochement.ecrituresNonPointees.length > 0 && (
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium text-orange-600">
                      − Écritures non pointées ({etatRapprochement.ecrituresNonPointees.length})
                    </p>
                    {etatRapprochement.ecrituresNonPointees.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-600">
                        <span>{formatDate(e.date)} — {e.label}</span>
                        <span>
                          {e.debit > 0 ? `D ${formatCurrency(e.debit)}` : `C ${formatCurrency(e.credit)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Solde compta corrigé</span>
                  <span>{formatCurrency(etatRapprochement.soldeComptaCorrige)}</span>
                </div>
              </div>
            </div>

            {/* Résultat rapprochement */}
            <div className={`mt-6 p-4 rounded-lg text-center ${
              etatRapprochement.isRapproche
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {etatRapprochement.isRapproche ? (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">
                    Rapprochement équilibré — les soldes corrigés sont identiques
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">
                    Écart de rapprochement : {formatCurrency(Math.abs(etatRapprochement.soldeBanqueCorrige - etatRapprochement.soldeComptaCorrige))}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Date du rapprochement : {formatDate(etatRapprochement.dateRapprochement)} — Compte {etatRapprochement.compte}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Mettre à jour les filtres avec les nouvelles dates
          setFilters(prev => ({
            ...prev,
            periode_debut: newDateRange.start,
            periode_fin: newDateRange.end
          }));
        }}
        initialDateRange={dateRange}
      />

      {/* Modal de Détail Rapprochement */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-text-secondary)]/10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white">
                  <GitCompare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Détail du Rapprochement</h2>
                  <p className="text-sm text-gray-600">{selectedItem.libelle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations Générales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Informations Comptables</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date d'Opération</p>
                    <p className="font-semibold">{formatDate(selectedItem.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Référence Comptable</p>
                    <p className="font-mono text-sm">{selectedItem.reference_comptable || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant Comptable</p>
                    <p className={`text-lg font-bold ${selectedItem.montant_comptable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedItem.montant_comptable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Libellé</p>
                    <p className="text-sm">{selectedItem.libelle}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Informations Bancaires</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Valeur Banque</p>
                    <p className="font-semibold">{selectedItem.date_valeur ? formatDate(selectedItem.date_valeur) : formatDate(selectedItem.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Référence Banque</p>
                    <p className="font-mono text-sm">{selectedItem.reference_banque || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant Banque</p>
                    <p className={`text-lg font-bold ${selectedItem.montant_banque >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedItem.montant_banque)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type de Mouvement</p>
                    <div className="flex items-center space-x-2">
                      {selectedItem.montant_banque > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-red-600" />
                      )}
                      <span>{selectedItem.type_mouvement || 'Non spécifié'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyse de l'Écart */}
              <div className={`p-4 rounded-lg ${
                Math.abs(selectedItem.ecart_montant || 0) > 0.01
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <h3 className="font-semibold mb-3 flex items-center">
                  {Math.abs(selectedItem.ecart_montant || 0) > 0.01 ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-900">Écart Détecté</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-900">Aucun Écart</span>
                    </>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Écart de Montant</p>
                    <p className={`text-lg font-bold ${Math.abs(selectedItem.ecart_montant || 0) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(selectedItem.ecart_montant || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type d'Écart</p>
                    {selectedItem.type_ecart ? (
                      <Badge className={getEcartTypeColor(selectedItem.type_ecart)}>
                        {selectedItem.type_ecart}
                      </Badge>
                    ) : (
                      <span className="text-green-600">Aucun</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Statut</p>
                    <Badge className={getStatusColor(selectedItem.statut)}>
                      {getStatusLabel(selectedItem.statut)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedItem.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                ID: {selectedItem.id}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
                {selectedItem.statut === 'non_rapproche' && (
                  <button
                    onClick={() => {
                      handleReconcileSingle(selectedItem);
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Rapprocher
                  </button>
                )}
                {selectedItem.statut === 'rapproche' && (
                  <button
                    onClick={() => {
                      handleCancelReconciliation(selectedItem);
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Annuler Rapprochement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}

      {mainTab === 'releves' && (<>
      {/* Journal des relevés bancaires importés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Journal des relevés bancaires
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({statements.length} relevé{statements.length !== 1 ? 's' : ''})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Aucun relevé importé. Cliquez sur « Importer Relevé » pour saisir les informations du relevé puis charger le fichier.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Compte</th>
                    <th className="px-3 py-2">Banque</th>
                    <th className="px-3 py-2">Période</th>
                    <th className="px-3 py-2 text-right">Solde ouverture</th>
                    <th className="px-3 py-2 text-right">Solde clôture</th>
                    <th className="px-3 py-2 text-right">Lignes</th>
                    <th className="px-3 py-2 text-right">Débit</th>
                    <th className="px-3 py-2 text-right">Crédit</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statements.map((st) => (
                    <React.Fragment key={st.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-[var(--color-primary)]">{st.accountCode}</td>
                        <td className="px-3 py-2">{st.bankName || st.accountLabel}</td>
                        <td className="px-3 py-2">{formatDate(st.periodStart)} → {formatDate(st.periodEnd)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(st.openingBalance)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(st.closingBalance)}</td>
                        <td className="px-3 py-2 text-right">{st.lineCount}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatCurrency(st.totalDebit)}</td>
                        <td className="px-3 py-2 text-right text-green-600">{formatCurrency(st.totalCredit)}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleStatementDetail(st.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            title="Voir le détail des écritures"
                          >
                            <Eye className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleDeleteStatement(st.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Supprimer le relevé"
                          >
                            <X className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                      {expandedStatementId === st.id && (
                        <tr>
                          <td colSpan={9} className="bg-gray-50 px-3 py-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">
                              Détail des écritures du relevé {st.fileName ? `(${st.fileName})` : ''}
                            </div>
                            <div className="overflow-x-auto max-h-72 overflow-y-auto">
                              <table className="w-full text-xs">
                                <thead className="bg-white sticky top-0 text-left text-gray-500">
                                  <tr>
                                    <th className="px-2 py-1">Date</th>
                                    <th className="px-2 py-1">Libellé</th>
                                    <th className="px-2 py-1">Référence</th>
                                    <th className="px-2 py-1 text-right">Débit</th>
                                    <th className="px-2 py-1 text-right">Crédit</th>
                                    <th className="px-2 py-1 text-center">Rapproché</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {statementLines.length === 0 && (
                                    <tr><td colSpan={6} className="px-2 py-3 text-center text-gray-400">Aucune ligne.</td></tr>
                                  )}
                                  {statementLines.map((ln) => (
                                    <tr key={ln.id}>
                                      <td className="px-2 py-1 whitespace-nowrap">{formatDate(ln.date)}</td>
                                      <td className="px-2 py-1">{ln.label}</td>
                                      <td className="px-2 py-1 font-mono text-gray-500">{ln.reference || '—'}</td>
                                      <td className="px-2 py-1 text-right text-red-600">{ln.debit > 0 ? formatCurrency(ln.debit) : '—'}</td>
                                      <td className="px-2 py-1 text-right text-green-600">{ln.credit > 0 ? formatCurrency(ln.credit) : '—'}</td>
                                      <td className="px-2 py-1 text-center">
                                        {ln.reconciled
                                          ? <Check className="w-3.5 h-3.5 inline text-green-600" />
                                          : <span className="text-gray-300">—</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </>)}

      {mainTab === 'historique' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Historique des rapprochements validés
              <span className="ml-2 text-sm font-normal text-gray-500">({reconciledHistory.length} ligne{reconciledHistory.length !== 1 ? 's' : ''} rapprochée{reconciledHistory.length !== 1 ? 's' : ''})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reconciledHistory.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                Aucune ligne rapprochée validée. Les lignes de relevé pointées (rapprochées) apparaîtront ici comme historique à consulter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Relevé</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="px-3 py-2">Référence</th>
                      <th className="px-3 py-2 text-right">Débit</th>
                      <th className="px-3 py-2 text-right">Crédit</th>
                      <th className="px-3 py-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconciledHistory.map((ln) => (
                      <tr key={ln.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 whitespace-nowrap">{formatDate(ln.date)}</td>
                        <td className="px-3 py-2 text-gray-500">{ln._stmt || '—'}</td>
                        <td className="px-3 py-2">{ln.label}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{ln.reference || '—'}</td>
                        <td className="px-3 py-2 text-right text-red-600">{ln.debit > 0 ? formatCurrency(ln.debit) : '—'}</td>
                        <td className="px-3 py-2 text-right text-green-600">{ln.credit > 0 ? formatCurrency(ln.credit) : '—'}</td>
                        <td className="px-3 py-2 text-center"><span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium"><Check className="w-3.5 h-3.5" /> Rapproché</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de setup avant import d'un relevé */}
      {showImportSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Informations du relevé</h3>
              <button onClick={() => setShowImportSetup(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compte trésorerie</label>
                  <input
                    type="text"
                    value={setupInfo.accountCode}
                    onChange={(e) => setSetupInfo(p => ({ ...p, accountCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="521"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Libellé compte</label>
                  <input
                    type="text"
                    value={setupInfo.accountLabel}
                    onChange={(e) => setSetupInfo(p => ({ ...p, accountLabel: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Banque"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banque</label>
                <input
                  type="text"
                  value={setupInfo.bankName}
                  onChange={(e) => setSetupInfo(p => ({ ...p, bankName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nom de la banque"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Période — début</label>
                  <input
                    type="date"
                    value={setupInfo.periodStart}
                    onChange={(e) => setSetupInfo(p => ({ ...p, periodStart: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Période — fin</label>
                  <input
                    type="date"
                    value={setupInfo.periodEnd}
                    onChange={(e) => setSetupInfo(p => ({ ...p, periodEnd: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solde ouverture</label>
                  <input
                    type="number"
                    value={setupInfo.openingBalance}
                    onChange={(e) => setSetupInfo(p => ({ ...p, openingBalance: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Solde clôture</label>
                  <input
                    type="number"
                    value={setupInfo.closingBalance}
                    onChange={(e) => setSetupInfo(p => ({ ...p, closingBalance: Number(e.target.value) }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                  <input
                    type="text"
                    value={setupInfo.currency}
                    onChange={(e) => setSetupInfo(p => ({ ...p, currency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {setupInfo.fileName && (
                <p className="text-xs text-gray-500">Fichier sélectionné : {setupInfo.fileName}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setShowImportSetup(false)}>Annuler</Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isLoading || !setupInfo.accountCode}>
                <Upload className="mr-2 h-4 w-4" />
                {isLoading ? 'Import en cours…' : 'Choisir le fichier CSV et importer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPage;