import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { validerEcriture } from '../../services/entryWorkflow';
import {
  FileText, Plus, BarChart3, CheckCircle, Clock, ArrowLeft, Home,
  Calendar, DollarSign, Edit, Eye, Search, Filter, Download, FileType, ChevronDown, X, Printer
} from 'lucide-react';
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import DataTable, { Column } from '../../components/ui/DataTable';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { formatCurrency } from '@/utils/formatters';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('brouillard');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EcritureBrouillard | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EcritureBrouillard | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [entryModalTemplateId, setEntryModalTemplateId] = useState<string | undefined>();
  // État contrôlé du formulaire de création de modèle
  const [templateForm, setTemplateForm] = useState({
    nom: '',
    type: '',
    journal: '',
    description: '',
    actif: false,
  });
  const [templateLines, setTemplateLines] = useState<Array<{ compte: string; libelle: string; debit: string; credit: string }>>([
    { compte: '', libelle: '', debit: '', credit: '' },
  ]);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // P1-E : données réelles depuis le DataAdapter (plus de tableau vide en dur).
  const { adapter } = useData();
  const [ecrituresData, setEcrituresData] = useState<EcritureBrouillard[]>([]);
  // Options de filtre journal calculées dynamiquement depuis les données réelles
  const journalFilterOptions = React.useMemo(() => {
    const codes = Array.from(new Set(ecrituresData.map(e => e.journal).filter(Boolean))).sort();
    if (codes.length === 0) {
      // Valeurs par défaut SYSCOHADA si pas encore de données chargées
      return ['VE', 'AC', 'BQ', 'CA', 'OD'].map(c => ({ value: c, label: c }));
    }
    return codes.map(c => ({ value: c, label: c }));
  }, [ecrituresData]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await adapter.getAll<any>('journalEntries');

      // Charger les lignes depuis journalLines (SaaS : tables séparées)
      let linesByEntry = new Map<string, any[]>();
      try {
        const allLines = await adapter.getAll<any>('journalLines');
        for (const l of allLines) {
          const key = l.entryId || l.entry_id;
          if (!key) continue;
          if (!linesByEntry.has(key)) linesByEntry.set(key, []);
          // Normaliser camelCase + snake_case
          linesByEntry.get(key)!.push({
            accountCode: l.accountCode || l.account_code || '',
            accountName: l.accountName || l.account_name || '',
            debit:       Number(l.debit  ?? 0),
            credit:      Number(l.credit ?? 0),
            label:       l.label || l.libelle || '',
            tiersCode:   l.tiersCode || l.tiers_code || '',
          });
        }
      } catch (linesErr) {
        console.error('[EntriesPage] Chargement journalLines échoué, utilisation de entry.lines :', linesErr);
        /* pas de journalLines — utiliser entry.lines */
      }

      const mapped: EcritureBrouillard[] = (entries as any[])
        .slice()
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
        .map((e: any) => {
          // Support camelCase (Dexie) et snake_case (Supabase)
          const injectedLines = linesByEntry.get(e.id) ?? (Array.isArray(e.lines) ? e.lines : []);
          // Utiliser les totaux stockés en DB en priorité (calculés à l'import)
          // Fallback sur la somme des lignes si les totaux sont absents
          const dbDebit  = Number(e.totalDebit  || e.total_debit  || 0);
          const dbCredit = Number(e.totalCredit || e.total_credit || 0);
          const lineDebit  = injectedLines.reduce((s: number, l: any) => s + Number(l.debit  ?? 0), 0);
          const lineCredit = injectedLines.reduce((s: number, l: any) => s + Number(l.credit ?? 0), 0);
          const debit  = lineDebit  > 0 ? lineDebit  : dbDebit;
          const credit = lineCredit > 0 ? lineCredit : dbCredit;
          // L'équilibre est vérifié sur les totaux DB (calculés à l'import depuis la source)
          // plus fiable que la somme des lignes qui peut être affectée par Math.abs()
          const equilibre = dbDebit > 0 && dbCredit > 0
            ? Math.abs(dbDebit - dbCredit) < 1   // tolérance 1 FCFA pour arrondis
            : Math.abs(debit - credit) < 1;
          return {
            id: e.id,
            numero: e.entryNumber || e.entry_number || '',
            journal: e.journal || '',
            date: e.date || '',
            source: (e.createdBy === 'system' || e.created_by === 'system' || e.nature) ? 'API' : 'Manuel',
            libelle: e.label || '',
            debit,
            credit,
            equilibre,
            statut: e.status || 'draft',
            type: e.nature || 'manuelle',
            lines: injectedLines,
          } as EcritureBrouillard;
        });
      setEcrituresData(mapped);
    } catch (err) {
      console.error('[EntriesPage] Erreur chargement des écritures :', err);
      toast.error('Impossible de charger les écritures comptables. Vérifiez votre connexion.');
      setEcrituresData([]);
    } finally {
      setIsLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Onglet « Brouillard » = écritures en brouillon UNIQUEMENT. Les écritures validées
  // appartiennent au Grand Livre, pas à cet écran. Sans ce filtre, les brouillons étaient
  // noyés parmi toutes les écritures importées (pagination sur tout) → non consultables.
  const draftEntries = React.useMemo(() => ecrituresData.filter(e => e.statut === 'draft'), [ecrituresData]);
  const draftCount = draftEntries.length;

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
      filterOptions: journalFilterOptions,
      width: '80px',
      align: 'center',
      render: (item) => (
        <span className="text-sm font-mono text-[var(--color-text-secondary)] font-semibold">{item.journal}</span>
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
          {formatCurrency(item.debit)}
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
          {formatCurrency(item.credit)}
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
        { value: 'draft', label: t('accounting.draft') },
        { value: 'validated', label: t('accounting.validated') }
      ],
      width: '100px',
      align: 'center',
      render: (item) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.statut === 'validated'
            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
            : 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
        }`}>
          {item.statut === 'validated' ? (
            <><CheckCircle className="w-3 h-3 inline mr-1" />Validée</>
          ) : (
            <><Clock className="w-3 h-3 inline mr-1" />Brouillon</>
          )}
        </span>
      )
    }
  ];

  // Onglet unique Brouillard
  const tabs = [
    { id: 'brouillard', label: t('accounting.draft'), icon: FileText, badge: draftCount > 0 ? String(draftCount) : undefined },
  ];

  // Raccourcis modèles — mappés sur les IDs réels de journalTemplates.ts
  const modelesSaisie = [
    { id: 'TPL-VTE-001', nom: 'Facture vente standard', journal: 'VE' },
    { id: 'TPL-ACH-001', nom: 'Achat avec TVA',         journal: 'AC' },
    { id: 'TPL-TRE-002', nom: 'Paiement fournisseur',   journal: 'BQ' },
  ];

  // Fonction pour ouvrir le modal d'édition
  const handleEditEntry = (entry: EcritureBrouillard) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  // Fonction pour voir les détails d'une écriture
  const handleViewEntry = (entry: EcritureBrouillard) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  // Fonction pour valider une écriture — transition réelle via le workflow.
  const [isValidatingEntry, setIsValidatingEntry] = useState(false);
  const handleValidateEntry = async (entryId: string) => {
    if (isValidatingEntry) return;
    setIsValidatingEntry(true);
    try {
      const result = await validerEcriture(adapter, entryId);
      if (result.success) {
        toast.success('Écriture validée avec succès');
        loadEntries();
      } else {
        toast.error(result.error || 'Validation impossible');
      }
    } catch (err) {
      console.error('[EntriesPage] Erreur validation écriture :', err);
      toast.error('Erreur lors de la validation');
    } finally {
      setIsValidatingEntry(false);
    }
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
    const allIds = ecrituresData.filter(e => e.equilibre).map(e => e.id);
    setSelectedEntries(prev =>
      prev.length === allIds.length ? [] : allIds
    );
  };

  // Validation en lot — réelle, pas juste un toast
  const [validatingBatch, setValidatingBatch] = useState(false);
  const handleValidateSelection = async () => {
    if (selectedEntries.length === 0) return;
    setValidatingBatch(true);
    let ok = 0; let ko = 0;
    for (const id of selectedEntries) {
      try {
        const result = await validerEcriture(adapter, id);
        if (result?.success) ok++; else ko++;
      } catch (err) {
        console.error(`[EntriesPage] Erreur validation écriture ${id} :`, err);
        ko++;
      }
    }
    setValidatingBatch(false);
    setSelectedEntries([]);
    await loadEntries();
    if (ko === 0) toast.success(`${ok} écriture(s) validée(s) avec succès`);
    else toast.error(`${ok} validée(s), ${ko} en erreur (vérifier l'équilibre débit/crédit)`);
  };

  // Valider TOUTES les écritures brouillon en un clic
  const handleValidateAll = async () => {
    const draftIds = ecrituresData.filter(e => e.statut === 'draft').map(e => e.id);
    if (draftIds.length === 0) { toast.info('Aucun brouillon à valider'); return; }
    setValidatingBatch(true);
    let ok = 0; let ko = 0;
    for (const id of draftIds) {
      try {
        const result = await validerEcriture(adapter, id);
        if (result?.success) ok++; else ko++;
      } catch (err) {
        console.error(`[EntriesPage] Erreur validation écriture ${id} :`, err);
        ko++;
      }
    }
    setValidatingBatch(false);
    await loadEntries();
    if (ko === 0) toast.success(`${ok} brouillon(s) validé(s) avec succès`);
    else toast.error(`${ok} validé(s), ${ko} en erreur`);
  };

  return (
    <div className="h-screen bg-[var(--color-border)] flex flex-col overflow-hidden">
      {/* En-tête avec navigation de retour */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/accounting')}
              className="flex items-center space-x-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Retour</span>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--color-primary)]">Écritures Comptables</h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">Saisie et gestion des écritures SYSCOHADA</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-[var(--color-warning-light)] text-[var(--color-warning)] px-3 py-1 rounded-full text-sm">
              <Clock className="w-4 h-4" />
              <span>{draftCount} en attente</span>
            </div>

            {/* Validation en lot */}
            {selectedEntries.length > 0 && (
              <button
                onClick={handleValidateSelection}
                disabled={validatingBatch}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-60"
              >
                {validatingBatch ? <span className="animate-spin">⏳</span> : <span>✓</span>}
                <span className="text-sm">Valider la sélection ({selectedEntries.length})</span>
              </button>
            )}
            {draftCount > 0 && selectedEntries.length === 0 && (
              <button
                onClick={handleValidateAll}
                disabled={validatingBatch}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-60"
              >
                {validatingBatch ? <span className="animate-spin">⏳</span> : <span>✓✓</span>}
                <span className="text-sm">Valider tout ({draftCount})</span>
              </button>
            )}

            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors flex items-center space-x-2"
            >
              <FileType className="w-4 h-4" />
              <span className="text-sm">Ajouter un modèle de saisie</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-2"
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
                    <div
                      key={modele.id}
                      role="button"
                      tabIndex={0}
                      className="p-3 hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border-light)] cursor-pointer"
                      onClick={() => {
                        setShowTemplateDropdown(false);
                        setEntryModalTemplateId(modele.id);
                        setShowEntryModal(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setShowTemplateDropdown(false);
                          setEntryModalTemplateId(modele.id);
                          setShowEntryModal(true);
                        }
                      }}
                    >
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
              onClick={() => {
                const role = user?.role;
                if (role === 'admin') navigate('/workspace/admin');
                else if (role === 'manager') navigate('/workspace/manager');
                else navigate('/workspace/comptable');
              }}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets - Pleine largeur */}
      <div className="bg-white border-y border-[var(--color-border)] shadow-sm flex flex-col flex-1 overflow-hidden w-full">
        <div className="px-4 border-b border-[var(--color-border)]">
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
                      ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30'
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
                {/* Indicateur de chargement */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8 space-x-2 text-[var(--color-text-tertiary)]">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--color-primary)]"></div>
                    <span className="text-sm">Chargement des écritures…</span>
                  </div>
                )}
                {/* Liste des écritures avec DataTable - Pleine largeur */}
                {!isLoading && <DataTable
                  columns={ecrituresColumns as unknown as import('../../components/ui/DataTable').Column<Record<string, unknown>>[]}
                  data={draftEntries as unknown as Record<string, unknown>[]}
                  pageSize={15}
                  searchable={true}
                  exportable={true}
                  refreshable={true}
                  printable={true}
                  selectable={false}
                  actions={(item) => {
                    const entry = item as unknown as EcritureBrouillard;
                    return (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewEntry(entry)}
                        className="p-1 hover:bg-[var(--color-info-light)] rounded transition-colors"
                        title="Voir les détails"
                      >
                        <Eye className="w-4 h-4 text-[var(--color-info)]" />
                      </button>
                      {entry.statut === 'draft' && (
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className={`p-1 hover:bg-[var(--color-warning-light)] rounded transition-colors ${
                          entry.equilibre ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-warning)]'
                        }`}
                        title={entry.equilibre ? "Modifier l'écriture" : "Corriger l'écriture"}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      )}
                    </div>
                    );
                  }}
                  emptyMessage="Aucune écriture en brouillard"
                  className="bg-white border-0 data-table w-full rounded-none shadow-none"
                />}
            </div>
          )}
        </div>
      </div>

      {/* Bouton flottant - Nouvelle Écriture */}
      <button
        onClick={() => setShowEntryModal(true)}
        className="fixed top-1/2 right-8 transform -translate-y-1/2
        w-14 h-14 bg-[var(--color-text-secondary)] text-white rounded-full shadow-lg hover:bg-[#404040] hover:shadow-xl transition-all duration-300 flex items-center
        justify-center z-40 group"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal de nouvelle écriture (+ TemplateSelector si raccourci activé) */}
      <JournalEntryModal
        isOpen={showEntryModal}
        onClose={() => {
          setShowEntryModal(false);
          setEntryModalTemplateId(undefined);
        }}
        initialTemplateId={entryModalTemplateId}
      />

      {/* Modal d'édition d'écriture */}
      <JournalEntryModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
          loadEntries();
        }}
        mode="edit"
        initialData={editingEntry ? {
          id: editingEntry.id,
          status: editingEntry.statut,
          journal: editingEntry.journal,
          date: editingEntry.date,
          entryNumber: editingEntry.numero,
          label: editingEntry.libelle,
          lines: (editingEntry as any).lines ?? [],
        } : undefined}
      />

      {/* Modal de détails d'écriture */}
      {showDetailsModal && selectedEntry && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowDetailsModal(false)} />

          {/* Modal Content — z-50 > overlay z-40 */}
          <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
            <div className="flex items-center justify-center min-h-screen p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full relative pointer-events-auto">
                {/* Header */}
                <div className="p-6 border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-text-secondary)]/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--color-primary)]">
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
                      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-2">Informations générales</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">N° Pièce:</span>
                          <span className="text-sm font-medium">{selectedEntry.numero}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">Journal:</span>
                          <span className="text-sm font-medium">{selectedEntry.journal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">Date:</span>
                          <span className="text-sm font-medium">{selectedEntry.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">Libellé:</span>
                          <span className="text-sm font-medium">{selectedEntry.libelle}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-2">Montants</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">Débit:</span>
                          <span className="text-sm font-medium text-[var(--color-error)]">
                            {formatCurrency(selectedEntry.debit ?? 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-[#404040]">Crédit:</span>
                          <span className="text-sm font-medium text-[var(--color-success)]">
                            {formatCurrency(selectedEntry.credit ?? 0)}
                          </span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium text-[#404040]">État:</span>
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
                    <h3 className="text-sm font-medium text-[var(--color-text-tertiary)] mb-3">Lignes d'écriture</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-[var(--color-surface-hover)]">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#404040]">{t('accounting.account')}</th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-[#404040]">{t('accounting.label')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#404040]">{t('accounting.debit')}</th>
                            <th className="px-4 py-2 text-right text-sm font-medium text-[#404040]">{t('accounting.credit')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(((selectedEntry as any)?.lines as any[]) || []).map((l: any, i: number) => (
                            <tr key={l.id || i}>
                              <td className="px-4 py-2 text-sm">{l.accountCode}</td>
                              <td className="px-4 py-2 text-sm">{l.accountName || l.label || ''}</td>
                              <td className="px-4 py-2 text-sm text-right text-[var(--color-error)]">{l.debit ? formatCurrency(l.debit) : '-'}</td>
                              <td className="px-4 py-2 text-sm text-right text-[var(--color-success)]">{l.credit ? formatCurrency(l.credit) : '-'}</td>
                            </tr>
                          ))}
                          {(!(selectedEntry as any)?.lines || ((selectedEntry as any).lines as any[]).length === 0) && (
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-sm text-center text-[var(--color-text-tertiary)]">Aucune ligne</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--color-border)] flex justify-between">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      if (selectedEntry) handleEditEntry(selectedEntry);
                    }}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>{t('common.edit')}</span>
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDetailsModal(false)}
                      className="px-4 py-2 text-[#404040] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)]"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        if (selectedEntry) handleValidateEntry(selectedEntry.id);
                        setShowDetailsModal(false);
                      }}
                      disabled={isValidatingEntry}
                      className="px-6 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success)] flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isValidatingEntry
                        ? <span className="animate-spin">⏳</span>
                        : <CheckCircle className="w-4 h-4" />
                      }
                      <span>{t('accounting.validateEntry')}</span>
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
                <div className="p-6 border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--color-primary)]">Créer un modèle de saisie</h2>
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
                    <label className="block text-sm font-medium text-[#404040] mb-2">Nom du modèle *</label>
                    <input
                      type="text"
                      value={templateForm.nom}
                      onChange={e => setTemplateForm(f => ({ ...f, nom: e.target.value }))}
                      placeholder="Ex: Facture fournisseur avec TVA"
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Type de transaction *</label>
                    <select
                      value={templateForm.type}
                      onChange={e => setTemplateForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    >
                      <option value="">Sélectionnez un type</option>
                      <option value="achats">Facture d'Achat</option>
                      <option value="ventes">Facture de Vente</option>
                      <option value="reglements">Règlement</option>
                      <option value="operations">Opérations Diverses</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Journal par défaut *</label>
                    <SearchableDropdown
                      options={[
                        { value: 'AC', label: 'AC - Achats' },
                        { value: 'VE', label: 'VE - Ventes' },
                        { value: 'BQ', label: 'BQ - Banque' },
                        { value: 'CA', label: 'CA - Caisse' },
                        { value: 'OD', label: 'OD - Opérations Diverses' }
                      ]}
                      value={templateForm.journal}
                      onChange={val => setTemplateForm(f => ({ ...f, journal: val }))}
                      placeholder="Sélectionnez un journal"
                      searchPlaceholder="Rechercher un journal..."
                      clearable
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#404040] mb-2">Description</label>
                    <textarea
                      rows={3}
                      value={templateForm.description}
                      onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Description du modèle..."
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    />
                  </div>

                  <div className="border rounded-lg p-4 bg-[var(--color-surface-hover)]">
                    <h3 className="text-sm font-medium text-[#404040] mb-3">Lignes d'écriture par défaut</h3>
                    <div className="space-y-2">
                      {templateLines.map((line, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={line.compte}
                            onChange={e => setTemplateLines(ls => ls.map((l, i) => i === idx ? { ...l, compte: e.target.value } : l))}
                            placeholder={t('accounting.account')}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            value={line.libelle}
                            onChange={e => setTemplateLines(ls => ls.map((l, i) => i === idx ? { ...l, libelle: e.target.value } : l))}
                            placeholder={t('accounting.label')}
                            className="flex-1 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            value={line.debit}
                            onChange={e => setTemplateLines(ls => ls.map((l, i) => i === idx ? { ...l, debit: e.target.value } : l))}
                            placeholder={t('accounting.debit')}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                          <input
                            type="text"
                            value={line.credit}
                            onChange={e => setTemplateLines(ls => ls.map((l, i) => i === idx ? { ...l, credit: e.target.value } : l))}
                            placeholder={t('accounting.credit')}
                            className="w-24 px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTemplateLines(ls => [...ls, { compte: '', libelle: '', debit: '', credit: '' }])}
                      className="mt-3 text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] flex items-center space-x-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter une ligne</span>
                    </button>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={templateForm.actif}
                        onChange={e => setTemplateForm(f => ({ ...f, actif: e.target.checked }))}
                        className="rounded border-[var(--color-border)]"
                      />
                      <span className="text-sm text-[#404040]">Activer ce modèle</span>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--color-border)] flex justify-end space-x-3">
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 text-[#404040] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)]"
                  >
                    Annuler
                  </button>
                  <button
                    disabled={isSavingTemplate}
                    onClick={async () => {
                      if (!templateForm.nom.trim()) {
                        toast.error('Le nom du modèle est obligatoire');
                        return;
                      }
                      if (!templateForm.journal) {
                        toast.error('Veuillez sélectionner un journal par défaut');
                        return;
                      }
                      setIsSavingTemplate(true);
                      try {
                        await adapter.create<any>('settings', {
                          key: `template_${Date.now()}`,
                          type: 'journalTemplate',
                          nom: templateForm.nom.trim(),
                          transactionType: templateForm.type,
                          journal: templateForm.journal,
                          description: templateForm.description.trim(),
                          actif: templateForm.actif,
                          lines: templateLines.filter(l => l.compte.trim()),
                          createdAt: new Date().toISOString(),
                        });
                        toast.success(`Modèle "${templateForm.nom}" créé avec succès`);
                        setTemplateForm({ nom: '', type: '', journal: '', description: '', actif: false });
                        setTemplateLines([{ compte: '', libelle: '', debit: '', credit: '' }]);
                        setShowTemplateModal(false);
                      } catch (err) {
                        console.error('[EntriesPage] Erreur création modèle :', err);
                        toast.error('Erreur lors de la création du modèle');
                      } finally {
                        setIsSavingTemplate(false);
                      }
                    }}
                    className="px-6 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSavingTemplate ? 'Création…' : 'Créer le modèle'}
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