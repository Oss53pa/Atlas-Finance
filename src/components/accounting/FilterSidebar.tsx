/**
 * FilterSidebar — Composant Filtre & Recherche des écrans comptables.
 *
 * Implémente le brief « Composant Filtre & Recherche » (v1.0 · 11/06/2026) :
 *  - Barre latérale DROITE repliable (260-300px déployée, ~44px repliée avec
 *    pastille du nombre de filtres actifs), animation douce.
 *  - UNE seule zone de filtrage, groupes empilés : Période (+ raccourcis),
 *    Journal (multi), Compte (racine/exact), Tiers, Montant (min + sens),
 *    Statut & lettrage. Bouton Effacer (conserve la période).
 *  - Filtres combinables (ET logique) ; état + repli PERSISTÉS par écran
 *    (localStorage, clé `compta-filters:<screenKey>`).
 *  - Chips des filtres actifs (helper buildFilterChips) — la période est une
 *    chip non supprimable.
 *  - Réutilisable : Journaux, Grand Livre, Balance, Lettrage, Tiers.
 *
 * Le composant est CONTRÔLÉ : il reçoit `filters` + `onChange` et ne possède
 * que l'état de repli. Le filtrage des lignes est fourni par applyComptaFilters.
 */
import React, { useEffect, useState } from 'react';
import { Filter, ChevronRight, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Modèle de filtres (groupe « Essentiel » du brief)
// ─────────────────────────────────────────────────────────────────────────────

export interface ComptaFilters {
  dateFrom: string;
  dateTo: string;
  journals: string[];          // codes journaux (vide = tous)
  accountPrefix: string;       // racine ou n° exact (« 401 », « 6 », « 521100 »)
  tiers: string;               // code ou nom (contient, insensible casse/accents)
  amountMin: string;           // montant minimum (chaîne pour la saisie libre)
  sens: 'all' | 'debit' | 'credit';
  lettrage: 'all' | 'lettre' | 'non_lettre';
  statut: 'all' | 'draft' | 'validated';
  search: string;              // recherche rapide multi-champs (en-tête)
}

export const DEFAULT_COMPTA_FILTERS: ComptaFilters = {
  dateFrom: '',
  dateTo: '',
  journals: [],
  accountPrefix: '',
  tiers: '',
  amountMin: '',
  sens: 'all',
  lettrage: 'all',
  statut: 'all',
  search: '',
};

/** Ligne d'écriture filtrable (une ligne du tableau de résultats). */
export interface ComptaRow {
  id: string;
  piece: string;
  date: string;            // ISO AAAA-MM-JJ
  journal: string;         // code journal
  accountCode: string;
  accountName: string;
  libelle: string;
  debit: number;
  credit: number;
  lettrage?: string;       // code de lettrage ('' = non lettré)
  tiersCode?: string;
  tiersName?: string;
  statut?: string;
}

/** Normalisation accents/casse pour la recherche (« pré » trouve « PRÉ »). */
const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Applique TOUS les filtres actifs (ET logique) sur des lignes. */
export function applyComptaFilters(rows: ComptaRow[], f: ComptaFilters): ComptaRow[] {
  const q = norm(f.search.trim());
  const qAmount = q.replace(',', '.');
  const tiersQ = norm(f.tiers.trim());
  const minAmount = parseFloat(String(f.amountMin).replace(/\s/g, '').replace(',', '.')) || 0;

  return rows.filter((r) => {
    if (f.dateFrom && r.date < f.dateFrom) return false;
    if (f.dateTo && r.date > f.dateTo) return false;
    if (f.journals.length > 0 && !f.journals.includes(r.journal)) return false;
    if (f.accountPrefix && !r.accountCode.startsWith(f.accountPrefix.trim())) return false;
    if (tiersQ && !norm(`${r.tiersCode || ''} ${r.tiersName || ''}`).includes(tiersQ)) return false;
    if (minAmount > 0 && Math.max(r.debit, r.credit) < minAmount) return false;
    if (f.sens === 'debit' && !(r.debit > 0)) return false;
    if (f.sens === 'credit' && !(r.credit > 0)) return false;
    if (f.lettrage === 'lettre' && !r.lettrage) return false;
    if (f.lettrage === 'non_lettre' && !!r.lettrage) return false;
    if (f.statut !== 'all' && (r.statut || 'validated') !== f.statut) return false;
    if (q) {
      const hay = norm(`${r.piece} ${r.accountCode} ${r.accountName} ${r.libelle} ${r.tiersCode || ''} ${r.tiersName || ''}`);
      const amounts = `${r.debit} ${r.credit}`;
      if (!hay.includes(q) && !amounts.includes(qAmount)) return false;
    }
    return true;
  });
}

/** Nombre de filtres actifs (hors période, toujours présente). */
export function countActiveFilters(f: ComptaFilters): number {
  let n = 0;
  if (f.journals.length > 0) n++;
  if (f.accountPrefix.trim()) n++;
  if (f.tiers.trim()) n++;
  if (parseFloat(String(f.amountMin).replace(/\s/g, '').replace(',', '.')) > 0) n++;
  if (f.sens !== 'all') n++;
  if (f.lettrage !== 'all') n++;
  if (f.statut !== 'all') n++;
  if (f.search.trim()) n++;
  return n;
}

export interface FilterChip {
  key: string;
  label: string;
  removable: boolean;
}

/** Chips des filtres actifs (la période est non supprimable). */
export function buildFilterChips(f: ComptaFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  const dd = (s: string) => (s ? s.split('-').reverse().slice(0, 2).join('/') : '…');
  chips.push({ key: 'periode', label: `Période : ${dd(f.dateFrom)} → ${dd(f.dateTo)}`, removable: false });
  if (f.journals.length > 0) chips.push({ key: 'journals', label: `Journal : ${f.journals.join(', ')}`, removable: true });
  if (f.accountPrefix.trim()) chips.push({ key: 'accountPrefix', label: `Compte ${f.accountPrefix.trim()}x`, removable: true });
  if (f.tiers.trim()) chips.push({ key: 'tiers', label: `Tiers : ${f.tiers.trim()}`, removable: true });
  const min = parseFloat(String(f.amountMin).replace(/\s/g, '').replace(',', '.')) || 0;
  if (min > 0) chips.push({ key: 'amountMin', label: `≥ ${min.toLocaleString('fr-FR')}`, removable: true });
  if (f.sens !== 'all') chips.push({ key: 'sens', label: f.sens === 'debit' ? 'Débit' : 'Crédit', removable: true });
  if (f.lettrage !== 'all') chips.push({ key: 'lettrage', label: f.lettrage === 'lettre' ? 'Lettré' : 'Non lettré', removable: true });
  if (f.statut !== 'all') chips.push({ key: 'statut', label: f.statut === 'draft' ? 'Brouillons' : 'Validées', removable: true });
  if (f.search.trim()) chips.push({ key: 'search', label: `« ${f.search.trim()} »`, removable: true });
  return chips;
}

/** Retire un filtre (clic sur la croix d'une chip). */
export function removeFilter(f: ComptaFilters, key: string): ComptaFilters {
  switch (key) {
    case 'journals': return { ...f, journals: [] };
    case 'accountPrefix': return { ...f, accountPrefix: '' };
    case 'tiers': return { ...f, tiers: '' };
    case 'amountMin': return { ...f, amountMin: '' };
    case 'sens': return { ...f, sens: 'all' };
    case 'lettrage': return { ...f, lettrage: 'all' };
    case 'statut': return { ...f, statut: 'all' };
    case 'search': return { ...f, search: '' };
    default: return f;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistance par écran
// ─────────────────────────────────────────────────────────────────────────────

const storageKey = (screenKey: string) => `compta-filters:${screenKey}`;
const collapsedKey = (screenKey: string) => `compta-filters-collapsed:${screenKey}`;

export function loadPersistedFilters(screenKey: string, defaults: ComptaFilters): ComptaFilters {
  try {
    const raw = localStorage.getItem(storageKey(screenKey));
    if (raw) return { ...defaults, ...(JSON.parse(raw) as Partial<ComptaFilters>) };
  } catch { /* stockage indisponible/corrompu → défauts */ }
  return defaults;
}

export function persistFilters(screenKey: string, f: ComptaFilters): void {
  try { localStorage.setItem(storageKey(screenKey), JSON.stringify(f)); } catch { /* noop */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterSidebarProps {
  /** Clé de persistance (un état par écran), ex. 'journal-detail'. */
  screenKey: string;
  filters: ComptaFilters;
  onChange: (next: ComptaFilters) => void;
  /** Journaux disponibles (code + libellé) pour la multi-sélection. */
  journalOptions?: Array<{ code: string; label: string }>;
  /** Bornes de l'exercice pour le raccourci « Exercice ». */
  exercice?: { start: string; end: string };
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  screenKey,
  filters,
  onChange,
  journalOptions = [],
  exercice,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(collapsedKey(screenKey));
      if (v !== null) return v === '1';
    } catch { /* défaut ci-dessous */ }
    // Responsive : replié par défaut sous ~1024px (le panneau s'ouvre en surimpression).
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  useEffect(() => {
    try { localStorage.setItem(collapsedKey(screenKey), collapsed ? '1' : '0'); } catch { /* noop */ }
  }, [collapsed, screenKey]);

  // Persistance des valeurs à chaque changement.
  useEffect(() => { persistFilters(screenKey, filters); }, [screenKey, filters]);

  const active = countActiveFilters(filters);
  const set = (patch: Partial<ComptaFilters>) => onChange({ ...filters, ...patch });

  const setPeriodPreset = (preset: 'month' | 'quarter' | 'exercice') => {
    const now = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === 'month') {
      set({ dateFrom: iso(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) });
    } else if (preset === 'quarter') {
      const q = Math.floor(now.getMonth() / 3);
      set({ dateFrom: iso(new Date(now.getFullYear(), q * 3, 1)), dateTo: iso(new Date(now.getFullYear(), q * 3 + 3, 0)) });
    } else if (exercice) {
      set({ dateFrom: exercice.start, dateTo: exercice.end });
    }
  };

  const clearAll = () => {
    // Effacer réinitialise tout SAUF la période (brief §5).
    onChange({ ...DEFAULT_COMPTA_FILTERS, dateFrom: filters.dateFrom, dateTo: filters.dateTo });
  };

  // ── État replié : bande fine + pastille ──────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex-shrink-0 w-11 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col items-center pt-3 transition-all duration-200">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-label={`Ouvrir les filtres${active > 0 ? ` (${active} actifs)` : ''}`}
          title="Ouvrir les filtres"
          className="relative p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
        >
          <Filter className="w-5 h-5 text-[var(--color-text-secondary)]" />
          {active > 0 && (
            <span className="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
              {active}
            </span>
          )}
        </button>
      </div>
    );
  }

  const labelCls = 'block text-xs font-medium text-[var(--color-text-secondary)] mb-1';
  const inputCls = 'w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40';
  const presetCls = 'px-2.5 py-1 rounded-full border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors';

  // ── État déployé ──────────────────────────────────────────────────────────
  return (
    <aside className="flex-shrink-0 w-[280px] border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-4 transition-all duration-200 overflow-y-auto">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-expanded={true}
          aria-label="Replier les filtres"
          className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)] hover:opacity-80"
        >
          <ChevronRight className="w-4 h-4" />
          <Filter className="w-4 h-4" />
          Filtres
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-3 py-1 text-xs border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
        >
          Effacer
        </button>
      </div>

      {/* Période */}
      <div>
        <label className={labelCls}>Période</label>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={filters.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} className={inputCls} aria-label="Période du" />
          <input type="date" value={filters.dateTo} onChange={(e) => set({ dateTo: e.target.value })} className={inputCls} aria-label="Période au" />
        </div>
        <div className="flex gap-1.5 mt-2">
          <button type="button" className={presetCls} onClick={() => setPeriodPreset('month')}>Ce mois</button>
          <button type="button" className={presetCls} onClick={() => setPeriodPreset('quarter')}>Trim.</button>
          <button type="button" className={presetCls} onClick={() => setPeriodPreset('exercice')}>Exercice</button>
        </div>
      </div>

      {/* Journal (multi) */}
      {journalOptions.length > 0 && (
        <div>
          <label className={labelCls}>Journal</label>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {journalOptions.map((j) => {
              const checked = filters.journals.includes(j.code);
              return (
                <label key={j.code} className="flex items-center gap-2 text-sm text-[var(--color-text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      set({ journals: checked ? filters.journals.filter((c) => c !== j.code) : [...filters.journals, j.code] })
                    }
                    className="rounded border-[var(--color-border)]"
                  />
                  <span className="font-mono text-xs">{j.code}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)] truncate">{j.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Compte */}
      <div>
        <label className={labelCls}>Compte (début)</label>
        <input
          type="text"
          value={filters.accountPrefix}
          onChange={(e) => set({ accountPrefix: e.target.value })}
          placeholder="401, 6…"
          className={inputCls + ' font-mono'}
        />
      </div>

      {/* Tiers */}
      <div>
        <label className={labelCls}>Tiers</label>
        <input
          type="text"
          value={filters.tiers}
          onChange={(e) => set({ tiers: e.target.value })}
          placeholder="Code ou nom…"
          className={inputCls}
        />
      </div>

      {/* Sens */}
      <div>
        <label className={labelCls}>Sens</label>
        <select value={filters.sens} onChange={(e) => set({ sens: e.target.value as ComptaFilters['sens'] })} className={inputCls}>
          <option value="all">Débit + crédit</option>
          <option value="debit">Débit</option>
          <option value="credit">Crédit</option>
        </select>
      </div>

      {/* Lettrage */}
      <div>
        <label className={labelCls}>Lettrage</label>
        <select value={filters.lettrage} onChange={(e) => set({ lettrage: e.target.value as ComptaFilters['lettrage'] })} className={inputCls}>
          <option value="all">Tous</option>
          <option value="lettre">Lettré</option>
          <option value="non_lettre">Non lettré</option>
        </select>
      </div>

      {/* Statut */}
      <div>
        <label className={labelCls}>Statut</label>
        <select value={filters.statut} onChange={(e) => set({ statut: e.target.value as ComptaFilters['statut'] })} className={inputCls}>
          <option value="all">Tous</option>
          <option value="validated">Validées</option>
          <option value="draft">Brouillons</option>
        </select>
      </div>

      {/* Montant min */}
      <div>
        <label className={labelCls}>Montant min</label>
        <input
          type="text"
          inputMode="numeric"
          value={filters.amountMin}
          onChange={(e) => set({ amountMin: e.target.value })}
          placeholder="0"
          className={inputCls + ' font-mono text-right'}
        />
      </div>
    </aside>
  );
};

// Chip de filtre actif (zone résultats).
export const FilterChipPill: React.FC<{ chip: FilterChip; onRemove?: () => void }> = ({ chip, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-medium">
    {chip.label}
    {chip.removable && onRemove && (
      <button type="button" onClick={onRemove} aria-label={`Retirer le filtre ${chip.label}`} className="hover:opacity-70">
        <X className="w-3 h-3" />
      </button>
    )}
  </span>
);

export default FilterSidebar;
