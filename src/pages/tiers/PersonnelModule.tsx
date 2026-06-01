/**
 * PersonnelModule — Gestion du personnel (comptes 421-425 SYSCOHADA)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Users, Search, Plus, Trash2, X, UserCheck, UserX,
  Mail, Phone, MapPin, Hash, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonnelRecord {
  id: string;
  code: string;
  name: string;
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
  collectif_account: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
}

const COLLECTIF_OPTIONS = ['421', '422', '423', '424', '425'] as const;

const COLLECTIF_LABELS: Record<string, string> = {
  '421': '421 — Avances & acomptes au personnel',
  '422': '422 — Rémunérations dues au personnel',
  '423': '423 — Oppositions sur salaires',
  '424': '424 — Participation des salariés',
  '425': '425 — Dépôts du personnel',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function guessCollectif(code: string): string {
  const prefix = code.substring(0, 3);
  if (COLLECTIF_OPTIONS.includes(prefix as any)) return prefix;
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

// ─── Component ────────────────────────────────────────────────────────────────

const PersonnelModule: React.FC = () => {
  const { adapter } = useData();

  // List state
  const [personnel, setPersonnel] = useState<PersonnelRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    code: '',
    name: '',
    collectif_account: '422',
    email: '',
    phone: '',
    address: '',
    is_active: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateForm, string>>>({});

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLabel, setDeleteLabel] = useState('');

  // ── Load ──────────────────────────────────────────────────────────────────

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
          name: tp.name || tp.raisonSociale || '',
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

  useEffect(() => {
    loadPersonnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return personnel;
    const q = search.toLowerCase();
    return personnel.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
    );
  }, [personnel, search]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const actifs = personnel.filter((p) => p.is_active).length;
    const inactifs = personnel.length - actifs;
    return { total: personnel.length, actifs, inactifs };
  }, [personnel]);

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openModal = async () => {
    const autoCode = await generateCode(adapter, '422');
    setForm({
      code: autoCode,
      name: '',
      collectif_account: '422',
      email: '',
      phone: '',
      address: '',
      is_active: true,
    });
    setErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErrors({});
  };

  const handleCollectifChange = async (collectif: string) => {
    const autoCode = await generateCode(adapter, collectif);
    setForm((prev) => ({
      ...prev,
      collectif_account: collectif,
      code: prev.code === '' ? autoCode : prev.code,
    }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof CreateForm, string>> = {};
    if (!form.name.trim()) errs.name = 'Le nom complet est requis';
    if (!form.code.trim()) errs.code = 'Le code est requis';
    if (!/^\d+$/.test(form.code.trim()))
      errs.code = 'Le code doit être numérique';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await adapter.create('thirdParties', {
        code: form.code.trim(),
        name: form.name.trim(),
        type: 'personnel',
        collectif_account: form.collectif_account,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        is_active: form.is_active,
      });
      toast.success(`Membre du personnel "${form.name.trim()}" créé avec succès`);
      closeModal();
      await loadPersonnel();
    } catch (err: any) {
      toast.error(
        err?.message
          ? `Erreur : ${err.message}`
          : 'Impossible de créer le membre du personnel'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const requestDelete = (p: PersonnelRecord) => {
    setDeleteId(p.id);
    setDeleteLabel(p.name || p.code);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await adapter.delete('thirdParties', deleteId);
      toast.success('Membre supprimé');
      setDeleteId(null);
      setDeleteLabel('');
      await loadPersonnel();
    } catch (err: any) {
      toast.error(
        err?.message ? `Erreur : ${err.message}` : 'Suppression impossible'
      );
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Personnel</h1>
            <p className="text-sm text-gray-500">
              Comptes 421–425 SYSCOHADA &mdash; {stats.total} enregistrement(s)
            </p>
          </div>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau membre
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total personnel</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <UserCheck className="w-5 h-5 text-green-500 shrink-0" />
          <div>
            <p className="text-xl font-bold text-green-700">{stats.actifs}</p>
            <p className="text-xs text-gray-500">Actifs</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <UserX className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-xl font-bold text-red-600">{stats.inactifs}</p>
            <p className="text-xs text-gray-500">Inactifs</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou code..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
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

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full mx-auto mb-3" />
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-25" />
          <p className="font-medium">Aucun membre du personnel trouvé</p>
          {search ? (
            <p className="text-xs mt-1">Essayez un autre terme de recherche</p>
          ) : (
            <p className="text-xs mt-1">
              Cliquez sur &laquo;&nbsp;Nouveau membre&nbsp;&raquo; pour en ajouter un
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {[
                  'Code',
                  'Nom complet',
                  'Compte collectif',
                  'Email',
                  'Téléphone',
                  'Statut',
                  'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                    {p.code}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 font-mono">
                      {p.collectif_account || guessCollectif(p.code)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 shrink-0" />
                        {p.email}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 shrink-0" />
                        {p.phone}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {p.is_active ? (
                        <UserCheck className="w-3 h-3" />
                      ) : (
                        <UserX className="w-3 h-3" />
                      )}
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => requestDelete(p)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Phase 2 note */}
      <p className="text-xs text-gray-400 italic text-center pt-2">
        Phase 2 prévoie la synchronisation automatique avec WiseHR
      </p>

      {/* ── Creation Modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-indigo-50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  Nouveau membre du personnel
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Row: Code + Collectif */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Hash className="w-3 h-3 inline mr-1" />
                    Code
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, code: e.target.value }))
                    }
                    placeholder="Auto-généré"
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none ${
                      errors.code ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.code && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.code}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Compte collectif
                  </label>
                  <select
                    value={form.collectif_account}
                    onChange={(e) => handleCollectifChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  >
                    {COLLECTIF_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400 truncate">
                    {COLLECTIF_LABELS[form.collectif_account]}
                  </p>
                </div>
              </div>

              {/* Nom complet */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Prénom et nom du membre"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Type (readonly) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value="Personnel"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Email + Téléphone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="email@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+XXX XXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  <MapPin className="w-3 h-3 inline mr-1" />
                  Adresse
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Adresse complète"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Statut toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">Statut</p>
                  <p className="text-xs text-gray-400">
                    {form.is_active ? 'Membre actif' : 'Membre inactif'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, is_active: !prev.is_active }))
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-indigo-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Créer le membre
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteId(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h2 className="font-semibold text-gray-900">
                Confirmer la suppression
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              Supprimer <strong>{deleteLabel}</strong> ? Cette action est
              irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
