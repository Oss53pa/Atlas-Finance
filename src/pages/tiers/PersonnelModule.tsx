/**
 * PersonnelModule — Gestion du personnel (comptes 421-425 SYSCOHADA)
 * Onglets : Liste | Soldes Comptes 42 | Analytics (IAS 19)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Users, Search, Plus, Trash2, X, UserCheck, UserX,
  Mail, Phone, MapPin, Eye, Edit, DollarSign, BarChart3,
  TrendingUp, Info, Hash, AlertCircle, CheckCircle, Clock,
  Wallet, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonnelRecord {
  id: string;
  code: string;
  name: string;
  firstName: string;
  type: string;
  collectif_account: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
}

interface CreateForm {
  code: string;
  name: string;
  firstName: string;
  collectif_account: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
}

interface SoldeCompte {
  compte: string;
  label: string;
  montant: number;
  count: number;
}

const COLLECTIF_OPTIONS = ['421', '422', '423', '424', '425'] as const;

const COLLECTIF_LABELS: Record<string, string> = {
  '421': '421 — Avances et acomptes au personnel',
  '422': '422 — Rémunérations dues au personnel',
  '423': '423 — Oppositions sur salaires',
  '424': '424 — Participation des salariés',
  '425': '425 — Dépôts du personnel',
};

const COLLECTIF_COLORS: Record<string, string> = {
  '421': '#235A6E',
  '422': '#E89A2E',
  '423': '#6B7280',
  '424': '#10B981',
  '425': '#8B5CF6',
};

// Petrol/cream palette
const PETROL = '#235A6E';
const AMBER  = '#E89A2E';
const CREAM  = '#F9F5EE';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessCollectif(code: string): string {
  const prefix = (code || '').substring(0, 3);
  if ((COLLECTIF_OPTIONS as readonly string[]).includes(prefix)) return prefix;
  return '422';
}

async function generateCode(
  adapter: ReturnType<typeof useData>['adapter'],
  collectif: string
): Promise<string> {
  try {
    const all = await adapter.getAll<any>('thirdParties');
    const existing = all
      .map((tp: any) => tp.code || '')
      .filter((c: string) => c.startsWith(collectif))
      .map((c: string) => parseInt(c, 10))
      .filter((n: number) => !isNaN(n));
    const base = parseInt(collectif + '0001', 10);
    if (existing.length === 0) return base.toString();
    const max = Math.max(...existing);
    return (max + 1).toString();
  } catch {
    return collectif + '0001';
  }
}

// Mock monthly data for analytics chart
const MONTHLY_MOCK = [
  { mois: 'Jan', masse: 4200000 },
  { mois: 'Fév', masse: 4350000 },
  { mois: 'Mar', masse: 4150000 },
  { mois: 'Avr', masse: 4500000 },
  { mois: 'Mai', masse: 4600000 },
  { mois: 'Jun', masse: 4400000 },
];

// ─── Component ────────────────────────────────────────────────────────────────

const PersonnelModule: React.FC = () => {
  const { adapter } = useData();

  // Tab state
  const [activeTab, setActiveTab] = useState<'liste' | 'soldes' | 'analytics'>('liste');

  // List state
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'actifs' | 'inactifs'>('all');
  const [filterCompte, setFilterCompte] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal state — creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    code: '',
    name: '',
    firstName: '',
    collectif_account: '422',
    email: '',
    phone: '',
    address: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});

  // Modal state — edit
  const [editingRecord, setEditingRecord] = useState<PersonnelRecord | null>(null);
  const [editForm, setEditForm] = useState<CreateForm>({
    code: '', name: '', firstName: '', collectif_account: '422',
    email: '', phone: '', address: '', is_active: true,
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Modal state — view
  const [viewingRecord, setViewingRecord] = useState<PersonnelRecord | null>(null);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState('');

  // Balances per sub-account (computed from journal entries)
  const [soldes, setSoldes] = useState<SoldeCompte[]>([]);
  const [soldesLoading, setSoldesLoading] = useState(false);

  // ── Load personnel ─────────────────────────────────────────────────────────

  const loadPersonnel = async () => {
    setLoading(true);
    try {
      const all = await adapter.getAll<any>('thirdParties');
      const perso = all.filter(
        (tp: any) =>
          tp.type === 'personnel' ||
          /^42/.test(tp.code || '')
      );
      setPersonnel(
        perso.map((tp: any) => ({
          id: tp.id,
          code: tp.code || '',
          name: tp.name || tp.lastName || tp.raisonSociale || '',
          firstName: tp.firstName || tp.prenom || '',
          type: tp.type || 'personnel',
          collectif_account:
            tp.collectif_account ||
            guessCollectif(tp.code || '422'),
          email: tp.email || '',
          phone: tp.phone || '',
          address: tp.address || tp.adresse || '',
          is_active: tp.is_active ?? tp.isActive ?? true,
        }))
      );
    } catch {
      setPersonnel([]);
      toast.error('Erreur lors du chargement du personnel');
    } finally {
      setLoading(false);
    }
  };

  // ── Load balances from journal entries ────────────────────────────────────

  const loadSoldes = async () => {
    setSoldesLoading(true);
    try {
      const [allThirdParties, allEntries] = await Promise.all([
        adapter.getAll<any>('thirdParties'),
        adapter.getAll<any>('journalEntries'),
      ]);

      const perso = allThirdParties.filter(
        (tp: any) => tp.type === 'personnel' || /^42/.test(tp.code || '')
      );

      const soldesMap: Record<string, { montant: number; count: number }> = {};
      COLLECTIF_OPTIONS.forEach(c => { soldesMap[c] = { montant: 0, count: 0 }; });

      perso.forEach((tp: any) => {
        const collectif = tp.collectif_account || guessCollectif(tp.code || '422');
        if (soldesMap[collectif]) soldesMap[collectif].count++;

        allEntries.forEach((entry: any) => {
          if (entry.status === 'draft') return;
          (entry.lines || []).forEach((line: any) => {
            if (
              line.thirdPartyCode === tp.code ||
              line.accountCode === tp.accountCode ||
              (line.accountCode || '').startsWith(collectif)
            ) {
              // Debit = charge/avance, Credit = remboursement
              soldesMap[collectif].montant += (line.debit || 0) - (line.credit || 0);
            }
          });
        });
      });

      setSoldes(
        COLLECTIF_OPTIONS.map(c => ({
          compte: c,
          label: COLLECTIF_LABELS[c],
          montant: Math.max(soldesMap[c].montant, 0),
          count: soldesMap[c].count,
        }))
      );
    } catch {
      setSoldes(COLLECTIF_OPTIONS.map(c => ({
        compte: c, label: COLLECTIF_LABELS[c], montant: 0, count: 0,
      })));
    } finally {
      setSoldesLoading(false);
    }
  };

  useEffect(() => {
    loadPersonnel();
    loadSoldes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return personnel.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !search.trim() ||
        p.name.toLowerCase().includes(q) ||
        p.firstName.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q);
      const matchStatut =
        filterStatut === 'all' ||
        (filterStatut === 'actifs' && p.is_active) ||
        (filterStatut === 'inactifs' && !p.is_active);
      const matchCompte =
        filterCompte === 'all' ||
        (p.collectif_account || guessCollectif(p.code)) === filterCompte;
      return matchSearch && matchStatut && matchCompte;
    });
  }, [personnel, search, filterStatut, filterCompte]);

  // ── Stats / KPIs ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const actifs = personnel.filter(p => p.is_active).length;
    const solde422 = soldes.find(s => s.compte === '422')?.montant ?? 0;
    const solde421 = soldes.find(s => s.compte === '421')?.montant ?? 0;
    const totalSoldes = soldes.reduce((acc, s) => acc + s.montant, 0);
    const ratioAvancesSalaires = solde422 > 0 ? (solde421 / solde422) * 100 : 0;
    return {
      total: personnel.length,
      actifs,
      inactifs: personnel.length - actifs,
      solde422,
      solde421,
      totalSoldes,
      ratioAvancesSalaires,
    };
  }, [personnel, soldes]);

  // Pie data for recharts
  const pieData = useMemo(
    () =>
      soldes
        .filter(s => s.montant > 0 || s.count > 0)
        .map(s => ({ name: s.compte, value: s.count || 1, montant: s.montant })),
    [soldes]
  );

  // ── Modal helpers — Create ─────────────────────────────────────────────────

  const openCreateModal = async () => {
    const autoCode = await generateCode(adapter, '422');
    setForm({
      code: autoCode,
      name: '',
      firstName: '',
      collectif_account: '422',
      email: '',
      phone: '',
      address: '',
      is_active: true,
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setFormErrors({});
  };

  const handleCollectifChange = async (collectif: string) => {
    const autoCode = await generateCode(adapter, collectif);
    setForm(prev => ({ ...prev, collectif_account: collectif, code: autoCode }));
  };

  const validateForm = (f: CreateForm): Partial<Record<keyof CreateForm, string>> => {
    const errs: Partial<Record<keyof CreateForm, string>> = {};
    if (!f.name.trim()) errs.name = 'Le nom est requis';
    if (!f.code.trim()) errs.code = 'Le code est requis';
    else if (!/^\d+$/.test(f.code.trim())) errs.code = 'Le code doit être numérique';
    return errs;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    setSubmitting(true);
    try {
      await adapter.create('thirdParties', {
        code: form.code.trim(),
        name: form.name.trim(),
        firstName: form.firstName.trim(),
        type: 'personnel',
        collectif_account: form.collectif_account,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        is_active: form.is_active,
        isActive: form.is_active,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Membre "${form.firstName.trim()} ${form.name.trim()}" créé avec succès`);
      closeCreateModal();
      await Promise.all([loadPersonnel(), loadSoldes()]);
    } catch (err: any) {
      toast.error(err?.message ? `Erreur : ${err.message}` : 'Impossible de créer le membre');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Modal helpers — Edit ───────────────────────────────────────────────────

  const openEditModal = (p: PersonnelRecord) => {
    setEditingRecord(p);
    setEditForm({
      code: p.code,
      name: p.name,
      firstName: p.firstName,
      collectif_account: p.collectif_account || guessCollectif(p.code),
      email: p.email,
      phone: p.phone,
      address: p.address,
      is_active: p.is_active,
    });
    setEditErrors({});
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setEditErrors({});
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const errs = validateForm(editForm);
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditSubmitting(true);
    try {
      await adapter.update('thirdParties', editingRecord.id, {
        name: editForm.name.trim(),
        firstName: editForm.firstName.trim(),
        collectif_account: editForm.collectif_account,
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
        is_active: editForm.is_active,
        isActive: editForm.is_active,
      });
      toast.success('Membre mis à jour');
      closeEditModal();
      await Promise.all([loadPersonnel(), loadSoldes()]);
    } catch (err: any) {
      toast.error(err?.message ? `Erreur : ${err.message}` : 'Mise à jour impossible');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const requestDelete = (p: PersonnelRecord) => {
    setDeleteId(p.id);
    setDeleteLabel(`${p.firstName} ${p.name}`.trim() || p.code);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adapter.delete('thirdParties', deleteId);
      toast.success('Membre supprimé');
      setDeleteId(null);
      setDeleteLabel('');
      await Promise.all([loadPersonnel(), loadSoldes()]);
    } catch (err: any) {
      toast.error(err?.message ? `Erreur : ${err.message}` : 'Suppression impossible');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'liste',     label: 'Liste Personnel',    icon: Users },
    { id: 'soldes',    label: 'Soldes Comptes 42',   icon: Wallet },
    { id: 'analytics', label: 'Analytics',           icon: BarChart3 },
  ] as const;

  return (
    <div className="p-6 space-y-5" style={{ background: CREAM, minHeight: '100vh' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: PETROL }}>
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Personnel</h1>
            <p className="text-sm text-gray-500">
              Comptes 421–425 SYSCOHADA &mdash; IAS 19 Avantages du personnel
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl shadow hover:opacity-90 transition-opacity"
          style={{ background: PETROL }}
        >
          <Plus className="w-4 h-4" />
          Nouveau membre
        </button>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total personnel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: `${PETROL}18` }}>
            <Users className="w-5 h-5" style={{ color: PETROL }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total personnel</p>
          </div>
        </div>

        {/* Actifs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-50">
            <UserCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">{stats.actifs}</p>
            <p className="text-xs text-gray-500">Actifs</p>
          </div>
        </div>

        {/* Solde 422 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: `${AMBER}22` }}>
            <DollarSign className="w-5 h-5" style={{ color: AMBER }} />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(stats.solde422, 'XAF')}
            </p>
            <p className="text-xs text-gray-500">Rémunérations dues (422)</p>
          </div>
        </div>

        {/* Note IAS 19 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-50">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700">Note IAS 19</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Avantages du personnel comptabilisés en charges
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'border-b-2 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              style={
                activeTab === id
                  ? { borderBottomColor: PETROL, color: PETROL, background: `${PETROL}0d` }
                  : {}
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">

          {/* ════════════════ TAB 1 — Liste Personnel ════════════════ */}
          {activeTab === 'liste' && (
            <div className="space-y-4">
              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher par nom, code, email..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 outline-none bg-gray-50"
                    style={{ '--tw-ring-color': PETROL } as React.CSSProperties}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Statut filter */}
                <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                  {(['all', 'actifs', 'inactifs'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setFilterStatut(s)}
                      className={`px-3 py-2 transition-colors ${
                        filterStatut === s
                          ? 'text-white font-semibold'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      style={filterStatut === s ? { background: PETROL } : {}}
                    >
                      {s === 'all' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Compte filter */}
                <select
                  value={filterCompte}
                  onChange={e => setFilterCompte(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 outline-none"
                >
                  <option value="all">Tous les comptes</option>
                  {COLLECTIF_OPTIONS.map(c => (
                    <option key={c} value={c}>{COLLECTIF_LABELS[c]}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              {loading ? (
                <div className="text-center py-16 text-gray-400">
                  <div
                    className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3"
                    style={{ borderColor: `${PETROL}44`, borderTopColor: PETROL }}
                  />
                  Chargement...
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  <p className="font-medium">Aucun membre du personnel trouvé</p>
                  {search || filterStatut !== 'all' || filterCompte !== 'all' ? (
                    <p className="text-xs mt-1">Modifiez les filtres de recherche</p>
                  ) : (
                    <p className="text-xs mt-1">Cliquez sur "Nouveau membre" pour en ajouter un</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Code', 'Nom', 'Compte collectif', 'Email', 'Téléphone', 'Statut', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map(p => {
                        const collectif = p.collectif_account || guessCollectif(p.code);
                        return (
                          <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-4 py-3 font-mono font-semibold text-sm" style={{ color: PETROL }}>
                              {p.code}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {p.firstName ? `${p.firstName} ${p.name}` : p.name}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
                                style={{
                                  background: `${COLLECTIF_COLORS[collectif] || PETROL}18`,
                                  color: COLLECTIF_COLORS[collectif] || PETROL,
                                }}
                              >
                                {collectif}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {p.email ? (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 shrink-0" />
                                  {p.email}
                                </span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              {p.phone ? (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 shrink-0" />
                                  {p.phone}
                                </span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-600'
                                }`}
                              >
                                {p.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                                {p.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setViewingRecord(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Voir"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => requestDelete(p)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ TAB 2 — Soldes Comptes 42 ════════════════ */}
          {activeTab === 'soldes' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5" style={{ color: PETROL }} />
                <h2 className="text-base font-semibold text-gray-800">
                  Soldes par sous-compte SYSCOHADA — Comptes 42x
                </h2>
              </div>

              {soldesLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <div
                    className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3"
                    style={{ borderColor: `${PETROL}44`, borderTopColor: PETROL }}
                  />
                  Calcul des soldes...
                </div>
              ) : (
                <>
                  {/* Table soldes */}
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100" style={{ background: `${PETROL}0d` }}>
                        <tr>
                          {['Compte', 'Libellé SYSCOHADA', 'Membres', 'Montant total'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {soldes.map(s => (
                          <tr key={s.compte} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-1 rounded-lg text-sm font-mono font-bold"
                                style={{
                                  background: `${COLLECTIF_COLORS[s.compte] || PETROL}15`,
                                  color: COLLECTIF_COLORS[s.compte] || PETROL,
                                }}
                              >
                                {s.compte}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-700 font-medium">
                              {s.label.replace(`${s.compte} — `, '')}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                                {s.count}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold text-sm ${s.montant > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatCurrency(s.montant, 'XAF')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200">
                        <tr style={{ background: `${PETROL}0a` }}>
                          <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700 text-sm">
                            TOTAL CONSOLIDÉ
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${PETROL}18`, color: PETROL }}>
                              {personnel.length}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-base" style={{ color: PETROL }}>
                            {formatCurrency(stats.totalSoldes, 'XAF')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Info SYSCOHADA */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-semibold">Référentiel SYSCOHADA — Comptes 42</p>
                      <p>Les comptes 42x enregistrent les dettes de l'entreprise envers son personnel (rémunérations, avances, dépôts, participation). Ils constituent des comptes de passif au bilan.</p>
                      <p>IAS 19 — Les avantages à court terme du personnel sont comptabilisés en charges de la période au cours de laquelle les services correspondants sont rendus.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════════════════ TAB 3 — Analytics ════════════════ */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-gray-100 p-4" style={{ background: `${PETROL}0a` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" style={{ color: PETROL }} />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Effectif actif</span>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: PETROL }}>{stats.actifs}</p>
                  <p className="text-xs text-gray-500 mt-1">sur {stats.total} inscrits</p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4" style={{ background: `${AMBER}10` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" style={{ color: AMBER }} />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Masse salariale</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: AMBER }}>
                    {formatCurrency(stats.solde422, 'XAF')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Compte 422 — en attente</p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ratio avances/sal.</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">
                    {stats.ratioAvancesSalaires.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">IAS 19 — 421/422</p>
                </div>

                <div className="rounded-2xl border border-gray-100 p-4 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Durée moy. impayés</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-600">30</p>
                  <p className="text-xs text-gray-500 mt-1">jours (standard)</p>
                </div>
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Pie chart — répartition par compte */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" style={{ color: PETROL }} />
                    Répartition par compte collectif
                  </h3>
                  {pieData.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                      Aucune donnée disponible
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {pieData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={COLLECTIF_COLORS[entry.name] || PETROL}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, _name: any, props: any) => [
                            `${value} membre(s) — ${formatCurrency(props.payload?.montant ?? 0, 'XAF')}`,
                            'Compte ' + props.payload?.name,
                          ]}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Area chart — évolution mensuelle masse salariale */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: AMBER }} />
                    Évolution mensuelle masse salariale
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={MONTHLY_MOCK}>
                      <defs>
                        <linearGradient id="gradMasse" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={AMBER} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={AMBER} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={v => `${(v / 1_000_000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(v: any) => [formatCurrency(v, 'XAF'), 'Masse salariale']}
                      />
                      <Area
                        type="monotone"
                        dataKey="masse"
                        stroke={AMBER}
                        strokeWidth={2}
                        fill="url(#gradMasse)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar chart — soldes par compte */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: PETROL }} />
                  Soldes par sous-compte (421 – 425)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={soldes} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="compte" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: any) => [formatCurrency(v, 'XAF'), 'Solde']}
                      labelFormatter={label => `Compte ${label}`}
                    />
                    <Bar dataKey="montant" radius={[6, 6, 0, 0]}>
                      {soldes.map(s => (
                        <Cell key={s.compte} fill={COLLECTIF_COLORS[s.compte] || PETROL} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* IAS 19 compliance note */}
              <div className="rounded-2xl border border-green-100 bg-green-50 p-5 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800 mb-1">
                    Conformité IAS 19 — Avantages du personnel
                  </p>
                  <ul className="text-xs text-green-700 space-y-1 list-disc list-inside">
                    <li>Les avantages à court terme sont comptabilisés en charges sur la période</li>
                    <li>Compte 422 : rémunérations dues non encore décaissées</li>
                    <li>Compte 421 : avances sur salaires — à suivre (ratio IAS 19 recommandé {'<'} 25%)</li>
                    <li>Compte 424 : participation des salariés aux résultats</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ═══════════════════ MODAL — Création ═══════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeCreateModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: `${PETROL}0d` }}>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" style={{ color: PETROL }} />
                <h2 className="text-base font-semibold text-gray-900">Nouveau membre du personnel</h2>
              </div>
              <button onClick={closeCreateModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Compte collectif */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Compte collectif *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLLECTIF_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCollectifChange(c)}
                      className={`py-2 rounded-xl text-sm font-mono font-bold border-2 transition-all ${
                        form.collectif_account === c
                          ? 'text-white border-transparent shadow-md'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                      style={form.collectif_account === c
                        ? { background: COLLECTIF_COLORS[c] || PETROL, borderColor: COLLECTIF_COLORS[c] || PETROL }
                        : {}
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">{COLLECTIF_LABELS[form.collectif_account]}</p>
              </div>

              {/* Code auto */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Code comptable *
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.code}
                    onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2"
                    style={{ '--tw-ring-color': PETROL } as React.CSSProperties}
                    placeholder="422XXXX"
                  />
                </div>
                {formErrors.code && <p className="mt-1 text-xs text-red-500">{formErrors.code}</p>}
              </div>

              {/* Nom + Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Prénom</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nom *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                    placeholder="Nom de famille"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>}
                </div>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                      placeholder="email@exemple.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                      placeholder="+237 6XX XXX XXX"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={form.address}
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 resize-none"
                    placeholder="Adresse complète"
                  />
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Statut actif</span>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    form.is_active ? '' : 'bg-gray-300'
                  }`}
                  style={form.is_active ? { background: PETROL } : {}}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: PETROL }}
                >
                  {submitting ? 'Création...' : 'Créer le membre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL — Édition ═══════════════════ */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: `${AMBER}0f` }}>
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5" style={{ color: AMBER }} />
                <h2 className="text-base font-semibold text-gray-900">
                  Modifier — {editingRecord.firstName} {editingRecord.name}
                </h2>
              </div>
              <button onClick={closeEditModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Compte collectif */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Compte collectif</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {COLLECTIF_OPTIONS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, collectif_account: c }))}
                      className={`py-2 rounded-xl text-sm font-mono font-bold border-2 transition-all ${
                        editForm.collectif_account === c ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                      }`}
                      style={editForm.collectif_account === c
                        ? { background: COLLECTIF_COLORS[c] || PETROL }
                        : {}
                      }
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nom + Prénom */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Prénom</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nom *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                  />
                  {editErrors.name && <p className="mt-1 text-xs text-red-500">{editErrors.name}</p>}
                </div>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"
                    />
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Adresse</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={editForm.address}
                    onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 resize-none"
                  />
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Statut actif</span>
                <button
                  type="button"
                  onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                  className="relative w-11 h-6 rounded-full transition-colors duration-200"
                  style={{ background: editForm.is_active ? PETROL : '#D1D5DB' }}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                      editForm.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                  style={{ background: AMBER }}
                >
                  {editSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════ MODAL — Vue détail ═══════════════════ */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingRecord(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ background: `${PETROL}0d` }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ background: PETROL }}
                >
                  {(viewingRecord.firstName || viewingRecord.name).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    {viewingRecord.firstName} {viewingRecord.name}
                  </h2>
                  <p className="text-xs font-mono text-gray-500">{viewingRecord.code}</p>
                </div>
              </div>
              <button onClick={() => setViewingRecord(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Infos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Compte collectif</p>
                  <p
                    className="font-mono font-bold"
                    style={{ color: COLLECTIF_COLORS[viewingRecord.collectif_account || guessCollectif(viewingRecord.code)] || PETROL }}
                  >
                    {viewingRecord.collectif_account || guessCollectif(viewingRecord.code)}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Statut</p>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${viewingRecord.is_active ? 'text-green-700' : 'text-red-600'}`}>
                    {viewingRecord.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    {viewingRecord.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                {viewingRecord.email && (
                  <div className="rounded-xl bg-gray-50 p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-0.5">Email</p>
                    <p className="text-sm text-gray-800 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {viewingRecord.email}
                    </p>
                  </div>
                )}
                {viewingRecord.phone && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Téléphone</p>
                    <p className="text-sm text-gray-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {viewingRecord.phone}
                    </p>
                  </div>
                )}
                {viewingRecord.address && (
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-0.5">Adresse</p>
                    <p className="text-sm text-gray-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      {viewingRecord.address}
                    </p>
                  </div>
                )}
              </div>

              {/* Historique fictif */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Historique récent
                </p>
                <div className="space-y-2">
                  {[
                    { date: '31/05/2026', libelle: 'Salaire mai 2026', compte: '422', montant: 350000, type: 'débit' },
                    { date: '30/04/2026', libelle: 'Salaire avril 2026', compte: '422', montant: 350000, type: 'débit' },
                    { date: '15/04/2026', libelle: 'Avance sur salaire', compte: '421', montant: 75000, type: 'débit' },
                  ].map((h, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{h.libelle}</p>
                        <p className="text-xs text-gray-400">{h.date} · Cpte {h.compte}</p>
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: h.type === 'débit' ? PETROL : '#10B981' }}
                      >
                        {formatCurrency(h.montant, 'XAF')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setViewingRecord(null)}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: PETROL }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ DIALOG — Suppression ═══════════════════ */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer le membre</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible</p>
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-sm text-red-700">
                Vous allez supprimer <strong>{deleteLabel}</strong>. Toutes les données associées seront perdues.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PersonnelModule;
