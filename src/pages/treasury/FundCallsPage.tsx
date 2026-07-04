/**
 * Module Appels de Fonds Atlas FnA
 * Interface complète avec workflow de validation selon cahier des charges
 */
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import {
  CreditCard,
  Plus,
  Download,
  Upload,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Search,
  Send,
  FileText,
  User,
  Building2,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Calculator
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Checkbox,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea
} from '../../components/ui';

interface PayableItem {
  id: string;
  vendor: string;
  vendorCode: string;
  documentDate: Date;
  documentNumber: string;
  reference: string;
  description: string;
  dueAmount: number;
  outstanding: number;
  invoiceType: 'ACHAT' | 'PRESTATION' | 'IMMOBILISATION' | 'AUTRE';
  arrearsAging: number; // jours de retard
  dueDate: Date;
  paymentTerms: string;
  selected?: boolean;
  recommendation?: 'PAIEMENT_COMPLET' | 'PAIEMENT_PARTIEL' | 'REPORTER' | 'URGENT';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  account: string;
  /** true = dépense PRÉVISIONNELLE saisie à la main, PAS encore comptabilisée
   *  (pas d'écriture au Grand Livre). Distinguée visuellement des dettes réelles. */
  provisional?: boolean;
}

interface FundCall {
  id: string;
  reference: string;
  date: Date;
  requestedBy: string;
  totalAmount: number;
  status: 'BROUILLON' | 'SOUMIS' | 'APPROUVE' | 'REJETE' | 'PAYE';
  workflowStep: 'CREATION' | 'VALIDATION_COMPTABLE' | 'VALIDATION_FINANCIERE' | 'VALIDATION_DIRECTION' | 'EXECUTION';
  approvers: {
    comptable?: { name: string; date?: Date; comment?: string };
    financier?: { name: string; date?: Date; comment?: string };
    direction?: { name: string; date?: Date; comment?: string };
  };
  items: PayableItem[];
  justification: string;
  paymentDate?: Date;
  bankAccount?: string;
}

/** Une paire libellé/valeur dans le détail dépliable d'une ligne payable. */
const Detail: React.FC<{ label: string; value: React.ReactNode; mono?: boolean; span?: boolean }> = ({ label, value, mono, span }) => (
  <div className={span ? 'col-span-2' : ''}>
    <span className="text-gray-500">{label} : </span>
    <span className={mono ? 'font-mono' : ''}>{value}</span>
  </div>
);

const FundCallsPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [viewMode, setViewMode] = useState<'payables' | 'fund-calls' | 'workflow'>('payables');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [proposedPayments, setProposedPayments] = useState<PayableItem[]>([]);
  const [groupBy, setGroupBy] = useState<'vendor' | 'type' | 'priority' | 'none'>('vendor');
  const [showFutureTransactions, setShowFutureTransactions] = useState(false);

  const [journalEntries, setJournalEntries] = useState<any[]>([]);
  const [fundCallsSetting, setFundCallsSetting] = useState<any>(undefined);
  const [payablesSetting, setPayablesSetting] = useState<any>(undefined);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [chargeAccounts, setChargeAccounts] = useState<{ code: string; name: string }[]>([]);

  // ── Dépenses PRÉVISIONNELLES (non encore comptabilisées) ──────────────────
  // Saisies à la main par l'utilisateur pour préparer un appel de fonds avant
  // que la facture ne soit enregistrée au Grand Livre. Persistées en local
  // (pas de table dédiée ; ce sont des prévisions, pas des écritures).
  const PROVISIONAL_KEY = 'wb_fund_call_provisional';
  const [provisionalExpenses, setProvisionalExpenses] = useState<PayableItem[]>(() => {
    try {
      const raw = localStorage.getItem(PROVISIONAL_KEY);
      if (!raw) return [];
      return (JSON.parse(raw) as PayableItem[]).map(it => ({
        ...it,
        documentDate: new Date(it.documentDate),
        dueDate: new Date(it.dueDate),
        provisional: true,
      }));
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(PROVISIONAL_KEY, JSON.stringify(provisionalExpenses)); } catch { /* quota/private mode */ }
  }, [provisionalExpenses]);

  // Ligne dépliée (détail) — id pour la table de gauche, `p-${id}` pour la droite.
  const [expandedPayable, setExpandedPayable] = useState<string | null>(null);

  // Au montage : les dépenses prévisionnelles persistées rejoignent la sélection
  // (elles s'affichent dans « Paiements proposés », pas dans « Comptes à payer »).
  useEffect(() => {
    setProposedPayments(prev => {
      const have = new Set(prev.map(p => p.id));
      const seed = provisionalExpenses.filter(p => !have.has(p.id));
      return seed.length ? [...seed, ...prev] : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const emptyForm = { vendor: '', description: '', amount: '', invoiceType: 'ACHAT' as PayableItem['invoiceType'], dueDate: '', priority: 'MEDIUM' as PayableItem['priority'], chargeAccount: '' };
  const [expenseForm, setExpenseForm] = useState(emptyForm);
  // Fournisseurs existants (tiers) pour l'autocomplétion du champ bénéficiaire.
  const [supplierNames, setSupplierNames] = useState<string[]>([]);
  useEffect(() => {
    adapter.getAll<any>('thirdParties').then((tps) => {
      setSupplierNames((tps || [])
        .filter((tp: any) => ['supplier', 'both', 'fournisseur'].includes(String(tp.type || '').toLowerCase()) || String(tp.code || tp.accountCode || '').startsWith('401'))
        .map((tp: any) => String(tp.name || tp.raison_sociale || tp.nom || ''))
        .filter(Boolean));
    }).catch(() => setSupplierNames([]));
  }, [adapter]);

  const addProvisionalExpense = () => {
    const amount = parseFloat(String(expenseForm.amount).replace(/\s/g, '').replace(',', '.')) || 0;
    if (!expenseForm.vendor.trim() || amount <= 0) return;
    const now = new Date();
    const due = expenseForm.dueDate ? new Date(expenseForm.dueDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // Compte de charge choisi (indicatif) → devient le n° de compte de la ligne.
    const charge = chargeAccounts.find(c => c.code === expenseForm.chargeAccount);
    const item: PayableItem = {
      id: `prov-${now.getTime()}`,
      vendor: expenseForm.vendor.trim(),
      vendorCode: charge ? charge.name : '—',
      documentDate: now,
      documentNumber: 'PRÉV.',
      reference: '—',
      description: expenseForm.description.trim() || expenseForm.vendor.trim(),
      dueAmount: amount,
      outstanding: amount,
      invoiceType: expenseForm.invoiceType,
      arrearsAging: Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))),
      dueDate: due,
      paymentTerms: 'Prévisionnel',
      priority: expenseForm.priority,
      account: expenseForm.chargeAccount || 'PRÉV.',
      provisional: true,
    };
    setProvisionalExpenses(prev => [...prev, item]);
    // La dépense rejoint DIRECTEMENT la sélection (table de droite).
    setProposedPayments(prev => [...prev, item]);
    setExpenseForm(emptyForm);
    setShowAddExpense(false);
  };

  const removeProvisionalExpense = (id: string) => {
    setProvisionalExpenses(prev => prev.filter(p => p.id !== id));
    setSelectedItems(prev => { const n = new Set(prev); n.delete(id); return n; });
    setProposedPayments(prev => prev.filter(p => p.id !== id));
  };

  useEffect(() => {
    const load = async () => {
      const [entries, fcSetting, pSetting, accounts] = await Promise.all([
        adapter.getAll('journalEntries'),
        adapter.getById('settings', 'fund_calls'),
        adapter.getById('settings', 'fund_call_payables'),
        adapter.getAll('accounts').catch(() => []),
      ]);
      setJournalEntries(entries as Record<string, unknown>[]);
      setFundCallsSetting(fcSetting);
      setPayablesSetting(pSetting);
      // Comptes de CHARGE (classe 6) du plan comptable — pour rattacher une
      // dépense prévisionnelle à un compte « à titre indicatif ».
      const charges = ((accounts as any[]) || [])
        .map(a => ({ code: String(a.code || a.account_code || a.accountCode || ''), name: String(a.name || a.label || a.libelle || '') }))
        .filter(a => a.code.startsWith('6'))
        .sort((a, b) => a.code.localeCompare(b.code));
      setChargeAccounts(charges);
      setDataLoaded(true);
    };
    load();
  }, [adapter]);

  const isLoading = !dataLoaded;

  // Build payables from settings or derive from journal entries
  const payables: PayableItem[] = useMemo(() => {
    if (payablesSetting) {
      const stored: PayableItem[] = JSON.parse(payablesSetting.value);
      // Rehydrate Date objects from stored strings
      return stored.map(item => ({
        ...item,
        documentDate: new Date(item.documentDate),
        dueDate: new Date(item.dueDate),
      }));
    }
    // Derive payables from journal entries on supplier accounts (401xxx, 404xxx)
    const supplierLines: PayableItem[] = [];
    journalEntries
      .filter(e => e.status === 'validated' || e.status === 'posted')
      .forEach(entry => {
        ((entry.lines as any[]) || [])
          .filter((line: any) => line.accountCode?.startsWith('401') || line.accountCode?.startsWith('404'))
          .filter((line: any) => line.credit > 0)
          .filter((line: any) => !line.lettrageCode) // facture LETTRÉE = payée → exclue
          .forEach((line: any) => {
            supplierLines.push({
              id: line.id,
              vendor: line.thirdPartyName || line.accountName,
              vendorCode: line.thirdPartyCode || line.accountCode,
              documentDate: new Date(entry.date),
              documentNumber: entry.entryNumber,
              reference: entry.reference,
              description: line.label || entry.label,
              dueAmount: line.credit,
              outstanding: line.credit,
              invoiceType: line.accountCode.startsWith('404') ? 'IMMOBILISATION' : 'ACHAT',
              arrearsAging: Math.max(0, Math.floor((Date.now() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24)) - 30),
              dueDate: new Date(new Date(entry.date).getTime() + 30 * 24 * 60 * 60 * 1000),
              paymentTerms: '30 jours',
              priority: 'MEDIUM',
              account: line.accountCode,
            });
          });
      });
    return supplierLines;
  }, [payablesSetting, journalEntries]);

  // Liste affichée = dettes RÉELLES (issues du GL) + dépenses PRÉVISIONNELLES
  // (saisies, non comptabilisées). Les prévisionnelles sont placées en tête.
  const combinedPayables: PayableItem[] = useMemo(
    () => [...provisionalExpenses, ...(payables || [])],
    [provisionalExpenses, payables],
  );

  // Agrégation PAR FOURNISSEUR : une entrée par tiers, total dû, et TOUTES ses
  // factures dépliables. (Avant : liste plate d'une facture par ligne.)
  interface SupplierGroup {
    key: string; vendor: string; account: string; total: number;
    maxAging: number; priority: PayableItem['priority']; invoices: PayableItem[];
  }
  const payablesBySupplier: SupplierGroup[] = useMemo(() => {
    const map = new Map<string, SupplierGroup>();
    for (const it of combinedPayables) {
      const key = it.vendorCode || it.vendor;
      if (!map.has(key)) {
        map.set(key, { key, vendor: it.vendor, account: it.account, total: 0, maxAging: 0, priority: 'LOW', invoices: [] });
      }
      const g = map.get(key)!;
      g.invoices.push(it);
      g.total += it.outstanding;
      g.maxAging = Math.max(g.maxAging, it.arrearsAging || 0);
      if (it.priority === 'CRITICAL' || (it.priority === 'HIGH' && g.priority !== 'CRITICAL')) g.priority = it.priority;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [combinedPayables]);

  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);

  // Sélectionne/désélectionne TOUTES les factures d'un fournisseur.
  const handleSupplierSelect = (group: SupplierGroup) => {
    const allSelected = group.invoices.every(inv => selectedItems.has(inv.id));
    const newSelected = new Set(selectedItems);
    if (allSelected) {
      group.invoices.forEach(inv => newSelected.delete(inv.id));
      setProposedPayments(prev => prev.filter(p => !group.invoices.some(inv => inv.id === p.id)));
    } else {
      const toAdd: PayableItem[] = [];
      group.invoices.forEach(inv => { if (!newSelected.has(inv.id)) { newSelected.add(inv.id); toAdd.push(inv); } });
      setProposedPayments(prev => [...prev, ...toAdd]);
    }
    setSelectedItems(newSelected);
  };

  // Load fund calls from Dexie settings
  const fundCalls: FundCall[] = useMemo(() => {
    if (!fundCallsSetting) return [];
    const stored: FundCall[] = JSON.parse(fundCallsSetting.value);
    return stored.map(fc => ({
      ...fc,
      date: new Date(fc.date),
      paymentDate: fc.paymentDate ? new Date(fc.paymentDate) : undefined,
      items: (fc.items || []).map(item => ({
        ...item,
        documentDate: new Date(item.documentDate),
        dueDate: new Date(item.dueDate),
      })),
      approvers: {
        ...fc.approvers,
        comptable: fc.approvers?.comptable ? { ...fc.approvers.comptable, date: fc.approvers.comptable.date ? new Date(fc.approvers.comptable.date) : undefined } : undefined,
        financier: fc.approvers?.financier ? { ...fc.approvers.financier, date: fc.approvers.financier.date ? new Date(fc.approvers.financier.date) : undefined } : undefined,
        direction: fc.approvers?.direction ? { ...fc.approvers.direction, date: fc.approvers.direction.date ? new Date(fc.approvers.direction.date) : undefined } : undefined,
      },
    }));
  }, [fundCallsSetting]);

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      setProposedPayments(prev => prev.filter(p => p.id !== itemId));
    } else {
      newSelected.add(itemId);
      const item = combinedPayables.find(p => p.id === itemId);
      if (item) {
        setProposedPayments(prev => [...prev, item]);
      }
    }
    setSelectedItems(newSelected);
  };

  const groupedPayables = useMemo(() => {
    if (groupBy === 'none') return { 'Tous': combinedPayables };

    return combinedPayables.reduce((groups, item) => {
      let groupKey = '';
      switch (groupBy) {
        case 'vendor':
          groupKey = item.vendor;
          break;
        case 'type':
          groupKey = item.invoiceType;
          break;
        case 'priority':
          groupKey = item.priority;
          break;
        default:
          groupKey = 'Tous';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, PayableItem[]>);
  }, [combinedPayables, groupBy]);

  const totalOutstanding = useMemo(() => {
    return (payables || []).reduce((sum, item) => sum + item.outstanding, 0);
  }, [payables]);

  const selectedAmount = useMemo(() => {
    return proposedPayments.reduce((sum, item) => sum + item.outstanding, 0);
  }, [proposedPayments]);

  // Persiste l'appel de fonds dans settings.fund_calls (brouillon ou soumis).
  const persistFundCall = async (statut: 'brouillon' | 'soumis') => {
    if (proposedPayments.length === 0) { toast.error('Aucun paiement sélectionné pour l’appel de fonds.'); return; }
    try {
      const raw: any = (fundCallsSetting as any)?.value ?? fundCallsSetting;
      const existing: any[] = Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw || '[]') : []);
      const call = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split('T')[0],
        statut,
        montant: selectedAmount,
        nbItems: proposedPayments.length,
        items: proposedPayments.map(p => ({ id: p.id, beneficiaire: p.vendor, code: p.vendorCode, montant: p.outstanding, type: p.invoiceType })),
      };
      const next = [call, ...existing];
      const value = JSON.stringify(next);
      if (fundCallsSetting) await adapter.update('settings', 'fund_calls', { value });
      else await adapter.create('settings', { key: 'fund_calls', value } as any);
      setFundCallsSetting({ key: 'fund_calls', value });
      toast.success(statut === 'brouillon' ? 'Appel de fonds enregistré (brouillon)' : `Appel de fonds soumis · ${formatCurrency(selectedAmount)}`);
    } catch (e: any) { toast.error(e?.message || 'Échec de l’enregistrement'); }
  };


  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Critique</Badge>;
      case 'HIGH':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Haute</Badge>;
      case 'MEDIUM':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Moyenne</Badge>;
      case 'LOW':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Basse</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'BROUILLON':
        return <Badge className="bg-gray-100 text-gray-800">{t('accounting.draft')}</Badge>;
      case 'SOUMIS':
        return <Badge className="bg-[var(--color-primary)]/10 text-[var(--color-primary)]">Soumis</Badge>;
      case 'APPROUVE':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case 'REJETE':
        return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>;
      case 'PAYE':
        return <Badge className="bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]">Payé</Badge>;
      default:
        return null;
    }
  };

  const renderPayablesTable = () => (
    <div className="space-y-3">
      {/* Résumé et filtres */}
      <div className="grid md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total à Payer</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(totalOutstanding)}
                </p>
                <p className="text-sm text-gray-700">{payables?.length} factures</p>
              </div>
              <CreditCard className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sélectionné</p>
                <p className="text-lg font-bold text-[var(--color-primary)]">
                  {formatCurrency(selectedAmount)}
                </p>
                <p className="text-sm text-gray-700">{proposedPayments.length} éléments</p>
              </div>
              <ArrowDownToLine className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Retard</p>
                <p className="text-lg font-bold text-orange-600">
                  {payables?.filter(p => p.arrearsAging > 0).length || 0}
                </p>
                <p className="text-sm text-gray-700">
                  {formatCurrency(payables?.filter(p => p.arrearsAging > 0)
                    .reduce((sum, p) => sum + p.outstanding, 0) || 0)}
                </p>
              </div>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critiques</p>
                <p className="text-lg font-bold text-red-600">
                  {payables?.filter(p => p.priority === 'CRITICAL').length || 0}
                </p>
                <p className="text-sm text-gray-700">Paiement urgent</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et contrôles */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
                <Input
                  placeholder="Rechercher fournisseur ou facture..."
                  className="pl-10 w-80"
                />
              </div>
              
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="futureTransactions"
                checked={showFutureTransactions}
                onChange={(e) => setShowFutureTransactions(e.target.checked)}
              />
              <Label htmlFor="futureTransactions" className="text-sm">
                Inclure transactions futures
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deux tables CÔTE À CÔTE : on pioche à GAUCHE (comptabilisé) pour alimenter
          la sélection à DROITE. Chacune a son propre défilement → les deux restent
          visibles en même temps ; séparateur centré (flèche) au milieu. */}
      <div className="flex items-stretch gap-0">

        {/* ── GAUCHE : Comptes à payer (dettes RÉELLES, Grand Livre) ── */}
        <Card className="flex-1 min-w-0">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Comptes à Payer
              </CardTitle>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {(payables || []).length} dette{(payables || []).length > 1 ? 's' : ''} · {formatCurrency(totalOutstanding)}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              Comptabilisé · Grand Livre — cochez pour alimenter la sélection →
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-y-auto">
              {/* Tout sélectionner (figé en haut) */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0 z-10 text-xs text-gray-600 border-b border-[var(--color-border)]">
                <Checkbox
                  checked={(payables || []).length > 0 && (payables || []).every(p => selectedItems.has(p.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(new Set((payables || []).map(p => p.id)));
                      setProposedPayments([...provisionalExpenses, ...(payables || [])]);
                    } else {
                      setSelectedItems(new Set());
                      setProposedPayments(prev => prev.filter(p => p.provisional));
                    }
                  }}
                />
                <span>Tout sélectionner</span>
              </div>

              {payablesBySupplier.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">Aucune dette comptabilisée.</div>
              ) : payablesBySupplier.map((group) => {
                const open = expandedSupplier === group.key;
                const allSel = group.invoices.every(inv => selectedItems.has(inv.id));
                return (
                  <div key={group.key} className={`border-b border-[var(--color-border)] ${
                    group.priority === 'CRITICAL' ? 'bg-red-50/40' : group.maxAging > 30 ? 'bg-yellow-50/40' : ''
                  }`}>
                    {/* Ligne FOURNISSEUR (total + nb factures) */}
                    <div className="px-3 py-2 flex items-center gap-2">
                      <Checkbox checked={allSel} onChange={() => handleSupplierSelect(group)} />
                      <button type="button" onClick={() => setExpandedSupplier(open ? null : group.key)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        <ChevronRight className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{group.vendor}</div>
                          <div className="text-xs text-gray-500">
                            {group.invoices.length} facture{group.invoices.length > 1 ? 's' : ''}{group.maxAging > 0 ? ` · retard max +${group.maxAging}j` : ''}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded shrink-0" title="Numéro de compte">{group.account}</span>
                        <span className="text-sm font-mono font-semibold whitespace-nowrap shrink-0">{formatCurrency(group.total)}</span>
                      </button>
                    </div>
                    {/* Toutes les FACTURES du fournisseur (dépliées) */}
                    {open && (
                      <div className="pl-7 pr-3 pb-2 space-y-1">
                        {group.invoices.map(inv => (
                          <div key={inv.id} className={`flex items-center gap-2 text-xs rounded px-2 py-1.5 ${inv.provisional ? 'bg-amber-50/70' : 'bg-gray-50'}`}>
                            <Checkbox checked={selectedItems.has(inv.id)} onChange={() => handleItemSelect(inv.id)} />
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-gray-700 truncate">{inv.documentNumber || inv.reference || '—'}</div>
                              <div className="text-gray-500 truncate">{inv.description}</div>
                            </div>
                            <div className="text-gray-500 whitespace-nowrap">{inv.documentDate.toLocaleDateString('fr-FR')}</div>
                            {inv.arrearsAging > 0 && <span className="text-red-600 whitespace-nowrap" title="Retard">+{inv.arrearsAging}j</span>}
                            <span className={`font-mono font-semibold whitespace-nowrap ${inv.provisional ? 'text-amber-700' : ''}`}>{formatCurrency(inv.outstanding)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── SÉPARATEUR centré : pioché à gauche → alimente à droite ── */}
        <div className="flex-none w-16 relative flex flex-col items-center justify-center">
          <div className="absolute top-6 bottom-6 w-px bg-[var(--color-border)]" />
          <div className="z-10 w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-sm" title="Alimente la sélection">
            <ArrowUpFromLine className="h-4 w-4 rotate-90" />
          </div>
          <span className="z-10 mt-1.5 text-[10px] text-gray-500 bg-[var(--color-background)] px-1">alimente</span>
        </div>

        {/* ── DROITE : Paiements proposés (sélection pour l'appel de fonds) ── */}
        <Card className="flex-1 min-w-0 border-2 border-[var(--color-primary)]/40">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpFromLine className="h-5 w-5" />
                Paiements Proposés
              </CardTitle>
              <span className="text-base font-bold font-mono text-[var(--color-primary)]">{formatCurrency(selectedAmount)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setShowAddExpense(true)} className="flex-1 flex items-center justify-center gap-1.5">
                <Plus className="h-4 w-4" />
                Dépense non comptabilisée
              </Button>
              <Button size="sm" onClick={() => setViewMode('workflow')} disabled={proposedPayments.length === 0} className="flex items-center gap-1.5">
                <Send className="h-4 w-4" />
                Créer Appel de Fonds
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[55vh] overflow-y-auto">
              {proposedPayments.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  Cochez des dettes à gauche, ou ajoutez une{' '}
                  <span className="font-semibold">dépense non comptabilisée</span>.
                </div>
              ) : proposedPayments.map((item) => {
                const expanded = expandedPayable === `p-${item.id}`;
                return (
                  <div key={item.id} className={`px-3 py-2 border-b border-[var(--color-border)] ${item.provisional ? 'bg-amber-50/70 border-l-4 border-amber-400' : ''}`}>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedPayable(expanded ? null : `p-${item.id}`)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                        <ChevronRight className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {item.vendor}
                            {item.provisional && <span className="text-[9px] uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300 rounded px-1 shrink-0">Prévisionnel</span>}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{item.description}</div>
                        </div>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded shrink-0" title="Numéro de compte">{item.account}</span>
                        <span className={`text-sm font-mono font-semibold whitespace-nowrap shrink-0 ${item.provisional ? 'text-amber-700' : ''}`}>{formatCurrency(item.outstanding)}</span>
                      </button>
                      <button type="button" onClick={() => item.provisional ? removeProvisionalExpense(item.id) : handleItemSelect(item.id)} title="Retirer de la sélection" className="p-1 text-red-500 hover:bg-red-50 rounded shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {expanded && (
                      <div className="mt-2 ml-7 grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white rounded p-2 border border-[var(--color-border)]">
                        <Detail label="Date document" value={item.documentDate.toLocaleDateString('fr-FR')} />
                        <Detail label="N° document" value={item.documentNumber || '—'} mono />
                        <Detail label="Référence" value={item.reference || '—'} mono />
                        <Detail label="Compte" value={item.account} mono />
                        <Detail label="Description" value={item.description} span />
                        <Detail label="Montant" value={formatCurrency(item.outstanding)} mono />
                        <Detail label="Retard (jours)" value={item.provisional ? '—' : (item.arrearsAging > 0 ? `+${item.arrearsAging}` : '0')} />
                        <div className="flex items-center gap-1"><span className="text-gray-500">Priorité :</span> {getPriorityBadge(item.priority)}</div>
                        <div className="col-span-2 flex items-center gap-2 mt-1">
                          <span className="text-gray-500">Recommandation :</span>
                          <select
                            value={item.recommendation || ''}
                            onChange={(e) => setProposedPayments(prev => prev.map(p => p.id === item.id ? { ...p, recommendation: (e.target.value || undefined) as PayableItem['recommendation'] } : p))}
                            className="border border-[var(--color-border)] rounded px-2 py-1 text-xs bg-white"
                          >
                            <option value="">—</option>
                            <option value="PAIEMENT_COMPLET">Paiement complet</option>
                            <option value="PAIEMENT_PARTIEL">Paiement partiel</option>
                            <option value="REPORTER">Reporter</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderFundCallsList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Historique des Appels de Fonds
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>Demandeur</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Étape Workflow</TableHead>
              <TableHead>Date Paiement</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fundCalls?.map((fundCall) => (
              <TableRow key={fundCall.id} className="hover:bg-primary-50">
                <TableCell>
                  <div className="font-mono font-medium">{fundCall.reference}</div>
                  <div className="text-sm text-gray-700">{fundCall.items.length} éléments</div>
                </TableCell>
                <TableCell>{fundCall.date.toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-700" />
                    {fundCall.requestedBy}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatCurrency(fundCall.totalAmount)}
                </TableCell>
                <TableCell>{getStatusBadge(fundCall.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {fundCall.workflowStep === 'EXECUTION' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-600" />
                    )}
                    <span className="text-sm">{fundCall.workflowStep.replace('_', ' ')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {fundCall.paymentDate?.toLocaleDateString('fr-FR') || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderWorkflow = () => (
    <div className="space-y-3">
      <Alert>
        <Send className="h-4 w-4" />
        <AlertDescription>
          Le workflow d'approbation garantit le contrôle des paiements selon la matrice de délégation définie.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Résumé de l'appel de fonds */}
        <Card>
          <CardHeader>
            <CardTitle>Résumé de l'Appel de Fonds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Date de demande</Label>
                <p className="font-medium">{new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Nombre de paiements</Label>
                <p className="font-medium">{proposedPayments.length}</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Montant total</Label>
                <p className="font-mono font-bold text-[var(--color-primary)]">
                  {formatCurrency(selectedAmount)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Priorité moyenne</Label>
                <p className="font-medium">Haute</p>
              </div>
            </div>

            <div>
              <Label htmlFor="justification">Justification *</Label>
              <Textarea
                id="justification"
                placeholder="Motif de l'appel de fonds et justification des paiements..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm text-gray-600">Répartition par type</Label>
              <div className="space-y-2 mt-2">
                {['ACHAT', 'PRESTATION', 'IMMOBILISATION', 'AUTRE'].map(type => {
                  const items = proposedPayments.filter(p => p.invoiceType === type);
                  const amount = items.reduce((sum, p) => sum + p.outstanding, 0);
                  if (amount === 0) return null;
                  
                  return (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="font-mono">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Workflow de validation */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow de Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  step: 'CREATION',
                  label: 'Création',
                  user: 'Demandeur',
                  status: 'completed',
                  icon: FileText
                },
                {
                  step: 'VALIDATION_COMPTABLE',
                  label: 'Validation Comptable',
                  user: 'Chef Comptable',
                  status: 'pending',
                  icon: Calculator
                },
                {
                  step: 'VALIDATION_FINANCIERE',
                  label: 'Validation Financière',
                  user: 'Directeur Financier',
                  status: 'waiting',
                  icon: DollarSign
                },
                {
                  step: 'VALIDATION_DIRECTION',
                  label: 'Validation Direction',
                  user: 'Directeur Général',
                  status: 'waiting',
                  icon: Building2
                },
                {
                  step: 'EXECUTION',
                  label: 'Exécution Paiement',
                  user: 'Trésorier',
                  status: 'waiting',
                  icon: Send
                }
              ].map((stage, index) => {
                const Icon = stage.icon;
                
                return (
                  <div key={stage.step} className="flex items-center gap-4">
                    <div className={`rounded-full p-2 border-2 ${
                      stage.status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                      stage.status === 'pending' ? 'bg-blue-600 border-blue-600 text-white' :
                      'bg-white border-gray-300 text-gray-700'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{stage.label}</div>
                      <div className="text-sm text-gray-600">{stage.user}</div>
                    </div>
                    
                    <div>
                      {stage.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {stage.status === 'pending' && (
                        <Clock className="h-5 w-5 text-[var(--color-primary)]" />
                      )}
                      {stage.status === 'waiting' && (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => persistFundCall('brouillon')}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Enregistrer Brouillon
                </Button>
                <Button onClick={() => persistFundCall('soumis')} disabled={proposedPayments.length === 0}>
                  <Send className="h-4 w-4 mr-2" />
                  Soumettre Appel de Fonds
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-primary-100 p-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-700 rounded-lg px-5 py-3 mb-3 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-3">
              <CreditCard className="h-6 w-6" />
              Appels de Fonds
            </h1>
            <p className="text-white/85 text-xs mt-0.5">
              Gestion des demandes de paiement avec workflow de validation
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PageHeaderActions />
            <Button className="bg-white text-primary-800 hover:bg-primary-100">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
            <Button variant="outline" className="border-white !bg-transparent text-white hover:!bg-white hover:text-primary-800">
              <Download className="h-4 w-4 mr-2" />
              Templates
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm mb-3 p-1">
        <div className="flex gap-1">
          {[
            { key: 'payables', label: 'Comptes à Payer', icon: FileText },
            { key: 'fund-calls', label: 'Historique', icon: Send },
            { key: 'workflow', label: 'Workflow', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key as 'payables' | 'fund-calls' | 'workflow')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg font-medium transition-all ${
                  viewMode === tab.key
                    ? 'bg-primary-800 text-white shadow-md'
                    : 'text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu */}
      {viewMode === 'payables' && renderPayablesTable()}
      {viewMode === 'fund-calls' && renderFundCallsList()}
      {viewMode === 'workflow' && renderWorkflow()}

      {/* Modale : ajouter une dépense PRÉVISIONNELLE (non comptabilisée) */}
      <Dialog open={showAddExpense} onOpenChange={setShowAddExpense} containerClassName="max-w-2xl">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une dépense non comptabilisée</DialogTitle>
            <DialogDescription>
              Dépense <span className="font-semibold">prévisionnelle</span> à inclure dans un
              appel de fonds avant son enregistrement comptable. Elle n'est PAS écrite au
              Grand Livre et reste distinguée des dettes réelles.
            </DialogDescription>
          </DialogHeader>

          {/* Repère couleur : tout ce qui est saisi ici est « Prévisionnel » (ambre). */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <span className="text-[10px] uppercase tracking-wide bg-amber-100 border border-amber-300 rounded px-1.5 py-0.5 font-semibold">Prévisionnel</span>
            <span>Enregistré et affiché en <span className="font-semibold">ambre</span>, distinct des dettes comptabilisées.</span>
          </div>

          <div className="space-y-3.5 py-2">
            <div>
              <Label htmlFor="exp-vendor">Bénéficiaire / Fournisseur *</Label>
              <Input id="exp-vendor" className="w-full" value={expenseForm.vendor} list="fund-suppliers"
                onChange={(e) => setExpenseForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder="Choisir un fournisseur existant ou saisir un nom…" />
              <datalist id="fund-suppliers">
                {Array.from(new Set([...supplierNames, ...payablesBySupplier.map(g => g.vendor)]))
                  .filter(Boolean).sort().map((name) => <option key={name} value={name} />)}
              </datalist>
              <p className="text-[11px] text-gray-400 mt-1">Sélectionnez un fournisseur existant dans la liste, ou tapez un nouveau nom.</p>
            </div>
            <div>
              <Label htmlFor="exp-desc">Description</Label>
              <Input id="exp-desc" className="w-full" value={expenseForm.description}
                onChange={(e) => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex. Acompte travaux toiture niveau 3" />
            </div>
            <div>
              <Label htmlFor="exp-charge">Compte de charge (à titre indicatif)</Label>
              <select id="exp-charge" value={expenseForm.chargeAccount}
                onChange={(e) => setExpenseForm(f => ({ ...f, chargeAccount: e.target.value }))}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white">
                <option value="">— Aucun (à imputer plus tard) —</option>
                {chargeAccounts.map(c => (
                  <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                Classe 6 du plan comptable. Sert de repère pour l'imputation — aucune écriture n'est générée.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exp-amount">Montant (FCFA) *</Label>
                <Input id="exp-amount" className="w-full" inputMode="decimal" value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" />
              </div>
              <div>
                <Label htmlFor="exp-due">Échéance prévue</Label>
                <Input id="exp-due" className="w-full" type="date" value={expenseForm.dueDate}
                  onChange={(e) => setExpenseForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="exp-type">Type</Label>
                <select id="exp-type" value={expenseForm.invoiceType}
                  onChange={(e) => setExpenseForm(f => ({ ...f, invoiceType: e.target.value as PayableItem['invoiceType'] }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white">
                  <option value="ACHAT">Achat</option>
                  <option value="PRESTATION">Prestation</option>
                  <option value="IMMOBILISATION">Immobilisation</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
              <div>
                <Label htmlFor="exp-prio">Priorité</Label>
                <select id="exp-prio" value={expenseForm.priority}
                  onChange={(e) => setExpenseForm(f => ({ ...f, priority: e.target.value as PayableItem['priority'] }))}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white">
                  <option value="LOW">Basse</option>
                  <option value="MEDIUM">Moyenne</option>
                  <option value="HIGH">Haute</option>
                  <option value="CRITICAL">Critique</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setExpenseForm(emptyForm); setShowAddExpense(false); }}>
              Annuler
            </Button>
            <Button
              onClick={addProvisionalExpense}
              disabled={!expenseForm.vendor.trim() || !(parseFloat(String(expenseForm.amount).replace(/\s/g, '').replace(',', '.')) > 0)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Ajouter la dépense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FundCallsPage;