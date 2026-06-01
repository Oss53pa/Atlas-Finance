/**
 * AutresTiersModule — Organismes sociaux, État, Autres débiteurs/créditeurs
 * Comptes 43x, 44x, 46x, 47x SYSCOHADA
 * Type DB : 'other' uniquement (pas 'social_org' ni 'state')
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { Database, Search, Plus, Trash2, X, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AutreTiers {
  id: string;
  code: string;
  name: string;
  type: string;
  collectif_account: string;
  is_active: boolean;
  email?: string;
  phone?: string;
}

type TabKey = 'all' | '43' | '44' | '46' | '47';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: '43', label: '43x — Org. sociaux' },
  { key: '44', label: '44x — État' },
  { key: '46', label: '46x — Divers' },
  { key: '47', label: '47x — Créditeurs' },
];

const CLASS_LABELS: Record<string, string> = {
  '43': 'Organismes sociaux',
  '431': 'Sécurité sociale',
  '44': 'État & Impôts',
  '441': 'TVA',
  '46': 'Débiteurs divers',
  '461': 'Débiteurs associés',
  '47': 'Créditeurs divers',
  '471': 'Créditeurs transitoires',
};

const CATEGORIES = [
  { value: '43', label: 'Organisme social (43x)' },
  { value: '44', label: 'État — Impôts & Taxes (44x)' },
  { value: '46', label: 'Débiteur divers (46x)' },
  { value: '47', label: 'Créditeur divers (47x)' },
];

const COLLECTIF_OPTIONS = [
  '43', '431', '44', '441', '46', '461', '47', '471',
];

const DEFAULT_FORM = {
  code: '',
  name: '',
  categorie: '47',
  collectif_account: '471',
  email: '',
  phone: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function classPrefix(code: string): string {
  return code.substring(0, 2);
}

function syscohadaClass(code: string): string {
  const prefix3 = code.substring(0, 3);
  const prefix2 = code.substring(0, 2);
  return CLASS_LABELS[prefix3] || CLASS_LABELS[prefix2] || `${prefix2}x`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

const AutresTiersModule: React.FC = () => {
  const { adapter } = useData();

  // Liste & filtres
  const [tiers, setTiers] = useState<AutreTiers[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);

  // Modal création
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  // Modal confirmation suppression
  const [deleteTarget, setDeleteTarget] = useState<AutreTiers | null>(null);

  // ── Chargement ──────────────────────────────────────────────────────────────
  const loadTiers = useCallback(async () => {
    setLoading(true);
    try {
      const all = await adapter.getAll<any>('thirdParties');
      const autres = all.filter((tp: any) =>
        tp.type === 'other' ||
        /^4[34567]/.test(tp.code || '')
      );
      setTiers(
        autres.map((tp: any) => ({
          id: tp.id,
          code: tp.code || '',
          name: tp.name || tp.raisonSociale || '',
          type: tp.type || 'other',
          collectif_account:
            tp.collectif_account ||
            tp.collectifAccount ||
            tp.compteComptable ||
            tp.accountCode?.substring(0, 3) ||
            classPrefix(tp.code || '') ||
            '47',
          is_active: tp.is_active ?? tp.isActive ?? true,
          email: tp.email || '',
          phone: tp.phone || '',
        }))
      );
    } catch {
      setTiers([]);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  // ── Filtrage ────────────────────────────────────────────────────────────────
  const filtered = tiers.filter(t => {
    const matchTab =
      activeTab === 'all' ||
      classPrefix(t.code) === activeTab;
    const matchSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.code.includes(search);
    return matchTab && matchSearch;
  });

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
      setShowModal(false);
      setForm({ ...DEFAULT_FORM });
      await loadTiers();
    } catch (err: any) {
      toast.error(`Erreur lors de la création : ${err?.message || 'inconnue'}`);
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

  // ── Compteurs par préfixe ──────────────────────────────────────────────────
  const countByPrefix = (prefix: string) =>
    tiers.filter(t => classPrefix(t.code) === prefix).length;

  // ── Rendu ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-purple-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Autres Tiers</h1>
            <p className="text-sm text-gray-500">
              Org. sociaux (43x), État (44x), Divers (46x–47x) — {tiers.length} enregistrement(s)
            </p>
          </div>
        </div>
        <button
          onClick={() => { setForm({ ...DEFAULT_FORM }); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Autre tiers
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['43', '44', '46', '47'] as const).map(prefix => (
          <div
            key={prefix}
            className="bg-white border border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-purple-400 transition-colors"
            onClick={() => setActiveTab(prefix)}
          >
            <p className="text-2xl font-bold text-purple-700">{countByPrefix(prefix)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{CLASS_LABELS[prefix] || `${prefix}x`}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1 text-xs text-gray-400">
                ({countByPrefix(tab.key)})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par code ou nom..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun tiers trouvé</p>
          <p className="text-xs mt-1">
            {tiers.length === 0
              ? 'Aucun enregistrement. Utilisez "+ Autre tiers" pour en créer un.'
              : 'Aucun résultat pour ce filtre.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Nom', 'Classe SYSCOHADA', 'Compte collectif', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-purple-700">{t.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                      {syscohadaClass(t.code)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{t.collectif_account}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {t.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Voir détail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Supprimer"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} résultat(s) affiché(s)
          </div>
        </div>
      )}

      {/* ── Modal création ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-purple-50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-semibold text-gray-900">Nouveau tiers — Comptes 43x/44x/46x/47x</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
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

              {/* Type (fixe) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type DB</label>
                <input
                  type="text"
                  value="other"
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Catégorie affichage */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Catégorie SYSCOHADA</label>
                <select
                  value={form.categorie}
                  onChange={e => {
                    const cat = e.target.value;
                    // Mettre à jour le compte collectif par défaut selon la catégorie
                    const defaultCollectif =
                      cat === '43' ? '431'
                      : cat === '44' ? '441'
                      : cat === '46' ? '461'
                      : '471';
                    setForm(f => ({ ...f, categorie: cat, collectif_account: defaultCollectif }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
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
                  {COLLECTIF_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>
                      {opt} — {CLASS_LABELS[opt] || opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="contact@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
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

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
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

      {/* ── Modal confirmation suppression ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <Trash2 className="w-6 h-6 text-red-500 flex-shrink-0" />
                <h2 className="text-base font-semibold text-gray-900">Confirmer la suppression</h2>
              </div>
              <p className="text-sm text-gray-600">
                Supprimer définitivement le tiers{' '}
                <span className="font-semibold text-gray-900">
                  {deleteTarget.name} ({deleteTarget.code})
                </span>{' '}
                ? Cette action est irréversible.
              </p>
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
