/**
 * AutresTiersModule — Organismes sociaux, État, Autres débiteurs/créditeurs
 * Comptes 43x, 44x, 46x, 47x SYSCOHADA
 * Conforme SYSCOHADA Art. 27 · IAS 12 · IAS 19
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import {
  Database, Search, Plus, Trash2, X, Save, Eye, Edit,
  BarChart3, PieChart, TrendingUp, TrendingDown, Users,
  ShieldCheck, AlertCircle, CheckCircle, Activity,
  Building, FileText, Mail, Phone, Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell,
  ResponsiveContainer
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutreTiers {
  id: string;
  code: string;
  name: string;
  type: string;
  classe: '43' | '44' | '46' | '47';
  collectif_account: string;
  is_active: boolean;
  email?: string;
  phone?: string;
  // Soldes calculés depuis les écritures
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

type MainTab = 'liste' | 'balance' | 'analytics';
type ClasseFilter = 'all' | '43' | '44' | '46' | '47';

interface FormData {
  code: string;
  name: string;
  classe: '43' | '44' | '46' | '47';
  collectif_account: string;
  email: string;
  phone: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLASSE_INFO: Record<string, { label: string; desc: string; collectifs: { code: string; label: string }[]; color: string; ifrs: string }> = {
  '43': {
    label: 'Organismes sociaux',
    desc: 'CNPS, mutuelles, caisses de retraite',
    collectifs: [
      { code: '431', label: '431 — CNPS / Sécurité sociale' },
      { code: '432', label: '432 — Mutuelles' },
      { code: '433', label: '433 — Caisses de retraite' },
      { code: '438', label: '438 — Autres organismes sociaux' },
    ],
    color: 'blue',
    ifrs: 'IAS 19',
  },
  '44': {
    label: 'État & Collectivités',
    desc: 'Impôts, TVA, IS, patentes',
    collectifs: [
      { code: '441', label: '441 — État, TVA' },
      { code: '442', label: '442 — État, IS' },
      { code: '443', label: '443 — Autres impôts & taxes' },
      { code: '444', label: '444 — Patentes & licences' },
      { code: '445', label: '445 — TVA déductible' },
      { code: '447', label: '447 — Autres impôts à payer' },
    ],
    color: 'amber',
    ifrs: 'IAS 12',
  },
  '46': {
    label: 'Associés / Débiteurs divers',
    desc: 'Associés, débiteurs transitoires',
    collectifs: [
      { code: '461', label: '461 — Associés, comptes courants' },
      { code: '462', label: '462 — Débiteurs divers' },
      { code: '468', label: '468 — Débiteurs transitoires' },
    ],
    color: 'emerald',
    ifrs: 'IFRS 9',
  },
  '47': {
    label: 'Créditeurs divers',
    desc: 'Créditeurs transitoires, autres',
    collectifs: [
      { code: '471', label: '471 — Créditeurs divers' },
      { code: '472', label: '472 — Versements reçus sur commandes' },
      { code: '476', label: '476 — Produits constatés d\'avance' },
      { code: '477', label: '477 — Charges constatées d\'avance' },
    ],
    color: 'purple',
    ifrs: 'IFRS 9',
  },
};

const CLASSE_FILTERS: { key: ClasseFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: '43', label: 'Org. Sociaux (43x)' },
  { key: '44', label: 'État & Impôts (44x)' },
  { key: '46', label: 'Divers (46x)' },
  { key: '47', label: 'Créditeurs (47x)' },
];

const MAIN_TABS = [
  { key: 'liste' as MainTab, label: 'Liste Autres Tiers', icon: Database },
  { key: 'balance' as MainTab, label: 'Balance par Classe', icon: BarChart3 },
  { key: 'analytics' as MainTab, label: 'Analytics', icon: Activity },
];

const COLOR_PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4'];

const DEFAULT_FORM: FormData = {
  code: '',
  name: '',
  classe: '47',
  collectif_account: '471',
  email: '',
  phone: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectClasse(code: string): '43' | '44' | '46' | '47' | null {
  const prefix = code.substring(0, 2);
  if (['43', '44', '46', '47'].includes(prefix)) return prefix as '43' | '44' | '46' | '47';
  return null;
}

function classeColorClasses(classe: string) {
  const c = CLASSE_INFO[classe]?.color || 'gray';
  const map: Record<string, { badge: string; bg: string; text: string; border: string; cardBg: string }> = {
    blue:    { badge: 'bg-blue-100 text-blue-700', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', cardBg: 'bg-blue-50' },
    amber:   { badge: 'bg-amber-100 text-amber-700', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', cardBg: 'bg-amber-50' },
    emerald: { badge: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', cardBg: 'bg-emerald-50' },
    purple:  { badge: 'bg-purple-100 text-purple-700', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', cardBg: 'bg-purple-50' },
    gray:    { badge: 'bg-gray-100 text-gray-700', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', cardBg: 'bg-gray-50' },
  };
  return map[c] || map.gray;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const AutresTiersModule: React.FC = () => {
  const { adapter } = useData();

  // Données
  const [tiers, setTiers] = useState<AutreTiers[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [mainTab, setMainTab] = useState<MainTab>('liste');
  const [classeFilter, setClasseFilter] = useState<ClasseFilter>('all');
  const [search, setSearch] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AutreTiers | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<AutreTiers | null>(null);
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  // ── Chargement ──────────────────────────────────────────────────────────────
  const loadTiers = useCallback(async () => {
    setLoading(true);
    try {
      const [allThirdParties, allEntries] = await Promise.all([
        adapter.getAll<any>('thirdParties'),
        adapter.getAll<any>('journalEntries'),
      ]);

      // Fiches "autres" RÉELLES : EXCLURE fournisseurs/clients/personnel (codes 40/41/42).
      // ⚠️ Les fiches type 'other' importées sont en réalité du PERSONNEL (code 42x) ;
      // sans cette exclusion elles apparaissent en double (Personnel + Autres Tiers).
      const autres = allThirdParties.filter((tp: any) => {
        const code = tp.code || '';
        if (/^4[012]/.test(code)) return false;
        return tp.type === 'other' || /^4[3467]/.test(code);
      });

      const mapped: AutreTiers[] = autres.map((tp: any) => {
        const rawCode: string = tp.code || '';
        const classeDetected = detectClasse(rawCode);
        const classe = classeDetected ?? '47';

        // Calcul soldes depuis écritures (hors brouillons)
        let totalDebit = 0;
        let totalCredit = 0;
        allEntries.forEach((entry: any) => {
          if (entry.status === 'draft') return;
          (entry.lines || []).forEach((line: any) => {
            if (
              line.thirdPartyCode === rawCode ||
              line.accountCode === tp.accountCode ||
              (line.accountCode || '').startsWith(rawCode)
            ) {
              totalDebit += line.debit || 0;
              totalCredit += line.credit || 0;
            }
          });
        });

        const collectif =
          tp.collectif_account ||
          tp.collectifAccount ||
          tp.compteComptable ||
          (tp.accountCode || '').substring(0, 3) ||
          classe + '1';

        return {
          id: tp.id,
          code: rawCode,
          name: tp.name || tp.raisonSociale || '',
          type: tp.type || 'other',
          classe,
          collectif_account: collectif,
          is_active: tp.is_active ?? tp.isActive ?? true,
          email: tp.email || '',
          phone: tp.phone || '',
          totalDebit,
          totalCredit,
          solde: totalCredit - totalDebit,
        };
      });

      // ── Dérivation Grand Livre : classes 43/44/46/47 (organismes sociaux, État,
      // débiteurs/créditeurs divers, associés). Ces tiers n'ont PAS de fiche dans
      // l'import → une ligne par COMPTE, soldes agrégés depuis le GL (hors brouillons).
      const dejaVus = new Set(mapped.map(m => m.code));
      const glByAccount = new Map<string, { name: string; debit: number; credit: number }>();
      allEntries.forEach((entry: any) => {
        if (entry.status === 'draft') return;
        (entry.lines || []).forEach((line: any) => {
          const code = String(line.accountCode || '');
          if (!/^4[3467]/.test(code)) return;
          const cur = glByAccount.get(code) || { name: line.accountName || code, debit: 0, credit: 0 };
          cur.debit += line.debit || 0;
          cur.credit += line.credit || 0;
          if ((!cur.name || cur.name === code) && line.accountName) cur.name = line.accountName;
          glByAccount.set(code, cur);
        });
      });
      for (const [code, v] of glByAccount.entries()) {
        if (dejaVus.has(code)) continue;
        const classe = code.substring(0, 2) as '43' | '44' | '46' | '47';
        mapped.push({
          id: `gl-${code}`,
          code,
          name: v.name || code,
          type: 'other',
          classe,
          collectif_account: code.substring(0, 3),
          is_active: true,
          email: '',
          phone: '',
          totalDebit: v.debit,
          totalCredit: v.credit,
          solde: v.credit - v.debit,
        });
      }

      setTiers(mapped);
    } catch {
      setTiers([]);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  // ── Filtrage liste ──────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      tiers.filter(t => {
        const matchClasse = classeFilter === 'all' || t.classe === classeFilter;
        const matchSearch =
          !search ||
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.code.toLowerCase().includes(search.toLowerCase());
        return matchClasse && matchSearch;
      }),
    [tiers, classeFilter, search]
  );

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const byClasse = (c: string) => tiers.filter(t => t.classe === c);
    const soldeSum = (arr: AutreTiers[]) => arr.reduce((s, t) => s + Math.max(t.solde, 0), 0);
    return {
      total: tiers.length,
      actifs: tiers.filter(t => t.is_active).length,
      dettesFiscales: soldeSum(byClasse('44')),
      chargesSociales: soldeSum(byClasse('43')),
      crediteursDivers: soldeSum(byClasse('47')),
      debiteursAssocies: soldeSum(byClasse('46')),
    };
  }, [tiers]);

  // ── Balance par classe ──────────────────────────────────────────────────────
  const balanceByClasse = useMemo(
    () =>
      (['43', '44', '46', '47'] as const).map(classe => {
        const items = tiers.filter(t => t.classe === classe);
        const debit = items.reduce((s, t) => s + t.totalDebit, 0);
        const credit = items.reduce((s, t) => s + t.totalCredit, 0);
        return {
          classe,
          label: CLASSE_INFO[classe]?.label || `${classe}x`,
          count: items.length,
          debit,
          credit,
          solde: credit - debit,
          items,
        };
      }),
    [tiers]
  );

  // ── Données graphiques ──────────────────────────────────────────────────────
  const pieData = useMemo(
    () =>
      balanceByClasse
        .filter(b => b.count > 0)
        .map(b => ({ name: `${b.classe}x — ${b.label}`, value: b.count })),
    [balanceByClasse]
  );

  const barData = useMemo(
    () =>
      balanceByClasse.map(b => ({
        classe: `${b.classe}x`,
        Débit: b.debit,
        Crédit: b.credit,
        Solde: Math.abs(b.solde),
      })),
    [balanceByClasse]
  );

  // ── Création ───────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Le code et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      await adapter.create('thirdParties', {
        id,
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        type: 'other',
        collectif_account: form.collectif_account,
        accountCode: form.collectif_account + form.code.trim().toUpperCase(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      toast.success(`Tiers "${form.name}" créé avec succès.`);
      setShowCreateModal(false);
      setForm({ ...DEFAULT_FORM });
      await loadTiers();
    } catch (err: any) {
      toast.error(`Erreur lors de la création : ${err?.message || 'inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Édition ────────────────────────────────────────────────────────────────
  const openEdit = (t: AutreTiers) => {
    setSelectedTiers(t);
    setForm({
      code: t.code,
      name: t.name,
      classe: t.classe,
      collectif_account: t.collectif_account,
      email: t.email || '',
      phone: t.phone || '',
    });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!selectedTiers || !form.code.trim() || !form.name.trim()) {
      toast.error('Le code et le nom sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      await adapter.update('thirdParties', selectedTiers.id, {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        collectif_account: form.collectif_account,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      toast.success(`Tiers "${form.name}" mis à jour.`);
      setShowEditModal(false);
      setSelectedTiers(null);
      await loadTiers();
    } catch (err: any) {
      toast.error(`Erreur lors de la mise à jour : ${err?.message || 'inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDelete = async (t: AutreTiers) => {
    try {
      await adapter.delete('thirdParties', t.id);
      setTiers(prev => prev.filter(x => x.id !== t.id));
      toast.success(`Tiers "${t.name}" supprimé.`);
    } catch (err: any) {
      toast.error(`Erreur lors de la suppression : ${err?.message || 'inconnue'}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  // ── Formulaire commun ──────────────────────────────────────────────────────
  const renderFormFields = () => (
    <div className="space-y-4">
      {/* Code + Nom */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="ex: 4710001"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Dénomination"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      {/* Classe SYSCOHADA */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Classe SYSCOHADA</label>
        <select
          value={form.classe}
          onChange={e => {
            const c = e.target.value as '43' | '44' | '46' | '47';
            const defaultCollectif = CLASSE_INFO[c]?.collectifs[0]?.code || c + '1';
            setForm(f => ({ ...f, classe: c, collectif_account: defaultCollectif }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        >
          <option value="43">43x — Organismes sociaux (CNPS, mutuelles)</option>
          <option value="44">44x — État & Impôts (TVA, IS, patentes)</option>
          <option value="46">46x — Associés / Débiteurs divers</option>
          <option value="47">47x — Créditeurs divers</option>
        </select>
      </div>

      {/* Compte collectif */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Compte collectif</label>
        <select
          value={form.collectif_account}
          onChange={e => setForm(f => ({ ...f, collectif_account: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
        >
          {(CLASSE_INFO[form.classe]?.collectifs || []).map(opt => (
            <option key={opt.code} value={opt.code}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Email + Téléphone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Mail className="inline w-3 h-3 mr-1" />Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="contact@exemple.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <Phone className="inline w-3 h-3 mr-1" />Téléphone
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+237 6XX XX XX XX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>
    </div>
  );

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 bg-gray-50 min-h-full">

      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 rounded-xl">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Autres Tiers</h1>
            <p className="text-sm text-gray-500">
              Org. sociaux (43x) · État (44x) · Divers (46x) · Créditeurs (47x)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Conforme SYSCOHADA Art. 27 · IAS 12 · IAS 19
          </span>
          <button
            onClick={() => { setForm({ ...DEFAULT_FORM }); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nouvel autre tiers
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase">Total</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
          <p className="text-xs text-gray-400 mt-0.5">{kpis.actifs} actifs</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-600 uppercase">Dettes fiscales (44x)</span>
            <FileText className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(kpis.dettesFiscales)}</p>
          <p className="text-xs text-gray-400 mt-0.5">IAS 12 — Impôt sur le résultat</p>
        </div>

        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-600 uppercase">Charges sociales (43x)</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-700">{formatCurrency(kpis.chargesSociales)}</p>
          <p className="text-xs text-gray-400 mt-0.5">IAS 19 — Cotisations</p>
        </div>

        <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-purple-600 uppercase">Créditeurs divers (47x)</span>
            <TrendingDown className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-purple-700">{formatCurrency(kpis.crediteursDivers)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Obligations diverses</p>
        </div>
      </div>

      {/* ── Onglets principaux ── */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
        {MAIN_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setMainTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                mainTab === tab.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 1 — LISTE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {mainTab === 'liste' && (
        <div className="space-y-4">
          {/* Filtres classe + recherche */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto flex-shrink-0">
              {CLASSE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setClasseFilter(f.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    classeFilter === f.key
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  {f.key !== 'all' && (
                    <span className="ml-1 text-gray-400">
                      ({tiers.filter(t => t.classe === f.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par code ou nom..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="w-8 h-8 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3" />
              Chargement...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun tiers trouvé</p>
              <p className="text-xs mt-1">
                {tiers.length === 0
                  ? 'Cliquez sur "+ Nouvel autre tiers" pour commencer.'
                  : 'Aucun résultat pour ce filtre.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Code', 'Nom', 'Classe SYSCOHADA', 'Compte collectif', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(t => {
                    const cc = classeColorClasses(t.classe);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-purple-700">{t.code}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cc.badge}`}>
                            {t.classe}x — {CLASSE_INFO[t.classe]?.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-600 text-xs">{t.collectif_account}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedTiers(t); setShowDetailModal(true); }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Voir détail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(t)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex justify-between">
                <span>{filtered.length} résultat(s)</span>
                <span>{tiers.length} tiers au total</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 2 — BALANCE PAR CLASSE */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {mainTab === 'balance' && (
        <div className="space-y-5">
          {/* Cards par classe */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {balanceByClasse.map(b => {
              const cc = classeColorClasses(b.classe);
              const info = CLASSE_INFO[b.classe];
              return (
                <div key={b.classe} className={`bg-white rounded-xl border ${cc.border} p-5 shadow-sm`}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${cc.badge}`}>
                    {b.classe}x — {b.label}
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{info?.desc}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Débit total</span>
                      <span className="font-mono font-medium text-gray-900">{formatCurrency(b.debit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Crédit total</span>
                      <span className="font-mono font-medium text-gray-900">{formatCurrency(b.credit)}</span>
                    </div>
                    <div className={`flex justify-between text-sm font-semibold pt-2 border-t ${cc.border}`}>
                      <span className={cc.text}>Solde net</span>
                      <span className={`font-mono ${b.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(b.solde))}
                        <span className="text-xs ml-1">{b.solde >= 0 ? 'C' : 'D'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
                    {b.count} tiers · IFRS {info?.ifrs}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tableau récapitulatif */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Récapitulatif Balance par Classe SYSCOHADA
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Classe', 'Intitulé', 'Nbre tiers', 'Débit total', 'Crédit total', 'Solde', 'Norme IFRS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {balanceByClasse.map(b => {
                  const cc = classeColorClasses(b.classe);
                  const info = CLASSE_INFO[b.classe];
                  return (
                    <tr key={b.classe} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cc.badge}`}>
                          {b.classe}x
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{b.label}</td>
                      <td className="px-4 py-3 text-gray-600">{b.count}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{formatCurrency(b.debit)}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{formatCurrency(b.credit)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono font-semibold ${b.solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(b.solde))} {b.solde >= 0 ? 'C' : 'D'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{info?.ifrs}</td>
                    </tr>
                  );
                })}
                {/* Total */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-700" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-gray-700">{tiers.length}</td>
                  <td className="px-4 py-3 font-mono text-gray-900">
                    {formatCurrency(balanceByClasse.reduce((s, b) => s + b.debit, 0))}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900">
                    {formatCurrency(balanceByClasse.reduce((s, b) => s + b.credit, 0))}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-900">
                    {formatCurrency(Math.abs(balanceByClasse.reduce((s, b) => s + b.solde, 0)))}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Graphique barres */}
          {barData.some(d => d.Débit > 0 || d.Crédit > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Débit / Crédit par classe</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="classe" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="Débit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Crédit" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 3 — ANALYTICS */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {mainTab === 'analytics' && (
        <div className="space-y-5">
          {/* KPI analytiques */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-gray-600 uppercase">Autres tiers actifs</span>
              </div>
              <p className="text-3xl font-bold text-purple-700">{kpis.actifs}</p>
              <p className="text-xs text-gray-400 mt-1">/ {kpis.total} enregistrés</p>
            </div>

            <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 uppercase">Dettes fiscales</span>
              </div>
              <p className="text-xl font-bold text-amber-700">{formatCurrency(kpis.dettesFiscales)}</p>
              <p className="text-xs text-gray-400 mt-1">IAS 12 — Impôt sur le résultat</p>
            </div>

            <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Building className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-blue-600 uppercase">Charges sociales</span>
              </div>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(kpis.chargesSociales)}</p>
              <p className="text-xs text-gray-400 mt-1">IAS 19 — Cotisations employeur</p>
            </div>

            <div className="bg-white rounded-xl border border-purple-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-semibold text-purple-600 uppercase">Créditeurs divers</span>
              </div>
              <p className="text-xl font-bold text-purple-700">{formatCurrency(kpis.crediteursDivers)}</p>
              <p className="text-xs text-gray-400 mt-1">IFRS 9 — Passifs financiers</p>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Répartition par classe — Pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                Répartition par classe SYSCOHADA
              </h3>
              <p className="text-xs text-gray-400 mb-4">Nombre de tiers par classe</p>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLOR_PALETTE[index % COLOR_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, name: string) => [v + ' tiers', name]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                  Aucune donnée
                </div>
              )}
            </div>

            {/* Débit / Crédit par classe — Bar (données réelles GL) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Mouvements par classe SYSCOHADA
              </h3>
              <p className="text-xs text-gray-400 mb-4">Débit / Crédit cumulés (43x, 44x, 46x, 47x)</p>
              {barData.some(d => d.Débit > 0 || d.Crédit > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="classe" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="Débit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Crédit" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-center text-gray-400 text-sm px-4">
                  Aucune donnée — module non alimenté par l'import
                </div>
              )}
            </div>
          </div>

          {/* Tableau normes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-green-600" />
              Référentiel normatif appliqué
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { classe: '43x', norm: 'IAS 19', title: 'Avantages du personnel', detail: 'Cotisations patronales, indemnités départ, retraites' },
                { classe: '44x', norm: 'IAS 12', title: 'Impôt sur le résultat', detail: 'Impôts exigibles et différés, TVA, patentes' },
                { classe: '46x', norm: 'IFRS 9', title: 'Instruments financiers', detail: 'Créances associés, débiteurs transitoires' },
                { classe: '47x', norm: 'IFRS 9', title: 'Passifs financiers', detail: 'Créditeurs divers, produits/charges constatés d\'avance' },
              ].map(n => (
                <div key={n.classe} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-600">{n.classe}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">{n.norm}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-900">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Conforme au Plan Comptable SYSCOHADA Révisé (2017) — Art. 27 et Annexes
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL CRÉATION */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-900">Nouveau tiers — 43x/44x/46x/47x</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {renderFormFields()}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.code.trim() || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL ÉDITION */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showEditModal && selectedTiers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-amber-50">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-semibold text-gray-900">Modifier — {selectedTiers.name}</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {renderFormFields()}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !form.code.trim() || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Mise à jour...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL DÉTAIL */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showDetailModal && selectedTiers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Détail — {selectedTiers.name}</h2>
              </div>
              <button onClick={() => { setShowDetailModal(false); setSelectedTiers(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Identité */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Code</p>
                  <p className="font-mono font-semibold text-purple-700">{selectedTiers.code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Statut</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedTiers.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedTiers.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 mb-0.5">Dénomination</p>
                  <p className="font-semibold text-gray-900">{selectedTiers.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Classe SYSCOHADA</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classeColorClasses(selectedTiers.classe).badge}`}>
                    {selectedTiers.classe}x — {CLASSE_INFO[selectedTiers.classe]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Compte collectif</p>
                  <p className="font-mono text-gray-700">{selectedTiers.collectif_account}</p>
                </div>
              </div>

              {/* Contact */}
              {(selectedTiers.email || selectedTiers.phone) && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contact</p>
                  <div className="space-y-1.5">
                    {selectedTiers.email && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {selectedTiers.email}
                      </p>
                    )}
                    {selectedTiers.phone && (
                      <p className="text-sm text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {selectedTiers.phone}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Soldes */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Soldes comptables</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-600 mb-1">Débit total</p>
                    <p className="text-sm font-bold text-blue-700 font-mono">{formatCurrency(selectedTiers.totalDebit)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-green-600 mb-1">Crédit total</p>
                    <p className="text-sm font-bold text-green-700 font-mono">{formatCurrency(selectedTiers.totalCredit)}</p>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${selectedTiers.solde >= 0 ? 'bg-purple-50' : 'bg-red-50'}`}>
                    <p className={`text-xs mb-1 ${selectedTiers.solde >= 0 ? 'text-purple-600' : 'text-red-600'}`}>Solde net</p>
                    <p className={`text-sm font-bold font-mono ${selectedTiers.solde >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                      {formatCurrency(Math.abs(selectedTiers.solde))} {selectedTiers.solde >= 0 ? 'C' : 'D'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Norme */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                  SYSCOHADA Art. 27 · Norme IFRS applicable : {CLASSE_INFO[selectedTiers.classe]?.ifrs}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => { setShowDetailModal(false); openEdit(selectedTiers); }}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => { setShowDetailModal(false); setSelectedTiers(null); }}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* MODAL CONFIRMATION SUPPRESSION */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Confirmer la suppression</h2>
              </div>
              <p className="text-sm text-gray-600">
                Supprimer définitivement le tiers{' '}
                <span className="font-semibold text-gray-900">
                  {deleteTarget.name} ({deleteTarget.code})
                </span>{' '}
                ? Cette action est irréversible.
              </p>
              {deleteTarget.totalDebit > 0 || deleteTarget.totalCredit > 0 ? (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Ce tiers possède des écritures comptables. La suppression peut créer des incohérences.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutresTiersModule;
